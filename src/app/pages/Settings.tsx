import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  User,
  DollarSign,
  Camera,
  Check,
  LogOut,
  Languages,
  Moon,
  Sun,
  CreditCard,
  Plus,
  Trash2,
  X,
  Bell,
  Lock,
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  ArrowUpDown,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  BarChart3,
  Loader2,
  Landmark,
  RefreshCw,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { usePlaidLink } from "react-plaid-link";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../providers/AuthProvider";
import { BRAND_LOGO_SRC } from "../lib/branding";
import { SUPPORTED_LANGUAGES } from "../lib/i18n";
import { useI18n } from "../providers/I18nProvider";
import {
  createLinkedCard,
  getUserProfile,
  getUserSettings,
  listLinkedCards,
  removeLinkedCard,
  updateLinkedCard,
  updateUserProfile,
  updateUserSettings,
} from "../lib/settings";
import type { LinkedCard } from "../types/settings";
import type { PlaidAccount, PlaidItem, PlaidTransaction } from "../types/plaid";
import { formatCategoryName, getCategoryColor } from "../hooks/usePlaidData";
import { getCategoryIcon } from "../lib/categoryIcons";
import { buildApiUrl, plaidApiAvailable } from "../lib/api";

const languages = SUPPORTED_LANGUAGES;

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "$", name: "Mexican Peso" },
];

const countries = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "FR", name: "France" },
  { code: "AU", name: "Australia" },
  { code: "IN", name: "India" },
];

const dateFormats = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY/MM/DD"];

const emptyCard = {
  cardNumber: "",
  cardHolder: "",
  cardType: "debit" as "credit" | "debit",
  bankName: "",
  autoImport: true,
};

async function readOptimizedAvatar(file: File) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Unable to read the selected image."));
      nextImage.src = imageUrl;
    });

    const maxDimension = 320;
    const scale = Math.min(maxDimension / image.width, maxDimension / image.height, 1);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to process the selected image.");
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

// --- Plaid Link Button Component ---

function PlaidLinkButton({
  linkToken,
  onSuccess,
  children,
  className,
}: {
  linkToken: string | null;
  onSuccess: (publicToken: string, metadata: any) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      onSuccess(public_token, metadata);
    },
  });

  return (
    <button onClick={() => open()} disabled={!ready || !linkToken} className={className}>
      {children}
    </button>
  );
}

