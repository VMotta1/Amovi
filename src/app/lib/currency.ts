const DEFAULT_CURRENCY = "USD";
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.35,
  AUD: 1.52,
  JPY: 149.5,
  CNY: 7.24,
};

export function convertCurrency(
  amount: number,
  fromCurrency = DEFAULT_CURRENCY,
  toCurrency = DEFAULT_CURRENCY,
) {
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

export function formatCurrency(amount: number, currency = DEFAULT_CURRENCY) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatCurrencyWithCode(amount: number, currency = DEFAULT_CURRENCY) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "code",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
