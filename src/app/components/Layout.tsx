import { ReactNode, useState, useEffect, useMemo } from "react";
import { Link, Outlet } from "react-router";
import { BarChart3, Menu, Moon, Plus, Sun, Target, User, Wallet } from "lucide-react";
import Navigation from "./Navigation";
import NotificationsPanel from "./NotificationsPanel";
import AddTransactionModal from "./AddTransactionModal";
import { useAuth } from "../providers/AuthProvider";
import { useI18n } from "../providers/I18nProvider";
import { ensureStarterFinancialSetup } from "../lib/finance";
import { createTransaction } from "../lib/transactions";
import { getUserProfile, getUserSettings, updateUserSettings } from "../lib/settings";
import { BRAND_LOGO_SRC } from "../lib/branding";
import { useIsMobile } from "./ui/use-mobile";
import type { UserSettings } from "../types/settings";

interface LayoutProps {
  children?: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [isSavingWalkthrough, setIsSavingWalkthrough] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const isMobile = useIsMobile();

  const walkthroughSteps = useMemo(
    () => [
      {
        icon: <Wallet className="size-6 text-primary" />,
        title: t("walkthrough.step1Title"),
        description: t("walkthrough.step1Description"),
      },
      {
        icon: <Plus className="size-6 text-primary" />,
        title: t("walkthrough.step2Title"),
        description: t("walkthrough.step2Description"),
      },
      {
        icon: <Target className="size-6 text-primary" />,
        title: t("walkthrough.step3Title"),
        description: t("walkthrough.step3Description"),
      },
    ],
    [t],
  );

