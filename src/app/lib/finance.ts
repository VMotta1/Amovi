import { supabase } from "../../lib/supabase";
import { convertCurrency } from "./currency";
import type {
  BudgetCategory,
  BudgetCategoryInput,
  GoalContribution,
  GoalContributionInput,
  SavingsGoal,
  SavingsGoalInput,
  Subscription,
  SubscriptionInput,
} from "../types/finance";

interface SavingsGoalRow {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string | null;
  original_target_amount: number | null;
  original_current_amount: number | null;
  emoji: string;
  pinned: boolean;
  created_at: string;
}

interface BudgetCategoryRow {
  id: string;
  user_id: string;
  name: string;
  budget: number;
  currency: string | null;
  original_budget: number | null;
  icon: string;
  color: string;
  pinned: boolean;
  created_at: string;
}

interface GoalContributionRow {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  currency: string | null;
  original_amount: number | null;
  contribution_type: "manual" | "initial" | "surplus_recommendation_accepted" | "adjustment";
  source: string;
  note: string | null;
  occurred_on: string;
  created_at: string;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  emoji: string;
  name: string;
  category: string;
  monthly_cost: number;
  currency: string | null;
  original_monthly_cost: number | null;
  renewal_date: string;
  has_student_discount: boolean;
  created_at: string;
}

const savingsGoalsCache = new Map<string, SavingsGoal[]>();
const budgetCategoriesCache = new Map<string, BudgetCategory[]>();
const subscriptionsCache = new Map<string, Subscription[]>();
const goalContributionsCache = new Map<string, GoalContribution[]>();

function getGoalContributionsCacheKey(userId: string, goalId: string) {
  return `${userId}:${goalId}`;
}

const savingsGoalSelect = `
  id,
  user_id,
  name,
  target_amount,
  current_amount,
  currency,
  original_target_amount,
  original_current_amount,
  emoji,
  pinned,
  created_at
`;

const budgetCategorySelect = `
  id,
  user_id,
  name,
  budget,
  currency,
  original_budget,
  icon,
  color,
  pinned,
  created_at
`;

const goalContributionSelect = `
  id,
  user_id,
  goal_id,
  amount,
  currency,
  original_amount,
  contribution_type,
  source,
  note,
  occurred_on,
  created_at
`;

const subscriptionSelect = `
  id,
  user_id,
  emoji,
  name,
  category,
  monthly_cost,
  currency,
  original_monthly_cost,
  renewal_date,
  has_student_discount,
  created_at
`;

function mapSavingsGoal(row: SavingsGoalRow): SavingsGoal {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    currency: row.currency ?? "USD",
    originalTargetAmount: Number(row.original_target_amount ?? row.target_amount),
    originalCurrentAmount: Number(row.original_current_amount ?? row.current_amount),
    emoji: row.emoji,
    pinned: row.pinned,
    createdAt: row.created_at,
  };
}

function mapBudgetCategory(row: BudgetCategoryRow): BudgetCategory {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    budget: Number(row.budget),
    currency: row.currency ?? "USD",
    originalBudget: Number(row.original_budget ?? row.budget),
    icon: row.icon,
    color: row.color,
    pinned: row.pinned,
    createdAt: row.created_at,
  };
}

function mapGoalContribution(row: GoalContributionRow): GoalContribution {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    amount: Number(row.amount),
    currency: row.currency ?? "USD",
    originalAmount: Number(row.original_amount ?? row.amount),
    contributionType: row.contribution_type,
    source: row.source,
    note: row.note,
    occurredOn: row.occurred_on,
    createdAt: row.created_at,
  };
}

function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    emoji: row.emoji,
    name: row.name,
    category: row.category,
    monthlyCost: Number(row.monthly_cost),
    currency: row.currency ?? "USD",
    originalMonthlyCost: Number(row.original_monthly_cost ?? row.monthly_cost),
    renewalDate: row.renewal_date,
    hasStudentDiscount: row.has_student_discount,
    createdAt: row.created_at,
  };
}

