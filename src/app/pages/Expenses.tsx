import { useEffect, useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
import { useUserCurrency } from "../hooks/useUserCurrency";
import { formatCurrency, formatCurrencyWithCode } from "../lib/currency";
import { formatTransactionDate, getCachedTransactions, getTransactionAmountInCurrency, listTransactions } from "../lib/transactions";
import { useAuth } from "../providers/AuthProvider";
import { useI18n } from "../providers/I18nProvider";
import type { Transaction } from "../types/transactions";
import { getCategoryIcon } from "../lib/categoryIcons";
import { usePlaidData, plaidToTransaction } from "../hooks/usePlaidData";

export default function Expenses() {
  const { user } = useAuth();
  const { t, localizeCategory } = useI18n();
  const currency = useUserCurrency();
  const [supabaseTxns, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { allTransactions: plaidRawTxns } = usePlaidData();

  const transactions = useMemo(() => {
    const supabaseExpenses = supabaseTxns; // already filtered to expenses below
    if (!user || plaidRawTxns.length === 0) return supabaseExpenses;
    const plaidExpenses = plaidRawTxns
      .filter((t) => t.amount > 0)
      .map((t) => plaidToTransaction(t, user.id));
    const plaidIds = new Set(plaidExpenses.map((t) => t.id));
    const supabaseOnly = supabaseExpenses.filter((t) => !plaidIds.has(t.id));
    return [...plaidExpenses, ...supabaseOnly].sort(
      (a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime(),
    );
  }, [supabaseTxns, plaidRawTxns, user]);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const cachedTransactions = getCachedTransactions(user.id);

    if (cachedTransactions) {
      setTransactions(cachedTransactions.filter((transaction) => transaction.type === "expense"));
      setIsLoading(false);
    }

    const loadExpenses = async () => {
      setIsLoading(!cachedTransactions);
      try {
        const data = await listTransactions(user.id);
        if (isMounted) {
          setTransactions(data.filter((transaction) => transaction.type === "expense"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!cachedTransactions) {
      loadExpenses();
    }
    window.addEventListener("transactionsChanged", loadExpenses);

    return () => {
      isMounted = false;
      window.removeEventListener("transactionsChanged", loadExpenses);
    };
  }, [user]);

  const filteredExpenses = useMemo(
    () =>
      transactions.filter((expense) =>
        expense.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery, transactions],
  );

  const totalExpenses = filteredExpenses.reduce(
    (sum, expense) => sum + getTransactionAmountInCurrency(expense, currency),
    0,
  );

  return (
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("expensesPage.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-input-background pl-11 pr-4 py-3 rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-sm text-muted-foreground">{t("expensesPage.totalExpenses")}</div>
            <div className="text-3xl text-foreground">{formatCurrency(totalExpenses, currency)}</div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg">
            <Filter className="size-4" />
            {t("expensesPage.items", { count: filteredExpenses.length })}
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
              {t("expensesPage.loading")}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
              {t("expensesPage.empty")}
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <div key={expense.id} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-accent-foreground">
                      {getCategoryIcon(expense.category)}
                    </div>
                    <div>
                      <div className="font-medium">{expense.name}</div>
                      <div className="text-sm text-muted-foreground">{localizeCategory(expense.category)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatTransactionDate(expense.occurredOn)} • {t("common.paidIn", {
                          amount: formatCurrencyWithCode(expense.originalAmount, expense.currency),
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-lg">-{formatCurrency(getTransactionAmountInCurrency(expense, currency), currency)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
  );
}
