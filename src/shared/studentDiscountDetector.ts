import {
  STUDENT_DISCOUNT_CATALOG_SEED,
  type StudentDiscountCatalogEntry,
} from "./studentDiscountCatalog";

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.35,
  AUD: 1.52,
  JPY: 149.5,
  CNY: 7.24,
  INR: 83,
};

const MONTHLY_GAP_MIN = 25;
const MONTHLY_GAP_MAX = 35;
const YEARLY_GAP_MIN = 330;
const YEARLY_GAP_MAX = 390;

const GENERIC_MATCH_TERMS = new Set(["apple", "google", "amazon"]);

export interface StudentDiscountTransaction {
  id: string;
  amount: number;
  merchantName?: string;
  sourceType?: "transaction" | "subscription";
  name?: string;
  date?: string;
  occurredOn?: string;
  category?: string;
  currency?: string;
  type?: "income" | "expense";
  isRecurring?: boolean;
  recurringFrequency?: "daily" | "weekly" | "biweekly" | "monthly" | "yearly" | null;
}

export interface StudentDiscountDetectorInput {
  transactions: StudentDiscountTransaction[];
  country?: string | null;
  displayCurrency?: string;
}

export interface StudentDiscountOpportunity {
  serviceId: string;
  serviceName: string;
  normalizedMerchant: string;
  matchConfidence: "high" | "possible";
  currentMonthlySpend: number;
  currentBillingAmount: number;
  currentBillingCadence: "monthly" | "yearly";
  regularPriceMonthly: number;
  studentPriceMonthly: number;
  estimatedMonthlySavings: number;
  estimatedYearlySavings: number;
  currency: string;
  region: string;
  offerUrl: string;
  verificationMethod: string;
  lastChecked: string;
  detectedTransactionIds: string[];
}

export interface RecurringSubscriptionCandidate {
  normalizedMerchant: string;
  displayName: string;
  currentMonthlySpend: number;
  currentBillingAmount: number;
  currentBillingCadence: "monthly" | "yearly";
  currency: string;
  lastChargeDate: string;
  detectedTransactionIds: string[];
}

