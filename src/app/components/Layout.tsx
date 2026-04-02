import { ReactNode, useState, useEffect, useMemo } from "react";
import { Link, Outlet } from "react-router";
import { BarChart3, Menu, Moon, Plus, Sun, Target, User, Wallet, X } from "lucide-react";
import Navigation from "./Navigation";
import NotificationsPanel from "./NotificationsPanel";
import AddTransactionModal from "./AddTransactionModal";
import { useAuth } from "../providers/AuthProvider";
import { useI18n } from "../providers/I18nProvider";
import { ensureStarterFinancialSetup } from "../lib/finance";
import { createTransaction } from "../lib/transactions";
import { getUserProfile, getUserSettings, updateUserSettings } from "../lib/settings";
import { useIsMobile } from "./ui/use-mobile";
import type { UserSettings } from "../types/settings";

const SIDEBAR_WIDTH = "240px";

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

    const handleProfileUpdated = () => { loadProfile(); };
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
    if (!isMobile) setIsSidebarOpen(false);
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
    if (!user) return;
    await createTransaction(user.id, transaction);
    window.dispatchEvent(new Event("transactionsChanged"));
    window.dispatchEvent(new Event("financialDataChanged"));
  };

  const handleToggleDarkMode = async () => {
    if (!user || !userSettings) return;
    const nextDarkMode = !darkMode;
    setDarkMode(nextDarkMode);
    try {
      const saved = await updateUserSettings(user.id, { ...userSettings, darkMode: nextDarkMode });
      setUserSettings(saved);
      setDarkMode(saved.darkMode);
      window.dispatchEvent(new Event("settingsUpdated"));
    } catch {
      setDarkMode(userSettings.darkMode);
    }
  };

  const handleCompleteWalkthrough = async () => {
    if (!user || !userSettings || isSavingWalkthrough) return;
    setIsSavingWalkthrough(true);
    try {
      const saved = await updateUserSettings(user.id, { ...userSettings, onboardingCompleted: true });
      setUserSettings(saved);
      setShowWalkthrough(false);
      window.dispatchEvent(new Event("settingsUpdated"));
    } finally {
      setIsSavingWalkthrough(false);
    }
  };

  const currentWalkthroughStep = walkthroughSteps[walkthroughStep];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header — slim dark bar */}
      <header className="fixed inset-x-0 top-0 z-50 h-14 bg-card border-b border-border flex items-center px-4 gap-3">
        {/* Mobile hamburger */}
        {isMobile && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Menu className="size-5" />
          </button>
        )}

        {/* Logo + wordmark */}
        <Link to="/" className="flex items-center gap-2.5 select-none">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L10.5 6H14L10.5 9.5L12 14L8 11.5L4 14L5.5 9.5L2 6H5.5L8 1Z" fill="white" />
            </svg>
          </div>
          <span
            className="text-base font-bold tracking-widest text-foreground uppercase"
            style={{ fontFamily: '"Inter", system-ui, sans-serif', letterSpacing: "0.18em" }}
          >
            AMOVI
          </span>
        </Link>

        <div className="flex-1" />

        {/* Right controls */}
        <div className="flex items-center gap-1.5">
          <NotificationsPanel />
          <button
            type="button"
            onClick={handleToggleDarkMode}
            aria-label={t("settingsPage.darkMode")}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <Link to="/settings">
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profile"
                className="h-8 w-8 rounded-full border-2 border-border object-cover hover:border-primary transition-colors cursor-pointer"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center hover:border-primary transition-colors cursor-pointer">
                <User className="size-4 text-muted-foreground" />
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="flex pt-14 min-h-screen">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside
            className="fixed top-14 left-0 bottom-0 z-40 bg-card border-r border-border flex flex-col"
            style={{ width: SIDEBAR_WIDTH }}
          >
            <Navigation />
          </aside>
        )}

        {/* Mobile sidebar drawer */}
        {isMobile && isSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
            <aside
              className="fixed top-0 left-0 bottom-0 z-50 bg-card border-r border-border flex flex-col"
              style={{ width: SIDEBAR_WIDTH }}
            >
              {/* Mobile drawer header */}
              <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1L10.5 6H14L10.5 9.5L12 14L8 11.5L4 14L5.5 9.5L2 6H5.5L8 1Z" fill="white" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold tracking-widest text-foreground uppercase">AMOVI</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
              <Navigation onNavigate={() => setIsSidebarOpen(false)} />
            </aside>
          </>
        )}

        {/* Main content */}
        <main
          className="flex-1 min-w-0 overflow-auto"
          style={{ marginLeft: isMobile ? 0 : SIDEBAR_WIDTH }}
        >
          {children ?? <Outlet />}
        </main>
      </div>

      {/* FAB */}
      {user && (
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          aria-label={t("addTransaction.title")}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 transition-all hover:scale-105 hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/25"
        >
          <Plus className="size-6" />
        </button>
      )}

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTransaction={handleAddTransaction}
        defaultCurrency={defaultCurrency}
      />

      {/* Walkthrough modal */}
      {user && userSettings && showWalkthrough && currentWalkthroughStep && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
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
                  className={`h-2 rounded-full transition-all ${
                    index === walkthroughStep ? "w-8 bg-primary" : "w-2 bg-border"
                  }`}
                />
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setWalkthroughStep((c) => Math.max(c - 1, 0))}
                disabled={walkthroughStep === 0}
                className="rounded-lg border border-border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-secondary transition-colors"
              >
                {t("walkthrough.back")}
              </button>

              {walkthroughStep < walkthroughSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setWalkthroughStep((c) => Math.min(c + 1, walkthroughSteps.length - 1))}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90 transition-colors"
                >
                  {t("walkthrough.next")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleCompleteWalkthrough()}
                  disabled={isSavingWalkthrough}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                >
                  {isSavingWalkthrough ? t("common.saving") : t("walkthrough.finish")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
