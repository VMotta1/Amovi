import { useEffect, useMemo, useState } from "react";
import {
  Repeat,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Calendar,
  TrendingUp,
  ShoppingCart,
} from "lucide-react";
import { useUserCurrency } from "../hooks/useUserCurrency";
import { formatCurrency, formatCurrencyWithCode } from "../lib/currency";
import {
  createTransaction,
  formatTransactionDate,
  getCachedTransactions,
  getTransactionAmountInCurrency,
  listTransactions,
  removeTransaction,
  updateTransaction,
} from "../lib/transactions";
import { useAuth } from "../providers/AuthProvider";
import { useI18n } from "../providers/I18nProvider";
import type { Transaction } from "../types/transactions";

const expenseCategories = ["Housing", "Food", "Books", "Transport", "Entertainment", "Shopping", "Other"];
const incomeCategories = ["Job", "Scholarship", "Allowance", "Gift", "Other"];

export default function RecurringTransactions() {
  const { user } = useAuth();
  const { t, localizeCategory, localizeFrequency } = useI18n();
  const currency = useUserCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingRecurring, setAddingRecurring] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    category: "",
    type: "expense" as "income" | "expense",
    frequency: "monthly" as "daily" | "weekly" | "biweekly" | "monthly" | "yearly",
  });

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const cachedTransactions = getCachedTransactions(user.id);

    if (cachedTransactions) {
      setTransactions(cachedTransactions.filter((transaction) => transaction.isRecurring));
      setIsLoading(false);
    }

    const loadRecurring = async () => {
      setIsLoading(!cachedTransactions);
      try {
        const data = await listTransactions(user.id);
        if (isMounted) {
          setTransactions(data.filter((transaction) => transaction.isRecurring));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!cachedTransactions) {
      loadRecurring();
    }
    window.addEventListener("transactionsChanged", loadRecurring);

    return () => {
      isMounted = false;
      window.removeEventListener("transactionsChanged", loadRecurring);
    };
  }, [user]);

  const activeRecurring = useMemo(
    () => transactions.filter((transaction) => transaction.recurringActive),
    [transactions],
  );
  const inactiveRecurring = useMemo(
    () => transactions.filter((transaction) => !transaction.recurringActive),
    [transactions],
  );

  const resetForm = () => {
    setFormData({
      name: "",
      amount: "",
      category: "",
      type: "expense",
      frequency: "monthly",
    });
    setSubmitError("");
    setEditingId(null);
    setAddingRecurring(false);
  };

  const handleToggleActive = async (transaction: Transaction) => {
    if (!user) {
      return;
    }

    const updated = await updateTransaction(user.id, transaction.id, {
      recurringActive: !transaction.recurringActive,
    });
    setTransactions((current) => current.map((item) => (item.id === transaction.id ? updated : item)));
    window.dispatchEvent(new Event("transactionsChanged"));
    window.dispatchEvent(new Event("financialDataChanged"));
  };

  const handleDelete = async (transactionId: string) => {
    if (!user || !confirm(t("recurringPage.confirmDelete"))) {
      return;
    }

    await removeTransaction(user.id, transactionId);
    setTransactions((current) => current.filter((transaction) => transaction.id !== transactionId));
    window.dispatchEvent(new Event("transactionsChanged"));
    window.dispatchEvent(new Event("financialDataChanged"));
  };

  const handleSave = async () => {
    const resolvedName = formData.name.trim();
    const resolvedCategory = formData.category.trim();
    const parsedAmount = parseFloat(formData.amount);

    if (!user) {
      return;
    }

    if (!resolvedName || !resolvedCategory || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSubmitError(t("addTransaction.fillAllFields"));
      return;
    }

    setSubmitError("");

    try {
      if (editingId) {
        const existing = transactions.find((transaction) => transaction.id === editingId);
        if (!existing) {
          return;
        }

        const updated = await updateTransaction(user.id, editingId, {
          name: resolvedName,
          category: resolvedCategory,
          type: formData.type,
          recurringFrequency: formData.frequency,
          amount: parsedAmount,
          originalAmount: parsedAmount,
          currency,
        });
        setTransactions((current) => current.map((transaction) => (transaction.id === editingId ? updated : transaction)));
      } else {
        const created = await createTransaction(user.id, {
          name: resolvedName,
          amount: parsedAmount,
          originalAmount: parsedAmount,
          currency,
          category: resolvedCategory,
          occurredOn: new Date().toISOString().split("T")[0],
          type: formData.type,
          isRecurring: true,
          recurringActive: true,
          recurringFrequency: formData.frequency,
        });
        setTransactions((current) => [created, ...current]);
      }

      resetForm();
      window.dispatchEvent(new Event("transactionsChanged"));
      window.dispatchEvent(new Event("financialDataChanged"));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t("addTransaction.fillAllFields"));
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setFormData({
      name: transaction.name,
      amount: String(transaction.originalAmount),
      category: transaction.category,
      type: transaction.type,
      frequency: transaction.recurringFrequency ?? "monthly",
    });
    setSubmitError("");
    setEditingId(transaction.id);
    setAddingRecurring(true);
  };

  const renderCard = (transaction: Transaction, paused = false) => (
    <div key={transaction.id} className={`rounded-lg p-4 ${paused ? "bg-muted/50 opacity-60" : "bg-secondary"}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-medium">{transaction.name}</div>
          <div className="text-sm text-muted-foreground">
            {localizeCategory(transaction.category)} • {localizeFrequency(transaction.recurringFrequency ?? "monthly")}
          </div>
        </div>
        <div className={`text-lg ${transaction.type === "income" ? "text-primary" : "text-foreground"}`}>
          {transaction.type === "income" ? "+" : "-"}
          {formatCurrency(getTransactionAmountInCurrency(transaction, currency), currency)}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <Calendar className="size-3 inline mr-1" />
          {formatTransactionDate(transaction.occurredOn)} • {t("recurringPage.paidIn", { amount: formatCurrencyWithCode(transaction.originalAmount, transaction.currency) })}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(transaction)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Edit2 className="size-4" />
          </button>
          <button
            onClick={() => handleToggleActive(transaction)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${paused ? "bg-primary text-primary-foreground" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
          >
            {paused ? t("recurringPage.resume") : t("recurringPage.pause")}
          </button>
          <button
            onClick={() => handleDelete(transaction.id)}
            className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <button
          onClick={() => {
            resetForm();
            setAddingRecurring(true);
          }}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <Plus className="size-5" />
          {t("recurringPage.addRecurring")}
        </button>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <Repeat className="size-5 text-primary" />
            {t("recurringPage.activeRecurring", { count: activeRecurring.length })}
          </h3>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t("recurringPage.loading")}</div>
          ) : activeRecurring.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t("recurringPage.noActive")}</div>
          ) : (
            <div className="space-y-3">{activeRecurring.map((transaction) => renderCard(transaction))}</div>
          )}
        </div>

        {inactiveRecurring.length > 0 ? (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="mb-4 text-muted-foreground">{t("recurringPage.paused", { count: inactiveRecurring.length })}</h3>
            <div className="space-y-3">{inactiveRecurring.map((transaction) => renderCard(transaction, true))}</div>
          </div>
        ) : null}

        <div className="bg-secondary border border-border rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <h4 className="mb-2">{t("recurringPage.infoTitle")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("recurringPage.infoMessage")}
              </p>
            </div>
          </div>
        </div>

        {addingRecurring ? (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full">
              <div className="sticky top-0 bg-primary text-primary-foreground px-6 py-4 rounded-t-2xl flex items-center justify-between">
                <h2 className="text-white">{editingId ? t("recurringPage.editRecurring") : t("recurringPage.addRecurring")}</h2>
                <button onClick={resetForm} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                  <X className="size-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {submitError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {submitError}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitError("");
                      setFormData((current) => ({ ...current, type: "expense", category: "" }));
                    }}
                    className={`py-3 rounded-lg transition-all ${
                      formData.type === "expense" ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t("recurringPage.expense")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitError("");
                      setFormData((current) => ({ ...current, type: "income", category: "" }));
                    }}
                    className={`py-3 rounded-lg transition-all ${
                      formData.type === "income" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t("recurringPage.income")}
                  </button>
                </div>

                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((current) => ({ ...current, name: e.target.value }))}
                  placeholder={t("recurringPage.name")}
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />

                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData((current) => ({ ...current, amount: e.target.value }))}
                  placeholder={t("recurringPage.amountIn", { currency })}
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />

                <select
                  value={formData.category}
                  onChange={(e) => setFormData((current) => ({ ...current, category: e.target.value }))}
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{t("recurringPage.selectCategory")}</option>
                  {(formData.type === "expense" ? expenseCategories : incomeCategories).map((category) => (
                    <option key={category} value={category}>
                      {localizeCategory(category)}
                    </option>
                  ))}
                </select>

                <select
                  value={formData.frequency}
                  onChange={(e) =>
                    setFormData((current) => ({
                      ...current,
                      frequency: e.target.value as "daily" | "weekly" | "biweekly" | "monthly" | "yearly",
                    }))
                  }
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="daily">{localizeFrequency("daily")}</option>
                  <option value="weekly">{localizeFrequency("weekly")}</option>
                  <option value="biweekly">{localizeFrequency("biweekly")}</option>
                  <option value="monthly">{localizeFrequency("monthly")}</option>
                  <option value="yearly">{localizeFrequency("yearly")}</option>
                </select>

                <button
                  onClick={handleSave}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  {editingId ? <Check className="size-4" /> : <Plus className="size-4" />}
                  {editingId ? t("recurringPage.saveChanges") : t("recurringPage.addRecurring")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
  );
}