function normalizeValue(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[*#/\\.,:_-]+/g, " ")
    .replace(/\d+/g, " ")
    .replace(/\b(?:inc|llc|ltd|corp|company|bill|payment|debit|credit|card|purchase|online|marketplace|mktp|www|usa|us|ca|com)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMerchantName(input: string) {
  const normalized = normalizeValue(input);

  if (normalized.includes("spotify")) return "spotify";
  if (normalized.includes("youtube")) return "youtube premium";
  if (normalized.includes("apple music")) return "apple music";
  if (normalized.includes("hulu")) return "hulu";
  if (normalized === "max" || normalized.includes("hbo max") || normalized.startsWith("max ")) return "max";
  if (normalized.includes("copilot")) return "github copilot";
  if (normalized.includes("github")) return "github";
  if (normalized.includes("microsoft 365") || normalized.includes("office 365")) return "microsoft 365";
  if (normalized.includes("msft")) return "microsoft 365";
  if (normalized.includes("apple")) return "apple";
  if (normalized.includes("notion")) return "notion";
  if (normalized.includes("canva")) return "canva";
  if (normalized.includes("adobe")) return "adobe";
  if (normalized.includes("amazon prime") || normalized.includes("amzn prime")) return "amazon prime";
  if (normalized.includes("amazon") || normalized.includes("amzn")) return "amazon";
  if (normalized.includes("netflix")) return "netflix";

  return normalized;
}

function toDisplayName(normalizedMerchant: string) {
  return normalizedMerchant
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTransactionMerchantName(transaction: StudentDiscountTransaction) {
  return transaction.merchantName ?? transaction.name ?? "";
}

function getTransactionDate(transaction: StudentDiscountTransaction) {
  return transaction.date ?? transaction.occurredOn ?? "";
}

function getTransactionSourceType(transaction: StudentDiscountTransaction) {
  return transaction.sourceType ?? "transaction";
}

function daysBetween(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const milliseconds = endDate.getTime() - startDate.getTime();
  return Math.round(milliseconds / (1000 * 60 * 60 * 24));
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function convertAmount(amount: number, fromCurrency = "USD", toCurrency = "USD") {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const fromRate = EXCHANGE_RATES[fromCurrency];
  const toRate = EXCHANGE_RATES[toCurrency];

  if (!fromRate || !toRate) {
    return amount;
  }

  const inUsd = amount / fromRate;
  return inUsd * toRate;
}

function resolveRegion(country?: string | null) {
  if (!country) {
    return "US";
  }

  const normalized = country.trim().toUpperCase();
  if (normalized === "CANADA") return "CA";
  if (normalized === "UNITED STATES") return "US";
  if (normalized.length === 2) return normalized;
  return "US";
}

function detectCadence(
  transactions: Array<StudentDiscountTransaction & { transactionDate: string }>,
): "monthly" | "yearly" | null {
  const sourceType = getTransactionSourceType(transactions[0] ?? {});
  if (sourceType === "subscription") {
    return "monthly";
  }

  const recurringHint = transactions.find(
    (transaction) =>
      transaction.isRecurring &&
      (transaction.recurringFrequency === "monthly" || transaction.recurringFrequency === "yearly"),
  );

  if (recurringHint?.recurringFrequency === "monthly" || recurringHint?.recurringFrequency === "yearly") {
    return recurringHint.recurringFrequency;
  }

  if (transactions.length < 2) {
    return null;
  }

  const gaps = transactions
    .slice(1)
    .map((transaction, index) => daysBetween(transactions[index].transactionDate, transaction.transactionDate))
    .filter((gap) => gap > 0);

  if (gaps.length === 0) {
    return null;
  }

  const avgGap = average(gaps);
  if (avgGap >= MONTHLY_GAP_MIN && avgGap <= MONTHLY_GAP_MAX) return "monthly";
  if (avgGap >= YEARLY_GAP_MIN && avgGap <= YEARLY_GAP_MAX) return "yearly";
  return null;
}

function isAmountConsistent(transactions: StudentDiscountTransaction[], displayCurrency: string) {
  const sourceType = getTransactionSourceType(transactions[0] ?? {});
  if (sourceType === "subscription") {
    return true;
  }

  if (transactions.length < 2) {
    return Boolean(transactions[0]?.isRecurring);
  }

  const convertedAmounts = transactions.map((transaction) =>
    convertAmount(transaction.amount, transaction.currency ?? displayCurrency, displayCurrency),
  );
  const avgAmount = average(convertedAmounts);
  if (avgAmount === 0) {
    return false;
  }

  return convertedAmounts.every((amount) => Math.abs(amount - avgAmount) <= Math.max(avgAmount * 0.18, 2));
}

function scoreCatalogMatch(
  normalizedMerchant: string,
  offer: StudentDiscountCatalogEntry,
) {
  const normalizedAliases = offer.aliases.map((alias) => normalizeMerchantName(alias));
  const matchedAlias = normalizedAliases.find(
    (alias) =>
      normalizedMerchant === alias ||
      normalizedMerchant.includes(alias) ||
      alias.includes(normalizedMerchant),
  );

  if (!matchedAlias) {
    return null;
  }

  return {
    offer,
    confidence: GENERIC_MATCH_TERMS.has(matchedAlias) ? ("possible" as const) : ("high" as const),
    score: normalizedMerchant === matchedAlias ? 3 : normalizedMerchant.includes(matchedAlias) ? 2 : 1,
  };
}

function pickCatalogMatch(normalizedMerchant: string, country?: string | null) {
  const region = resolveRegion(country);
  const candidates = STUDENT_DISCOUNT_CATALOG_SEED.filter(
    (offer) => offer.isActive && offer.region === region,
  )
    .map((offer) => scoreCatalogMatch(normalizedMerchant, offer))
    .filter((match): match is NonNullable<typeof match> => Boolean(match))
    .sort((left, right) => right.score - left.score);

  return candidates[0] ?? null;
}

export function detectStudentDiscountOpportunities({
  transactions,
  country,
  displayCurrency = "USD",
}: StudentDiscountDetectorInput): StudentDiscountOpportunity[] {
  const expenseTransactions = transactions
    .filter((transaction) => (transaction.type ?? "expense") === "expense")
    .map((transaction) => ({
      ...transaction,
      transactionDate: getTransactionDate(transaction),
      rawMerchantName: getTransactionMerchantName(transaction),
      amount: Math.abs(transaction.amount),
    }))
    .filter((transaction) => transaction.transactionDate && transaction.rawMerchantName);

  const groupedByMerchant = expenseTransactions.reduce<
    Map<string, Array<typeof expenseTransactions[number]>>
  >((groups, transaction) => {
    const normalizedMerchant = normalizeMerchantName(transaction.rawMerchantName);
    if (!normalizedMerchant) {
      return groups;
    }

    const existing = groups.get(normalizedMerchant) ?? [];
    existing.push(transaction);
    groups.set(normalizedMerchant, existing);
    return groups;
  }, new Map());

  return Array.from(groupedByMerchant.entries())
    .map(([normalizedMerchant, merchantTransactions]) => {
      const sortedTransactions = [...merchantTransactions].sort((left, right) =>
        left.transactionDate.localeCompare(right.transactionDate),
      );
      const cadence = detectCadence(sortedTransactions);

      if (!cadence || !isAmountConsistent(sortedTransactions, displayCurrency)) {
        return null;
      }

      const match = pickCatalogMatch(normalizedMerchant, country);
      if (!match) {
        return null;
      }

      const convertedAmounts = sortedTransactions.map((transaction) =>
        convertAmount(transaction.amount, transaction.currency ?? displayCurrency, displayCurrency),
      );
      const averageCharge = average(convertedAmounts);
      const currentMonthlySpend =
        cadence === "yearly" ? averageCharge / 12 : averageCharge;
      const regularPriceMonthly = convertAmount(
        match.offer.regularPriceMonthly,
        match.offer.currency,
        displayCurrency,
      );
      const studentPriceMonthly = convertAmount(
        match.offer.studentPriceMonthly,
        match.offer.currency,
        displayCurrency,
      );
      const estimatedMonthlySavings = Math.max(currentMonthlySpend - studentPriceMonthly, 0);

      if (estimatedMonthlySavings <= 0) {
        return null;
      }

      return {
        serviceId: match.offer.serviceId,
        serviceName: match.offer.serviceName,
        normalizedMerchant,
        matchConfidence: match.confidence,
        currentMonthlySpend,
        currentBillingAmount: averageCharge,
        currentBillingCadence: cadence,
        regularPriceMonthly,
        studentPriceMonthly,
        estimatedMonthlySavings,
        estimatedYearlySavings: estimatedMonthlySavings * 12,
        currency: displayCurrency,
        region: match.offer.region,
        offerUrl: match.offer.offerUrl,
        verificationMethod: match.offer.verificationMethod,
        lastChecked: match.offer.lastChecked,
        detectedTransactionIds: sortedTransactions.map((transaction) => transaction.id),
      } satisfies StudentDiscountOpportunity;
    })
    .filter((opportunity): opportunity is StudentDiscountOpportunity => Boolean(opportunity))
    .sort((left, right) => right.estimatedYearlySavings - left.estimatedYearlySavings);
}

export function detectRecurringSubscriptionCandidates({
  transactions,
  displayCurrency = "USD",
}: Pick<StudentDiscountDetectorInput, "transactions" | "displayCurrency">): RecurringSubscriptionCandidate[] {
  const expenseTransactions = transactions
    .filter((transaction) => (transaction.type ?? "expense") === "expense")
    .map((transaction) => ({
      ...transaction,
      transactionDate: getTransactionDate(transaction),
      rawMerchantName: getTransactionMerchantName(transaction),
      amount: Math.abs(transaction.amount),
    }))
    .filter((transaction) => transaction.transactionDate && transaction.rawMerchantName);

  const groupedByMerchant = expenseTransactions.reduce<
    Map<string, Array<typeof expenseTransactions[number]>>
  >((groups, transaction) => {
    const normalizedMerchant = normalizeMerchantName(transaction.rawMerchantName);
    if (!normalizedMerchant) {
      return groups;
    }

    const existing = groups.get(normalizedMerchant) ?? [];
    existing.push(transaction);
    groups.set(normalizedMerchant, existing);
    return groups;
  }, new Map());

  return Array.from(groupedByMerchant.entries())
    .map(([normalizedMerchant, merchantTransactions]) => {
      const sortedTransactions = [...merchantTransactions].sort((left, right) =>
        left.transactionDate.localeCompare(right.transactionDate),
      );
      const cadence = detectCadence(sortedTransactions);

      if (!cadence || !isAmountConsistent(sortedTransactions, displayCurrency)) {
        return null;
      }

      const convertedAmounts = sortedTransactions.map((transaction) =>
        convertAmount(transaction.amount, transaction.currency ?? displayCurrency, displayCurrency),
      );
      const averageCharge = average(convertedAmounts);

      return {
        normalizedMerchant,
        displayName: toDisplayName(normalizedMerchant),
        currentMonthlySpend: cadence === "yearly" ? averageCharge / 12 : averageCharge,
        currentBillingAmount: averageCharge,
        currentBillingCadence: cadence,
        currency: displayCurrency,
        lastChargeDate: sortedTransactions[sortedTransactions.length - 1]?.transactionDate ?? "",
        detectedTransactionIds: sortedTransactions.map((transaction) => transaction.id),
      } satisfies RecurringSubscriptionCandidate;
    })
    .filter((candidate): candidate is RecurringSubscriptionCandidate => Boolean(candidate))
    .sort((left, right) => right.currentMonthlySpend - left.currentMonthlySpend);
}
