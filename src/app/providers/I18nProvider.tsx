import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getUserSettings } from "../lib/settings";
import { useAuth } from "./AuthProvider";
import {
  type AppLanguage,
  SUPPORTED_LANGUAGES,
  type TranslationKey,
  localizeCategory,
  localizeFrequency,
  localizeInvestmentType,
  t as translate,
} from "../lib/i18n";

interface I18nContextValue {
  language: AppLanguage;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  localizeCategory: typeof localizeCategory;
  localizeFrequency: typeof localizeFrequency;
  localizeInvestmentType: typeof localizeInvestmentType;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguage] = useState<AppLanguage>("English");

  useEffect(() => {
    if (!user) {
      setLanguage("English");
      return;
    }

    let isMounted = true;

    const loadLanguage = async () => {
      try {
        const settings = await getUserSettings(user.id);
        const nextLanguage = SUPPORTED_LANGUAGES.includes(settings.language as AppLanguage)
          ? (settings.language as AppLanguage)
          : "English";
        if (isMounted) {
          setLanguage(nextLanguage);
          document.documentElement.lang = nextLanguage === "Français" ? "fr" : "en";
        }
      } catch {
        if (isMounted) {
          setLanguage("English");
          document.documentElement.lang = "en";
        }
      }
    };

    void loadLanguage();

    const handleSettingsUpdated = () => {
      void loadLanguage();
    };

    window.addEventListener("settingsUpdated", handleSettingsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("settingsUpdated", handleSettingsUpdated);
    };
  }, [user]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      t: (key, vars) => translate(language, key, vars),
      localizeCategory: (value) => localizeCategory(language, value),
      localizeFrequency: (value) => localizeFrequency(language, value),
      localizeInvestmentType: (value) => localizeInvestmentType(language, value),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
