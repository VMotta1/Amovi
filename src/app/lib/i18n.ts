import { translations, type AppLanguage, type TranslationKey, type TranslationTree, SUPPORTED_LANGUAGES } from "../i18n";

export { SUPPORTED_LANGUAGES };
export type { AppLanguage, TranslationKey, TranslationTree };

function readTranslation(tree: TranslationTree, path: string): string {
  return path.split(".").reduce((current, segment) => current[segment as keyof typeof current], tree as never) as string;
}

export function t(language: AppLanguage, key: TranslationKey, vars?: Record<string, string | number>) {
  const template = readTranslation(translations[language], key);
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (result, [name, value]) => result.replaceAll(`{{${name}}}`, String(value)),
    template,
  );
}

const categoryTranslations: Record<string, { English: string; Français: string }> = {
  Food: { English: "Food", Français: "Alimentation" },
  Books: { English: "Books", Français: "Livres" },
  Transport: { English: "Transport", Français: "Transport" },
  Entertainment: { English: "Entertainment", Français: "Loisirs" },
  Shopping: { English: "Shopping", Français: "Achats" },
  Other: { English: "Other", Français: "Autre" },
  Job: { English: "Job", Français: "Travail" },
  Scholarship: { English: "Scholarship", Français: "Bourse" },
  Allowance: { English: "Allowance", Français: "Argent de poche" },
  Gift: { English: "Gift", Français: "Cadeau" },
  Housing: { English: "Housing", Français: "Logement" },
};

const frequencyTranslations = {
  daily: { English: "Daily", Français: "Quotidien" },
  weekly: { English: "Weekly", Français: "Hebdomadaire" },
  biweekly: { English: "Biweekly", Français: "Toutes les deux semaines" },
  monthly: { English: "Monthly", Français: "Mensuel" },
  yearly: { English: "Yearly", Français: "Annuel" },
} as const;

const investmentTypeTranslations = {
  stock: { English: "Stocks", Français: "Actions" },
  crypto: { English: "Crypto", Français: "Crypto" },
  etf: { English: "ETFs", Français: "ETF" },
  bond: { English: "Bonds", Français: "Obligations" },
} as const;

export function localizeCategory(language: AppLanguage, value: string) {
  return categoryTranslations[value]?.[language] ?? value;
}

export function localizeFrequency(
  language: AppLanguage,
  value: "daily" | "weekly" | "biweekly" | "monthly" | "yearly" | null | undefined
) {
  if (!value || !(value in frequencyTranslations)) {
    // Fallback: Capitalize first letter or return 'Recurring'
    return value && typeof value === "string"
      ? value.charAt(0).toUpperCase() + value.slice(1)
      : "Recurring";
  }
  return frequencyTranslations[value as keyof typeof frequencyTranslations][language];
}

export function localizeInvestmentType(
  language: AppLanguage,
  value: "stock" | "crypto" | "etf" | "bond",
) {
  return investmentTypeTranslations[value][language];
}
