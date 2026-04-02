"""
Amovi backend — FastAPI server that powers the Student Discount Detector.

Detection pipeline (per request):
  1. Claude (claude-sonnet-4-5) identifies all merchants in the transaction list
     that could have a student discount — not limited to subscriptions.
  2. Each identified merchant is fuzzy-matched against discounts.csv via
     rapidfuzz (partial_ratio ≥ 70).  This replaces the old keyword/deals.py
     approach and covers the 25 brands in the new CSV.
  3. Any merchant that scores below the threshold is sent to Claude's built-in
     web-search tool so live pricing and claim URLs are returned.
"""

import json
import os
import re
from typing import Optional

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from matcher import (
    estimate_savings,
    find_best_match,
    get_discounts,
    student_price_from,
)

load_dotenv()

app = FastAPI(title="Amovi API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5100",
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:5200",
        "http://localhost:5201",
        "http://localhost:5202",
        "http://localhost:5203",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────────

class Transaction(BaseModel):
    date: str
    description: str
    amount: float
    transaction_id: str = ""


class AnalyzeRequest(BaseModel):
    transactions: list[Transaction]


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_client() -> anthropic.Anthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set in backend/.env")
    return anthropic.Anthropic(api_key=api_key)


def _strip_markdown(text: str) -> str:
    text = re.sub(r"^```[a-z]*\n?", "", text.strip())
    return re.sub(r"\n?```$", "", text)


def _build_deal(
    *,
    service: str,
    category: str,
    currently_paying: float,
    discount_row: dict,
    confidence: str,
    transaction_ids: list[str],
    web_sourced: bool = False,
    how_to_claim: str = "",
    offer_url: str = "",
    verification: str = "",
    note: str = "",
) -> Optional[dict]:
    """Build a standardised deal dict; returns None if savings <= 0."""
    if web_sourced:
        monthly_savings = round(currently_paying - student_price_from(currently_paying, discount_row), 2) if discount_row else 0.0
    else:
        monthly_savings = estimate_savings(currently_paying, discount_row)

    if monthly_savings <= 0 and discount_row:
        # "custom" discount type — flag with 0 savings so user knows it exists
        monthly_savings = 0.0

    student_price = round(max(currently_paying - monthly_savings, 0.0), 2)

    return {
        "service": service,
        "category": category,
        "currently_paying": currently_paying,
        "student_price": student_price,
        "monthly_savings": monthly_savings,
        "annual_savings": round(monthly_savings * 12, 2),
        "how_to_claim": how_to_claim or discount_row.get("student_discount", ""),
        "offer_url": offer_url or discount_row.get("source", ""),
        "verification": verification or discount_row.get("eligibility", "Student verification"),
        "note": note,
        "confidence": confidence,
        "web_sourced": web_sourced,
        "transaction_ids": transaction_ids,
    }


# ── Step 1: Claude identifies candidate merchants ─────────────────────────────

def _detect_with_claude(transactions: list[Transaction]) -> list[dict]:
    client = get_client()
    tx_list = [
        {"id": t.transaction_id, "date": t.date, "description": t.description, "amount": t.amount}
        for t in transactions
    ]

    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        system=(
            "You are a financial assistant helping students save money. "
            "Given a list of bank transactions, identify EVERY unique merchant that "
            "could potentially offer a student discount — this includes subscriptions, "
            "software, streaming, retail stores, food delivery, learning platforms, "
            "productivity tools, VPNs, cloud storage, telecom carriers, and any other "
            "service known to have student pricing. "
            "Return a JSON array where each item has: "
            "service_name (cleaned display name), merchant_raw (original description), "
            "monthly_amount (float, the transaction amount), "
            "transaction_id (from the id field), "
            "confidence (high/medium/low). "
            "Return ONLY valid JSON, no markdown."
        ),
        messages=[{"role": "user", "content": f"Transactions:\n{json.dumps(tx_list, indent=2)}"}],
    )

    raw = _strip_markdown(message.content[0].text)
    return json.loads(raw)


def _fallback_detection(transactions: list[Transaction]) -> list[dict]:
    """Keyword fallback when Claude is unavailable."""
    discounts = get_discounts()
    detected: list[dict] = []
    seen: set[str] = set()

    for tx in transactions:
        match = find_best_match(tx.description, discounts)
        if match and match["brand"] not in seen:
            seen.add(match["brand"])
            detected.append({
                "service_name": match["brand"],
                "merchant_raw": tx.description,
                "monthly_amount": tx.amount,
                "transaction_id": tx.transaction_id,
                "confidence": "medium",
            })

    return detected


# ── Step 2: fuzzy match against discounts.csv ─────────────────────────────────

