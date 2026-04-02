"""
Fuzzy discount matcher for Amovi.

Loads discounts.csv and matches any merchant name against it using
rapidfuzz partial_ratio scoring. This replaces the old keyword-based
deals.py approach with a more robust, CSV-driven pipeline.
"""

import csv
import re
from pathlib import Path
from typing import Optional

from rapidfuzz import fuzz

DISCOUNTS_CSV = Path(__file__).resolve().parent / "discounts.csv"
MATCH_THRESHOLD = 70

STOP_WORDS = {
    "inc", "llc", "ltd", "corp", "corporation", "company", "co",
    "services", "service", "subscription", "store", "marketplace",
    "mktp", "payment", "bill", "online", "digital", "usa", "ca",
    "com", "www",
}


# ── Text normalisation ────────────────────────────────────────────────────────

def normalize_name(value: str) -> str:
    text = (value or "").strip().lower()
    text = text.replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    parts = [p for p in text.split() if p and p not in STOP_WORDS]
    return " ".join(parts)


def parse_money(value: str) -> Optional[float]:
    if not value:
        return None
    match = re.search(r"(\d+(?:\.\d+)?)", value.replace(",", ""))
    return float(match.group(1)) if match else None


# ── CSV loader ────────────────────────────────────────────────────────────────

def load_discounts(path: Path = DISCOUNTS_CSV) -> list[dict]:
    with path.open("r", newline="", encoding="utf-8") as fh:
        lines = [ln for ln in fh if ln.strip() and not ln.lstrip().startswith("#")]

    reader = csv.DictReader(lines)
    discounts: list[dict] = []

    for row in reader:
        brand = (row.get("brand") or "").strip()
        if not brand:
            continue

        aliases_raw = row.get("aliases") or ""
        aliases = [a.strip().rstrip("*") for a in aliases_raw.split("|") if a.strip()]
        candidates = [brand, *aliases]
        normalized = {normalize_name(c) for c in candidates if normalize_name(c)}
        if not normalized:
            continue

        row["brand"] = brand
        row["_normalized_candidates"] = sorted(normalized)
        discounts.append(row)

    return discounts


# Module-level singleton so we only parse the CSV once per process
_DISCOUNTS: Optional[list[dict]] = None


def get_discounts() -> list[dict]:
    global _DISCOUNTS
    if _DISCOUNTS is None:
        _DISCOUNTS = load_discounts()
    return _DISCOUNTS


# ── Matching ──────────────────────────────────────────────────────────────────

def find_best_match(merchant: str, discounts: Optional[list[dict]] = None) -> Optional[dict]:
    if discounts is None:
        discounts = get_discounts()

    merchant_key = normalize_name(merchant)
    if not merchant_key:
        return None

    best_row: Optional[dict] = None
    best_score = -1
    best_gap = float("inf")

    for row in discounts:
        for candidate in row["_normalized_candidates"]:
            score = fuzz.partial_ratio(merchant_key, candidate)
            gap = abs(len(merchant_key) - len(candidate))
            if score > best_score or (score == best_score and gap < best_gap):
                best_score = score
                best_gap = gap
                best_row = row

    return best_row if best_score >= MATCH_THRESHOLD else None


# ── Savings estimation ────────────────────────────────────────────────────────

def estimate_savings(current_price: float, discount: dict) -> float:
    """
    Returns how much the user saves per month if they switch to the student price.
    """
    discount_type = (discount.get("discount_type") or "").strip().lower()
    percent = parse_money(discount.get("discount_percent") or "")
    student_price = parse_money(discount.get("discounted_price") or "")

    if discount_type == "percent" and percent is not None:
        return round(current_price * (percent / 100.0), 2)

    if discount_type in {"price", "bundle"} and student_price is not None:
        return round(max(current_price - student_price, 0.0), 2)

    if discount_type == "free":
        return round(current_price, 2)

    # "custom" or unknown — flag as possible but savings unknown
    return 0.0


def student_price_from(current_price: float, discount: dict) -> float:
    """Returns the estimated student monthly price."""
    savings = estimate_savings(current_price, discount)
    return round(max(current_price - savings, 0.0), 2)
