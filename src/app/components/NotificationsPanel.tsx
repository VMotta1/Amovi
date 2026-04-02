import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, X, AlertCircle, Info, CheckCircle } from "lucide-react";
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  formatDistanceToNow,
  startOfMonth,
  subMonths,
} from "date-fns";
import { formatCurrency } from "../lib/currency";
import { useAuth } from "../providers/AuthProvider";
import {
  createSubscription,
  getBudgetAmountInCurrency,
  getSavingsGoalAmountsInCurrency,
  getSubscriptionAmountInCurrency,
  listBudgetCategories,
  listSavingsGoals,
  listSubscriptions,
} from "../lib/finance";
import {
  getTransactionAmountInCurrency,
  getTransactionAmountInInterval,
  listTransactions,
} from "../lib/transactions";
import { dismissNotification, listNotifications, markAllNotificationsRead, markNotificationRead, syncNotifications } from "../lib/notifications";
import { getUserSettings } from "../lib/settings";
import { useI18n } from "../providers/I18nProvider";
import type { AppNotification, AppNotificationInput } from "../types/notifications";
import type { BudgetCategory, SavingsGoal, Subscription } from "../types/finance";
import type { UserSettings } from "../types/settings";
import type { Transaction } from "../types/transactions";
import {
  detectRecurringSubscriptionCandidates,
  normalizeMerchantName,
} from "../../shared/studentDiscountDetector";

const defaultSettings: UserSettings = {
  userId: "",
  language: "English",
  currency: "USD",
  country: "US",
  dateFormat: "MM/DD/YYYY",
  darkMode: false,
  budgetAlerts: true,
  subscriptionReminders: true,
  weeklySummary: true,
  savingsMilestones: true,
  onboardingCompleted: false,
};

