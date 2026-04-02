import { useState, useEffect, useCallback } from "react";
import type { PlaidAccount, PlaidItem, PlaidTransaction } from "../types/plaid";
import type { Transaction } from "../types/transactions";
import { buildApiUrl, plaidApiAvailable } from "../lib/api";

export type { PlaidAccount, PlaidItem, PlaidTransaction };

export function formatCategoryName(raw: string): string {
  return raw.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Converts a Plaid transaction into the app's unified Transaction type so it
 * can be merged with Supabase-sourced transactions on any page.
 */
export function plaidToTransaction(t: PlaidTransaction, userId: string): Transaction {
  const isIncome = t.amount < 0;
  return {
    id: `plaid_${t.transaction_id}`,
    userId,
    name: t.merchant_name ?? t.name,
    amount: Math.abs(t.amount),
    currency: t.iso_currency_code ?? "CAD",
    originalAmount: Math.abs(t.amount),
    category: formatCategoryName(t.category),
    occurredOn: t.date,
    type: isIncome ? "income" : "expense",
    isRecurring: false,
    recurringActive: false,
    recurringFrequency: null,
    createdAt: t.date,
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  FOOD_AND_DRINK: "#2d6a4f",
  TRANSPORTATION: "#52b788",
  ENTERTAINMENT: "#74c69d",
  GENERAL_MERCHANDISE: "#40916c",
  GENERAL_SERVICES: "#b7e4c7",
  RENT_AND_UTILITIES: "#d8f3dc",
  MEDICAL: "#081c15",
  PERSONAL_CARE: "#95d5b2",
  EDUCATION: "#95d5b2",
  TRANSFER_IN: "#1b4332",
  TRANSFER_OUT: "#1b4332",
  INCOME: "#2d6a4f",
  LOAN_PAYMENTS: "#52b788",
  BANK_FEES: "#74c69d",
  TRAVEL: "#40916c",
  GOVERNMENT_AND_NON_PROFIT: "#b7e4c7",
  "Food and Drink": "#2d6a4f",
  "Travel": "#52b788",
  "Shops": "#40916c",
  "Transfer": "#1b4332",
  "Payment": "#1b4332",
  "Recreation": "#74c69d",
  "Service": "#b7e4c7",
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "#95d5b2";
}

export function usePlaidData() {
  const [plaidItems, setPlaidItems] = useState<PlaidItem[]>(() => {
    const saved = localStorage.getItem("plaidItems");
    return saved ? JSON.parse(saved) : [];
  });

  const [allTransactions, setAllTransactions] = useState<PlaidTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllTransactions = useCallback(async () => {
    if (!plaidApiAvailable || plaidItems.length === 0) {
      setAllTransactions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const allTxns: PlaidTransaction[] = [];

    for (const item of plaidItems) {
      try {
        const apiUrl = buildApiUrl(`/api/plaid/transactions/${item.item_id}`);
        if (!apiUrl) {
          break;
        }
        const res = await fetch(apiUrl);
        const data = await res.json();
        if (data.transactions) {
          allTxns.push(...data.transactions);
        }
      } catch {
        // Server might not be running -- will show empty state
      }
    }

    allTxns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAllTransactions(allTxns);
    setIsLoading(false);
  }, [plaidItems]);

  useEffect(() => {
    fetchAllTransactions();
  }, [fetchAllTransactions]);

  // Listen for changes to plaidItems from other pages (e.g., Settings)
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem("plaidItems");
      const items: PlaidItem[] = saved ? JSON.parse(saved) : [];
      setPlaidItems(items);
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("plaidItemsUpdated", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("plaidItemsUpdated", handleStorage);
    };
  }, []);

  const expenses = allTransactions.filter((t) => t.amount > 0);
  const income = allTransactions.filter((t) => t.amount < 0);

  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = income.reduce((s, t) => s + Math.abs(t.amount), 0);
  const balance = totalIncome - totalExpenses;

  const hasLinkedAccounts = plaidItems.length > 0;

  return {
    plaidItems,
    allTransactions,
    expenses,
    income,
    totalExpenses,
    totalIncome,
    balance,
    isLoading,
    error,
    hasLinkedAccounts,
    refresh: fetchAllTransactions,
  };
}
