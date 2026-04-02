import csv
import re
from pathlib import Path

from rapidfuzz import fuzz


ROOT = Path(__file__).resolve().parent
DISCOUNTS_CSV = ROOT / "discounts.csv"
EXPENSES_CSV = ROOT / "sample_expenses.csv"
RESULTS_CSV = ROOT / "results.csv"
MATCH_THRESHOLD = 70

STOP_WORDS = {
    "inc",
    "llc",
    "ltd",
    "corp",
    "corporation",
    "company",
    "co",
    "services",
    "service",
    "subscription",
    "store",
    "marketplace",
    "mktp",
    "payment",
    "bill",
    "online",
    "digital",
    "usa",
    "ca",
    "com",
    "www",
}


def normalize_name(value: str) -> str:
    text = (value or "").strip().lower()
    text = text.replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    parts = [part for part in text.split() if part and part not in STOP_WORDS]
    return " ".join(parts)


def parse_money(value: str) -> float | None:
    if not value:
        return None
    match = re.search(r"(\d+(?:\.\d+)?)", value.replace(",", ""))
    return float(match.group(1)) if match else None


def load_discounts(path: Path) -> list[dict]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        lines = [line for line in handle if line.strip() and not line.lstrip().startswith("#")]

    reader = csv.DictReader(lines)
    discounts = []
    for row in reader:
        if not row.get("brand"):
            continue

        brand = row["brand"].strip()
        aliases = [alias.strip() for alias in (row.get("aliases") or "").split("|") if alias.strip()]
        candidates = [brand, *aliases]
        normalized = {normalize_name(candidate) for candidate in candidates if normalize_name(candidate)}
        if not normalized:
            continue

        row["brand"] = brand
        row["_normalized_candidates"] = sorted(normalized)
        discounts.append(row)

    return discounts


def load_expenses(path: Path) -> list[dict]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def find_best_match(merchant: str, discounts: list[dict]) -> dict | None:
    merchant_key = normalize_name(merchant)
    if not merchant_key:
        return None

    best_row = None
    best_score = -1
    best_length_gap = float("inf")

    for row in discounts:
        for candidate in row["_normalized_candidates"]:
            score = fuzz.partial_ratio(merchant_key, candidate)
            length_gap = abs(len(merchant_key) - len(candidate))
            if score > best_score or (score == best_score and length_gap < best_length_gap):
                best_score = score
                best_length_gap = length_gap
                best_row = row

    if best_score >= MATCH_THRESHOLD:
        return best_row
    return None


def estimate_savings(price: float, discount: dict) -> float:
    discount_type = (discount.get("discount_type") or "").strip().lower()
    percent = parse_money(discount.get("discount_percent") or "")
    discounted_price = parse_money(discount.get("discounted_price") or "")

    if discount_type == "percent" and percent is not None:
        return round(price * (percent / 100.0), 2)

    if discount_type in {"price", "bundle"} and discounted_price is not None:
        return round(max(price - discounted_price, 0.0), 2)

    if discount_type == "free":
        return round(price, 2)

    return 0.0


def main() -> None:
    discounts = load_discounts(DISCOUNTS_CSV)
    expenses = load_expenses(EXPENSES_CSV)

    results = []
    total_savings = 0.0
    match_count = 0

    for expense in expenses:
        merchant = (expense.get("merchant") or "").strip()
        price = float(expense.get("price") or 0)
        match = find_best_match(merchant, discounts)

        if match:
            match_count += 1
            savings = estimate_savings(price, match)
            total_savings += savings
            matched_brand = match["brand"]
            student_discount = match.get("student_discount") or ""
        else:
            savings = 0.0
            matched_brand = ""
            student_discount = ""

        results.append(
            {
                "merchant": merchant,
                "price": f"{price:.2f}",
                "matched_brand": matched_brand,
                "student_discount": student_discount,
                "estimated_savings": f"{savings:.2f}",
            }
        )

    with RESULTS_CSV.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "merchant",
                "price",
                "matched_brand",
                "student_discount",
                "estimated_savings",
            ],
        )
        writer.writeheader()
        writer.writerows(results)

    print(f"Total savings: ${total_savings:.2f}")
    print(f"Number of matches: {match_count}")


if __name__ == "__main__":
    main()