export async function listSavingsGoals(userId: string) {
  const { data, error } = await supabase
    .from("savings_goals")
    .select(savingsGoalSelect)
    .eq("user_id", userId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  const mapped = (data ?? []).map((row) => mapSavingsGoal(row as SavingsGoalRow));
  savingsGoalsCache.set(userId, mapped);
  return mapped;
}

export function getCachedSavingsGoals(userId: string) {
  return savingsGoalsCache.get(userId) ?? null;
}

export async function createSavingsGoal(userId: string, input: SavingsGoalInput) {
  if (input.pinned) {
    await supabase.from("savings_goals").update({ pinned: false }).eq("user_id", userId);
  }

  const { data, error } = await supabase
    .from("savings_goals")
    .insert({
      user_id: userId,
      name: input.name,
      target_amount: input.targetAmount,
      current_amount: input.currentAmount,
      currency: input.currency ?? "USD",
      original_target_amount: input.originalTargetAmount ?? input.targetAmount,
      original_current_amount: input.originalCurrentAmount ?? input.currentAmount,
      emoji: input.emoji,
      pinned: input.pinned ?? false,
    })
    .select(savingsGoalSelect)
    .single();

  if (error) throw error;
  const goal = mapSavingsGoal(data as SavingsGoalRow);

  if ((input.originalCurrentAmount ?? input.currentAmount) > 0) {
    await createGoalContribution(userId, goal.id, {
      amount: input.currentAmount,
      currency: input.currency ?? "USD",
      originalAmount: input.originalCurrentAmount ?? input.currentAmount,
      contributionType: "initial",
      source: "goal_creation",
      note: "Initial saved amount",
    });
  }

  return goal;
}

export async function updateSavingsGoal(
  userId: string,
  goalId: string,
  updates: Partial<SavingsGoalInput>,
) {
  if (updates.pinned) {
    await supabase.from("savings_goals").update({ pinned: false }).eq("user_id", userId);
  }

  const payload = {
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.targetAmount !== undefined ? { target_amount: updates.targetAmount } : {}),
    ...(updates.currentAmount !== undefined ? { current_amount: updates.currentAmount } : {}),
    ...(updates.currency !== undefined ? { currency: updates.currency } : {}),
    ...(updates.originalTargetAmount !== undefined
      ? { original_target_amount: updates.originalTargetAmount }
      : {}),
    ...(updates.originalCurrentAmount !== undefined
      ? { original_current_amount: updates.originalCurrentAmount }
      : {}),
    ...(updates.emoji !== undefined ? { emoji: updates.emoji } : {}),
    ...(updates.pinned !== undefined ? { pinned: updates.pinned } : {}),
  };

  const { data, error } = await supabase
    .from("savings_goals")
    .update(payload)
    .eq("id", goalId)
    .eq("user_id", userId)
    .select(savingsGoalSelect)
    .single();

  if (error) throw error;
  return mapSavingsGoal(data as SavingsGoalRow);
}

