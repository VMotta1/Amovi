export interface UserProfile {
  id: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  email: string | null;
}

export interface UserSettings {
  userId: string;
  language: string;
  currency: string;
  country: string;
  dateFormat: string;
  darkMode: boolean;
  budgetAlerts: boolean;
  subscriptionReminders: boolean;
  weeklySummary: boolean;
  savingsMilestones: boolean;
  onboardingCompleted: boolean;
}

export interface UserSettingsInput {
  language: string;
  currency: string;
  country: string;
  dateFormat: string;
  darkMode: boolean;
  budgetAlerts: boolean;
  subscriptionReminders: boolean;
  weeklySummary: boolean;
  savingsMilestones: boolean;
  onboardingCompleted: boolean;
}

export interface LinkedCard {
  id: string;
  userId: string;
  cardNumber: string;
  cardHolder: string;
  cardType: "credit" | "debit";
  bankName: string;
  autoImport: boolean;
  createdAt: string;
}

export interface LinkedCardInput {
  cardNumber: string;
  cardHolder: string;
  cardType: "credit" | "debit";
  bankName: string;
  autoImport: boolean;
}