def _match_catalog(candidates: list[dict]) -> tuple[list[dict], list[dict]]:
    """
    Returns (matched_deals, unmatched_candidates).
    Uses rapidfuzz partial_ratio ≥ 70 via matcher.find_best_match().
    """
    discounts = get_discounts()
    matched: list[dict] = []
    unmatched: list[dict] = []
    seen_brands: set[str] = set()

    for sub in candidates:
        service_name = sub.get("service_name") or sub.get("merchant_raw", "")
        currently_paying = float(sub.get("monthly_amount") or 0)
        tx_ids = [sub["transaction_id"]] if sub.get("transaction_id") else []
        confidence = sub.get("confidence", "medium")

        # Try service_name first, fall back to raw merchant string
        row = find_best_match(service_name, discounts) or find_best_match(
            sub.get("merchant_raw", ""), discounts
        )

        if row and row["brand"] not in seen_brands:
            seen_brands.add(row["brand"])
            deal = _build_deal(
                service=row["brand"],
                category=row.get("category", "Other"),
                currently_paying=currently_paying,
                discount_row=row,
                confidence=confidence,
                transaction_ids=tx_ids,
            )
            if deal is not None:
                matched.append(deal)
        else:
            unmatched.append(sub)

    return matched, unmatched


# ── Step 3: Claude web-search for anything not in the CSV ─────────────────────

def _web_search_discount(service_name: str, monthly_amount: float, tx_ids: list[str]) -> Optional[dict]:
    try:
        client = get_client()
        response = client.beta.messages.create(
            model="claude-opus-4-5",
            max_tokens=1024,
            betas=["web-search-2025-03-05"],
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}],
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Search the web for a student discount for '{service_name}' in Canada. "
                        f"The regular price appears to be ${monthly_amount:.2f}/month CAD. "
                        f"Return ONLY a JSON object with keys: "
                        f"student_price_cad (number), offer_url (string), "
                        f"how_to_claim (string), verification_method (string), category (string). "
                        f"If no student discount exists return {{\"no_discount\": true}}. "
                        f"Return ONLY valid JSON, no markdown."
                    ),
                }
            ],
        )

        final_text = next(
            (b.text for b in response.content if hasattr(b, "text")), ""
        ).strip()
        if not final_text:
            return None

        data = json.loads(_strip_markdown(final_text))
        if data.get("no_discount"):
            return None

        student_price = float(data.get("student_price_cad") or 0)
        savings = round(monthly_amount - student_price, 2)
        if savings <= 0:
            return None

        offer_url = data.get("offer_url", "")
        return {
            "service": service_name,
            "category": data.get("category", "Web Search Result"),
            "currently_paying": monthly_amount,
            "student_price": student_price,
            "monthly_savings": savings,
            "annual_savings": round(savings * 12, 2),
            "how_to_claim": data.get("how_to_claim", "Visit the service website for student verification."),
            "offer_url": offer_url,
            "verification": data.get("verification_method", "Student verification"),
            "note": f"Found via live web search — verify at {offer_url}",
            "confidence": "medium",
            "web_sourced": True,
            "transaction_ids": tx_ids,
        }

    except Exception as e:
        print(f"Web search failed for {service_name}: {e}")
        return None


# ── Shared analysis orchestrator ──────────────────────────────────────────────

def _run_analysis(transactions: list[Transaction]) -> dict:
    # 1. Identify candidates
    try:
        candidates = _detect_with_claude(transactions)
    except Exception as e:
        print(f"Claude detection failed, using fallback: {e}")
        candidates = _fallback_detection(transactions)

    # 2. Fuzzy-match against discounts.csv
    matched_deals, unmatched = _match_catalog(candidates)

    # 3. Web-search for anything that missed the CSV
    final_unmatched: list[dict] = []
    for sub in unmatched:
        service_name = sub.get("service_name") or sub.get("merchant_raw", "")
        monthly_amount = float(sub.get("monthly_amount") or 0)
        tx_ids = [sub["transaction_id"]] if sub.get("transaction_id") else []

        web_deal = _web_search_discount(service_name, monthly_amount, tx_ids)
        if web_deal:
            matched_deals.append(web_deal)
        else:
            final_unmatched.append({
                "service_name": service_name,
                "monthly_amount": monthly_amount,
                "reason": "No student deal found in catalog or web search",
            })

    total_monthly = round(sum(d["monthly_savings"] for d in matched_deals), 2)
    total_annual = round(sum(d["annual_savings"] for d in matched_deals), 2)

    return {
        "detected_subscriptions": candidates,
        "matched_deals": matched_deals,
        "unmatched_subscriptions": final_unmatched,
        "total_monthly_savings": total_monthly,
        "total_annual_savings": total_annual,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/api/analyze")
def analyze(request: AnalyzeRequest):
    """Upload page: scan uploaded CSV transactions."""
    return _run_analysis(request.transactions)


@app.post("/api/analyze-all")
def analyze_all(request: AnalyzeRequest):
    """
    Subscriptions page: scan ALL Plaid transactions for any merchant with
    a student discount — not limited to recurring subscriptions.
    """
    return _run_analysis(request.transactions)


@app.get("/api/health")
def health():
    return {"status": "ok", "discounts_loaded": len(get_discounts())}
