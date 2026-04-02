import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  PiggyBank,
  ShoppingCart,
  Book,
  Utensils,
  Bus,
  Film,
  Calendar,
  CalendarDays,
  CalendarRange,
  Loader2,
  Home as HomeIcon,
  Briefcase,
  Heart,
  Scissors,
  GraduationCap,
  CreditCard,
  Landmark,
  Plane,
  Building,
  ChevronDown,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  eachMonthOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from "date-fns";
import { useUserCurrency } from "../hooks/useUserCurrency";
import { BRAND_LOGO_SRC } from "../lib/branding";
import { convertCurrency, formatCurrency, formatCurrencyWithCode } from "../lib/currency";
import {
  createGoalContribution,
  getCachedBudgetCategories,
  getCachedSavingsGoals,
  getBudgetAmountInCurrency,
  getSavingsGoalAmountsInCurrency,
  listBudgetCategories,
  listSavingsGoals,
} from "../lib/finance";
import {
  createTransaction,
  formatTransactionDate,
  getCachedTransactions,
  getTransactionAmountInCurrency,
  listTransactions,
  parseTransactionDate,
} from "../lib/transactions";
import { getCachedUserSettings, getUserSettings } from "../lib/settings";
import { useAuth } from "../providers/AuthProvider";
import { useI18n } from "../providers/I18nProvider";
import type { BudgetCategory, SavingsGoal } from "../types/finance";
import type { Transaction } from "../types/transactions";
import { getCategoryIcon } from "../lib/categoryIcons";
import { usePlaidData, plaidToTransaction } from "../hooks/usePlaidData";

const CHART_COLORS = ["#2d6a4f", "#52b788", "#74c69d", "#95d5b2", "#b7e4c7", "#40916c"];

