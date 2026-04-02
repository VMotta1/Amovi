import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  CalendarDays,
  CalendarRange,
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
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { useUserCurrency } from "../hooks/useUserCurrency";
import { formatCurrency } from "../lib/currency";
import {
  getCachedBudgetCategories,
  getCachedSavingsGoals,
  getCachedSubscriptions,
  getBudgetAmountInCurrency,
  getSavingsGoalAmountsInCurrency,
  getSubscriptionAmountInCurrency,
  listBudgetCategories,
  listSavingsGoals,
  listSubscriptions,
} from "../lib/finance";
import {
  getCachedTransactions,
  getTransactionAmountInCurrency,
  getTransactionAmountInInterval,
  listTransactions,
  parseTransactionDate,
} from "../lib/transactions";
import { useAuth } from "../providers/AuthProvider";
import { useI18n } from "../providers/I18nProvider";
import type { BudgetCategory, SavingsGoal, Subscription } from "../types/finance";
import type { Transaction } from "../types/transactions";
import { usePlaidData, plaidToTransaction } from "../hooks/usePlaidData";

const CHART_COLORS = ["#2d6a4f", "#52b788", "#74c69d", "#95d5b2", "#b7e4c7", "#40916c"];

export default function Analytics() {
  const { user } = useAuth();
  const { t, localizeCategory } = useI18n();
  const currency = useUserCurrency();
  const cachedTransactions = user ? getCachedTransactions(user.id) : null;
  const cachedBudgetCategories = user ? getCachedBudgetCategories(user.id) : null;
  const cachedGoals = user ? getCachedSavingsGoals(user.id) : null;
  const cachedSubscriptions = user ? getCachedSubscriptions(user.id) : null;
  const [overviewPeriod, setOverviewPeriod] = useState<"week" | "month" | "year">("month");
  const [distributionPeriod, setDistributionPeriod] = useState<"week" | "month" | "year">("month");
  const [trendPeriod, setTrendPeriod] = useState<"6m" | "12m" | "all">("12m");
  const [spendingPeriod, setSpendingPeriod] = useState<"14d" | "30d" | "90d">("14d");
  const [budgetPeriod, setBudgetPeriod] = useState<"1m" | "3m" | "6m" | "12m" | "all">("6m");
  const [categoryTrendPeriod, setCategoryTrendPeriod] = useState<"3m" | "6m" | "12m">("6m");
  const [transactions, setTransactions] = useState<Transaction[]>(() => cachedTransactions ?? []);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>(() => cachedBudgetCategories ?? []);
  const [goals, setGoals] = useState<SavingsGoal[]>(() => cachedGoals ?? []);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => cachedSubscriptions ?? []);
  const [isLoading, setIsLoading] = useState(
    () => !(cachedTransactions || cachedBudgetCategories || cachedGoals || cachedSubscriptions),
  );

  const { allTransactions: plaidRawTxns } = usePlaidData();

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
      setBudgetCategories([]);
      setGoals([]);
      setSubscriptions([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const cachedCategories = getCachedBudgetCategories(user.id);

    if (cachedTransactions) setTransactions(cachedTransactions);
    if (cachedCategories) setBudgetCategories(cachedCategories);
    if (cachedGoals) setGoals(cachedGoals);
    if (cachedSubscriptions) setSubscriptions(cachedSubscriptions);
    if (cachedTransactions || cachedCategories || cachedGoals || cachedSubscriptions) {
      setIsLoading(false);
    }

    const loadData = async () => {
      setIsLoading(!(cachedTransactions || cachedCategories || cachedGoals || cachedSubscriptions));
      try {
        const [transactionData, categoryData, goalData, subscriptionData] = await Promise.all([
          listTransactions(user.id),
          listBudgetCategories(user.id),
          listSavingsGoals(user.id),
          listSubscriptions(user.id),
        ]);

        if (!isMounted) {
          return;
        }

        setTransactions(transactionData);
        setBudgetCategories(categoryData);
        setGoals(goalData);
        setSubscriptions(subscriptionData);
      } catch {
        if (!isMounted) {
          return;
        }

        setTransactions([]);
        setBudgetCategories([]);
        setGoals([]);
        setSubscriptions([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!(cachedTransactions || cachedCategories || cachedGoals || cachedSubscriptions)) {
      loadData();
    }

    const reload = () => {
      loadData();
    };

    window.addEventListener("transactionsChanged", reload);
    window.addEventListener("financialDataChanged", reload);

    return () => {
      isMounted = false;
      window.removeEventListener("transactionsChanged", reload);
      window.removeEventListener("financialDataChanged", reload);
    };
  }, [user]);

  const now = new Date();
  const firstTransactionDate = useMemo(
    () =>
      allTransactions.length > 0
        ? allTransactions
            .map((transaction) => parseTransactionDate(transaction.occurredOn))
            .sort((a, b) => a.getTime() - b.getTime())[0]
        : now,
    [now, allTransactions],
  );

  const selectedInterval = useMemo(() => {
    if (overviewPeriod === "week") {
      return { start: subDays(now, 6), end: now };
    }
    if (overviewPeriod === "year") {
      return { start: startOfYear(now), end: endOfYear(now) };
    }
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }, [now, overviewPeriod]);

  const distributionInterval = useMemo(() => {
    if (distributionPeriod === "week") {
      return { start: subDays(now, 6), end: now };
    }
    if (distributionPeriod === "year") {
      return { start: startOfYear(now), end: endOfYear(now) };
    }
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }, [distributionPeriod, now]);

  const periodTransactions = useMemo(
    () =>
      allTransactions.filter((transaction) =>
        isWithinInterval(parseTransactionDate(transaction.occurredOn), selectedInterval),
      ),
    [selectedInterval, allTransactions],
  );

  const expenseTransactions = periodTransactions.filter((transaction) => transaction.type === "expense");
  const incomeTransactions = periodTransactions.filter((transaction) => transaction.type === "income");
  const distributionTransactions = useMemo(
    () =>
      allTransactions.filter(
        (transaction) =>
          transaction.type === "expense" &&
          isWithinInterval(parseTransactionDate(transaction.occurredOn), distributionInterval),
      ),
    [distributionInterval, allTransactions],
  );

  const totalIncome = allTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce(
      (sum, transaction) =>
        sum + getTransactionAmountInInterval(transaction, currency, selectedInterval.start, selectedInterval.end),
      0,
    );
  const totalExpenses = allTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce(
      (sum, transaction) =>
        sum + getTransactionAmountInInterval(transaction, currency, selectedInterval.start, selectedInterval.end),
      0,
    );
  const totalSaved = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((totalSaved / totalIncome) * 100).toFixed(1) : "0.0";

  const categoryData = useMemo(() => {
    const totals = distributionTransactions.reduce<Record<string, number>>((acc, transaction) => {
      acc[transaction.category] =
        (acc[transaction.category] ?? 0) +
        getTransactionAmountInInterval(transaction, currency, distributionInterval.start, distributionInterval.end);
      return acc;
    }, {});

    const total = Object.values(totals).reduce((sum, value) => sum + value, 0);

    return Object.entries(totals)
      .map(([name, value], index) => ({
        name,
        value,
        color: CHART_COLORS[index % CHART_COLORS.length],
        percentage: total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [currency, distributionTransactions]);

  const topCategory = categoryData[0];

  const monthlyComparison = useMemo(() => {
    const startMonth =
      trendPeriod === "all"
        ? startOfMonth(firstTransactionDate)
        : startOfMonth(subMonths(now, trendPeriod === "12m" ? 11 : 5));

    return eachMonthOfInterval({
      start: startMonth,
      end: endOfMonth(now),
    }).map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const income = allTransactions
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + getTransactionAmountInInterval(transaction, currency, monthStart, monthEnd), 0);
      const expenses = allTransactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + getTransactionAmountInInterval(transaction, currency, monthStart, monthEnd), 0);

      return {
        month: format(month, "MMM"),
        income,
        expenses,
        savings: income - expenses,
      };
    });
  }, [currency, firstTransactionDate, now, allTransactions, trendPeriod]);

  const previousMonthData = monthlyComparison[monthlyComparison.length - 2];
  const currentMonthData = monthlyComparison[monthlyComparison.length - 1];
  const spendingChange =
    previousMonthData && previousMonthData.expenses > 0
      ? (((currentMonthData.expenses - previousMonthData.expenses) / previousMonthData.expenses) * 100)
      : 0;

  const dailySpending = useMemo(() => {
    const dayCount = spendingPeriod === "90d" ? 89 : spendingPeriod === "30d" ? 29 : 13;
    return eachDayOfInterval({
      start: startOfDay(subDays(now, dayCount)),
      end: endOfDay(now),
    }).map((day) => {
      const amount = allTransactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + getTransactionAmountInInterval(transaction, currency, day, day), 0);

      return {
        day: format(day, "MMM d"),
        amount,
      };
    });
  }, [currency, now, spendingPeriod, allTransactions]);

  const avgDailySpending = (
    dailySpending.reduce((sum, item) => sum + item.amount, 0) / (dailySpending.length || 1)
  ).toFixed(2);

  const budgetComparison = useMemo(() => {
    const startMonth =
      budgetPeriod === "all"
        ? startOfMonth(firstTransactionDate)
        : startOfMonth(
            subMonths(
              now,
              budgetPeriod === "12m" ? 11 : budgetPeriod === "6m" ? 5 : budgetPeriod === "3m" ? 2 : 0,
            ),
          );

    return eachMonthOfInterval({
      start: startMonth,
      end: endOfMonth(now),
    }).map((month) => {
      const actual = allTransactions
        .filter((transaction) => transaction.type === "expense")
        .reduce(
          (sum, transaction) =>
            sum + getTransactionAmountInInterval(transaction, currency, startOfMonth(month), endOfMonth(month)),
          0,
        );

      const budget = budgetCategories.reduce(
        (sum, category) => sum + getBudgetAmountInCurrency(category, currency),
        0,
      );

      return {
        month: format(month, "MMM yyyy"),
        budget,
        actual,
      };
    });
  }, [budgetCategories, budgetPeriod, currency, firstTransactionDate, now, allTransactions]);

  const overBudgetMonth = budgetComparison
    .slice()
    .reverse()
    .find((month) => month.actual > month.budget);

  const topSpendingCategories = useMemo(() => {
    const totals: Record<string, number> = {};
    allTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => { totals[t.category] = (totals[t.category] ?? 0) + 1; });
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name);
  }, [allTransactions]);

  const categoryTrends = useMemo(() => {
    const startMonth = startOfMonth(
      subMonths(now, categoryTrendPeriod === "12m" ? 11 : categoryTrendPeriod === "6m" ? 5 : 2),
    );

    return eachMonthOfInterval({
      start: startMonth,
      end: endOfMonth(now),
    }).map((month) => {
      const row: Record<string, string | number> = { month: format(month, "MMM") };

      topSpendingCategories.forEach((categoryName) => {
        row[categoryName.toLowerCase()] = allTransactions
          .filter(
            (transaction) =>
              transaction.type === "expense" &&
              transaction.category.toLowerCase() === categoryName.toLowerCase(),
          )
          .reduce(
            (sum, transaction) =>
              sum + getTransactionAmountInInterval(transaction, currency, startOfMonth(month), endOfMonth(month)),
            0,
          );
      });

      return row;
    });
  }, [topSpendingCategories, categoryTrendPeriod, currency, now, allTransactions]);

  const recommendations = useMemo(() => {
    const items: Array<{ title: string; message: string }> = [];

    if (overBudgetMonth) {
      items.push({
        title: t("analytics.reduceSpending"),
        message: t("analytics.overBudgetInMonth", {
          amount: formatCurrency(overBudgetMonth.actual - overBudgetMonth.budget, currency),
          month: overBudgetMonth.month,
        }),
      });
    }

    const foodCategory = categoryData.find((category) => category.name.toLowerCase() === "food");
    if (foodCategory) {
      items.push({
        title: t("analytics.reviewFood"),
        message:
          foodCategory.percentage > 30
            ? t("analytics.foodHigh")
            : t("analytics.foodControlled"),
      });
    }

    const pinnedGoal = goals.find((goal) => goal.pinned) ?? goals[0];
    if (pinnedGoal) {
      const displayGoal = getSavingsGoalAmountsInCurrency(pinnedGoal, currency);
      const remaining = displayGoal.targetAmount - displayGoal.currentAmount;
      items.push({
        title: t("analytics.trackGoal"),
        message: remaining > 0
          ? t("analytics.goalNeeds", {
              name: pinnedGoal.name,
              amount: formatCurrency(remaining, currency),
            })
          : t("analytics.goalFunded", { name: pinnedGoal.name }),
      });
    }

    if (subscriptions.length > 0) {
      const monthlySubscriptionTotal = subscriptions.reduce(
        (sum, subscription) => sum + getSubscriptionAmountInCurrency(subscription, currency),
        0,
      );
      items.push({
        title: t("analytics.auditRecurring"),
        message: t("analytics.subscriptionsTotal", {
          amount: formatCurrency(monthlySubscriptionTotal, currency),
        }),
      });
    }

    return items.slice(0, 3);
  }, [categoryData, currency, goals, overBudgetMonth, subscriptions, t]);

  const trackedTrendCategories = topSpendingCategories;

  return (
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">{t("analytics.view")}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setOverviewPeriod("week")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  overviewPeriod === "week"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Calendar className="size-4" />
                {t("home.week")}
              </button>
              <button
                onClick={() => setOverviewPeriod("month")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  overviewPeriod === "month"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-secondary"
                }`}
              >
                <CalendarDays className="size-4" />
                {t("home.month")}
              </button>
              <button
                onClick={() => setOverviewPeriod("year")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  overviewPeriod === "year"
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

        {isLoading ? (
          <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
            {t("analytics.loading")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-sm text-muted-foreground mb-1">{t("analytics.savingsRate")}</div>
                <div className="text-2xl text-primary">{savingsRate}%</div>
                <div className="text-xs text-muted-foreground mt-1">{t("analytics.ofIncome")}</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-sm text-muted-foreground mb-1">{t("analytics.avgDaily")}</div>
                <div className="text-2xl">{formatCurrency(Number(avgDailySpending), currency)}</div>
                <div className="text-xs text-muted-foreground mt-1">{t("analytics.spending")}</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-sm text-muted-foreground mb-1">{t("analytics.totalSaved")}</div>
                <div className="text-2xl text-primary">{formatCurrency(totalSaved, currency)}</div>
                <div className="text-xs text-muted-foreground mt-1">{t("analytics.thisPeriod")}</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-sm text-muted-foreground mb-1">{t("analytics.topCategory")}</div>
                <div className="text-lg">{topCategory ? localizeCategory(topCategory.name) : t("analytics.none")}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {topCategory ? formatCurrency(topCategory.value, currency) : t("analytics.noExpenseData")}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-primary to-[#52b788] text-white rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <TrendingUp className="size-8 flex-shrink-0" />
                  <div>
                    <h4 className="mb-2">{t("analytics.momentum")}</h4>
                    <p className="text-sm text-white/90">
                      {spendingChange <= 0
                        ? t("analytics.spendingLess", { delta: Math.abs(spendingChange).toFixed(1) })
                        : t("analytics.spendingMore", { delta: spendingChange.toFixed(1) })}{" "}
                      {t("analytics.currentSavingsRate", { rate: savingsRate })}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <TrendingDown className="size-8 flex-shrink-0 text-orange-500" />
                  <div>
                    <h4 className="mb-2 text-orange-900">{t("analytics.watchOut")}</h4>
                    <p className="text-sm text-orange-800">
                      {overBudgetMonth
                        ? t("analytics.overBudgetMonthSummary", {
                            month: overBudgetMonth.month,
                            amount: formatCurrency(overBudgetMonth.actual - overBudgetMonth.budget, currency),
                          })
                        : t("analytics.noCategoriesOver")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-secondary border border-border rounded-xl p-6">
              <h3 className="mb-4">{t("analytics.smartRecommendations")}</h3>
              <div className="space-y-3">
                {recommendations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("analytics.notEnoughData")}</p>
                ) : (
                  recommendations.map((item, index) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium mb-1">{item.title}</div>
                        <p className="text-sm text-muted-foreground">{item.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="size-5 text-primary" />
                  <h3>{t("analytics.spendingDistribution")}</h3>
                </div>
                <div className="flex gap-2">
                  {(["week", "month", "year"] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setDistributionPeriod(period)}
                      className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                        distributionPeriod === period
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {period === "week" ? t("home.week") : period === "month" ? t("home.month") : t("home.year")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart key={`analytics-spending-pie-${distributionPeriod}`}>
                    <Pie
                      data={categoryData.length ? categoryData : [{ name: t("analytics.noExpensesPie"), value: 1, color: "#d9f0b3", percentage: 100 }]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {(categoryData.length ? categoryData : [{ name: t("analytics.noExpensesPie"), value: 1, color: "#d9f0b3", percentage: 100 }]).map((entry, index) => (
                        <Cell key={`analytics-spending-cell-${entry.name}-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {categoryData.map((category, index) => (
                    <div key={`analytics-legend-${category.name}-${index}`} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                          <span>{localizeCategory(category.name)}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(category.value, currency)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            backgroundColor: category.color,
                            width: `${category.percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-5 text-primary" />
                  <h3>{t("analytics.incomeExpenseTrend")}</h3>
                </div>
                <div className="flex gap-2">
                  {(["6m", "12m", "all"] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setTrendPeriod(period)}
                      className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                        trendPeriod === period
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {period === "6m" ? t("analytics.last6Months") : period === "12m" ? t("analytics.last12Months") : t("analytics.allTime")}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyComparison}>
                  <defs>
                    <linearGradient id="analytics-colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2d6a4f" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2d6a4f" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="analytics-colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d4183d" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#d4183d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#52796f" />
                  <YAxis stroke="#52796f" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #95d5b2",
                      borderRadius: "8px",
                    }}
                  />
                  <Area type="monotone" dataKey="income" stroke="#2d6a4f" fillOpacity={1} fill="url(#analytics-colorIncome)" />
                  <Area type="monotone" dataKey="expenses" stroke="#d4183d" fillOpacity={1} fill="url(#analytics-colorExpenses)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: "#2d6a4f" }} />
                  <span className="text-sm text-muted-foreground">{t("home.income")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: "#d4183d" }} />
                  <span className="text-sm text-muted-foreground">{t("home.expenses")}</span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="size-5 text-primary" />
                  <h3>{t("analytics.spendingOverTime")}</h3>
                </div>
                <div className="flex gap-2">
                  {(["14d", "30d", "90d"] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setSpendingPeriod(period)}
                      className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                        spendingPeriod === period
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {period === "14d" ? t("analytics.last14Days") : period === "30d" ? t("analytics.last30Days") : t("analytics.last90Days")}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailySpending}>
                  <XAxis dataKey="day" stroke="#52796f" fontSize={12} />
                  <YAxis stroke="#52796f" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #95d5b2",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => formatCurrency(Number(value), currency)}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#2d6a4f" strokeWidth={2} dot={{ fill: "#2d6a4f", r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3>{t("analytics.budgetVsActual")}</h3>
                  <div className="flex gap-2">
                    {(["1m", "3m", "6m", "12m", "all"] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setBudgetPeriod(period)}
                        className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                          budgetPeriod === period
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {period === "1m"
                          ? t("analytics.lastMonth")
                          : period === "3m"
                            ? t("analytics.last3Months")
                            : period === "6m"
                              ? t("analytics.last6Months")
                              : period === "12m"
                                ? t("analytics.last12Months")
                                : t("analytics.allTime")}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={budgetComparison}>
                    <XAxis dataKey="month" stroke="#52796f" fontSize={12} />
                    <YAxis stroke="#52796f" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #95d5b2",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="budget" fill="#95d5b2" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="actual" fill="#2d6a4f" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3>{t("analytics.categoryTrends")}</h3>
                  <div className="flex gap-2">
                    {(["3m", "6m", "12m"] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setCategoryTrendPeriod(period)}
                        className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                          categoryTrendPeriod === period
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {period === "3m" ? t("analytics.last3Months") : period === "6m" ? t("analytics.last6Months") : t("analytics.last12Months")}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={categoryTrends}>
                    <XAxis dataKey="month" stroke="#52796f" />
                    <YAxis stroke="#52796f" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #95d5b2",
                        borderRadius: "8px",
                      }}
                    />
                    {trackedTrendCategories.map((categoryName, index) => (
                      <Line
                        key={categoryName}
                        type="monotone"
                        dataKey={categoryName.toLowerCase()}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {trackedTrendCategories.map((categoryName, index) => (
                    <div key={categoryName} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="text-sm text-muted-foreground">{localizeCategory(categoryName)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
  );
}
