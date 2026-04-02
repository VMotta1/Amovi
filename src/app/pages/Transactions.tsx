import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Filter,
  Search,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  X,
  ChevronDown,
  Download,
  Edit2,
  Check,
  Repeat,
  Trash2,
} from "lucide-react";
import DateFilter from "../components/DateFilter";
import { useUserCurrency } from "../hooks/useUserCurrency";
import { formatCurrency, formatCurrencyWithCode } from "../lib/currency";
import {
  formatTransactionDate,
  getCachedTransactions,
  getTransactionAmountInCurrency,
  listTransactionOccurrencesInInterval,
  listTransactions,
  parseTransactionDate,
  removeTransaction,
  updateTransaction,
} from "../lib/transactions";
import { useAuth } from "../providers/AuthProvider";
import { useI18n } from "../providers/I18nProvider";
import type { Transaction } from "../types/transactions";

interface TransactionListItem {
  id: string;
  occurredOn: string;
  transaction: Transaction;
}
import { getCategoryIcon } from "../lib/categoryIcons";
import { usePlaidData, plaidToTransaction } from "../hooks/usePlaidData";

const PLAID_OVERRIDES_KEY = "bambu_plaid_tx_overrides";
const PLAID_HIDDEN_KEY = "bambu_plaid_tx_hidden";

function getPlaidOverrides(): Record<string, { name?: string; category?: string; amount?: number }> {
  try { return JSON.parse(localStorage.getItem(PLAID_OVERRIDES_KEY) ?? "{}"); } catch { return {}; }
}
function savePlaidOverride(id: string, overrides: { name?: string; category?: string; amount?: number }) {
  const existing = getPlaidOverrides();
  localStorage.setItem(PLAID_OVERRIDES_KEY, JSON.stringify({ ...existing, [id]: overrides }));
}
function getPlaidHidden(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(PLAID_HIDDEN_KEY) ?? "[]") as string[]); } catch { return new Set(); }
}
function addPlaidHidden(id: string) {
  const hidden = getPlaidHidden();
  hidden.add(id);
  localStorage.setItem(PLAID_HIDDEN_KEY, JSON.stringify([...hidden]));
}

