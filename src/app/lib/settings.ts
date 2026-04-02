import { supabase } from "../../lib/supabase";
import type {
  LinkedCard,
  LinkedCardInput,
  UserProfile,
  UserSettings,
  UserSettingsInput,
} from "../types/settings";

interface ProfileRow {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface UserSettingsRow {
  user_id: string;
  language: string;
  currency: string;
  country: string;
  date_format: string;
  dark_mode: boolean;
  budget_alerts: boolean;
  subscription_reminders: boolean;
  weekly_summary: boolean;
  savings_milestones: boolean;
  onboarding_completed: boolean;
}

interface LinkedCardRow {
  id: string;
  user_id: string;
  card_number: string;
  card_holder: string;
  card_type: "credit" | "debit";
  bank_name: string;
  auto_import: boolean;
  created_at: string;
}

const settingsCache = new Map<string, UserSettings>();

function mapProfile(row: ProfileRow, email: string | null): UserProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    email,
  };
}

function mapSettings(row: UserSettingsRow): UserSettings {
  return {
    userId: row.user_id,
    language: row.language,
    currency: row.currency,
    country: row.country,
    dateFormat: row.date_format,
    darkMode: row.dark_mode,
    budgetAlerts: row.budget_alerts,
    subscriptionReminders: row.subscription_reminders,
    weeklySummary: row.weekly_summary,
    savingsMilestones: row.savings_milestones,
    onboardingCompleted: row.onboarding_completed,
  };
}

function mapCard(row: LinkedCardRow): LinkedCard {
  return {
    id: row.id,
    userId: row.user_id,
    cardNumber: row.card_number,
    cardHolder: row.card_holder,
    cardType: row.card_type,
    bankName: row.bank_name,
    autoImport: row.auto_import,
    createdAt: row.created_at,
  };
}

export async function getUserProfile(userId: string, email: string | null) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, first_name, last_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      id: userId,
      fullName: null,
      firstName: null,
      lastName: null,
      avatarUrl: null,
      email,
    } satisfies UserProfile;
  }

  return mapProfile(data as ProfileRow, email);
}

export async function updateUserProfile(
  userId: string,
  input: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  },
  email: string | null,
) {
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim() || null;

  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      full_name: fullName,
      first_name: input.firstName || null,
      last_name: input.lastName || null,
      avatar_url: input.avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .select("id, full_name, first_name, last_name, avatar_url")
    .single();

  if (error) throw error;
  return mapProfile(data as ProfileRow, email);
}

export async function getUserSettings(userId: string) {
  const { data, error } = await supabase
    .from("user_settings")
    .select(
      "user_id, language, currency, country, date_format, dark_mode, budget_alerts, subscription_reminders, weekly_summary, savings_milestones, onboarding_completed",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const fallback = {
      userId,
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
    } satisfies UserSettings;
    settingsCache.set(userId, fallback);
    return fallback;
  }

  const mapped = mapSettings(data as UserSettingsRow);
  settingsCache.set(userId, mapped);
  return mapped;
}

export function getCachedUserSettings(userId: string) {
  return settingsCache.get(userId) ?? null;
}

export async function updateUserSettings(userId: string, input: UserSettingsInput) {
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({
      user_id: userId,
      language: input.language,
      currency: input.currency,
      country: input.country,
      date_format: input.dateFormat,
      dark_mode: input.darkMode,
      budget_alerts: input.budgetAlerts,
      subscription_reminders: input.subscriptionReminders,
      weekly_summary: input.weeklySummary,
      savings_milestones: input.savingsMilestones,
      onboarding_completed: input.onboardingCompleted,
      updated_at: new Date().toISOString(),
    })
    .select(
      "user_id, language, currency, country, date_format, dark_mode, budget_alerts, subscription_reminders, weekly_summary, savings_milestones, onboarding_completed",
    )
    .single();

  if (error) throw error;
  const mapped = mapSettings(data as UserSettingsRow);
  settingsCache.set(userId, mapped);
  return mapped;
}

export async function listLinkedCards(userId: string) {
  const { data, error } = await supabase
    .from("linked_cards")
    .select("id, user_id, card_number, card_holder, card_type, bank_name, auto_import, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapCard(row as LinkedCardRow));
}

export async function createLinkedCard(userId: string, input: LinkedCardInput) {
  const { data, error } = await supabase
    .from("linked_cards")
    .insert({
      user_id: userId,
      card_number: input.cardNumber,
      card_holder: input.cardHolder,
      card_type: input.cardType,
      bank_name: input.bankName,
      auto_import: input.autoImport,
    })
    .select("id, user_id, card_number, card_holder, card_type, bank_name, auto_import, created_at")
    .single();

  if (error) throw error;
  return mapCard(data as LinkedCardRow);
}

export async function updateLinkedCard(
  userId: string,
  cardId: string,
  updates: Partial<LinkedCardInput>,
) {
  const payload = {
    ...(updates.cardNumber !== undefined ? { card_number: updates.cardNumber } : {}),
    ...(updates.cardHolder !== undefined ? { card_holder: updates.cardHolder } : {}),
    ...(updates.cardType !== undefined ? { card_type: updates.cardType } : {}),
    ...(updates.bankName !== undefined ? { bank_name: updates.bankName } : {}),
    ...(updates.autoImport !== undefined ? { auto_import: updates.autoImport } : {}),
  };

  const { data, error } = await supabase
    .from("linked_cards")
    .update(payload)
    .eq("id", cardId)
    .eq("user_id", userId)
    .select("id, user_id, card_number, card_holder, card_type, bank_name, auto_import, created_at")
    .single();

  if (error) throw error;
  return mapCard(data as LinkedCardRow);
}

export async function removeLinkedCard(userId: string, cardId: string) {
  const { error } = await supabase
    .from("linked_cards")
    .delete()
    .eq("id", cardId)
    .eq("user_id", userId);

  if (error) throw error;
}