// ===================== MAIN COMPONENT =====================

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [language, setLanguage] = useState("English");
  const [currency, setCurrency] = useState("USD");
  const [country, setCountry] = useState("US");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [darkMode, setDarkMode] = useState(false);
  const [savedNotification, setSavedNotification] = useState("");
  const [errorNotification, setErrorNotification] = useState("");
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [subscriptionReminders, setSubscriptionReminders] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [savingsMilestones, setSavingsMilestones] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkedCards, setLinkedCards] = useState<LinkedCard[]>([]);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCard, setNewCard] = useState(emptyCard);

  const splitFullName = (fullName: string) => {
    const trimmed = fullName.trim();
    if (!trimmed) {
      return { firstName: "", lastName: "" };
    }

    const parts = trimmed.split(/\s+/);
    return {
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
    };
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadSettings = async () => {
      setIsLoading(true);
      setErrorNotification("");

      try {
        const [profile, settings, cards] = await Promise.all([
          getUserProfile(user.id, user.email ?? null),
          getUserSettings(user.id),
          listLinkedCards(user.id),
        ]);

        if (!isMounted) {
          return;
        }

        const fallbackFullName =
          profile.fullName ??
          (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "");
        const parsedName = splitFullName(fallbackFullName);

        setProfilePhoto(profile.avatarUrl);
        setFirstName(profile.firstName ?? parsedName.firstName);
        setLastName(profile.lastName ?? parsedName.lastName);
        setEmail(profile.email ?? user.email ?? "");
        setLanguage(settings.language);
        setCurrency(settings.currency);
        setCountry(settings.country);
        setDateFormat(settings.dateFormat);
        setDarkMode(settings.darkMode);
        setBudgetAlerts(settings.budgetAlerts);
        setSubscriptionReminders(settings.subscriptionReminders);
        setWeeklySummary(settings.weeklySummary);
        setSavingsMilestones(settings.savingsMilestones);
        setOnboardingCompleted(settings.onboardingCompleted);
        setLinkedCards(cards);
      } catch (error) {
        if (isMounted) {
          setErrorNotification(error instanceof Error ? error.message : t("settingsPage.failedLoad"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const showSaved = (message: string) => {
    setSavedNotification(message);
    setTimeout(() => setSavedNotification(""), 3000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setErrorNotification("");

    try {
      const optimizedAvatar = await readOptimizedAvatar(file);
      setProfilePhoto(optimizedAvatar);
    } catch (error) {
      setErrorNotification(error instanceof Error ? error.message : t("settingsPage.failedSaveProfile"));
    } finally {
      e.target.value = "";
    }
  };

  const handleSaveProfile = async (overridePhoto?: string | null) => {
    if (!user) {
      return;
    }

    setErrorNotification("");

    try {
      await updateUserProfile(
        user.id,
        {
          firstName,
          lastName,
          avatarUrl: overridePhoto !== undefined ? overridePhoto : profilePhoto,
        },
        email,
      );

      const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
      const authUpdates: {
        email?: string;
        data?: {
          full_name: string | null;
        };
      } = {
        data: {
          full_name: fullName || null,
        },
      };

      if (email && email !== user.email) {
        authUpdates.email = email;
      }

      const { error } = await supabase.auth.updateUser(authUpdates);
      if (error) {
        throw error;
      }

      window.dispatchEvent(new Event("profileUpdated"));
      showSaved(
        authUpdates.email
          ? t("settingsPage.profileSavedEmail")
          : t("settingsPage.profileSaved"),
      );
    } catch (error) {
      setErrorNotification(error instanceof Error ? error.message : t("settingsPage.failedSaveProfile"));
    }
  };

  const persistPreferences = async (overrides?: Partial<{
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
  }>) => {
    if (!user) {
      return;
    }

    const next = {
      language,
      currency,
      country,
      dateFormat,
      darkMode,
      budgetAlerts,
      subscriptionReminders,
      weeklySummary,
      savingsMilestones,
      onboardingCompleted,
      ...overrides,
    };

    try {
      const saved = await updateUserSettings(user.id, next);
      setLanguage(saved.language);
      setCurrency(saved.currency);
      setCountry(saved.country);
      setDateFormat(saved.dateFormat);
      setDarkMode(saved.darkMode);
      setBudgetAlerts(saved.budgetAlerts);
      setSubscriptionReminders(saved.subscriptionReminders);
      setWeeklySummary(saved.weeklySummary);
      setSavingsMilestones(saved.savingsMilestones);
      setOnboardingCompleted(saved.onboardingCompleted);
      window.dispatchEvent(new Event("settingsUpdated"));
    } catch (error) {
      setErrorNotification(error instanceof Error ? error.message : t("settingsPage.failedUpdateSettings"));
    }
  };

  const handleLogout = async () => {
    setErrorNotification("");

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      setErrorNotification(error instanceof Error ? error.message : t("settingsPage.failedLogout"));
      return;
    }

    localStorage.removeItem("supabase.auth.token");
    sessionStorage.clear();
    navigate("/auth", { replace: true });
    window.location.assign("/auth");
  };

  const handleAddCard = async () => {
    if (!user || !newCard.cardNumber || !newCard.cardHolder || !newCard.bankName) {
      return;
    }

    try {
      const created = await createLinkedCard(user.id, newCard);
      setLinkedCards([...linkedCards, created]);
      setShowAddCardModal(false);
      setNewCard(emptyCard);
      showSaved(t("settingsPage.cardLinked"));
    } catch (error) {
      setErrorNotification(error instanceof Error ? error.message : t("settingsPage.failedAddCard"));
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!user) {
      return;
    }

    try {
      await removeLinkedCard(user.id, id);
      setLinkedCards(linkedCards.filter((card) => card.id !== id));
    } catch (error) {
      setErrorNotification(error instanceof Error ? error.message : t("settingsPage.failedRemoveCard"));
    }
  };

  const toggleAutoImport = async (id: string) => {
    if (!user) {
      return;
    }

    const card = linkedCards.find((item) => item.id === id);
    if (!card) {
      return;
    }

    try {
      const updated = await updateLinkedCard(user.id, id, {
        autoImport: !card.autoImport,
      });
      setLinkedCards(linkedCards.map((item) => (item.id === id ? updated : item)));
    } catch (error) {
      setErrorNotification(error instanceof Error ? error.message : t("settingsPage.failedUpdateCard"));
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      setErrorNotification(t("settingsPage.enterNewPassword"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorNotification(t("settingsPage.passwordMismatch"));
      return;
    }

    try {
      await supabase.auth.updateUser({ password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showSaved(t("settingsPage.passwordUpdated"));
    } catch (error) {
      setErrorNotification(error instanceof Error ? error.message : t("settingsPage.failedUpdatePassword"));
    }
  };

  // --- Plaid State ---
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [plaidItems, setPlaidItems] = useState<PlaidItem[]>(() => {
    const saved = localStorage.getItem("plaidItems");
    return saved ? JSON.parse(saved) : [];
  });
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [plaidError, setPlaidError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    const apiUrl = buildApiUrl("/api/plaid/create-link-token");
    if (!apiUrl) {
      return;
    }

    fetch(apiUrl, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.link_token) setLinkToken(data.link_token);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (plaidItems.length > 0 && !selectedItemId) {
      setSelectedItemId(plaidItems[0].item_id);
    }
  }, [plaidItems, selectedItemId]);

  const fetchTransactions = useCallback(async (itemId: string) => {
    const apiUrl = buildApiUrl(`/api/plaid/transactions/${itemId}`);
    if (!apiUrl) {
      setTransactions([]);
      setPlaidError("Plaid backend is not configured for this deployment.");
      return;
    }

    setIsLoadingTransactions(true);
    try {
      const res = await fetch(apiUrl);
      const data = await res.json();
      if (data.transactions) setTransactions(data.transactions);
    } catch {
      setPlaidError("Failed to fetch transactions. Make sure the backend is running.");
    } finally {
      setIsLoadingTransactions(false);
    }
  }, []);

  useEffect(() => {
    if (selectedItemId) fetchTransactions(selectedItemId);
  }, [selectedItemId, fetchTransactions]);

  const handlePlaidSuccess = async (publicToken: string) => {
    const apiUrl = buildApiUrl("/api/plaid/exchange-token");
    if (!apiUrl) {
      setPlaidError("Plaid backend is not configured for this deployment.");
      return;
    }

    setIsLinking(true);
    setPlaidError(null);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token: publicToken }),
      });
      const data = await res.json();
      const newItem: PlaidItem = {
        item_id: data.item_id,
        institution_name: data.institution_name,
        accounts: data.accounts,
      };
      const updated = [...plaidItems, newItem];
      setPlaidItems(updated);
      localStorage.setItem("plaidItems", JSON.stringify(updated));
      window.dispatchEvent(new Event("plaidItemsUpdated"));
      setSelectedItemId(newItem.item_id);
    } catch {
      setPlaidError("Cannot connect to server. Start the backend with: cd server && node index.js");
    } finally {
      setIsLinking(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const apiUrl = buildApiUrl(`/api/plaid/item/${itemId}`);
      if (apiUrl) {
        await fetch(apiUrl, { method: "DELETE" });
      }
    } catch {
      // Server might be down -- still clean up locally
    }
    const updated = plaidItems.filter((i) => i.item_id !== itemId);
    setPlaidItems(updated);
    localStorage.setItem("plaidItems", JSON.stringify(updated));
    window.dispatchEvent(new Event("plaidItemsUpdated"));
    if (selectedItemId === itemId) {
      setSelectedItemId(updated.length > 0 ? updated[0].item_id : null);
      setTransactions([]);
    }
  };

  const maskCardNumber = (num: string) => {
    const digits = num.replace(/\D/g, "");
    return digits.length >= 4 ? `**** **** **** ${digits.slice(-4)}` : num;
  };

  const expenseTransactions = transactions.filter((t) => t.amount > 0);
  const incomeTotal = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalSpending = expenseTransactions.reduce((s, t) => s + t.amount, 0);
  const pendingCount = transactions.filter((t) => t.pending).length;

  const pieData = Array.from(
    expenseTransactions.reduce((map, t) => {
      const existing = map.get(t.category);
      if (existing) existing.value += t.amount;
      else map.set(t.category, { rawName: t.category, name: formatCategoryName(t.category), value: t.amount, color: getCategoryColor(t.category) });
      return map;
    }, new Map<string, { rawName: string; name: string; value: number; color: string }>()),
  ).map(([, v]) => ({ ...v, value: Math.round(v.value * 100) / 100 }));

  const filteredTransactions = expenseTransactions
    .filter((t) => {
      const matchesSearch =
        !searchQuery ||
        (t.merchant_name || t.name).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
        return sortOrder === "desc" ? diff : -diff;
      }
      return sortOrder === "desc" ? b.amount - a.amount : a.amount - b.amount;
    });

  const expenseCategories = ["all", ...Array.from(new Set(expenseTransactions.map((t) => t.category)))];

  const selectedItem = plaidItems.find((i) => i.item_id === selectedItemId);

  const getCurrencySymbol = (code: string) => {
    const map: Record<string, string> = { CAD: "C$", USD: "$", EUR: "€", GBP: "£" };
    return map[code] || "$";
  };

  return (
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2>{t("settingsPage.settings")}</h2>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <LogOut className="size-4" />
            {t("settingsPage.logout")}
          </button>
        </div>

        {savedNotification ? (
          <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top">
            <Check className="size-5" />
            {savedNotification}
          </div>
        ) : null}

        {errorNotification ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorNotification}
          </div>
        ) : null}

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <User className="size-5 text-primary" />
            <h3>{t("settingsPage.profile")}</h3>
          </div>
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center overflow-hidden border-4 border-border">
                  {profilePhoto ? <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-4xl">🐼</span>}
                </div>
                <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:opacity-90 transition-opacity shadow-lg">
                  <Camera className="size-4" />
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
              <div>
                <h4 className="mb-1">{t("settingsPage.profilePicture")}</h4>
                <p className="text-sm text-muted-foreground">{t("settingsPage.uploadPhoto")}</p>
                {profilePhoto && (
                  <button
                    onClick={async () => {
                      setProfilePhoto(null);
                      await handleSaveProfile(null);
                    }}
                    className="mt-2 text-xs text-destructive hover:underline flex items-center gap-1"
                  >
                    <X className="size-3" />
                    Remove photo
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{t("settingsPage.firstName")}</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t("settingsPage.firstNamePlaceholder")}
                className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{t("settingsPage.lastName")}</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t("settingsPage.lastNamePlaceholder")}
                className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{t("settingsPage.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("settingsPage.emailPlaceholder")}
                className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Check className="size-5" />
              {t("settingsPage.saveProfile")}
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Languages className="size-5 text-primary" />
            <h3>{t("settingsPage.language")}</h3>
          </div>

          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              void persistPreferences({ language: e.target.value });
            }}
            className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="size-5 text-primary" />
            <h3>{t("settingsPage.defaultCurrency")}</h3>
          </div>

          <select
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value);
              void persistPreferences({ currency: e.target.value });
            }}
            className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {currencies.map((curr) => (
              <option key={curr.code} value={curr.code}>
                {curr.code} ({curr.symbol}) - {curr.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted-foreground mt-2">{t("settingsPage.defaultCurrencyHelp")}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="size-5 text-primary" />
            <h3>Country</h3>
          </div>

          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              void persistPreferences({ country: e.target.value });
            }}
            className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {countries.map((countryOption) => (
              <option key={countryOption.code} value={countryOption.code}>
                {countryOption.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted-foreground mt-2">
            Used to filter region-specific student discount offers.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="size-5 text-primary" />
            <h3>{t("settingsPage.dateFormat")}</h3>
          </div>

          <select
            value={dateFormat}
            onChange={(e) => {
              setDateFormat(e.target.value);
              void persistPreferences({ dateFormat: e.target.value });
            }}
            className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {dateFormats.map((formatOption) => (
              <option key={formatOption} value={formatOption}>
                {formatOption}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted-foreground mt-2">{t("settingsPage.dateFormatHelp")}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {darkMode ? <Moon className="size-5 text-primary" /> : <Sun className="size-5 text-primary" />}
              <div>
                <h3>{t("settingsPage.darkMode")}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t("settingsPage.darkModeHelp")}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => {
                  setDarkMode(e.target.checked);
                  void persistPreferences({ darkMode: e.target.checked });
                }}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-muted rounded-full peer peer-checked:bg-primary peer-focus:ring-4 peer-focus:ring-primary/20 transition-colors relative">
                <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-6 w-6 transition-transform ${darkMode ? "translate-x-7" : ""}`}></div>
              </div>
            </label>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Landmark className="size-5 text-primary" />
            <h3>Linked Bank Accounts</h3>
          </div>

          {plaidError && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm mb-4">
              {plaidError}
            </div>
          )}

          {plaidItems.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Landmark className="size-14 mx-auto mb-4 opacity-40" />
              <h4 className="text-lg mb-1 text-foreground">No Accounts Linked Yet</h4>
              <p className="text-sm max-w-sm mx-auto">
                Connect your bank account securely through Plaid to automatically import all your transactions.
              </p>
              <PlaidLinkButton
                linkToken={linkToken}
                onSuccess={handlePlaidSuccess}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLinking ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {isLinking ? "Linking..." : "Link Your Bank Account"}
              </PlaidLinkButton>
              {!plaidApiAvailable && (
                <p className="text-xs text-muted-foreground mt-3">
                  Plaid is disabled on this static deployment. Set <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">VITE_API_BASE_URL</code> to your hosted backend URL to enable it.
                </p>
              )}
              {plaidApiAvailable && !linkToken && (
                <p className="text-xs text-muted-foreground mt-3">
                  Make sure the Plaid backend is reachable and returning a link token.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Account Selector */}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {plaidItems.map((item) => {
                  const isSelected = item.item_id === selectedItemId;
                  const accountType = item.accounts[0]?.type || "depository";

                  return (
                    <button
                      key={item.item_id}
                      onClick={() => setSelectedItemId(item.item_id)}
                      className={`relative flex-shrink-0 w-[280px] rounded-xl p-4 text-white shadow-lg overflow-hidden text-left transition-all duration-200 ${
                        accountType === "credit"
                          ? "bg-gradient-to-br from-purple-600 to-purple-900"
                          : "bg-gradient-to-br from-blue-600 to-blue-900"
                      } ${isSelected ? "ring-3 ring-primary/60 scale-[1.02]" : "opacity-75 hover:opacity-90"}`}
                    >
                      <div className="absolute top-3 right-3 opacity-10">
                        <CreditCard className="size-14" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium opacity-80">{item.institution_name}</span>
                          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase">
                            {accountType}
                          </span>
                        </div>
                        {item.accounts.map((acc) => (
                          <div key={acc.account_id} className="mb-2">
                            <div className="font-mono text-sm tracking-wider">
                              •••• •••• •••• {acc.mask || "••••"}
                            </div>
                            <div className="text-xs opacity-70 mt-1">{acc.name}</div>
                            {acc.balances.current != null && (
                              <div className="text-sm font-semibold mt-1">
                                {getCurrencySymbol(acc.balances.iso_currency_code || "USD")}
                                {Math.abs(acc.balances.current).toFixed(2)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 left-1.5 bg-white text-primary rounded-full p-0.5">
                          <Check className="size-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}

                <PlaidLinkButton
                  linkToken={linkToken}
                  onSuccess={handlePlaidSuccess}
                  className="flex-shrink-0 w-[120px] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                >
                  <Plus className="size-6" />
                  <span className="text-xs">Add</span>
                </PlaidLinkButton>
              </div>

              {selectedItem && (
                <>
                  {isLoadingTransactions ? (
                    <div className="text-center py-8">
                      <Loader2 className="size-8 mx-auto mb-3 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading transactions...</p>
                    </div>
                  ) : (
                    <>
                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <DollarSign className="size-4 text-primary mx-auto mb-1" />
                          <div className="text-lg font-semibold">${totalSpending.toFixed(2)}</div>
                          <div className="text-[10px] text-muted-foreground">Total Spent</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <TrendingDown className="size-4 text-primary mx-auto mb-1" />
                          <div className="text-lg font-semibold">{expenseTransactions.length}</div>
                          <div className="text-[10px] text-muted-foreground">Transactions</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <Calendar className="size-4 text-yellow-600 dark:text-yellow-400 mx-auto mb-1" />
                          <div className="text-lg font-semibold">{pendingCount}</div>
                          <div className="text-[10px] text-muted-foreground">Pending</div>
                        </div>
                      </div>

                      {incomeTotal > 0 && (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Income received</span>
                          <span className="text-sm font-semibold text-primary">+${incomeTotal.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Spending Breakdown */}
                      {pieData.length > 0 && (
                        <div className="bg-muted/30 rounded-xl p-4">
                          <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                            <BarChart3 className="size-4 text-primary" />
                            Spending Breakdown
                          </h4>
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0" suppressHydrationWarning>
                              <ResponsiveContainer width={140} height={140}>
                                <PieChart>
                                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                                    {pieData.map((entry, i) => <Cell key={`pie-${i}`} fill={entry.color} />)}
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex-1 space-y-1.5 pt-1">
                              {pieData.map((item) => (
                                <div key={item.rawName} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-muted-foreground text-xs">{item.name}</span>
                                  </div>
                                  <span className="text-xs font-medium">${item.value.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Search & Filters */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Search transactions..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                            />
                          </div>
                          <button
                            onClick={() => fetchTransactions(selectedItemId!)}
                            className="px-3 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-secondary transition-colors"
                            title="Refresh transactions"
                          >
                            <RefreshCw className={`size-4 ${isLoadingTransactions ? "animate-spin" : ""}`} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-secondary text-xs transition-colors"
                          >
                            <Filter className="size-3" />
                            Filters
                            {showFilters ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                          </button>
                          <button
                            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-secondary text-xs transition-colors"
                          >
                            <ArrowUpDown className="size-3" />
                            {sortBy === "date" ? "Date" : "Amount"} {sortOrder === "desc" ? "↓" : "↑"}
                          </button>
                          <button onClick={() => setSortBy(sortBy === "date" ? "amount" : "date")} className="text-xs text-primary hover:underline">
                            Sort by {sortBy === "date" ? "amount" : "date"}
                          </button>
                        </div>
                        {showFilters && (
                          <div className="flex gap-1.5 flex-wrap">
                            {expenseCategories.map((cat) => (
                              <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${
                                  categoryFilter === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"
                                }`}
                              >
                                {cat === "all" ? "All" : formatCategoryName(cat)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Transaction Items */}
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {filteredTransactions.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <Search className="size-6 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No transactions found</p>
                          </div>
                        ) : (
                          filteredTransactions.map((t) => (
                            <div key={t.transaction_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-9 h-9 rounded-full flex items-center justify-center"
                                  style={{
                                    backgroundColor: getCategoryColor(t.category) + "20",
                                    color: getCategoryColor(t.category),
                                  }}
                                >
                                  {getCategoryIcon(t.category)}
                                </div>
                                <div>
                                  <div className="text-sm font-medium">{t.merchant_name || t.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatCategoryName(t.category)} &middot; {t.date}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {t.pending && (
                                  <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded-full">Pending</span>
                                )}
                                <span className="text-sm font-medium">
                                  -{getCurrencySymbol(t.iso_currency_code)}{t.amount.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {filteredTransactions.length > 0 && (
                        <div className="pt-3 border-t border-border flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {filteredTransactions.length} of {expenseTransactions.length} transactions
                          </span>
                          <button
                            onClick={() => handleRemoveItem(selectedItem.item_id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                          >
                            <Trash2 className="size-3" />
                            Unlink Account
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="size-5 text-primary" />
            <h3>{t("settingsPage.notifications")}</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">{t("settingsPage.budgetAlerts")}</h4>
                <p className="text-xs text-muted-foreground mt-1">{t("settingsPage.budgetAlertsHelp")}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={budgetAlerts}
                  onChange={(e) => {
                    setBudgetAlerts(e.target.checked);
                    void persistPreferences({ budgetAlerts: e.target.checked });
                  }}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-muted rounded-full peer peer-checked:bg-primary peer-focus:ring-4 peer-focus:ring-primary/20 transition-colors relative">
                  <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-6 w-6 transition-transform ${budgetAlerts ? "translate-x-7" : ""}`}></div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">{t("settingsPage.subscriptionReminders")}</h4>
                <p className="text-xs text-muted-foreground mt-1">{t("settingsPage.subscriptionRemindersHelp")}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={subscriptionReminders}
                  onChange={(e) => {
                    setSubscriptionReminders(e.target.checked);
                    void persistPreferences({ subscriptionReminders: e.target.checked });
                  }}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-muted rounded-full peer peer-checked:bg-primary peer-focus:ring-4 peer-focus:ring-primary/20 transition-colors relative">
                  <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-6 w-6 transition-transform ${subscriptionReminders ? "translate-x-7" : ""}`}></div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">{t("settingsPage.weeklySummary")}</h4>
                <p className="text-xs text-muted-foreground mt-1">{t("settingsPage.weeklySummaryHelp")}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={weeklySummary}
                  onChange={(e) => {
                    setWeeklySummary(e.target.checked);
                    void persistPreferences({ weeklySummary: e.target.checked });
                  }}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-muted rounded-full peer peer-checked:bg-primary peer-focus:ring-4 peer-focus:ring-primary/20 transition-colors relative">
                  <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-6 w-6 transition-transform ${weeklySummary ? "translate-x-7" : ""}`}></div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">{t("settingsPage.savingsMilestones")}</h4>
                <p className="text-xs text-muted-foreground mt-1">{t("settingsPage.savingsMilestonesHelp")}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={savingsMilestones}
                  onChange={(e) => {
                    setSavingsMilestones(e.target.checked);
                    void persistPreferences({ savingsMilestones: e.target.checked });
                  }}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-muted rounded-full peer peer-checked:bg-primary peer-focus:ring-4 peer-focus:ring-primary/20 transition-colors relative">
                  <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-6 w-6 transition-transform ${savingsMilestones ? "translate-x-7" : ""}`}></div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="size-5 text-primary" />
            <h3>{t("settingsPage.security")}</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{t("settingsPage.currentPassword")}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t("settingsPage.currentPasswordPlaceholder")}
                className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{t("settingsPage.newPassword")}</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("settingsPage.newPasswordPlaceholder")} className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{t("settingsPage.confirmPassword")}</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t("settingsPage.confirmPasswordPlaceholder")} className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>

            <button
              onClick={handleUpdatePassword}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Check className="size-5" />
              {t("settingsPage.updatePassword")}
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="size-5 text-primary" />
            <h3>{t("settingsPage.deleteAccount")}</h3>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("settingsPage.deleteAccountHelp")}
            </p>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full bg-destructive text-destructive-foreground py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Trash2 className="size-5" />
              {t("settingsPage.deleteAccount")}
            </button>
            {showDeleteConfirm ? (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-card border border-border rounded-xl p-6 w-96">
                  <div className="flex items-center justify-between">
                    <h3>{t("settingsPage.confirmDeletion")}</h3>
                    <button onClick={() => setShowDeleteConfirm(false)} className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="space-y-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      {t("settingsPage.selfServeDelete")}
                    </p>

                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="w-full bg-muted text-foreground py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      {t("common.close")}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="bg-secondary border border-primary/20 rounded-xl p-6 text-center">
          <img
            src={BRAND_LOGO_SRC}
            alt="Bambuu logo"
            className="mx-auto mb-2 h-12 w-12 object-contain"
          />
          <h4 className="mb-2 text-primary">Bambuu v1.0</h4>
          <p className="text-sm text-muted-foreground">{t("settingsPage.footer")}</p>
        </div>
      </div>
  );
}
