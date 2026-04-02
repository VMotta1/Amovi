import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  X,
  AlertCircle,
  Info,
  CheckCircle,
} from "lucide-react";
import { differenceInCalendarDays, endOfMonth, formatDistanceToNow, isWithinInterval, startOfMonth, subMonths } from "date-fns";
import { formatCurrency } from "../lib/currency";
import { useAuth } from "../providers/AuthProvider";
import {
  getBudgetAmountInCurrency,
  getSubscriptionAmountInCurrency,
  listBudgetCategories,
  listSavingsGoals,
  listSubscriptions,
} from "../lib/finance";
import { getTransactionAmountInCurrency, listTransactions, parseTransactionDate } from "../lib/transactions";
import { getUserSettings } from "../lib/settings";
import { useI18n } from "../providers/I18nProvider";
import type { BudgetCategory, SavingsGoal, Subscription } from "../types/finance";
import type { UserSettings } from "../types/settings";
import type { Transaction } from "../types/transactions";

interface Notification {
  id: string;
  type: "info" | "warning" | "success" | "alert";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const defaultSettings: UserSettings = {
  userId: "",
  language: "English",
  currency: "USD",
  dateFormat: "MM/DD/YYYY",
  darkMode: false,
  budgetAlerts: true,
  subscriptionReminders: true,
  weeklySummary: true,
  savingsMilestones: true,
};

export default function NotificationsPanel() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setBudgetCategories([]);
      setGoals([]);
      setSubscriptions([]);
      setSettings(null);
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

        if (!isMounted) {
          return;
        }