export async function removeSavingsGoal(userId: string, goalId: string) {
  const { error } = await supabase
    .from("savings_goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function listGoalContributions(userId: string, goalId: string) {
  const { data, error } = await supabase
    .from("goal_contributions")
    .select(goalContributionSelect)
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  const mapped = (data ?? []).map((row) => mapGoalContribution(row as GoalContributionRow));
  goalContributionsCache.set(getGoalContributionsCacheKey(userId, goalId), mapped);
  return mapped;
}

export function getCachedGoalContributions(userId: string, goalId: string) {
  return goalContributionsCache.get(getGoalContributionsCacheKey(userId, goalId)) ?? null;
}

async function recalculateGoalCurrentAmount(userId: string, goalId: string) {
  const [{ data: goalData, error: goalError }, { data: contributionData, error: contributionError }] =
    await Promise.all([
      supabase
        .from("savings_goals")
        .select(savingsGoalSelect)
        .eq("id", goalId)
        .eq("user_id", userId)
        .single(),
      supabase
        .from("goal_contributions")
        .select(goalContributionSelect)
        .eq("user_id", userId)
        .eq("goal_id", goalId),
    ]);

  if (goalError) throw goalError;
  if (contributionError) throw contributionError;

  const goal = mapSavingsGoal(goalData as SavingsGoalRow);
  const contributions = (contributionData ?? []).map((row) => mapGoalContribution(row as GoalContributionRow));
  const nextOriginalCurrentAmount = contributions.reduce(
    (sum, contribution) =>
      sum + convertCurrency(contribution.originalAmount, contribution.currency, goal.currency),
    0,
  );

  const { data, error } = await supabase
    .from("savings_goals")
    .update({
      current_amount: nextOriginalCurrentAmount,
      original_current_amount: nextOriginalCurrentAmount,
    })
    .eq("id", goalId)
    .eq("user_id", userId)
    .select(savingsGoalSelect)
    .single();

  if (error) throw error;
  return mapSavingsGoal(data as SavingsGoalRow);
}

export async function createGoalContribution(
  userId: string,
  goalId: string,
  input: GoalContributionInput,
) {
  const { data, error } = await supabase
    .from("goal_contributions")
    .insert({
      user_id: userId,
      goal_id: goalId,
      amount: input.amount,
      currency: input.currency ?? "USD",
      original_amount: input.originalAmount ?? input.amount,
      contribution_type: input.contributionType ?? "manual",
      source: input.source ?? "manual",
      note: input.note ?? null,
      occurred_on: input.occurredOn ?? new Date().toISOString().slice(0, 10),
    })
    .select(goalContributionSelect)
    .single();

  if (error) throw error;

  const contribution = mapGoalContribution(data as GoalContributionRow);
  await recalculateGoalCurrentAmount(userId, goalId);

  return contribution;
}

export async function updateGoalContribution(
  userId: string,
  goalId: string,
  contributionId: string,
  updates: Partial<GoalContributionInput>,
) {
  const payload = {
    ...(updates.amount !== undefined ? { amount: updates.amount } : {}),
    ...(updates.currency !== undefined ? { currency: updates.currency } : {}),
    ...(updates.originalAmount !== undefined ? { original_amount: updates.originalAmount } : {}),
    ...(updates.contributionType !== undefined ? { contribution_type: updates.contributionType } : {}),
    ...(updates.source !== undefined ? { source: updates.source } : {}),
    ...(updates.note !== undefined ? { note: updates.note ?? null } : {}),
    ...(updates.occurredOn !== undefined ? { occurred_on: updates.occurredOn } : {}),
  };

  const { data, error } = await supabase
    .from("goal_contributions")
    .update(payload)
    .eq("id", contributionId)
    .eq("goal_id", goalId)
    .eq("user_id", userId)
    .select(goalContributionSelect)
    .single();

  if (error) throw error;
  await recalculateGoalCurrentAmount(userId, goalId);
  return mapGoalContribution(data as GoalContributionRow);
}

export async function removeGoalContribution(userId: string, goalId: string, contributionId: string) {
  const { error } = await supabase
    .from("goal_contributions")
    .delete()
    .eq("id", contributionId)
    .eq("goal_id", goalId)
    .eq("user_id", userId);

  if (error) throw error;
  return recalculateGoalCurrentAmount(userId, goalId);
}

export async function listBudgetCategories(userId: string) {
  const { data, error } = await supabase
    .from("budget_categories")
    .select(budgetCategorySelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const mapped = (data ?? []).map((row) => mapBudgetCategory(row as BudgetCategoryRow));
  budgetCategoriesCache.set(userId, mapped);
  return mapped;
}

export function getCachedBudgetCategories(userId: string) {
  return budgetCategoriesCache.get(userId) ?? null;
}

export async function createBudgetCategory(userId: string, input: BudgetCategoryInput) {
  const { data, error } = await supabase
    .from("budget_categories")
    .insert({
      user_id: userId,
      name: input.name,
      budget: input.budget,
      currency: input.currency ?? "USD",
      original_budget: input.originalBudget ?? input.budget,
      icon: input.icon,
      color: input.color,
      pinned: input.pinned ?? false,
    })
    .select(budgetCategorySelect)
    .single();

  if (error) throw error;
  return mapBudgetCategory(data as BudgetCategoryRow);
}

export async function updateBudgetCategory(
  userId: string,
  categoryId: string,
  updates: Partial<BudgetCategoryInput>,
) {
  const payload = {
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.budget !== undefined ? { budget: updates.budget } : {}),
    ...(updates.currency !== undefined ? { currency: updates.currency } : {}),
    ...(updates.originalBudget !== undefined ? { original_budget: updates.originalBudget } : {}),
    ...(updates.icon !== undefined ? { icon: updates.icon } : {}),
    ...(updates.color !== undefined ? { color: updates.color } : {}),
    ...(updates.pinned !== undefined ? { pinned: updates.pinned } : {}),
  };

  const { data, error } = await supabase
    .from("budget_categories")
    .update(payload)
    .eq("id", categoryId)
    .eq("user_id", userId)
    .select(budgetCategorySelect)
    .single();

  if (error) throw error;
  return mapBudgetCategory(data as BudgetCategoryRow);
}

export async function removeBudgetCategory(userId: string, categoryId: string) {
  const { error } = await supabase
    .from("budget_categories")
    .delete()
    .eq("id", categoryId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function listSubscriptions(userId: string) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(subscriptionSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const mapped = (data ?? []).map((row) => mapSubscription(row as SubscriptionRow));
  subscriptionsCache.set(userId, mapped);
  return mapped;
}

export function getCachedSubscriptions(userId: string) {
  return subscriptionsCache.get(userId) ?? null;
}

export async function createSubscription(userId: string, input: SubscriptionInput) {
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      emoji: input.emoji,
      name: input.name,
      category: input.category,
      monthly_cost: input.monthlyCost,
      currency: input.currency ?? "USD",
      original_monthly_cost: input.originalMonthlyCost ?? input.monthlyCost,
      renewal_date: input.renewalDate,
      has_student_discount: input.hasStudentDiscount,
    })
    .select(subscriptionSelect)
    .single();

  if (error) throw error;
  return mapSubscription(data as SubscriptionRow);
}

export async function updateSubscription(
  userId: string,
  subscriptionId: string,
  updates: Partial<SubscriptionInput>,
) {
  const payload = {
    ...(updates.emoji !== undefined ? { emoji: updates.emoji } : {}),
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.category !== undefined ? { category: updates.category } : {}),
    ...(updates.monthlyCost !== undefined ? { monthly_cost: updates.monthlyCost } : {}),
    ...(updates.currency !== undefined ? { currency: updates.currency } : {}),
    ...(updates.originalMonthlyCost !== undefined
      ? { original_monthly_cost: updates.originalMonthlyCost }
      : {}),
    ...(updates.renewalDate !== undefined ? { renewal_date: updates.renewalDate } : {}),
    ...(updates.hasStudentDiscount !== undefined
      ? { has_student_discount: updates.hasStudentDiscount }
      : {}),
  };

  const { data, error } = await supabase
    .from("subscriptions")
    .update(payload)
    .eq("id", subscriptionId)
    .eq("user_id", userId)
    .select(subscriptionSelect)
    .single();

  if (error) throw error;
  return mapSubscription(data as SubscriptionRow);
}