export default function Transactions() {
  const { user } = useAuth();
  const { t, localizeCategory, localizeFrequency, language } = useI18n();
  const currency = useUserCurrency();
  const [supabaseTxns, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<
    "all" | "income" | "expense"
  >("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [sortOption, setSortOption] = useState<string>("date_desc");
  const [showRecurringOnly, setShowRecurringOnly] = useState(false);

  const { allTransactions: plaidRawTxns } = usePlaidData();
  const [plaidOverridesVersion, setPlaidOverridesVersion] = useState(0);

  const allTransactions = useMemo(() => {
    if (!user || plaidRawTxns.length === 0) return supabaseTxns;
    const overrides = getPlaidOverrides();
    const hidden = getPlaidHidden();
    const plaidConverted = plaidRawTxns
      .map((t) => plaidToTransaction(t, user.id))
      .filter((t) => !hidden.has(t.id))
      .map((t) => {
        const override = overrides[t.id];
        if (!override) return t;
        return {
          ...t,
          ...(override.name !== undefined && { name: override.name }),
          ...(override.category !== undefined && { category: override.category }),
          ...(override.amount !== undefined && { amount: override.amount, originalAmount: override.amount }),
        };
      });
    const plaidIds = new Set(plaidConverted.map((t) => t.id));
    const supabaseOnly = supabaseTxns.filter((t) => !plaidIds.has(t.id));
    return [...plaidConverted, ...supabaseOnly].sort(
      (a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime(),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseTxns, plaidRawTxns, user, plaidOverridesVersion]);

  const categories = [
    "Food",
    "Books",
    "Transport",
    "Entertainment",
    "Job",
    "Scholarship",
    "Gift",
    "Other",
  ];

  useEffect(() => {
    if (!user) {
      setAllTransactions((prev) => {
        if (prev.length > 0) return prev;
        return [
          {
            id: "1",
            name: "Coffee Shop",
            type: "expense",
            category: "Food",
            amount: 4.5,
            originalAmount: 4.5,
            currency: "USD",
            occurredOn: new Date().toISOString().split("T")[0],
            isRecurring: false,
            recurringFrequency: null,
            userId: "test-user",
            recurringActive: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: "2",
            name: "Book Purchase",
            type: "expense",
            category: "Books",
            amount: 15.0,
            originalAmount: 15.0,
            currency: "USD",
            occurredOn: new Date(Date.now() - 86400000 * 3)
              .toISOString()
              .split("T")[0],
            isRecurring: false,
            recurringFrequency: null,
            userId: "test-user",
            recurringActive: false,
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          },
          {
            id: "3",
            name: "Part-time Job",
            type: "income",
            category: "Job",
            amount: 200.0,
            originalAmount: 200.0,
            currency: "USD",
            occurredOn: new Date(Date.now() - 86400000 * 7)
              .toISOString()
              .split("T")[0],
            isRecurring: false,
            recurringFrequency: null,
            userId: "test-user",
            recurringActive: false,
            createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          },
          {
            id: "4",
            name: "Bus Pass",
            type: "expense",
            category: "Transport",
            amount: 30.0,
            originalAmount: 30.0,
            currency: "USD",
            occurredOn: new Date(Date.now() - 86400000 * 10)
              .toISOString()
              .split("T")[0],
            isRecurring: true,
            recurringFrequency: "monthly",
            userId: "test-user",
            recurringActive: true,
            createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
          },
          {
            id: "5",
            name: "Scholarship",
            type: "income",
            category: "Scholarship",
            amount: 500.0,
            originalAmount: 500.0,
            currency: "USD",
            occurredOn: new Date(Date.now() - 86400000 * 15)
              .toISOString()
              .split("T")[0],
            isRecurring: false,
            recurringFrequency: null,
            userId: "test-user",
            recurringActive: false,
            createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
          },
        ];
      });
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const cachedTransactions = getCachedTransactions(user.id);

    if (cachedTransactions) {
      setAllTransactions(cachedTransactions);
      setIsLoading(false);
    }

    const loadTransactions = async () => {
      setIsLoading(!cachedTransactions);

      try {
        const data = await listTransactions(user.id);
        if (isMounted) {
          setAllTransactions(data);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!cachedTransactions) {
      loadTransactions();
    }

    const handleTransactionsChanged = () => {
      loadTransactions();
    };

    window.addEventListener("transactionsChanged", handleTransactionsChanged);

    return () => {
      isMounted = false;
      window.removeEventListener(
        "transactionsChanged",
        handleTransactionsChanged
      );
    };
  }, [user]);

  const transactionItems = useMemo(() => {
    const today = new Date();
    const rangeStart =
      selectedDateRange === "week"
        ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)
        : selectedDateRange === "month"
          ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)
          : selectedDateRange === "quarter"
            ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90)
            : selectedDate
              ? new Date(selectedDate)
              : undefined;
    const rangeEnd = selectedDate ? new Date(selectedDate) : today;

    return allTransactions.flatMap((transaction) => {
      if (rangeStart) {
        return listTransactionOccurrencesInInterval(transaction, rangeStart, rangeEnd).map((occurrence) => ({
          id: occurrence.id,
          occurredOn: occurrence.occurredOn,
          transaction: occurrence.transaction,
        }));
      }

      if (transaction.isRecurring && transaction.recurringActive && transaction.recurringFrequency) {
        return listTransactionOccurrencesInInterval(transaction, parseTransactionDate(transaction.occurredOn), today).map(
          (occurrence) => ({
            id: occurrence.id,
            occurredOn: occurrence.occurredOn,
            transaction: occurrence.transaction,
          }),
        );
      }

      return [
        {
          id: `${transaction.id}:${transaction.occurredOn}`,
          occurredOn: transaction.occurredOn,
          transaction,
        },
      ];
    });
  }, [allTransactions, selectedDate, selectedDateRange]);

  const filteredTransactions = useMemo(
    () =>
      transactionItems.filter(({ transaction, occurredOn }) => {
        if (showRecurringOnly && !transaction.isRecurring) {
          return false;
        }

        if (
          searchQuery &&
          !transaction.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }

        if (selectedType !== "all" && transaction.type !== selectedType) {
          return false;
        }

        if (
          selectedCategory !== "all" &&
          transaction.category !== selectedCategory
        ) {
          return false;
        }

        const convertedAmount = getTransactionAmountInCurrency(
          transaction,
          currency
        );

        if (minAmount && convertedAmount < parseFloat(minAmount)) {
          return false;
        }

        if (maxAmount && convertedAmount > parseFloat(maxAmount)) {
          return false;
        }

        if (selectedDateRange !== "all") {
          const transactionDate = parseTransactionDate(occurredOn);
          const today = new Date();
          const daysDiff = Math.floor(
            (today.getTime() - transactionDate.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          if (selectedDateRange === "week" && daysDiff > 7) return false;
          if (selectedDateRange === "month" && daysDiff > 30) return false;
          if (selectedDateRange === "quarter" && daysDiff > 90) return false;
        }

        if (selectedDate) {
          const transactionDate = parseTransactionDate(occurredOn);
          const selectedDateObj = new Date(selectedDate);
          if (
            transactionDate.toDateString() !== selectedDateObj.toDateString()
          ) {
            return false;
          }
        }

        return true;
      }),
    [
      maxAmount,
      minAmount,
      searchQuery,
      selectedCategory,
      selectedDate,
      selectedDateRange,
      selectedType,
      showRecurringOnly,
      transactionItems,
      currency,
    ]
  );

  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    switch (sortOption) {
      case "date_asc":
        sorted.sort(
          (a, b) =>
            new Date(a.occurredOn).getTime() - new Date(b.occurredOn).getTime()
        );
        break;
      case "date_desc":
        sorted.sort(
          (a, b) =>
            new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime()
        );
        break;
      case "amount_asc":
        sorted.sort(
          (a, b) =>
            getTransactionAmountInCurrency(a.transaction, currency) -
            getTransactionAmountInCurrency(b.transaction, currency)
        );
        break;
      case "amount_desc":
        sorted.sort(
          (a, b) =>
            getTransactionAmountInCurrency(b.transaction, currency) -
            getTransactionAmountInCurrency(a.transaction, currency)
        );
        break;
      case "name_asc":
        sorted.sort((a, b) => a.transaction.name.localeCompare(b.transaction.name));
        break;
      case "name_desc":
        sorted.sort((a, b) => b.transaction.name.localeCompare(a.transaction.name));
        break;
      default:
        break;
    }
    return sorted;
  }, [filteredTransactions, sortOption, currency]);

  const totalIncome = sortedTransactions
    .filter(({ transaction }) => transaction.type === "income")
    .reduce(
      (sum, { transaction }) => sum + getTransactionAmountInCurrency(transaction, currency),
      0
    );

  const totalExpenses = sortedTransactions
    .filter(({ transaction }) => transaction.type === "expense")
    .reduce(
      (sum, { transaction }) => sum + getTransactionAmountInCurrency(transaction, currency),
      0
    );

  const clearFilters = () => {
    setSelectedType("all");
    setSelectedCategory("all");
    setSelectedDateRange("all");
    setMinAmount("");
    setMaxAmount("");
    setSearchQuery("");
    setSelectedDate(undefined);
    setShowRecurringOnly(false);
  };

  const hasActiveFilters =
    showRecurringOnly ||
    selectedType !== "all" ||
    selectedCategory !== "all" ||
    selectedDateRange !== "all" ||
    minAmount !== "" ||
    maxAmount !== "" ||
    searchQuery !== "" ||
    selectedDate !== undefined;

  const handleExportCSV = () => {
    const csvData = [
      [
        "Name",
        "Amount",
        "Display Currency",
        "Original Amount",
        "Original Currency",
        "Category",
        "Type",
        "Date",
      ],
      ...sortedTransactions.map(({ transaction, occurredOn }) => [
        transaction.name,
        getTransactionAmountInCurrency(transaction, currency).toString(),
        currency,
        transaction.originalAmount.toString(),
        transaction.currency,
        transaction.category,
        transaction.type,
        occurredOn,
      ]),
    ];
    const csvContent = csvData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pandabudget-transactions-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const jsonData = {
      exportDate: new Date().toISOString(),
      totalIncome,
      totalExpenses,
      transactions: sortedTransactions.map(({ transaction, occurredOn }) => ({
        ...transaction,
        occurredOn,
      })),
    };
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pandabudget-data-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const startEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditName(transaction.name);
    setEditAmount(transaction.originalAmount.toString());
    setEditCategory(transaction.category);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditAmount("");
    setEditCategory("");
  };

  const saveEdit = async (id: string) => {
    if (!user) {
      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7644/ingest/736cd269-5120-42ad-bdbd-54fcf1e8f8bf',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6ac9b5'},body:JSON.stringify({sessionId:'6ac9b5',location:'Transactions.tsx:saveEdit',message:'saveEdit called',data:{id,isPlaid:id.startsWith('plaid_'),editName,editCategory},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (id.startsWith("plaid_")) {
      const parsedAmount = editAmount !== "" ? parseFloat(editAmount) : undefined;
      savePlaidOverride(id, {
        name: editName || undefined,
        category: editCategory || undefined,
        amount: parsedAmount && !isNaN(parsedAmount) ? parsedAmount : undefined,
      });
      setPlaidOverridesVersion((v) => v + 1);
      cancelEdit();
      return;
    }

    const updated = await updateTransaction(user.id, id, {
      name: editName,
      amount:
        editAmount !== ""
          ? getTransactionAmountInCurrency(
              {
                ...allTransactions.find(
                  (transaction) => transaction.id === id
                )!,
                originalAmount: parseFloat(editAmount),
              },
              currency
            )
          : undefined,
      originalAmount: parseFloat(editAmount) || undefined,
      category: editCategory,
    });

    setAllTransactions(
      supabaseTxns.map((transaction) =>
        transaction.id === id ? updated : transaction
      )
    );
    cancelEdit();
    window.dispatchEvent(new Event("transactionsChanged"));
  };

  const deleteTransaction = async (id: string) => {
    if (!user) {
      return;
    }

    if (id.startsWith("plaid_")) {
      addPlaidHidden(id);
      setPlaidOverridesVersion((v) => v + 1);
      setDeleteConfirmId(null);
      return;
    }

    await removeTransaction(user.id, id);
    setAllTransactions(
      supabaseTxns.filter((transaction) => transaction.id !== id)
    );
    setDeleteConfirmId(null);
    window.dispatchEvent(new Event("transactionsChanged"));
  };

  return (
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:gap-4 mb-6">
          <div className="relative flex-1 mb-3 md:mb-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("transactions.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-input-background pl-11 pr-4 py-3 rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              title="Sort by"
            >
              <option value="date_desc">Newest</option>
              <option value="date_asc">Oldest</option>
              <option value="amount_desc">Amount (high)</option>
              <option value="amount_asc">Amount (low)</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
                <Download className="size-5" />
                <span>{t("transactions.exportData")}</span>
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={handleExportCSV}
                  className="w-full px-4 py-3 text-left hover:bg-secondary rounded-t-lg transition-colors flex items-center gap-2"
                >
                  <Download className="size-4" />
                  {t("transactions.exportCsv")}
                </button>
                <button
                  onClick={handleExportJSON}
                  className="w-full px-4 py-3 text-left hover:bg-secondary rounded-b-lg transition-colors flex items-center gap-2"
                >
                  <Download className="size-4" />
                  {t("transactions.exportJson")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recurring Transactions toggle and Filters button on the same line */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-6">
          <div className="flex items-center gap-2 flex-1">
            <button
              type="button"
              onClick={() => setShowRecurringOnly((value) => !value)}
              className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                showRecurringOnly
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:bg-secondary"
              }`}
            >
              <Repeat className={`size-5 ${showRecurringOnly ? "text-primary-foreground" : "text-primary"}`} />
              <span>
                {showRecurringOnly
                  ? `${t("common.all")} ${t("transactions.transactionsSuffix")}`
                  : t("transactions.recurringTransactions")}
              </span>
            </button>
          </div>
          <div className="flex justify-end flex-1">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent transition-colors"
              aria-expanded={showFilters}
              type="button"
            >
              <Filter className="size-4" />
              {t("transactions.filters")}
              <ChevronDown
                className={`size-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
              {hasActiveFilters && (
                <span className="ml-1 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                  {t("transactions.active")}
                </span>
              )}
            </button>
          </div>
        </div>

        {showFilters && (
          <div
            id="filters-panel"
            className="bg-card border border-border rounded-xl shadow-sm mb-6 p-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* ── Category ── */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-3">
                  {t("transactions.category")}
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                >
                  <option value="all">{t("transactions.allCategories")}</option>
                  {Array.from(new Set(allTransactions.map((t) => t.category)))
                    .sort()
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {localizeCategory(cat) || cat}
                      </option>
                    ))}
                </select>
              </div>

              {/* ── Date Range ── */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-3">
                  <Calendar className="size-4" />
                  {t("transactions.dateRange")}
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { value: "all", label: t("transactions.allTime") },
                    { value: "week", label: t("transactions.lastWeek") },
                    { value: "month", label: t("transactions.lastMonth") },
                    { value: "quarter", label: t("transactions.lastQuarter") },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => { setSelectedDateRange(value); setSelectedDate(undefined); }}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        selectedDateRange === value && !selectedDate
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <DateFilter
                  selectedDate={selectedDate}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setSelectedDateRange("all");
                  }}
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate(undefined)}
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <X className="size-3" /> Clear date
                  </button>
                )}
              </div>

              {/* ── Amount Range ── */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-3">
                  <DollarSign className="size-4" />
                  {t("transactions.amountRange")}
                </label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Min</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="w-full px-3 py-2.5 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Max</label>
                    <input
                      type="number"
                      placeholder="∞"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="w-full px-3 py-2.5 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-5 pt-4 border-t border-border flex justify-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors"
                >
                  <X className="size-4" />
                  {t("transactions.clearAllFilters")}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground mb-1">
              {t("transactions.total")}
            </div>
            <div className="text-2xl">{sortedTransactions.length}</div>
            <div className="text-xs text-muted-foreground">
              {t("transactions.transactionsSuffix")}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingUp className="size-3" />
              {t("home.income")}
            </div>
            <div className="text-2xl text-primary">
              {formatCurrency(totalIncome, currency)}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingDown className="size-3" />
              {t("home.expenses")}
            </div>
            <div className="text-2xl text-destructive">
              {formatCurrency(totalExpenses, currency)}
            </div>
          </div>
        </div>

        {/* Type filter button group centered above transactions list */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedType("all")}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                selectedType === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t("common.all")}
            </button>
            <button
              onClick={() => setSelectedType("income")}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                selectedType === "income"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t("home.income")}
            </button>
            <button
              onClick={() => setSelectedType("expense")}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                selectedType === "expense"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-muted text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t("addTransaction.expense")}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {showRecurringOnly ? (
            <div className="text-sm text-muted-foreground">
              {t("transactions.recurringTransactions")}
            </div>
          ) : null}
          {isLoading ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <h3 className="mb-2">{t("transactions.loadingTitle")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("transactions.loadingDescription")}
              </p>
            </div>
          ) : sortedTransactions.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <ShoppingCart className="size-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="mb-2">{t("transactions.emptyTitle")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("transactions.emptyDescription")}
              </p>
            </div>
          ) : (
            sortedTransactions.map(({ id, occurredOn, transaction }) => (
              <div
                key={id}
                className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {editingId === transaction.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          transaction.type === "income"
                            ? "bg-primary/10 text-primary"
                            : "bg-accent text-accent-foreground"
                        }`}
                      >
                        {getCategoryIcon(
                          transaction.category,
                          transaction.type
                        )}
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder={t("transactions.name")}
                          className="px-3 py-2 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          placeholder={t("transactions.amount")}
                          className="px-3 py-2 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="px-3 py-2 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">
                            {t("transactions.selectCategory")}
                          </option>
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {localizeCategory(
                                category.charAt(0).toUpperCase() +
                                  category.slice(1).toLowerCase()
                              )}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveEdit(transaction.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                      >
                        <Check className="size-4" />
                        {t("transactions.save")}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-secondary transition-colors"
                      >
                        <X className="size-4" />
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                ) : deleteConfirmId === transaction.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Trash2 className="size-6 text-destructive" />
                      <div>
                        <div className="font-medium text-destructive">
                          {t("transactions.deletePrompt")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("transactions.deleteDescription")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => deleteTransaction(transaction.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity"
                      >
                        <Trash2 className="size-4" />
                        {t("common.delete")}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-secondary transition-colors"
                      >
                        <X className="size-4" />
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          transaction.type === "income"
                            ? "bg-primary/10 text-primary"
                            : "bg-accent text-accent-foreground"
                        }`}
                      >
                        {getCategoryIcon(
                          transaction.category,
                          transaction.type
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {transaction.name}
                          </span>
                          {transaction.isRecurring ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full border border-primary/20"
                            >
                              <Repeat className="size-3" />
                              {t("transactions.recurringTitle", {
                                frequency:
                                  transaction.recurringFrequency &&
                                  [
                                    "daily",
                                    "weekly",
                                    "biweekly",
                                    "monthly",
                                    "yearly",
                                  ].includes(transaction.recurringFrequency)
                                    ? localizeFrequency(
                                        transaction.recurringFrequency as any
                                      )
                                    : transaction.recurringFrequency
                                    ? transaction.recurringFrequency
                                        .charAt(0)
                                        .toUpperCase() +
                                      transaction.recurringFrequency.slice(1)
                                    : "Recurring",
                              })}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {localizeCategory(
                            transaction.category.charAt(0).toUpperCase() +
                              transaction.category.slice(1).toLowerCase()
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatTransactionDate(occurredOn)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("common.paidIn", {
                            amount: formatCurrencyWithCode(
                              transaction.originalAmount,
                              transaction.currency
                            ),
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={
                          transaction.type === "income"
                            ? "text-lg text-primary"
                            : "text-lg text-foreground"
                        }
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(
                          getTransactionAmountInCurrency(transaction, currency),
                          currency
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(transaction)}
                          className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-secondary transition-colors"
                          title={t("transactions.editTitle")}
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(transaction.id)}
                          className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                          title={t("transactions.deleteTitle")}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {sortedTransactions.length > 0 ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t("transactions.showingCount", {
              shown: sortedTransactions.length,
              total: transactionItems.length,
            })}
          </div>
        ) : null}
      </div>
  );
}