export default function Home() {
  const { user } = useAuth();
  const { t, localizeCategory } = useI18n();
  const currency = useUserCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [userCountry, setUserCountry] = useState("US");
  const [isLoading, setIsLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<"week" | "month" | "year">("month");
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [expandedBudgetCategories, setExpandedBudgetCategories] = useState<Set<string>>(new Set());
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionNote, setContributionNote] = useState("");

  const { allTransactions: plaidRawTxns } = usePlaidData();

  // Merged list: Supabase transactions + Plaid transactions converted to the same shape,
  // deduplicated so re-renders don't create duplicates.
  const allTransactions = useMemo(() => {
    if (!user || plaidRawTxns.length === 0) return transactions;
    const plaidConverted = plaidRawTxns.map((t) => plaidToTransaction(t, user.id));
    const plaidIds = new Set(plaidConverted.map((t) => t.id));
    const supabaseOnly = transactions.filter((t) => !plaidIds.has(t.id));
    return [...plaidConverted, ...supabaseOnly].sort(
      (a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime(),
    );
  }, [transactions, plaidRawTxns, user]);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setGoals([]);
      setBudgetCategories([]);
      setUserCountry("US");
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const cachedTransactions = getCachedTransactions(user.id);
    const cachedGoals = getCachedSavingsGoals(user.id);
    const cachedBudgetData = getCachedBudgetCategories(user.id);
    const cachedSettings = getCachedUserSettings(user.id);

    if (cachedTransactions) setTransactions(cachedTransactions);
    if (cachedGoals) setGoals(cachedGoals);
    if (cachedBudgetData) setBudgetCategories(cachedBudgetData);
    if (cachedSettings) setUserCountry(cachedSettings.country ?? "US");
    if (cachedTransactions || cachedGoals || cachedBudgetData || cachedSettings) {
      setIsLoading(false);
    }

    const loadTransactions = async () => {
      setIsLoading(!(cachedTransactions || cachedGoals || cachedBudgetData || cachedSettings));

      try {
        const [transactionData, goalData, budgetData, settings] = await Promise.all([
          listTransactions(user.id),
          listSavingsGoals(user.id),
          listBudgetCategories(user.id),
          getUserSettings(user.id),
        ]);
        if (isMounted) {
          setTransactions(transactionData);
          setGoals(goalData);
          setBudgetCategories(budgetData);
          setUserCountry(settings.country ?? "US");
        }
      } catch {
        if (isMounted) {
          setTransactions([]);
          setGoals([]);
          setBudgetCategories([]);
          setUserCountry("US");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!(cachedTransactions || cachedGoals || cachedBudgetData || cachedSettings)) {
      loadTransactions();
    }

    const handleTransactionsChanged = () => {
      loadTransactions();
    };

    const handleSettingsUpdated = () => {
      loadTransactions();
    };

    window.addEventListener("transactionsChanged", handleTransactionsChanged);
    window.addEventListener("settingsUpdated", handleSettingsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("transactionsChanged", handleTransactionsChanged);
      window.removeEventListener("settingsUpdated", handleSettingsUpdated);
    };
  }, [user]);

  const userName =
    user?.user_metadata?.full_name?.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || "";
  const pinnedGoal = goals.find((goal) => goal.pinned) ?? goals[0] ?? null;
  const pinnedGoalAmounts = pinnedGoal
    ? getSavingsGoalAmountsInCurrency(pinnedGoal, currency)
    : { targetAmount: 0, currentAmount: 0 };
  const savingsGoal = pinnedGoalAmounts.targetAmount;
  const currentSavings = pinnedGoalAmounts.currentAmount;
  const savingsProgress = savingsGoal ? (currentSavings / savingsGoal) * 100 : 0;

  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return allTransactions.filter((transaction) =>
      isWithinInterval(parseTransactionDate(transaction.occurredOn), { start, end }),
    );
  }, [allTransactions]);

  const balance = useMemo(
    () =>
      allTransactions.reduce(
        (sum, transaction) =>
          transaction.type === "income"
            ? sum + getTransactionAmountInCurrency(transaction, currency)
            : sum - getTransactionAmountInCurrency(transaction, currency),
        0,
      ),
    [currency, allTransactions],
  );

  const monthlyIncome = useMemo(
    () =>
      currentMonthTransactions
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + getTransactionAmountInCurrency(transaction, currency), 0),
    [currency, currentMonthTransactions],
  );

  const monthlyExpenses = useMemo(
    () =>
      currentMonthTransactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + getTransactionAmountInCurrency(transaction, currency), 0),
    [currency, currentMonthTransactions],
  );

  const monthlyBudgetOverview = useMemo(() => {
    // Deduplicate budget categories by name
    const seenNames = new Set<string>();
    const uniqueCategories = budgetCategories.filter((c) => {
      const key = c.name.toLowerCase().trim();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

    // H-G fix: explicit Plaid→budget mapping prevents double-counting (e.g. "Rent And Utilities" → rent only)
    const normalizeCat = (s: string) =>
      s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9 ]/g, "").trim();
    const PLAID_TO_BUDGET: Record<string, string> = {
      "food and drink": "food and groceries",
      "food and drug stores": "food and groceries",
      "groceries": "food and groceries",
      "rent and utilities": "rent and housing",
      "home improvement": "rent and housing",
      "transportation": "transport",
      "travel": "transport",
      "general merchandise": "shopping",
      "shops": "shopping",
      "medical": "health",
      "healthcare": "health",
      "entertainment": "entertainment",
      "recreation": "entertainment",
      "service": "other",
      "transfer": "other",
      "bank fees": "other",
    };
    const categoriesMatch = (budgetName: string, txCategory: string): boolean => {
      const budgetNorm = normalizeCat(budgetName);
      const txNorm = normalizeCat(txCategory);
      const mapped = PLAID_TO_BUDGET[txNorm];
      if (mapped !== undefined) return budgetNorm === mapped;
      // Fallback: exact normalized match for non-Plaid transactions
      return budgetNorm === txNorm;
    };

    const rankedCategories = uniqueCategories
      .map((category) => {
        const budget = getBudgetAmountInCurrency(category, currency);
        const spent = currentMonthTransactions
          .filter(
            (transaction) =>
              transaction.type === "expense" &&
              categoriesMatch(category.name, transaction.category),
          )
          .reduce((sum, transaction) => sum + getTransactionAmountInCurrency(transaction, currency), 0);

        const matchingTransactions = currentMonthTransactions
          .filter(
            (transaction) =>
              transaction.type === "expense" &&
              categoriesMatch(category.name, transaction.category),
          )
          .sort((a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime());

        return {
          id: category.id,
          name: category.name,
          budget,
          spent,
          percentage: budget > 0 ? (spent / budget) * 100 : 0,
          remaining: budget - spent,
          isOverBudget: spent > budget,
          pinned: category.pinned,
          transactions: matchingTransactions,
        };
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }
        return b.percentage - a.percentage;
      });

    const pinnedCategories = rankedCategories.filter((category) => category.pinned);
    return pinnedCategories.length > 0 ? pinnedCategories : rankedCategories.slice(0, 4);
  }, [budgetCategories, currency, currentMonthTransactions]);

  const expensesByCategory = useMemo(() => {
    const now = new Date();
    const interval =
      timePeriod === "week"
        ? { start: subDays(now, 6), end: now }
        : timePeriod === "year"
          ? { start: startOfYear(now), end: endOfYear(now) }
          : { start: startOfMonth(now), end: endOfMonth(now) };

    const expenseTransactions = allTransactions.filter(
      (transaction) =>
        transaction.type === "expense" &&
        isWithinInterval(parseTransactionDate(transaction.occurredOn), interval),
    );

    const byCategory = expenseTransactions.reduce<Record<string, number>>((acc, transaction) => {
      acc[transaction.category] =
        (acc[transaction.category] ?? 0) + getTransactionAmountInCurrency(transaction, currency);
      return acc;
    }, {});

    return Object.entries(byCategory).map(([name, value], index) => ({
      name,
      value,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [currency, timePeriod, allTransactions]);

  const timeSeriesData = useMemo(() => {
    const now = new Date();

    if (timePeriod === "week") {
      return Array.from({ length: 7 }, (_, index) => {
        const day = subDays(now, 6 - index);
        const sameDay = allTransactions.filter(
          (transaction) =>
            format(parseTransactionDate(transaction.occurredOn), "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
        );

        return {
          period: format(day, "EEE"),
          income: sameDay
            .filter((transaction) => transaction.type === "income")
            .reduce((sum, transaction) => sum + getTransactionAmountInCurrency(transaction, currency), 0),
          expenses: sameDay
            .filter((transaction) => transaction.type === "expense")
            .reduce((sum, transaction) => sum + getTransactionAmountInCurrency(transaction, currency), 0),
        };
      });
    }

    if (timePeriod === "year") {
      return eachMonthOfInterval({
        start: startOfYear(now),
        end: endOfMonth(now),
      }).map((month) => {
        const inMonth = allTransactions.filter(
          (transaction) =>
            format(parseTransactionDate(transaction.occurredOn), "yyyy-MM") === format(month, "yyyy-MM"),
        );

        return {
          period: format(month, "MMM"),
          income: inMonth
            .filter((transaction) => transaction.type === "income")
            .reduce((sum, transaction) => sum + getTransactionAmountInCurrency(transaction, currency), 0),
          expenses: inMonth
            .filter((transaction) => transaction.type === "expense")
            .reduce((sum, transaction) => sum + getTransactionAmountInCurrency(transaction, currency), 0),
        };
      });
    }

    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const result: Array<{ period: string; income: number; expenses: number }> = [];

    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      const currentDay = new Date(day);
      const sameDay = allTransactions.filter(
        (transaction) =>
          format(parseTransactionDate(transaction.occurredOn), "yyyy-MM-dd") === format(currentDay, "yyyy-MM-dd"),
      );
      result.push({
        period: format(currentDay, "MMM d"),
        income: sameDay
          .filter((transaction) => transaction.type === "income")
          .reduce((sum, transaction) => sum + getTransactionAmountInCurrency(transaction, currency), 0),
        expenses: sameDay
          .filter((transaction) => transaction.type === "expense")
          .reduce((sum, transaction) => sum + getTransactionAmountInCurrency(transaction, currency), 0),
      });
    }

    return result.filter((entry) => entry.income > 0 || entry.expenses > 0);
  }, [currency, timePeriod, allTransactions]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("home.goodMorning");
    if (hour < 18) return t("home.goodAfternoon");
    return t("home.goodEvening");
  };

  const handleContributeToGoal = async () => {
    if (!user || !pinnedGoal || !contributionAmount) {
      return;
    }

    const amount = parseFloat(contributionAmount);
    const today = new Date().toISOString().slice(0, 10);

    await createGoalContribution(user.id, pinnedGoal.id, {
      amount,
      currency,
      originalAmount: amount,
      contributionType: "manual",
      source: "home_bamboo",
      note: contributionNote || null,
    });

    // Record as an expense transaction so it appears in Transactions/Expenses
    // and deducts from the balance just like any other spending.
    const newTxn = await createTransaction(user.id, {
      name: `Savings: ${pinnedGoal.name}`,
      amount,
      currency,
      originalAmount: amount,
      category: "Savings",
      occurredOn: today,
      type: "expense",
      isRecurring: false,
    });

    setTransactions((current) => [newTxn, ...current]);

    setGoals((current) =>
      current.map((goal) =>
        goal.id === pinnedGoal.id
          ? {
              ...goal,
              currentAmount:
                goal.currentAmount + convertCurrency(amount, currency, goal.currency),
              originalCurrentAmount:
                goal.originalCurrentAmount + convertCurrency(amount, currency, goal.currency),
            }
          : goal,
      ),
    );

    setContributionAmount("");
    setContributionNote("");
    setShowContributionModal(false);
    window.dispatchEvent(new Event("transactionsChanged"));
    window.dispatchEvent(new Event("financialDataChanged"));
  };

  return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground mb-4 animate-pulse">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Syncing transactions…</span>
          </div>
        )}

        {/* Personalized Greeting */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl">
              {getGreeting()}
              {userName ? `, ${userName}` : ""}!
            </h2>
            <img
              src={BRAND_LOGO_SRC}
              alt="Bambuu logo"
              className="h-8 w-8 object-contain"
            />
          </div>
          <p className="text-muted-foreground">{t("home.overview")}</p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-6">
            <div className="bg-primary text-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-2 opacity-90">
                <Wallet className="size-5" />
                <span className="text-sm">{t("home.totalBalance")}</span>
              </div>
              <div className="text-4xl mb-4">{formatCurrency(balance, currency)}</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="size-4" />
                    <span className="text-xs opacity-90">{t("home.income")}</span>
                  </div>
                  <div className="text-xl">{formatCurrency(monthlyIncome, currency)}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="size-4" />
                    <span className="text-xs opacity-90">{t("home.expenses")}</span>
                  </div>
                  <div className="text-xl">{formatCurrency(monthlyExpenses, currency)}</div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{t("home.view")}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimePeriod("week")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      timePeriod === "week"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <Calendar className="size-4" />
                    {t("home.week")}
                  </button>
                  <button
                    onClick={() => setTimePeriod("month")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      timePeriod === "month"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <CalendarDays className="size-4" />
                    {t("home.month")}
                  </button>
                  <button
                    onClick={() => setTimePeriod("year")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      timePeriod === "year"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <CalendarRange className="size-4" />
                    {t("home.year")}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                <h3 className="mb-4 flex items-center gap-2">
                  <Target className="size-5 text-primary" />
                  {t("home.spendingByCategory")}
                </h3>
                {expensesByCategory.length === 0 ? (
                  <div className="h-[250px] flex flex-col items-center justify-center rounded-lg bg-muted/40 text-center">
                    <div className="text-4xl text-primary mb-2">{formatCurrency(0, currency)}</div>
                    <p className="text-sm text-muted-foreground">{t("home.noExpenseData")}</p>
                  </div>
                ) : (
                  <div suppressHydrationWarning>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart key={`spending-pie-${timePeriod}`}>
                        <Pie
                          data={expensesByCategory}
                          cx="50%"
                          cy="50%"
                          outerRadius={95}
                          dataKey="value"
                        >
                          {expensesByCategory.map((entry, index) => (
                            <Cell key={`home-spending-cell-${entry.name}-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value, currency)}
                          contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {expensesByCategory.length === 0 ? (
                    <div className="text-sm text-muted-foreground">{formatCurrency(0, currency)} {t("home.totalSuffix")}</div>
                  ) : (
                    expensesByCategory.map((category, index) => (
                      <div key={`legend-${category.name}-${index}`} className="flex items-center gap-2">
                        <div className="w-3 h-3 flex-shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                        <span className="text-sm text-muted-foreground truncate">{localizeCategory(category.name)}</span>
                        <span className="text-sm ml-auto">{formatCurrency(category.value, currency)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                <h3 className="mb-4 flex items-center gap-2">
                  <TrendingUp className="size-5 text-primary" />
                  {timePeriod === "week" ? "Weekly Overview" : timePeriod === "year" ? "Yearly Overview" : "Monthly Overview"}
                </h3>
                <div suppressHydrationWarning>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={timeSeriesData} key={`overview-bar-${timePeriod}`}>
                      <XAxis dataKey="period" stroke="#52796f" />
                      <YAxis stroke="#52796f" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #95d5b2",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="income" fill="#2d6a4f" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="expenses" fill="#95d5b2" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: "#2d6a4f" }} />
                    <span className="text-sm text-muted-foreground">{t("home.income")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: "#95d5b2" }} />
                    <span className="text-sm text-muted-foreground">{t("home.expenses")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <h3 className="mb-4 flex items-center gap-2">
                <Wallet className="size-5 text-primary" />
                {t("home.monthlyBudgetStatus")}
              </h3>
              {monthlyBudgetOverview.length === 0 ? (
                <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                  {t("home.noBudgetCategories")}
                </div>
              ) : (
                <div className="space-y-3">
                  {monthlyBudgetOverview.map((category) => {
                    const isExpanded = expandedBudgetCategories.has(category.id);
                    return (
                      <div key={category.id} className="rounded-lg bg-muted/50 overflow-hidden">
                        <button
                          className="w-full px-4 py-3 text-left"
                          onClick={() =>
                            setExpandedBudgetCategories((prev) => {
                              const next = new Set(prev);
                              if (next.has(category.id)) next.delete(category.id);
                              else next.add(category.id);
                              return next;
                            })
                          }
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{localizeCategory(category.name)}</div>
                              {category.transactions.length > 0 && (
                                <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                                  {category.transactions.length}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`text-xs ${category.isOverBudget ? "text-destructive" : "text-primary"}`}>
                                {category.isOverBudget
                                  ? t("home.overBudget", {
                                      amount: formatCurrency(Math.abs(category.remaining), currency),
                                    })
                                  : t("home.remainingBudget", {
                                      amount: formatCurrency(category.remaining, currency),
                                    })}
                              </div>
                              <div className={`flex items-center justify-center w-7 h-7 rounded-md border transition-colors duration-200 ${isExpanded ? "bg-primary border-primary text-primary-foreground" : "bg-secondary border-border text-muted-foreground"}`}>
                                <ChevronDown
                                  className={`size-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className={`h-full rounded-full transition-all ${category.isOverBudget ? "bg-destructive" : "bg-primary"}`}
                              style={{ width: `${Math.min(category.percentage, 100)}%` }}
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatCurrency(category.spent, currency)} / {formatCurrency(category.budget, currency)}</span>
                            <span>{t("home.budgetUsed", { value: category.percentage.toFixed(0) })}</span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border">
                            {category.transactions.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-muted-foreground">
                                No transactions this month.
                              </div>
                            ) : (
                              <div className="divide-y divide-border">
                                {category.transactions.map((tx) => (
                                  <div key={tx.id} className="flex items-center justify-between px-4 py-2.5">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0 text-sm">
                                        {getCategoryIcon(tx.category, tx.type)}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-sm truncate">{tx.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {formatTransactionDate(tx.occurredOn)}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-sm font-medium text-foreground ml-3 flex-shrink-0">
                                      -{formatCurrency(getTransactionAmountInCurrency(tx, currency), currency)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3>{t("home.recentTransactions")}</h3>
                <Link to="/transactions" className="text-primary hover:underline text-sm">
                  {t("home.viewAll")}
                </Link>
              </div>
              <div className="space-y-3">
                {isLoading ? (
                  <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                    {t("home.loadingTransactions")}
                  </div>
                ) : allTransactions.length === 0 ? (
                  <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                    {t("home.noTransactions")}
                  </div>
                ) : (
                  allTransactions.slice(0, 6).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-secondary transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === "income" ? "bg-primary/10 text-primary" : "bg-accent"
                        }`}>
                          {getCategoryIcon(transaction.category, transaction.type)}
                        </div>
                        <div>
                          <div>{transaction.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {localizeCategory(transaction.category)} • {formatTransactionDate(transaction.occurredOn)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t("common.paidIn", {
                              amount: formatCurrencyWithCode(transaction.originalAmount, transaction.currency),
                            })}
                          </div>
                        </div>
                      </div>
                      <div className={transaction.type === "income" ? "text-primary" : "text-foreground"}>
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(getTransactionAmountInCurrency(transaction, currency), currency)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          <div className="w-full self-stretch bg-card rounded-xl p-5 shadow-sm border border-border flex flex-col items-center lg:w-[260px] lg:flex-shrink-0 lg:self-start">
            <div className="mb-2 text-center">
              <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center shadow-md mb-2">
                <span className="text-3xl">{pinnedGoal?.emoji ?? "🎯"}</span>
              </div>
              <div className="text-xs text-muted-foreground">{t("home.goal")}</div>
              <div className="mt-1 text-sm font-medium">
                {pinnedGoal?.name ?? t("home.noGoalPinned")}
              </div>
              <div className="mt-1 text-sm font-medium">
                {pinnedGoal ? formatCurrency(savingsGoal, currency) : formatCurrency(0, currency)}
              </div>
            </div>

            <div className="mb-4 w-full sm:hidden">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("home.start")}</span>
                <span>{savingsProgress.toFixed(0)}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(savingsProgress, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span>{formatCurrency(0, currency)}</span>
                <span className="text-primary">{formatCurrency(savingsGoal, currency)}</span>
              </div>
            </div>

            <div className="relative hidden w-[132px] min-h-[250px] overflow-visible pt-6 sm:block sm:min-h-[320px]">
              <div className="absolute inset-y-0 left-1/2 w-[86px] -translate-x-1/2 overflow-hidden rounded-[999px]">
                <img
                  src="/bamboo.png"
                  alt="Bamboo"
                  className="absolute inset-0 h-full w-full object-contain object-center opacity-95"
                />
              </div>

              <div
                className="absolute left-1/2 z-10 transition-all duration-700 ease-out"
                style={{ bottom: `${Math.min(Math.max(savingsProgress - 6, 0), 74)}%`, transform: "translateX(-56%)" }}
              >
                <div className="relative">
                  <img
                    src="/panda.svg"
                    alt="Panda"
                    className="h-[74px] w-auto drop-shadow-md transition-transform duration-700 ease-out"
                  />
                  <div className="absolute left-full top-1/2 ml-2 -translate-y-1/2 rounded-md border border-primary/25 bg-white px-2 py-1 shadow-sm">
                    <div className="text-xs font-medium text-primary">{savingsProgress.toFixed(0)}%</div>
                  </div>
                  {savingsProgress >= 100 ? (
                    <div className="absolute -left-6 -top-16 w-[132px]">
                      <div className="relative border-4 border-[#2f3b2f] bg-[#fffdf4] px-3 py-2 shadow-[4px_4px_0_#d9d2b6]">
                        <div className="font-mono text-[10px] leading-4 text-[#2f3b2f]">
                          You made it
                          happen! 🎋
                        </div>
                        <div className="absolute bottom-[-12px] left-8 h-0 w-0 border-l-[10px] border-r-[6px] border-t-[12px] border-l-transparent border-r-transparent border-t-[#2f3b2f]" />
                        <div className="absolute bottom-[-8px] left-[34px] h-0 w-0 border-l-[8px] border-r-[4px] border-t-[10px] border-l-transparent border-r-transparent border-t-[#fffdf4]" />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {pinnedGoal ? (
              <button
                onClick={() => setShowContributionModal(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <PiggyBank className="size-4" />
                {t("home.contribute")}
              </button>
            ) : null}

            <div className="mt-4 w-full text-center">
              <div className="hidden text-xs text-muted-foreground sm:block">{t("home.start")}</div>
              <div className="hidden text-sm sm:block">{formatCurrency(0, currency)}</div>
              <div className="mt-4 rounded-xl bg-accent/30 px-4 py-3 text-center">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Remaining to goal
                </div>
                <div className="mt-1 text-lg font-semibold text-primary">
                  {pinnedGoal ? formatCurrency(Math.max(savingsGoal - currentSavings, 0), currency) : formatCurrency(0, currency)}
                </div>
                <p className="mt-1 text-xs">
                  {pinnedGoal
                    ? t("home.toGo", {
                        amount: formatCurrency(savingsGoal - currentSavings, currency),
                        emoji: pinnedGoal.emoji,
                      })
                    : t("home.pinGoal")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {showContributionModal && pinnedGoal ? (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full">
              <div className="sticky top-0 bg-primary text-primary-foreground px-6 py-4 rounded-t-2xl flex items-center justify-between">
                <h2 className="text-white">{t("home.contributeToGoal")}</h2>
                <button
                  onClick={() => {
                    setShowContributionModal(false);
                    setContributionAmount("");
                    setContributionNote("");
                  }}
                  className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">{t("home.contributionAmount")}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">{t("home.contributionNote")}</label>
                  <input
                    type="text"
                    value={contributionNote}
                    onChange={(e) => setContributionNote(e.target.value)}
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder={t("home.contributionNotePlaceholder")}
                  />
                </div>
                <button
                  onClick={handleContributeToGoal}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <PiggyBank className="size-4" />
                  {t("home.contribute")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
  );
}