export default function NotificationsPanel() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user || !settings) {
      return;
    }

    let isMounted = true;

    const syncDetectedSubscriptions = async () => {
      const candidates = detectRecurringSubscriptionCandidates({
        transactions: transactions.map((transaction) => ({
          id: transaction.id,
          amount: transaction.originalAmount,
          merchantName: transaction.name,
          sourceType: "transaction",
          date: transaction.occurredOn,
          category: transaction.category,
          currency: transaction.currency,
          type: transaction.type,
          isRecurring: transaction.isRecurring,
          recurringFrequency: transaction.recurringFrequency,
        })),
        displayCurrency: settings.currency,
      });

      const existingByMerchant = new Set(
        subscriptions.map((subscription) => normalizeMerchantName(subscription.name)),
      );

      const missingCandidates = candidates.filter(
        (candidate) => !existingByMerchant.has(candidate.normalizedMerchant),
      );

      if (missingCandidates.length === 0) {
        return;
      }

      await Promise.all(
        missingCandidates.map(async (candidate) => {
          await createSubscription(user.id, {
            emoji: "📱",
            name: candidate.displayName,
            category: "Other",
            monthlyCost: candidate.currentMonthlySpend,
            currency: settings.currency,
            originalMonthlyCost: candidate.currentMonthlySpend,
            renewalDate: candidate.lastChargeDate || new Date().toISOString().split("T")[0],
            hasStudentDiscount: false,
          });
        }),
      );

      if (isMounted) {
        window.dispatchEvent(new Event("financialDataChanged"));
      }
    };

    void syncDetectedSubscriptions();

    return () => {
      isMounted = false;
    };
  }, [settings, subscriptions, transactions, user]);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setBudgetCategories([]);
      setGoals([]);
      setSubscriptions([]);
      setSettings(null);
      setNotifications([]);
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        const [transactionData, categoryData, goalData, subscriptionData, settingsData] = await Promise.all([
          listTransactions(user.id),
          listBudgetCategories(user.id),
          listSavingsGoals(user.id),
          listSubscriptions(user.id),
          getUserSettings(user.id),
        ]);

        if (!isMounted) return;

        setTransactions(transactionData);
        setBudgetCategories(categoryData);
        setGoals(goalData);
        setSubscriptions(subscriptionData);
        setSettings(settingsData);
      } catch {
        if (!isMounted) return;

        setTransactions([]);
        setBudgetCategories([]);
        setGoals([]);
        setSubscriptions([]);
        setSettings({ ...defaultSettings, userId: user.id });
      }
    };

    void loadData();

    const reload = () => {
      void loadData();
    };

    window.addEventListener("transactionsChanged", reload);
    window.addEventListener("financialDataChanged", reload);

    return () => {
      isMounted = false;
      window.removeEventListener("transactionsChanged", reload);
      window.removeEventListener("financialDataChanged", reload);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !settings) {
      return;
    }

    let isMounted = true;
    const now = new Date();
    const currentMonthInterval = {
      start: startOfMonth(now),
      end: endOfMonth(now),
    };
    const currentMonthExpenses = transactions.filter((transaction) => transaction.type === "expense");

    const generated: AppNotificationInput[] = [];

    if (settings.savingsMilestones) {
      goals.forEach((goal) => {
        const displayGoal = getSavingsGoalAmountsInCurrency(goal, settings.currency);
        const progress = displayGoal.targetAmount > 0 ? (displayGoal.currentAmount / displayGoal.targetAmount) * 100 : 0;

        [25, 50, 75].forEach((milestone) => {
          if (progress >= milestone && progress < 100) {
            generated.push({
              sourceKey: `goal-${goal.id}-milestone-${milestone}`,
              type: "info",
              title: t("notifications.goalProgress"),
              message: t("notifications.goalToward", {
                progress: milestone,
                name: goal.name,
              }),
              payload: { goalId: goal.id, milestone },
              createdAt: goal.createdAt,
            });
          }
        });

        if (progress >= 100) {
          generated.push({
            sourceKey: `goal-${goal.id}-completed`,
            type: "success",
            title: t("notifications.goalCompleted"),
            message: t("notifications.goalFunded", { name: goal.name }),
            payload: { goalId: goal.id, progress: 100 },
            createdAt: goal.createdAt,
          });
        }
      });
    }

    if (settings.budgetAlerts) {
      budgetCategories.forEach((category) => {
        const displayBudget = getBudgetAmountInCurrency(category, settings.currency);
        const spent = currentMonthExpenses
          .filter((transaction) => transaction.category.toLowerCase() === category.name.toLowerCase())
          .reduce(
            (sum, transaction) =>
              sum + getTransactionAmountInInterval(transaction, settings.currency, currentMonthInterval.start, currentMonthInterval.end),
            0,
          );

        if (displayBudget <= 0) {
          return;
        }

        const monthKey = format(now, "yyyy-MM");
        const usage = spent / displayBudget;

        if (usage >= 0.8 && usage < 1) {
          generated.push({
            sourceKey: `budget-${category.id}-${monthKey}-80`,
            type: "warning",
            title: t("notifications.budgetAlert"),
            message: t("notifications.budgetUsedMessage", {
              name: category.name,
              progress: (usage * 100).toFixed(0),
            }),
            payload: { categoryId: category.id, month: monthKey, threshold: 80 },
          });
        }

        if (usage >= 1) {
          generated.push({
            sourceKey: `budget-${category.id}-${monthKey}-over`,
            type: "alert",
            title: t("notifications.overBudget"),
            message: t("notifications.overBudgetMessage", {
              name: category.name,
              amount: formatCurrency(spent - displayBudget, settings.currency),
            }),
            payload: { categoryId: category.id, month: monthKey, threshold: 100 },
          });
        }
      });
    }

    if (settings.subscriptionReminders) {
      subscriptions.forEach((subscription) => {
        const daysUntilRenewal = differenceInCalendarDays(new Date(subscription.renewalDate), now);
        if (daysUntilRenewal >= 0 && daysUntilRenewal <= 3) {
          generated.push({
            sourceKey: `subscription-${subscription.id}-${subscription.renewalDate}`,
            type: "alert",
            title: t("notifications.upcomingRenewal"),
            message: t("notifications.renewsIn", {
              name: subscription.name,
              amount: formatCurrency(
                getSubscriptionAmountInCurrency(subscription, settings.currency),
                settings.currency,
              ),
              days: daysUntilRenewal,
              suffix: daysUntilRenewal === 1 ? "" : "s",
            }),
            payload: { subscriptionId: subscription.id, renewalDate: subscription.renewalDate },
            createdAt: subscription.createdAt,
          });
        }
      });
    }

    const detectedSubscriptionNotifications = detectRecurringSubscriptionCandidates({
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        amount: transaction.originalAmount,
        merchantName: transaction.name,
        sourceType: "transaction",
        date: transaction.occurredOn,
        category: transaction.category,
        currency: transaction.currency,
        type: transaction.type,
        isRecurring: transaction.isRecurring,
        recurringFrequency: transaction.recurringFrequency,
      })),
      displayCurrency: settings.currency,
    });

    const subscriptionNameSet = new Set(
      subscriptions.map((subscription) => normalizeMerchantName(subscription.name)),
    );

    detectedSubscriptionNotifications.forEach((candidate) => {
      if (!subscriptionNameSet.has(candidate.normalizedMerchant)) {
        return;
      }

      generated.push({
        sourceKey: `subscription-detected-${candidate.normalizedMerchant}`,
        type: "info",
        title: t("notifications.subscriptionDetected"),
        message: t("notifications.subscriptionDetectedMessage", {
          name: candidate.displayName,
          amount: formatCurrency(candidate.currentMonthlySpend, settings.currency),
        }),
        payload: {
          route: "/subscriptions",
          actionLabel: t("notifications.reviewSubscription"),
          merchant: candidate.normalizedMerchant,
        },
        createdAt: candidate.lastChargeDate,
      });
    });

    if (settings.weeklySummary) {
      const thisMonthIncome = transactions
        .filter((transaction) => transaction.type === "income")
        .reduce(
          (sum, transaction) =>
            sum + getTransactionAmountInInterval(transaction, settings.currency, currentMonthInterval.start, currentMonthInterval.end),
          0,
        );
      const thisMonthExpenses = currentMonthExpenses.reduce(
        (sum, transaction) =>
          sum + getTransactionAmountInInterval(transaction, settings.currency, currentMonthInterval.start, currentMonthInterval.end),
        0,
      );
      const previousMonthInterval = {
        start: startOfMonth(subMonths(now, 1)),
        end: endOfMonth(subMonths(now, 1)),
      };
      const previousMonthIncome = transactions
        .filter((transaction) => transaction.type === "income")
        .reduce(
          (sum, transaction) =>
            sum + getTransactionAmountInInterval(transaction, settings.currency, previousMonthInterval.start, previousMonthInterval.end),
          0,
        );
      const previousMonthExpenses = transactions
        .filter((transaction) => transaction.type === "expense")
        .reduce(
          (sum, transaction) =>
            sum + getTransactionAmountInInterval(transaction, settings.currency, previousMonthInterval.start, previousMonthInterval.end),
          0,
        );
      const delta =
        previousMonthExpenses > 0
          ? ((thisMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100
          : 0;

      generated.push({
        sourceKey: `summary-${format(now, "yyyy-MM")}`,
        type: delta <= 0 ? "success" : "info",
        title: t("notifications.spendingSummary"),
        message:
          thisMonthIncome > 0
            ? t("notifications.summaryWithIncome", {
                income: formatCurrency(thisMonthIncome, settings.currency),
                expenses: formatCurrency(thisMonthExpenses, settings.currency),
                trend:
                  delta <= 0
                    ? t("notifications.spendingLess", { delta: Math.abs(delta).toFixed(1) })
                    : t("notifications.spendingMore", { delta: delta.toFixed(1) }),
              })
            : t("notifications.summaryExpensesOnly", {
                expenses: formatCurrency(thisMonthExpenses, settings.currency),
              }),
        payload: { month: format(now, "yyyy-MM") },
      });

      const pinnedGoal = goals.find((goal) => goal.pinned) ?? goals[0];
      const leftover = previousMonthIncome - previousMonthExpenses;
      if (pinnedGoal && leftover > 0) {
        generated.push({
          sourceKey: `leftover-${pinnedGoal.id}-${format(subMonths(now, 1), "yyyy-MM")}`,
          type: "info",
          title: t("notifications.leftoverSuggestion"),
          message: t("notifications.leftoverSuggestionMessage", {
            amount: formatCurrency(leftover, settings.currency),
            goal: pinnedGoal.name,
          }),
          payload: { goalId: pinnedGoal.id, month: format(subMonths(now, 1), "yyyy-MM"), leftover },
        });
      }
    }

    transactions
      .filter((transaction) => transaction.type === "income")
      .slice(0, 5)
      .forEach((transaction) => {
        generated.push({
          sourceKey: `income-${transaction.id}`,
          type: "success",
          title: t("notifications.incomeRecorded"),
          message: t("notifications.incomeAdded", {
            name: transaction.name,
            amount: formatCurrency(
              getTransactionAmountInCurrency(transaction, settings.currency),
              settings.currency,
            ),
          }),
          payload: { transactionId: transaction.id },
          createdAt: transaction.createdAt,
        });
      });

    const syncData = async () => {
      const synced = await syncNotifications(user.id, generated);
      if (isMounted) {
        setNotifications(synced.slice(0, 20));
      }
    };

    void syncData();

    return () => {
      isMounted = false;
    };
  }, [budgetCategories, goals, settings, subscriptions, t, transactions, user]);

  useEffect(() => {
    if (!user || !settings) {
      return;
    }

    let isMounted = true;
    const refreshInbox = async () => {
      const data = await listNotifications(user.id);
      if (isMounted) {
        setNotifications(data.slice(0, 20));
      }
    };

    const handler = () => {
      void refreshInbox();
    };

    window.addEventListener("notificationsChanged", handler);
    return () => {
      isMounted = false;
      window.removeEventListener("notificationsChanged", handler);
    };
  }, [settings, user]);

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="size-5 text-primary" />;
      case "warning":
        return <AlertCircle className="size-5 text-orange-500" />;
      case "info":
        return <Info className="size-5 text-blue-500" />;
      case "alert":
        return <AlertCircle className="size-5 text-destructive" />;
      default:
        return <Bell className="size-5" />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-primary/10 border-primary/20";
      case "warning":
        return "bg-orange-50 border-orange-200";
      case "info":
        return "bg-blue-50 border-blue-200";
      case "alert":
        return "bg-destructive/10 border-destructive/20";
      default:
        return "bg-muted border-border";
    }
  };

  const handleMarkAsRead = async (id: string) => {
    if (!user) return;

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id && !notification.readAt
          ? { ...notification, readAt: new Date().toISOString() }
          : notification,
      ),
    );
    await markNotificationRead(user.id, id);
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;

    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, readAt: notification.readAt ?? readAt })),
    );
    await markAllNotificationsRead(user.id);
  };

  const handleDismiss = async (id: string) => {
    if (!user) return;

    setNotifications((current) => current.filter((notification) => notification.id !== id));
    await dismissNotification(user.id, id);
  };

  const handleNotificationAction = async (notification: AppNotification) => {
    const route = typeof notification.payload.route === "string" ? notification.payload.route : null;
    if (!route) {
      return;
    }

    await handleMarkAsRead(notification.id);
    setIsOpen(false);
    navigate(route);
  };

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => !notification.dismissedAt).slice(0, 8),
    [notifications],
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setIsOpen(false)} />

          <div className="fixed top-32 right-4 w-96 max-w-[calc(100vw-2rem)] bg-card rounded-2xl shadow-2xl border border-border z-50 max-h-[70vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3>{t("notifications.title")}</h3>
                {unreadCount > 0 ? (
                  <p className="text-sm text-muted-foreground">{t("notifications.unread", { count: unreadCount })}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 ? (
                  <button onClick={handleMarkAllAsRead} className="text-xs text-primary hover:underline">
                    {t("notifications.markAllRead")}
                  </button>
                ) : null}
                <button onClick={() => setIsOpen(false)} className="hover:bg-muted p-2 rounded-lg transition-colors">
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {visibleNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="size-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t("notifications.empty")}</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {visibleNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${getBackgroundColor(notification.type)} ${!notification.readAt ? "shadow-sm" : "opacity-70"}`}
                      onClick={() => void handleMarkAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm">
                              {notification.title}
                              {!notification.readAt ? (
                                <span className="inline-block w-2 h-2 bg-primary rounded-full ml-2" />
                              ) : null}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDismiss(notification.id);
                              }}
                              className="hover:bg-white/50 p-1 rounded transition-colors"
                            >
                              <X className="size-3 text-muted-foreground" />
                            </button>
                          </div>
                          <p className="text-sm text-foreground/80 mb-2">{notification.message}</p>
                          {typeof notification.payload.actionLabel === "string" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleNotificationAction(notification);
                              }}
                              className="mb-2 inline-flex rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:opacity-90 transition-opacity"
                            >
                              {notification.payload.actionLabel}
                            </button>
                          ) : null}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
