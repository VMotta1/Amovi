import { useEffect, useMemo, useState } from "react";
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  DollarSign,
  Tag,
  Utensils,
  Book,
  Bus,
  Film,
  ShoppingCart,
  Coffee,
  Home as HomeIcon,
  Music,
  Smartphone,
  Heart,
  Pin,
  PinOff,
  PiggyBank,
} from "lucide-react";
import { endOfMonth, isWithinInterval, startOfMonth } from "date-fns";
import { useUserCurrency } from "../hooks/useUserCurrency";
import { formatCurrency } from "../lib/currency";
import {
  createBudgetCategory,
  createGoalContribution,
  createSavingsGoal,
  getCachedBudgetCategories,
  getCachedGoalContributions,
  getCachedSavingsGoals,
  getBudgetAmountInCurrency,
  getGoalContributionAmountInCurrency,
  getSavingsGoalAmountsInCurrency,
  listBudgetCategories,
  listGoalContributions,
  listSavingsGoals,
  removeBudgetCategory,
  removeGoalContribution,
  removeSavingsGoal,
  updateGoalContribution,
  updateBudgetCategory,
  updateSavingsGoal,
} from "../lib/finance";
import { getCachedTransactions, getTransactionAmountInCurrency, listTransactions, parseTransactionDate } from "../lib/transactions";
import { useAuth } from "../providers/AuthProvider";
import { useI18n } from "../providers/I18nProvider";
import type { BudgetCategory, GoalContribution, SavingsGoal } from "../types/finance";
import type { Transaction } from "../types/transactions";

const iconOptions = [
  { value: "utensils", label: "Food", icon: Utensils },
  { value: "book", label: "Books", icon: Book },
  { value: "bus", label: "Transport", icon: Bus },
  { value: "film", label: "Entertainment", icon: Film },
  { value: "shopping", label: "Shopping", icon: ShoppingCart },
  { value: "coffee", label: "Coffee", icon: Coffee },
  { value: "home", label: "Home", icon: HomeIcon },
  { value: "music", label: "Music", icon: Music },
  { value: "smartphone", label: "Smartphone", icon: Smartphone },
  { value: "heart", label: "Heart", icon: Heart },
];

const colorOptions = [
  "#2d6a4f",
  "#52b788",
  "#74c69d",
  "#95d5b2",
  "#b7e4c7",
  "#40916c",
  "#1b4332",
  "#081c15",
  "#52796f",
  "#84a98c",
];

const emojiOptions = ["💻", "📱", "🎮", "🚗", "✈️", "🏠", "🎓", "💍", "🎸", "📷", "🚲", "⌚", "🎯", "💰"];

interface BudgetCategoryWithSpent extends BudgetCategory {
  spent: number;
  displayBudget: number;
  isUnbudgeted: boolean;
}