        setTransactions(transactionData);
        setBudgetCategories(categoryData);
        setGoals(goalData);
        setSubscriptions(subscriptionData);
        setSettings(settingsData);
      } catch {
        if (!isMounted) {
          return;
        }

        setTransactions([]);
        setBudgetCategories([]);
        setGoals([]);
        setSubscriptions([]);
        setSettings({ ...defaultSettings, userId: user.id });
      }
    };

    loadData();

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

  const derivedNotifications = useMemo(() => {
    if (!settings) {
      return [] as Notification[];
    }

    const items: Notification[] = [];
    const now = new Date();

    const currentMonthExpenses = transactions.filter(
      (transaction) =>
        transaction.type === "expense" &&
        isWithinInterval(parseTransactionDate(transaction.occurredOn), {
          start: startOfMonth(now),
          end: endOfMonth(now),
        }),
    );

    if (settings.savingsMilestones) {
      const pinnedGoal = goals.find((goal) => goal.pinned) ?? goals[0];
      if (pinnedGoal) {
        const progress = pinnedGoal.targetAmount > 0 ? (pinnedGoal.currentAmount / pinnedGoal.targetAmount) * 100 : 0;
        items.push({
          id: `goal-${pinnedGoal.id}`,
          type: progress >= 100 ? "success" : "info",
          title: progress >= 100 ? t("notifications.goalCompleted") : t("notifications.goalProgress"),
          message:
            progress >= 100
              ? t("notifications.goalFunded", { name: pinnedGoal.name })
              : t("notifications.goalToward", { progress: progress.toFixed(1), name: pinnedGoal.name }),
          time: formatDistanceToNow(new Date(pinnedGoal.createdAt), { addSuffix: true }),
          read: false,
        });
      }
    }

    if (settings.budgetAlerts) {
      budgetCategories.forEach((category) => {
        const displayBudget = getBudgetAmountInCurrency(category, settings.currency);
        const spent = currentMonthExpenses
          .filter((transaction) => transaction.category.toLowerCase() === category.name.toLowerCase())
          .reduce((sum, transaction) => sum + getTransactionAmountInCurrency(transaction, settings.currency), 0);

        if (displayBudget > 0 && spent / displayBudget >= 0.8) {
          items.push({
            id: `budget-${category.id}`,
            type: spent > displayBudget ? "alert" : "warning",
            title: spent > displayBudget ? t("notifications.overBudget") : t("notifications.budgetAlert"),
            message:
              spent > displayBudget
                ? t("notifications.overBudgetMessage", {
                    name: category.name,
                    amount: formatCurrency(spent - displayBudget, settings.currency),
                  })
                : t("notifications.budgetUsedMessage", {
                    name: category.name,
                    progress: ((spent / displayBudget) * 100).toFixed(0),
                  }),
            time: t("notifications.thisMonth"),
            read: false,
          });
        }
      });
    }

    if (settings.subscriptionReminders) {
      subscriptions.forEach((subscription) => {
        const daysUntilRenewal = differenceInCalendarDays(new Date(subscription.renewalDate), now);
        if (daysUntilRenewal >= 0 && daysUntilRenewal <= 3) {
          items.push({
            id: `subscription-${subscription.id}`,
            type: "alert",
            title: t("notifications.upcomingRenewal"),
            message: t("notifications.renewsIn", {
              name: subscription.name,
              amount: formatCurrency(getSubscriptionAmountInCurrency(subscription, settings.currency), settings.currency),
              days: daysUntilRenewal,
              suffix: daysUntilRenewal === 1 ? "" : "s",
            }),
            time: `renews ${formatDistanceToNow(new Date(subscription.renewalDate), { addSuffix: true })}`,
            read: false,
          });
        }
      });
    }

    if (settings.weeklySummary) {
      const thisMonth = transactions.filter((transaction) =>
        isWithinInterval(parseTransactionDate(transaction.occurredOn), {
          start: startOfMonth(now),
          end: endOfMonth(now),
        }),
      );
      const thisMonthIncome = thisMonth
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + getTransactionAmountInCurrency(transaction, settings.currency), 0);
      const thisMonthExpenses = thisMonth
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + getTransactionAmountInCurrency(transaction, settings.currency), 0);

      const previousMonthInterval = {
        start: startOfMonth(subMonths(now, 1)),
        end: endOfMonth(subMonths(now, 1)),
      };
      const previousMonthExpenses = transactions
        .filter(
          (transaction) =>
            transaction.type === "expense" &&
            isWithinInterval(parseTransactionDate(transaction.occurredOn), previousMonthInterval),
        )
        .reduce((sum, transaction) => sum + getTransactionAmountInCurrency(transaction, settings.currency), 0);

      const delta = previousMonthExpenses > 0
        ? ((thisMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100
        : 0;

      items.push({
        id: "summary-monthly",
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
        time: t("notifications.updatedRecently"),
        read: false,
      });
    }

    const latestIncome = transactions.find((transaction) => transaction.type === "income");
    if (latestIncome) {
      items.push({
        id: `income-${latestIncome.id}`,
        type: "success",
        title: t("notifications.incomeRecorded"),
        message: t("notifications.incomeAdded", {
          name: latestIncome.name,
          amount: formatCurrency(getTransactionAmountInCurrency(latestIncome, settings.currency), settings.currency),
        }),
        time: formatDistanceToNow(parseTransactionDate(latestIncome.occurredOn), { addSuffix: true }),
        read: false,
      });
    }

    return items
      .filter((notification) => !dismissedIds.includes(notification.id))
      .map((notification) => ({
        ...notification,
        read: readIds.includes(notification.id),
      }))
      .slice(0, 8);
  }, [budgetCategories, dismissedIds, goals, readIds, settings, subscriptions, transactions]);

  const unreadCount = derivedNotifications.filter((notification) => !notification.read).length;

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

  const markAsRead = (id: string) => {
    setReadIds((current) => (current.includes(id) ? current : [...current, id]));
  };

  const markAllAsRead = () => {
    setReadIds(derivedNotifications.map((notification) => notification.id));
  };

  const deleteNotification = (id: string) => {
    setDismissedIds((current) => [...current, id]);
  };

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

          <div className="fixed top-16 right-4 w-96 max-w-[calc(100vw-2rem)] bg-card rounded-2xl shadow-2xl border border-border z-50 max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3>{t("notifications.title")}</h3>
                {unreadCount > 0 ? <p className="text-sm text-muted-foreground">{t("notifications.unread", { count: unreadCount })}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 ? (
                  <button onClick={markAllAsRead} className="text-xs text-primary hover:underline">
                    {t("notifications.markAllRead")}
                  </button>
                ) : null}
                <button onClick={() => setIsOpen(false)} className="hover:bg-muted p-2 rounded-lg transition-colors">
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {derivedNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="size-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t("notifications.empty")}</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {derivedNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${getBackgroundColor(notification.type)} ${!notification.read ? "shadow-sm" : "opacity-70"}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm">
                              {notification.title}
                              {!notification.read ? (
                                <span className="inline-block w-2 h-2 bg-primary rounded-full ml-2" />
                              ) : null}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="hover:bg-white/50 p-1 rounded transition-colors"
                            >
                              <X className="size-3 text-muted-foreground" />
                            </button>
                          </div>
                          <p className="text-sm text-foreground/80 mb-2">{notification.message}</p>
                          <p className="text-xs text-muted-foreground">{notification.time}</p>
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