  useEffect(() => {
    if (!user) {
      setProfilePhoto(null);
      setDefaultCurrency("USD");
      setUserSettings(null);
      setDarkMode(false);
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      try {
        const [profile, settings] = await Promise.all([
          getUserProfile(user.id, user.email ?? null),
          getUserSettings(user.id),
        ]);
        const createdStarterData = await ensureStarterFinancialSetup(user.id, settings.currency);
        if (isMounted) {
          setProfilePhoto(profile.avatarUrl);
          setDefaultCurrency(settings.currency);
          setUserSettings(settings);
          setDarkMode(settings.darkMode);
          setShowWalkthrough(!settings.onboardingCompleted);
          setWalkthroughStep(0);
          if (createdStarterData) {
            window.dispatchEvent(new Event("financialDataChanged"));
          }
        }
      } catch {
        if (isMounted) {
          setProfilePhoto(null);
          setDefaultCurrency("USD");
          setUserSettings(null);
          setDarkMode(false);
          setShowWalkthrough(false);
          setWalkthroughStep(0);
        }
      }
    };

    loadProfile();

    const handleProfileUpdated = () => {
      loadProfile();
    };

    window.addEventListener("profileUpdated", handleProfileUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("profileUpdated", handleProfileUpdated);
    };
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileNavOpen(false);
    }
  }, [isMobile]);

  const handleAddTransaction = async (transaction: {
    name: string;
    amount: number;
    category: string;
    type: 'income' | 'expense';
    occurredOn: string;
    currency?: string;
    originalAmount?: number;
    isRecurring?: boolean;
    recurringFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  }) => {
    if (!user) {
      return;
    }

    await createTransaction(user.id, transaction);
    window.dispatchEvent(new Event("transactionsChanged"));
    window.dispatchEvent(new Event("financialDataChanged"));
  };

  const handleToggleDarkMode = async () => {
    if (!user || !userSettings) {
      return;
    }

    const nextDarkMode = !darkMode;
    setDarkMode(nextDarkMode);

    try {
      const saved = await updateUserSettings(user.id, {
        ...userSettings,
        darkMode: nextDarkMode,
      });
      setUserSettings(saved);
      setDarkMode(saved.darkMode);
      window.dispatchEvent(new Event("settingsUpdated"));
    } catch {
      setDarkMode(userSettings.darkMode);
    }
  };

  const handleCompleteWalkthrough = async () => {
    if (!user || !userSettings || isSavingWalkthrough) {
      return;
    }

    setIsSavingWalkthrough(true);

    try {
      const saved = await updateUserSettings(user.id, {
        ...userSettings,
        onboardingCompleted: true,
      });
      setUserSettings(saved);
      setShowWalkthrough(false);
      window.dispatchEvent(new Event("settingsUpdated"));
    } finally {
      setIsSavingWalkthrough(false);
    }
  };

  const currentWalkthroughStep = walkthroughSteps[walkthroughStep];

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Fixed at top */}
      <header className="fixed inset-x-0 top-0 z-50 h-20 bg-primary px-4 text-primary-foreground shadow-md md:h-28 md:px-6">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3">
          <div className="flex w-24 items-center md:w-32">
            {isMobile ? (
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
                aria-label="Open menu"
                aria-expanded={isMobileNavOpen}
                className="rounded-lg bg-white/18 p-2 transition-colors hover:bg-white/28"
              >
                <Menu className="size-5 text-white" />
              </button>
            ) : null}
          </div>
          <Link to="/" className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <div className="flex h-11 w-11 items-center justify-center sm:h-12 sm:w-12 md:h-16 md:w-16">
              <img
                src={BRAND_LOGO_SRC}
                alt="Bambuu logo"
                className="h-full w-full object-contain"
              />
            </div>
            <h1
              className="text-base font-semibold uppercase tracking-[0.22em] text-white sm:text-lg md:text-2xl"
              style={{ fontFamily: '"Montserrat", sans-serif' }}
            >
              BAMBUU
            </h1>
          </Link>
          <div className="flex w-auto items-center justify-end gap-2 sm:gap-3 md:w-40">
            <NotificationsPanel />
            <button
              type="button"
              onClick={handleToggleDarkMode}
              aria-label={t("settingsPage.darkMode")}
              className="rounded-lg bg-white/20 p-2 transition-colors hover:bg-white/30"
            >
              {darkMode ? <Sun className="size-4 text-white md:size-5" /> : <Moon className="size-4 text-white md:size-5" />}
            </button>
            <Link to="/settings" className="flex-shrink-0">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Profile"
                  className="h-9 w-9 cursor-pointer rounded-full border-2 border-white/30 object-cover transition-colors hover:border-white/50 md:h-11 md:w-11"
                />
              ) : (
                <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30 md:h-11 md:w-11">
                  <User className="size-5 text-white md:size-6" />
                </div>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <Navigation mobileOpen={isMobileNavOpen} onMobileOpenChange={setIsMobileNavOpen} />

      {/* Main Content */}
      <main className="pt-20 md:pt-[11.5rem]">
        {children ?? <Outlet />}
      </main>

      {user ? (
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          aria-label={t("addTransaction.title")}
          className="fixed bottom-6 right-6 z-50 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-all hover:scale-105 hover:opacity-95 focus:outline-none focus:ring-4 focus:ring-primary/25"
        >
          <Plus className="size-10" />
        </button>
      ) : null}

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTransaction={handleAddTransaction}
        defaultCurrency={defaultCurrency}
      />

      {user && userSettings && showWalkthrough && currentWalkthroughStep ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                  <BarChart3 className="size-3.5" />
                  {t("walkthrough.badge")}
                </div>
                <h2 className="text-xl">{t("walkthrough.title")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("walkthrough.subtitle")}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleCompleteWalkthrough()}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t("walkthrough.skip")}
              </button>
            </div>

            <div className="rounded-xl bg-muted/40 p-5">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                {currentWalkthroughStep.icon}
              </div>
              <h3 className="mb-2">{currentWalkthroughStep.title}</h3>
              <p className="text-sm text-muted-foreground">{currentWalkthroughStep.description}</p>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              {walkthroughSteps.map((step, index) => (
                <div
                  key={step.title}
                  className={`h-2.5 rounded-full transition-all ${
                    index === walkthroughStep ? "w-8 bg-primary" : "w-2.5 bg-border"
                  }`}
                />
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setWalkthroughStep((current) => Math.max(current - 1, 0))}
                disabled={walkthroughStep === 0}
                className="rounded-lg border border-border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("walkthrough.back")}
              </button>

              {walkthroughStep < walkthroughSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setWalkthroughStep((current) => Math.min(current + 1, walkthroughSteps.length - 1))}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
                >
                  {t("walkthrough.next")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleCompleteWalkthrough()}
                  disabled={isSavingWalkthrough}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingWalkthrough ? t("common.saving") : t("walkthrough.finish")}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