export default function BudgetGoals() {
  const { user } = useAuth();
  const { t } = useI18n();
  const currency = useUserCurrency();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goalContributions, setGoalContributions] = useState<Record<string, GoalContribution[]>>({});
  const [loadedContributionGoalIds, setLoadedContributionGoalIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("");
  const [goalEmoji, setGoalEmoji] = useState("💻");
  const [addingGoal, setAddingGoal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editBudget, setEditBudget] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryBudget, setNewCategoryBudget] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("shopping");
  const [newCategoryColor, setNewCategoryColor] = useState("#DDEB9D");
  const [contributionGoalId, setContributionGoalId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionNote, setContributionNote] = useState("");
  const [editingContribution, setEditingContribution] = useState<GoalContribution | null>(null);
  const [editingContributionAmount, setEditingContributionAmount] = useState("");
  const [editingContributionNote, setEditingContributionNote] = useState("");
  const [categoryPinFeedback, setCategoryPinFeedback] = useState("");

  const getDefaultIconForCategory = (categoryName: string) => {
    const normalized = categoryName.trim().toLowerCase();
    if (normalized.includes("food") || normalized.includes("alimentation") || normalized.includes("restaurant")) {
      return "utensils";
    }
    if (normalized.includes("book") || normalized.includes("livre")) {
      return "book";
    }
    if (normalized.includes("transport") || normalized.includes("bus") || normalized.includes("train")) {
      return "bus";
    }
    if (normalized.includes("entertainment") || normalized.includes("loisir") || normalized.includes("movie")) {
      return "film";
    }
    if (normalized.includes("shop") || normalized.includes("achat")) {
      return "shopping";
    }
    if (normalized.includes("coffee") || normalized.includes("cafe")) {
      return "coffee";
    }
    if (normalized.includes("home") || normalized.includes("housing") || normalized.includes("logement")) {
      return "home";
    }
    if (normalized.includes("music") || normalized.includes("spotify")) {
      return "music";
    }
    if (normalized.includes("phone") || normalized.includes("mobile")) {
      return "smartphone";
    }
    return "shopping";
  };

  useEffect(() => {
    if (!user) {
      setGoals([]);
      setCategories([]);
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const cachedGoals = getCachedSavingsGoals(user.id);
    const cachedCategories = getCachedBudgetCategories(user.id);
    const cachedTransactions = getCachedTransactions(user.id);
    const cachedContributionEntries = (cachedGoals ?? [])
      .map((goal) => [goal.id, getCachedGoalContributions(user.id, goal.id)] as const)
      .filter((entry): entry is readonly [string, GoalContribution[]] => Array.isArray(entry[1]));

    if (cachedGoals) setGoals(cachedGoals);
    if (cachedCategories) setCategories(cachedCategories);
    if (cachedTransactions) setTransactions(cachedTransactions);
    if (cachedContributionEntries.length > 0) {
      setGoalContributions(Object.fromEntries(cachedContributionEntries));
      setLoadedContributionGoalIds(new Set(cachedContributionEntries.map(([goalId]) => goalId)));
    }
    if (cachedGoals || cachedCategories || cachedTransactions) {
      setIsLoading(false);
    }

    const missingCachedContributions =
      cachedGoals?.some((goal) => !getCachedGoalContributions(user.id, goal.id)) ?? false;

    const loadData = async (showLoading = true) => {
      if (showLoading && !(cachedGoals || cachedCategories || cachedTransactions)) {
        setIsLoading(true);
      }

      try {
        const [goalData, categoryData, transactionData] = await Promise.all([
          listSavingsGoals(user.id),
          listBudgetCategories(user.id),
          listTransactions(user.id),
        ]);

        if (!isMounted) {
          return;
        }

        setGoals(goalData);
        setCategories(categoryData);
        setTransactions(transactionData);

        const contributionEntries = await Promise.all(
          goalData.map(async (goal) => [goal.id, await listGoalContributions(user.id, goal.id)] as const),
        );
        setGoalContributions(Object.fromEntries(contributionEntries));
        setLoadedContributionGoalIds(new Set(goalData.map((goal) => goal.id)));
      } finally {
        if (isMounted && showLoading) {
          setIsLoading(false);
        }
      }
    };

    if (!(cachedGoals || cachedCategories || cachedTransactions)) {
      loadData();
    } else if (missingCachedContributions) {
      loadData(false);
    }

    const reload = () => {
      loadData(false);
    };

    window.addEventListener("transactionsChanged", reload);
    window.addEventListener("financialDataChanged", reload);

    return () => {
      isMounted = false;
      window.removeEventListener("transactionsChanged", reload);
      window.removeEventListener("financialDataChanged", reload);
    };
  }, [user]);

  const refreshGoalsAndContributions = async () => {
    if (!user) {
      return;
    }

    const goalData = await listSavingsGoals(user.id);
    setGoals(goalData);

    const contributionEntries = await Promise.all(
      goalData.map(async (goal) => [goal.id, await listGoalContributions(user.id, goal.id)] as const),
    );
    setGoalContributions(Object.fromEntries(contributionEntries));
    setLoadedContributionGoalIds(new Set(goalData.map((goal) => goal.id)));
  };

  const categoriesWithSpent = useMemo<BudgetCategoryWithSpent[]>(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const monthlyExpenses = transactions.filter(
      (transaction) =>
        transaction.type === "expense" &&
        isWithinInterval(parseTransactionDate(transaction.occurredOn), { start, end }),
    );

    const savedCategories = categories.map((category) => {
      const displayBudget = getBudgetAmountInCurrency(category, currency);
      return {
        ...category,
        displayBudget,
        isUnbudgeted: false,
        spent: monthlyExpenses
          .filter((transaction) => transaction.category.toLowerCase() === category.name.toLowerCase())
          .reduce((sum, transaction) => sum + getTransactionAmountInCurrency(transaction, currency), 0),
      };
    });

    const missingCategories = Array.from(
      new Set(
        monthlyExpenses
          .map((transaction) => transaction.category.trim())
          .filter(
            (name) =>
              name &&
              !savedCategories.some((category) => category.name.toLowerCase() === name.toLowerCase()),
          ),
      ),
    ).map((name) => ({
      id: `missing-${name.toLowerCase()}`,
      userId: user?.id ?? "",
      name,
      budget: 0,
      currency,
      originalBudget: 0,
      icon: getDefaultIconForCategory(name),
      color: "#95d5b2",
      createdAt: "",
      displayBudget: 0,
      isUnbudgeted: true,
      spent: monthlyExpenses
        .filter((transaction) => transaction.category.toLowerCase() === name.toLowerCase())
        .reduce((sum, transaction) => sum + getTransactionAmountInCurrency(transaction, currency), 0),
    }));

    return [...savedCategories, ...missingCategories];
  }, [categories, currency, transactions, user?.id]);

  const totalBudget = categoriesWithSpent.reduce((sum, category) => sum + category.displayBudget, 0);
  const totalSpent = categoriesWithSpent.reduce((sum, category) => sum + category.spent, 0);
  const totalGoalsTarget = goals.reduce(
    (sum, goal) => sum + getSavingsGoalAmountsInCurrency(goal, currency).targetAmount,
    0,
  );
  const totalGoalsSaved = goals.reduce(
    (sum, goal) => sum + getSavingsGoalAmountsInCurrency(goal, currency).currentAmount,
    0,
  );

  const getIcon = (iconName: string) => {
    const option = iconOptions.find((opt) => opt.value === iconName);
    return option ? option.icon : ShoppingCart;
  };

  const resetGoalForm = () => {
    setGoalName("");
    setGoalAmount("");
    setGoalCurrent("");
    setGoalEmoji("💻");
    setEditingGoal(null);
    setAddingGoal(false);
  };

  const resetCategoryForm = () => {
    setNewCategoryName("");
    setNewCategoryBudget("");
    setNewCategoryIcon("shopping");
    setNewCategoryColor("#95d5b2");
    setEditBudget("");
    setEditingCategory(null);
    setAddingCategory(false);
  };

  const handleSaveGoal = async () => {
    if (!user || !goalName || !goalAmount) {
      return;
    }

    if (editingGoal) {
      const updated = await updateSavingsGoal(user.id, editingGoal, {
        name: goalName,
        targetAmount: parseFloat(goalAmount),
        currency,
        originalTargetAmount: parseFloat(goalAmount),
        emoji: goalEmoji,
      });
      setGoals(goals.map((goal) => (goal.id === editingGoal ? updated : goal)));
    } else {
      const created = await createSavingsGoal(user.id, {
        name: goalName,
        targetAmount: parseFloat(goalAmount),
        currentAmount: parseFloat(goalCurrent) || 0,
        currency,
        originalTargetAmount: parseFloat(goalAmount),
        originalCurrentAmount: parseFloat(goalCurrent) || 0,
        emoji: goalEmoji,
      });
      setGoals([...goals, created]);
    }

    resetGoalForm();
    window.dispatchEvent(new Event("financialDataChanged"));
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user || !confirm(t("budgetGoalsPage.confirmDeleteGoal"))) {
      return;
    }

    await removeSavingsGoal(user.id, goalId);
    setGoals(goals.filter((goal) => goal.id !== goalId));
    setGoalContributions((current) => {
      const next = { ...current };
      delete next[goalId];
      return next;
    });
    window.dispatchEvent(new Event("financialDataChanged"));
  };

  const handlePinGoal = async (goalId: string) => {
    if (!user) {
      return;
    }

    const goal = goals.find((item) => item.id === goalId);
    if (!goal) {
      return;
    }

    const shouldPin = !goal.pinned;
    await updateSavingsGoal(user.id, goalId, { pinned: shouldPin });

    if (shouldPin) {
      setGoals(
        goals.map((item) => ({
          ...item,
          pinned: item.id === goalId,
        })),
      );
    } else {
      setGoals(goals.map((item) => (item.id === goalId ? { ...item, pinned: false } : item)));
    }

    window.dispatchEvent(new Event("financialDataChanged"));
  };

  const handleSaveBudget = async (categoryId: string) => {
    if (!user || !editBudget) {
      return;
    }

    const updated = await updateBudgetCategory(user.id, categoryId, {
      budget: parseFloat(editBudget),
      currency,
      originalBudget: parseFloat(editBudget),
    });

    setCategories(categories.map((category) => (category.id === categoryId ? updated : category)));
    setEditingCategory(null);
    setEditBudget("");
    window.dispatchEvent(new Event("financialDataChanged"));
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!user || !confirm(t("budgetGoalsPage.confirmDeleteCategory"))) {
      return;
    }

    await removeBudgetCategory(user.id, categoryId);
    setCategories(categories.filter((category) => category.id !== categoryId));
    window.dispatchEvent(new Event("financialDataChanged"));
  };

  const handleAddCategory = async () => {
    if (!user || !newCategoryName || !newCategoryBudget) {
      alert(t("budgetGoalsPage.fillAllFields"));
      return;
    }

    const trimmedName = newCategoryName.trim();
    const existingCategory = categories.find(
      (category) => category.name.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (existingCategory) {
      const updated = await updateBudgetCategory(user.id, existingCategory.id, {
        name: existingCategory.name,
        budget: parseFloat(newCategoryBudget),
        currency,
        originalBudget: parseFloat(newCategoryBudget),
        icon: newCategoryIcon,
        color: newCategoryColor,
      });

      setCategories(
        categories.map((category) => (category.id === existingCategory.id ? updated : category)),
      );
      resetCategoryForm();
      window.dispatchEvent(new Event("financialDataChanged"));
      return;
    }

    const created = await createBudgetCategory(user.id, {
      name: trimmedName,
      budget: parseFloat(newCategoryBudget),
      currency,
      originalBudget: parseFloat(newCategoryBudget),
      icon: newCategoryIcon,
      color: newCategoryColor,
    });

    setCategories([...categories, created]);
    resetCategoryForm();
    window.dispatchEvent(new Event("financialDataChanged"));
  };

  const DEFAULT_BUDGET_AMOUNTS: Record<string, number> = {
    "food & groceries": 400,
    "transport": 150,
    "rent & housing": 1200,
    "utilities": 200,
    "school / books": 150,
    "entertainment": 150,
    "shopping": 200,
    "health": 100,
    "subscriptions": 60,
    "other": 100,
  };

  const handleResetBudgetsToDefaults = async () => {
    if (!user || !confirm("Reset all budget category amounts to the new defaults? This will update every category to the new suggested amounts.")) {
      return;
    }

    const updates = categories.map((category) => {
      const key = category.name.toLowerCase().trim();
      const newAmount = DEFAULT_BUDGET_AMOUNTS[key];
      if (newAmount === undefined) return null;
      return updateBudgetCategory(user.id, category.id, {
        budget: newAmount,
        currency,
        originalBudget: newAmount,
      });
    }).filter(Boolean);

    const updated = await Promise.all(updates as Promise<BudgetCategory>[]);
    setCategories((prev) =>
      prev.map((c) => {
        const u = updated.find((uc) => uc.id === c.id);
        return u ?? c;
      })
    );
    window.dispatchEvent(new Event("financialDataChanged"));
  };

  const handlePromptSetBudget = (categoryName: string) => {
    setNewCategoryName(categoryName);
    setNewCategoryBudget("");
    setNewCategoryIcon(getDefaultIconForCategory(categoryName));
    setNewCategoryColor("#95d5b2");
    setAddingCategory(true);
  };

  const resetContributionForm = () => {
    setContributionGoalId(null);
    setContributionAmount("");
    setContributionNote("");
  };

  const resetEditingContributionForm = () => {
    setEditingContribution(null);
    setEditingContributionAmount("");
    setEditingContributionNote("");
  };

  const handleAddContribution = async () => {
    if (!user || !contributionGoalId || !contributionAmount) {
      return;
    }

    const contribution = await createGoalContribution(user.id, contributionGoalId, {
      amount: parseFloat(contributionAmount),
      currency,
      originalAmount: parseFloat(contributionAmount),
      contributionType: "manual",
      source: "budget_goals_modal",
      note: contributionNote || null,
    });

    setGoalContributions((current) => ({
      ...current,
      [contributionGoalId]: [contribution, ...(current[contributionGoalId] ?? [])],
    }));
    await refreshGoalsAndContributions();
    resetContributionForm();
    window.dispatchEvent(new Event("financialDataChanged"));
  };

  const handleUpdateContribution = async () => {
    if (!user || !editingContribution || !editingContributionAmount) {
      return;
    }

    await updateGoalContribution(user.id, editingContribution.goalId, editingContribution.id, {
      amount: parseFloat(editingContributionAmount),
      currency: editingContribution.currency,
      originalAmount: parseFloat(editingContributionAmount),
      note: editingContributionNote || null,
      source: editingContribution.source,
      contributionType: editingContribution.contributionType,
      occurredOn: editingContribution.occurredOn,
    });

    await refreshGoalsAndContributions();
    resetEditingContributionForm();
    window.dispatchEvent(new Event("financialDataChanged"));
  };

  const handleDeleteContribution = async (contribution: GoalContribution) => {
    if (!user || !confirm(t("budgetGoalsPage.confirmDeleteContribution"))) {
      return;
    }

    await removeGoalContribution(user.id, contribution.goalId, contribution.id);
    await refreshGoalsAndContributions();
    if (editingContribution?.id === contribution.id) {
      resetEditingContributionForm();
    }
    window.dispatchEvent(new Event("financialDataChanged"));
  };

  return (
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-primary text-white rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Target className="size-5" />
              <h3 className="text-white">{t("budgetGoalsPage.savingsGoals")}</h3>
            </div>
            <div className="text-3xl mb-1">{formatCurrency(totalGoalsSaved, currency)}</div>
            <div className="text-white/80 text-sm">{t("budgetGoalsPage.totalLabel", { amount: formatCurrency(totalGoalsTarget, currency) })}</div>
            <div className="mt-3 w-full bg-white/20 rounded-full h-2">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${totalGoalsTarget ? (totalGoalsSaved / totalGoalsTarget) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="size-5 text-primary" />
              <h3>{t("budgetGoalsPage.monthlyBudget")}</h3>
            </div>
            <div className="text-3xl mb-1">{formatCurrency(totalSpent, currency)}</div>
            <div className="text-muted-foreground text-sm">{t("budgetGoalsPage.budgetLabel", { amount: formatCurrency(totalBudget, currency) })}</div>
            <div className="mt-3 w-full bg-muted rounded-full h-2">
              <div
                className={`h-full rounded-full transition-all ${
                  totalSpent > totalBudget ? "bg-destructive" : "bg-primary"
                }`}
                style={{ width: `${Math.min(totalBudget ? (totalSpent / totalBudget) * 100 : 0, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3>{t("budgetGoalsPage.yourSavingsGoals")}</h3>
            <button
              onClick={() => {
                setAddingGoal(true);
                setGoalName("");
                setGoalAmount("");
                setGoalCurrent("");
                setGoalEmoji("💻");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="size-4" />
              {t("budgetGoalsPage.addGoal")}
            </button>
          </div>

          {isLoading ? (
            <div className="rounded-lg bg-secondary p-4 text-sm text-muted-foreground">{t("budgetGoalsPage.loadingGoals")}</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {goals.length === 0 ? (
                <div className="rounded-lg bg-secondary p-4 text-sm text-muted-foreground">
                  {t("budgetGoalsPage.noGoals")}
                </div>
              ) : (
                goals.map((goal) => {
                  const displayGoal = getSavingsGoalAmountsInCurrency(goal, currency);
                  const progress = displayGoal.targetAmount
                    ? (displayGoal.currentAmount / displayGoal.targetAmount) * 100
                    : 0;

                  return (
                    <div key={goal.id} className="bg-secondary rounded-lg p-4">
                      {editingGoal === goal.id ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-2xl">
                              {goalEmoji}
                            </div>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={goalName}
                                onChange={(e) => setGoalName(e.target.value)}
                                className="w-full px-3 py-1 bg-input-background rounded border border-border focus:border-primary focus:outline-none"
                                placeholder={t("budgetGoalsPage.goalName")}
                              />
                            </div>
                          </div>

                          <input
                            type="number"
                            step="0.01"
                            value={goalAmount}
                            onChange={(e) => setGoalAmount(e.target.value)}
                            className="w-full px-3 py-2 bg-input-background rounded border border-border focus:border-primary focus:outline-none"
                            placeholder={t("budgetGoalsPage.targetAmount")}
                          />

                          <input
                            type="text"
                            value={formatCurrency(displayGoal.currentAmount, currency)}
                            readOnly
                            className="w-full px-3 py-2 bg-muted rounded border border-border text-muted-foreground focus:outline-none"
                          />
                          <p className="text-xs text-muted-foreground">{t("budgetGoalsPage.currentAmountManagedByContributions")}</p>

                          <div className="grid grid-cols-6 gap-2">
                            {emojiOptions.slice(0, 6).map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => setGoalEmoji(emoji)}
                                className={`text-xl p-2 rounded transition-all ${
                                  goalEmoji === emoji ? "bg-primary/20 scale-110" : "bg-muted hover:bg-accent"
                                }`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveGoal}
                              className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg hover:opacity-90 flex items-center justify-center gap-1"
                            >
                              <Check className="size-4" />
                              {t("budgetGoalsPage.save")}
                            </button>
                            <button
                              onClick={resetGoalForm}
                              className="px-4 bg-muted hover:bg-accent py-2 rounded-lg"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-2xl">
                                {goal.emoji}
                              </div>
                              <div>
                                <div className="font-medium">{goal.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {formatCurrency(displayGoal.currentAmount, currency)} / {formatCurrency(displayGoal.targetAmount, currency)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingGoal(goal.id);
                                  setGoalName(goal.name);
                                  setGoalAmount(String(goal.originalTargetAmount));
                                  setGoalCurrent("");
                                  setGoalEmoji(goal.emoji);
                                }}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                              >
                                <Edit2 className="size-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteGoal(goal.id)}
                                className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                              >
                                <Trash2 className="size-4" />
                              </button>
                              <button
                                onClick={() => setContributionGoalId(goal.id)}
                                className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                              >
                                <PiggyBank className="size-4" />
                              </button>
                              <button
                                onClick={() => handlePinGoal(goal.id)}
                                className={`p-2 hover:bg-muted rounded-lg transition-colors ${
                                  goal.pinned ? "bg-primary text-primary-foreground" : ""
                                }`}
                              >
                                {goal.pinned ? <Pin className="size-4" /> : <PinOff className="size-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>

                          <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t("budgetGoalsPage.complete", { progress: progress.toFixed(0) })}</span>
                            <span className="text-muted-foreground">
                              {t("budgetGoalsPage.toGo", { amount: formatCurrency(displayGoal.targetAmount - displayGoal.currentAmount, currency) })}
                            </span>
                          </div>
                          <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">{t("budgetGoalsPage.recentContributions")}</span>
                              <button
                                onClick={() => setContributionGoalId(goal.id)}
                                className="text-xs text-primary hover:underline"
                              >
                                {t("budgetGoalsPage.contribute")}
                              </button>
                            </div>
                            {!loadedContributionGoalIds.has(goal.id) ? (
                              <div className="text-xs text-muted-foreground">{t("budgetGoalsPage.loading")}</div>
                            ) : (goalContributions[goal.id] ?? []).length === 0 ? (
                              <div className="text-xs text-muted-foreground">{t("budgetGoalsPage.noContributions")}</div>
                            ) : (
                              <div className="space-y-1">
                                {(goalContributions[goal.id] ?? []).slice(0, 4).map((contribution) => (
                                  <div key={contribution.id} className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate">
                                        {contribution.contributionType === "initial"
                                          ? t("budgetGoalsPage.initialContribution")
                                          : contribution.note || t("budgetGoalsPage.contribute")}
                                      </div>
                                      <div className="text-[11px] text-muted-foreground/80">
                                        {contribution.occurredOn}
                                      </div>
                                    </div>
                                    <span>{formatCurrency(getGoalContributionAmountInCurrency(contribution, currency), currency)}</span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          setEditingContribution(contribution);
                                          setEditingContributionAmount(String(contribution.originalAmount));
                                          setEditingContributionNote(contribution.note ?? "");
                                        }}
                                        className="p-1 hover:bg-muted rounded transition-colors"
                                        aria-label={t("budgetGoalsPage.editContribution")}
                                      >
                                        <Edit2 className="size-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteContribution(contribution)}
                                        className="p-1 hover:bg-destructive/10 text-destructive rounded transition-colors"
                                        aria-label={t("budgetGoalsPage.deleteContribution")}
                                      >
                                        <Trash2 className="size-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3>{t("budgetGoalsPage.categoryBudgets")}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetBudgetsToDefaults}
                className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent transition-colors text-sm"
                title="Reset all category budgets to recommended defaults"
              >
                Reset to defaults
              </button>
              <button
                onClick={() => setAddingCategory(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                <Plus className="size-4" />
                {t("budgetGoalsPage.addCategory")}
              </button>
            </div>
          </div>

          {categoryPinFeedback ? (
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
              {categoryPinFeedback}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-lg bg-secondary p-4 text-sm text-muted-foreground">{t("budgetGoalsPage.loadingBudgetCategories")}</div>
          ) : (
            <div className="space-y-3">
              {categoriesWithSpent.length === 0 ? (
                <div className="rounded-lg bg-secondary p-4 text-sm text-muted-foreground">
                  {t("budgetGoalsPage.noBudgetCategories")}
                </div>
              ) : (
                categoriesWithSpent.map((category) => {
                  const percentage = category.displayBudget ? (category.spent / category.displayBudget) * 100 : 0;
                  const isOverBudget = !category.isUnbudgeted && category.spent > category.displayBudget;
                  const IconComponent = getIcon(category.icon);

                  return (
                    <div key={category.id} className="bg-secondary rounded-lg p-4">
                      {editingCategory === category.id ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                              style={{ backgroundColor: category.color }}
                            >
                              <IconComponent className="size-5" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{category.name}</div>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm text-muted-foreground mb-2 block">{t("budgetGoalsPage.monthlyBudgetInput")}</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editBudget}
                              onChange={(e) => setEditBudget(e.target.value)}
                              className="w-full px-4 py-2 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              autoFocus
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveBudget(category.id)}
                              className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                              <Check className="size-4" />
                              {t("budgetGoalsPage.save")}
                            </button>
                            <button
                              onClick={() => {
                                setEditingCategory(null);
                                setEditBudget("");
                              }}
                              className="px-4 bg-muted hover:bg-accent py-2 rounded-lg transition-colors"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                                style={{ backgroundColor: category.color }}
                              >
                                <IconComponent className="size-5" />
                              </div>
                              <div>
                                <div className="font-medium">{category.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {category.isUnbudgeted
                                    ? formatCurrency(category.spent, currency)
                                    : `${formatCurrency(category.spent, currency)} / ${formatCurrency(category.displayBudget, currency)}`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {category.isUnbudgeted ? (
                                <button
                                  onClick={() => handlePromptSetBudget(category.name)}
                                  className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
                                >
                                  {t("budgetGoalsPage.setBudget")}
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={async () => {
                                      if (!user) {
                                        return;
                                      }

                                      const shouldPin = !category.pinned;
                                      const updated = await updateBudgetCategory(user.id, category.id, {
                                        pinned: shouldPin,
                                      });

                                      setCategories((current) =>
                                        current.map((item) =>
                                          item.id === category.id ? updated : item,
                                        ),
                                      );
                                      setCategoryPinFeedback(
                                        shouldPin
                                          ? `${category.name} pinned to Home.`
                                          : `${category.name} removed from Home.`,
                                      );
                                      window.setTimeout(() => setCategoryPinFeedback(""), 2200);
                                      window.dispatchEvent(new Event("financialDataChanged"));
                                    }}
                                    className={`p-2 hover:bg-muted rounded-lg transition-colors ${
                                      category.pinned ? "bg-primary text-primary-foreground" : ""
                                    }`}
                                  >
                                    {category.pinned ? <Pin className="size-4" /> : <PinOff className="size-4" />}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingCategory(category.id);
                                      setEditBudget(String(category.originalBudget));
                                    }}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                  >
                                    <Edit2 className="size-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(category.id)}
                                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {category.isUnbudgeted ? (
                            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                              {t("budgetGoalsPage.setBudgetPrompt", { category: category.name })}
                            </div>
                          ) : (
                            <>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isOverBudget ? "bg-destructive" : "bg-primary"
                                  }`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                              </div>
                              <div className="text-sm text-muted-foreground mt-2 flex items-center justify-between">
                                <span>{t("budgetGoalsPage.used", { value: percentage.toFixed(1) })}</span>
                                {isOverBudget ? (
                                  <span className="text-destructive">⚠️ {t("budgetGoalsPage.over", { amount: formatCurrency(category.spent - category.displayBudget, currency) })}</span>
                                ) : (
                                  <span className="text-primary">{t("budgetGoalsPage.left", { amount: formatCurrency(category.displayBudget - category.spent, currency) })}</span>
                                )}
                              </div>
                              {category.pinned ? (
                                <div className="mt-2 text-xs text-primary">
                                  Pinned to Home
                                </div>
                              ) : null}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {addingGoal ? (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full">
              <div className="sticky top-0 bg-primary text-primary-foreground px-6 py-4 rounded-t-2xl flex items-center justify-between">
                <h2 className="text-white">{t("budgetGoalsPage.addNewGoal")}</h2>
                <button onClick={resetGoalForm} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                  <X className="size-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">{t("budgetGoalsPage.goalNameLabel")}</label>
                  <input
                    type="text"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    placeholder={t("budgetGoalsPage.goalNamePlaceholder")}
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">{t("budgetGoalsPage.targetAmountLabel")}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={goalAmount}
                    onChange={(e) => setGoalAmount(e.target.value)}
                    placeholder="1200"
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">{t("budgetGoalsPage.currentAmountLabel")}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">{t("budgetGoalsPage.initialSavedAmountHelp")}</p>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">{t("budgetGoalsPage.emojiIcon")}</label>
                  <div className="grid grid-cols-7 gap-2">
                    {emojiOptions.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setGoalEmoji(emoji)}
                        className={`text-2xl p-3 rounded-lg transition-all ${
                          goalEmoji === emoji ? "bg-primary/20 scale-110" : "bg-secondary hover:bg-accent"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveGoal}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Plus className="size-4" />
                  {t("budgetGoalsPage.addGoal")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {contributionGoalId ? (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full">
              <div className="sticky top-0 bg-primary text-primary-foreground px-6 py-4 rounded-t-2xl flex items-center justify-between">
                <h2 className="text-white">{t("budgetGoalsPage.contributeToGoal")}</h2>
                <button onClick={resetContributionForm} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                  <X className="size-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">{t("budgetGoalsPage.contributionAmount")}</label>
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
                  <label className="text-sm text-muted-foreground mb-2 block">{t("budgetGoalsPage.contributionNote")}</label>
                  <input
                    type="text"
                    value={contributionNote}
                    onChange={(e) => setContributionNote(e.target.value)}
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder={t("budgetGoalsPage.contributionNotePlaceholder")}
                  />
                </div>
                <button
                  onClick={handleAddContribution}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <PiggyBank className="size-4" />
                  {t("budgetGoalsPage.addContribution")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {editingContribution ? (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full">
              <div className="sticky top-0 bg-primary text-primary-foreground px-6 py-4 rounded-t-2xl flex items-center justify-between">
                <h2 className="text-white">{t("budgetGoalsPage.editContribution")}</h2>
                <button onClick={resetEditingContributionForm} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                  <X className="size-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">{t("budgetGoalsPage.contributionAmount")}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingContributionAmount}
                    onChange={(e) => setEditingContributionAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">{t("budgetGoalsPage.contributionNote")}</label>
                  <input
                    type="text"
                    value={editingContributionNote}
                    onChange={(e) => setEditingContributionNote(e.target.value)}
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder={t("budgetGoalsPage.contributionNotePlaceholder")}
                  />
                </div>
                <button
                  onClick={handleUpdateContribution}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Check className="size-4" />
                  {t("budgetGoalsPage.updateContribution")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {addingCategory ? (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-primary text-primary-foreground px-6 py-4 rounded-t-2xl flex items-center justify-between">
                <h2 className="text-white">{t("budgetGoalsPage.addNewCategory")}</h2>
                <button onClick={resetCategoryForm} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                  <X className="size-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1">
                    <Tag className="size-4" />
                    {t("budgetGoalsPage.categoryName")}
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder={t("budgetGoalsPage.categoryNamePlaceholder")}
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1">
                    <DollarSign className="size-4" />
                    {t("budgetGoalsPage.monthlyBudgetLabel")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCategoryBudget}
                    onChange={(e) => setNewCategoryBudget(e.target.value)}
                    placeholder="100"
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">{t("budgetGoalsPage.icon")}</label>
                  <div className="grid grid-cols-4 gap-2">
                    {iconOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setNewCategoryIcon(option.value)}
                          className={`p-3 rounded-lg transition-all flex flex-col items-center gap-1 ${
                            newCategoryIcon === option.value ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-accent"
                          }`}
                        >
                          <Icon className="size-5" />
                          <span className="text-xs">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">{t("budgetGoalsPage.color")}</label>
                  <div className="grid grid-cols-5 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewCategoryColor(color)}
                        className={`w-full aspect-square rounded-lg transition-all ${
                          newCategoryColor === color ? "ring-4 ring-primary ring-offset-2" : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAddCategory}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Plus className="size-4" />
                  {t("budgetGoalsPage.addCategory")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
  );
}
