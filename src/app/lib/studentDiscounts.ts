import { supabase, supabaseKey, supabaseUrl } from "../../lib/supabase";
import {
  detectStudentDiscountOpportunities,
  type StudentDiscountDetectorInput,
  type StudentDiscountOpportunity,
} from "../../shared/studentDiscountDetector";

const SUPABASE_ENDPOINT =
  `${supabaseUrl}/functions/v1/server/make-server-b711015c/student-discounts/detect`;

// FastAPI backend running locally (started separately with uvicorn)
const BACKEND_ENDPOINT = "http://localhost:8000/api/analyze-all";

interface BackendDeal {
  service: string;
  category: string;
  currently_paying: number;
  student_price: number;
  monthly_savings: number;
  annual_savings: number;
  how_to_claim: string;
  offer_url: string;
  verification: string;
  note?: string;
  confidence: string;
  web_sourced: boolean;
  transaction_ids: string[];
}

interface BackendResponse {
  matched_deals: BackendDeal[];
  total_monthly_savings: number;
  total_annual_savings: number;
}

function mapBackendDeal(
  deal: BackendDeal,
  displayCurrency: string,
): StudentDiscountOpportunity {
  return {
    serviceId: `${deal.service.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-backend`,
    serviceName: deal.service,
    normalizedMerchant: deal.service.toLowerCase().replace(/[^a-z0-9 ]+/g, "").trim(),
    matchConfidence: deal.confidence === "high" ? "high" : "possible",
    currentMonthlySpend: deal.currently_paying,
    currentBillingAmount: deal.currently_paying,
    currentBillingCadence: "monthly",
    regularPriceMonthly: deal.currently_paying,
    studentPriceMonthly: deal.student_price,
    estimatedMonthlySavings: deal.monthly_savings,
    estimatedYearlySavings: deal.annual_savings,
    currency: displayCurrency,
    region: "CA",
    offerUrl: deal.offer_url || "",
    verificationMethod: deal.verification || "Student verification",
    lastChecked: new Date().toISOString().split("T")[0]!,
    detectedTransactionIds: deal.transaction_ids ?? [],
  };
}

async function detectWithBackend(
  input: StudentDiscountDetectorInput,
): Promise<StudentDiscountOpportunity[]> {
  // Map StudentDiscountTransaction[] → the backend's simpler Transaction format
  const transactions = input.transactions.map((tx, i) => ({
    date: tx.date ?? tx.occurredOn ?? new Date().toISOString().split("T")[0],
    description: tx.merchantName ?? tx.name ?? "Unknown",
    amount: Math.abs(tx.amount),
    transaction_id: tx.id ?? String(i),
  }));

  const response = await fetch(BACKEND_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions }),
  });

  if (!response.ok) throw new Error(`Backend returned ${response.status}`);

  const data = (await response.json()) as BackendResponse;
  const displayCurrency = input.displayCurrency ?? "CAD";
  return (data.matched_deals ?? []).map((deal) => mapBackendDeal(deal, displayCurrency));
}

export async function detectStudentDiscounts(
  input: StudentDiscountDetectorInput,
): Promise<StudentDiscountOpportunity[]> {
  // 1. Try Anthropic-powered backend first (broad scan of all transactions)
  try {
    const backendResults = await detectWithBackend(input);
    if (backendResults.length > 0) return backendResults;
  } catch (e) {
    console.info("Backend unavailable, falling back to Supabase/local detector:", e);
  }

  // 2. Fall back to Supabase Edge Function
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(SUPABASE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) throw new Error(`Supabase detector status ${response.status}`);

    const payload = (await response.json()) as { opportunities?: StudentDiscountOpportunity[] };
    return payload.opportunities ?? [];
  } catch {
    // 3. Last resort: local catalog matching
    return detectStudentDiscountOpportunities(input);
  }
}