export async function removeSubscription(userId: string, subscriptionId: string) {
  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", subscriptionId)
    .eq("user_id", userId);

  if (error) throw error;
}

export function getSavingsGoalAmountsInCurrency(goal: SavingsGoal, currency: string) {
  return {
    targetAmount: convertCurrency(goal.originalTargetAmount, goal.currency, currency),
    currentAmount: convertCurrency(goal.originalCurrentAmount, goal.currency, currency),
  };
}

export function getGoalContributionAmountInCurrency(contribution: GoalContribution, currency: string) {
  return convertCurrency(contribution.originalAmount, contribution.currency, currency);
}

export function getBudgetAmountInCurrency(category: BudgetCategory, currency: string) {
  return convertCurrency(category.originalBudget, category.currency, currency);
}

export function getSubscriptionAmountInCurrency(subscription: Subscription, currency: string) {
  return convertCurrency(subscription.originalMonthlyCost, subscription.currency, currency);
}

export async function ensureStarterFinancialSetup(userId: string, currency = "USD") {
  const [existingGoals, existingCategories] = await Promise.all([
    listSavingsGoals(userId),
    listBudgetCategories(userId),
  ]);

  let createdAnything = false;

  if (existingGoals.length === 0) {
    await createSavingsGoal(userId, {
      name: "New Laptop",
      targetAmount: 1200,
      currentAmount: 0,
      currency,
      originalTargetAmount: 1200,
      originalCurrentAmount: 0,
      emoji: "💻",
      pinned: true,
    });
    createdAnything = true;
  }

  if (existingCategories.length === 0) {
    const starterCategories: BudgetCategoryInput[] = [
      { name: "Food & Groceries", budget: 400, currency, originalBudget: 400, icon: "utensils", color: "#74c69d" },
      { name: "Transport", budget: 150, currency, originalBudget: 150, icon: "bus", color: "#95d5b2" },
      { name: "Rent & Housing", budget: 1200, currency, originalBudget: 1200, icon: "home", color: "#b7e4c7" },
      { name: "Utilities", budget: 200, currency, originalBudget: 200, icon: "smartphone", color: "#d8f3dc" },
      { name: "School / Books", budget: 150, currency, originalBudget: 150, icon: "book", color: "#cad2c5" },
      { name: "Entertainment", budget: 150, currency, originalBudget: 150, icon: "film", color: "#52b788" },
      { name: "Shopping", budget: 200, currency, originalBudget: 200, icon: "shopping", color: "#40916c" },
      { name: "Health", budget: 100, currency, originalBudget: 100, icon: "heart", color: "#84a98c" },
      { name: "Subscriptions", budget: 60, currency, originalBudget: 60, icon: "music", color: "#2d6a4f" },
      { name: "Other", budget: 100, currency, originalBudget: 100, icon: "shopping", color: "#52796f" },
    ];

    await Promise.all(starterCategories.map((category) => createBudgetCategory(userId, category)));
    createdAnything = true;
  }

  return createdAnything;
}
