import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  BookOpen,
  Lightbulb,
  AlertCircle,
  LineChart,
  Target,
  Wallet,
  Plus,
  X,
  ChevronDown,
  Zap,
  Shield,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Trash2,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { useAuth } from "../providers/AuthProvider";
import { useUserCurrency } from "../hooks/useUserCurrency";
import { formatCurrency } from "../lib/currency";
import { useI18n } from "../providers/I18nProvider";
import {
  createInvestment,
  getInvestmentPricesInCurrency,
  getInvestmentTotalsInCurrency,
  listInvestments,
  removeInvestment,
} from "../lib/investments";
import type { InvestmentPosition } from "../types/investments";
import { usePlaidData } from "../hooks/usePlaidData";

type InvestmentType = "stock" | "crypto" | "etf" | "bond";
type SuggestionTone = "info" | "warning" | "success";

const COLORS = ["#A0C878", "#DDEB9D", "#8AB060", "#6B9440"];

export default function Investments() {
  const { user } = useAuth();
  const { t, localizeInvestmentType } = useI18n();
  const currency = useUserCurrency();
  const [activeTab, setActiveTab] = useState<"portfolio" | "learn" | "calculator">("portfolio");
  const [showAddInvestment, setShowAddInvestment] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<"low" | "medium" | "high" | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [timeHorizon, setTimeHorizon] = useState("10");
  const [expectedReturn, setExpectedReturn] = useState("7");
  const [portfolio, setPortfolio] = useState<InvestmentPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { plaidItems, allTransactions: plaidTxns, isLoading: plaidLoading } = usePlaidData();

  // Derive account balances from plaidItems
  const plaidAccounts = plaidItems.flatMap((item) =>
    item.accounts.map((acc) => ({
      ...acc,
      institutionName: item.institution_name,
    })),
  );

  // Net cash flow per account from transactions (to show spending context)
  const totalPlaidBalance = plaidAccounts.reduce(
    (sum, acc) => sum + (acc.balances.current ?? 0),
    0,
  );
  const plaidMonthlyExpenses = plaidTxns
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
  const plaidMonthlyIncome = plaidTxns
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const [newInvestment, setNewInvestment] = useState({
    name: "",
    type: "etf" as InvestmentType,
    shares: "",
    purchasePrice: "",
    currentPrice: "",
  });

  useEffect(() => {
    if (!user) {
      setPortfolio([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadInvestments = async () => {
      setIsLoading(true);
      try {
        const data = await listInvestments(user.id);
        if (isMounted) {
          setPortfolio(data);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInvestments();
    window.addEventListener("investmentsChanged", loadInvestments);

    return () => {
      isMounted = false;
      window.removeEventListener("investmentsChanged", loadInvestments);
    };
  }, [user]);

  const portfolioWithTotals = useMemo(
    () =>
      portfolio.map((investment) => ({
        ...investment,
        ...getInvestmentTotalsInCurrency(investment, currency),
      })),
    [currency, portfolio],
  );

  const totalInvested = portfolioWithTotals.reduce((sum, inv) => sum + inv.invested, 0);
  const currentValue = portfolioWithTotals.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalGain = currentValue - totalInvested;
  const totalGainPercent = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(2) : "0.00";
  const typeExposure = {
    stock: portfolioWithTotals.filter((i) => i.type === "stock").reduce((sum, i) => sum + i.currentValue, 0),
    crypto: portfolioWithTotals.filter((i) => i.type === "crypto").reduce((sum, i) => sum + i.currentValue, 0),
    etf: portfolioWithTotals.filter((i) => i.type === "etf").reduce((sum, i) => sum + i.currentValue, 0),
    bond: portfolioWithTotals.filter((i) => i.type === "bond").reduce((sum, i) => sum + i.currentValue, 0),
  };
  const cryptoShare = currentValue > 0 ? (typeExposure.crypto / currentValue) * 100 : 0;
  const etfShare = currentValue > 0 ? (typeExposure.etf / currentValue) * 100 : 0;
  const bondShare = currentValue > 0 ? (typeExposure.bond / currentValue) * 100 : 0;
  const largestTypeShare = currentValue > 0 ? (Math.max(...Object.values(typeExposure)) / currentValue) * 100 : 0;

  const portfolioData = [
    {
      name: t("investmentsPage.stocks"),
      value: portfolioWithTotals.filter((i) => i.type === "stock").reduce((sum, i) => sum + i.currentValue, 0),
    },
    {
      name: t("investmentsPage.crypto"),
      value: portfolioWithTotals.filter((i) => i.type === "crypto").reduce((sum, i) => sum + i.currentValue, 0),
    },
    {
      name: t("investmentsPage.etfs"),
      value: portfolioWithTotals.filter((i) => i.type === "etf").reduce((sum, i) => sum + i.currentValue, 0),
    },
    {
      name: t("investmentsPage.bonds"),
      value: portfolioWithTotals.filter((i) => i.type === "bond").reduce((sum, i) => sum + i.currentValue, 0),
    },
  ].filter((item) => item.value > 0);

  const performanceData = [
    { month: t("investmentsPage.jan"), value: totalInvested * 0.82 },
    { month: t("investmentsPage.feb"), value: totalInvested * 0.88 },
    { month: t("investmentsPage.mar"), value: totalInvested * 0.93 },
    { month: t("investmentsPage.apr"), value: totalInvested * 0.96 },
    { month: t("investmentsPage.may"), value: totalInvested * 1.02 },
    { month: t("investmentsPage.jun"), value: currentValue },
  ];

  const getInvestmentIcon = (type: string) => {
    switch (type) {
      case "stock":
        return <LineChart className="size-4" />;
      case "crypto":
        return <Zap className="size-4" />;
      case "etf":
        return <PieChartIcon className="size-4" />;
      case "bond":
        return <Shield className="size-4" />;
      default:
        return <DollarSign className="size-4" />;
    }
  };

  const calculateInvestmentGrowth = () => {
    const principal = parseFloat(investmentAmount) || 0;
    const monthly = parseFloat(monthlyContribution) || 0;
    const years = parseFloat(timeHorizon) || 0;
    const rate = parseFloat(expectedReturn) / 100 || 0;

    const months = years * 12;
    let futureValue = principal * Math.pow(1 + rate / 12, months);

    for (let i = 0; i < months; i += 1) {
      futureValue += monthly * Math.pow(1 + rate / 12, months - i);
    }

    return futureValue.toFixed(2);
  };

  const learningResources = [
    {
      title: t("investmentsPage.resources.stocks.title"),
      description: t("investmentsPage.resources.stocks.description"),
      risk: t("investmentsPage.resources.stocks.risk"),
      example: t("investmentsPage.resources.stocks.example"),
      tips: [
        t("investmentsPage.resources.stocks.tips.0"),
        t("investmentsPage.resources.stocks.tips.1"),
        t("investmentsPage.resources.stocks.tips.2"),
      ],
    },
    {
      title: t("investmentsPage.resources.crypto.title"),
      description: t("investmentsPage.resources.crypto.description"),
      risk: t("investmentsPage.resources.crypto.risk"),
      example: t("investmentsPage.resources.crypto.example"),
      tips: [
        t("investmentsPage.resources.crypto.tips.0"),
        t("investmentsPage.resources.crypto.tips.1"),
        t("investmentsPage.resources.crypto.tips.2"),
      ],
    },
    {
      title: t("investmentsPage.resources.etf.title"),
      description: t("investmentsPage.resources.etf.description"),
      risk: t("investmentsPage.resources.etf.risk"),
      example: t("investmentsPage.resources.etf.example"),
      tips: [
        t("investmentsPage.resources.etf.tips.0"),
        t("investmentsPage.resources.etf.tips.1"),
        t("investmentsPage.resources.etf.tips.2"),
      ],
    },
    {
      title: t("investmentsPage.resources.bond.title"),
      description: t("investmentsPage.resources.bond.description"),
      risk: t("investmentsPage.resources.bond.risk"),
      example: t("investmentsPage.resources.bond.example"),
      tips: [
        t("investmentsPage.resources.bond.tips.0"),
        t("investmentsPage.resources.bond.tips.1"),
        t("investmentsPage.resources.bond.tips.2"),
      ],
    },
  ];

  const smartSuggestions = useMemo(() => {
    const suggestions: Array<{
      title: string;
      description: string;
      tone: SuggestionTone;
      icon: JSX.Element;
    }> = [];

    if (portfolioWithTotals.length === 0) {
      suggestions.push({
        title: t("investmentsPage.suggestions.emptyTitle"),
        description: t("investmentsPage.suggestions.emptyDescription"),
        tone: "info",
        icon: <Lightbulb className="size-5" />,
      });
      suggestions.push({
        title: t("investmentsPage.suggestions.startSmallTitle"),
        description: t("investmentsPage.suggestions.startSmallDescription"),
        tone: "success",
        icon: <Target className="size-5" />,
      });
      return suggestions;
    }

    if (largestTypeShare >= 75) {
      suggestions.push({
        title: t("investmentsPage.suggestions.diversifyTitle"),
        description: t("investmentsPage.suggestions.diversifyDescription", {
          percent: largestTypeShare.toFixed(0),
        }),
        tone: "warning",
        icon: <Shield className="size-5" />,
      });
    }

    if (cryptoShare >= 25) {
      suggestions.push({
        title: t("investmentsPage.suggestions.cryptoTitle"),
        description: t("investmentsPage.suggestions.cryptoDescription", {
          percent: cryptoShare.toFixed(0),
        }),
        tone: "warning",
        icon: <Zap className="size-5" />,
      });
    }

    if (etfShare < 40) {
      suggestions.push({
        title: t("investmentsPage.suggestions.etfCoreTitle"),
        description: t("investmentsPage.suggestions.etfCoreDescription"),
        tone: "info",
        icon: <PieChartIcon className="size-5" />,
      });
    }

    if (bondShare === 0) {
      suggestions.push({
        title: t("investmentsPage.suggestions.stabilityTitle"),
        description: t("investmentsPage.suggestions.stabilityDescription"),
        tone: "info",
        icon: <Shield className="size-5" />,
      });
    }

    if (totalGain < 0) {
      suggestions.push({
        title: t("investmentsPage.suggestions.downturnTitle"),
        description: t("investmentsPage.suggestions.downturnDescription"),
        tone: "success",
        icon: <TrendingDown className="size-5" />,
      });
    } else if (portfolioWithTotals.length > 0) {
      suggestions.push({
        title: t("investmentsPage.suggestions.rebalanceTitle"),
        description: t("investmentsPage.suggestions.rebalanceDescription"),
        tone: "success",
        icon: <TrendingUp className="size-5" />,
      });
    }

    return suggestions.slice(0, 3);
  }, [bondShare, cryptoShare, etfShare, largestTypeShare, portfolioWithTotals.length, t, totalGain]);

  const getSuggestionClasses = (tone: SuggestionTone) => {
    switch (tone) {
      case "warning":
        return "border-amber-200 bg-amber-50 text-amber-900";
      case "success":
        return "border-primary/20 bg-primary/5";
      default:
        return "border-border bg-muted/40";
    }
  };

  const resetInvestmentForm = () => {
    setNewInvestment({
      name: "",
      type: "etf",
      shares: "",
      purchasePrice: "",
      currentPrice: "",
    });
    setShowAddInvestment(false);
  };

  const handleAddInvestment = async () => {
    if (
      !user ||
      !newInvestment.name ||
      !newInvestment.shares ||
      !newInvestment.purchasePrice ||
      !newInvestment.currentPrice
    ) {
      return;
    }

    const created = await createInvestment(user.id, {
      name: newInvestment.name,
      type: newInvestment.type,
      shares: parseFloat(newInvestment.shares),
      purchasePrice: parseFloat(newInvestment.purchasePrice),
      currentPrice: parseFloat(newInvestment.currentPrice),
      currency,
      originalPurchasePrice: parseFloat(newInvestment.purchasePrice),
      originalCurrentPrice: parseFloat(newInvestment.currentPrice),
    });

    setPortfolio((current) => [...current, created]);
    resetInvestmentForm();
    window.dispatchEvent(new Event("investmentsChanged"));
  };

  const handleDeleteInvestment = async (investmentId: string) => {
    if (!user || !confirm(t("investmentsPage.confirmRemove"))) {
      return;
    }

    await removeInvestment(user.id, investmentId);
    setPortfolio((current) => current.filter((investment) => investment.id !== investmentId));
    window.dispatchEvent(new Event("investmentsChanged"));
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-3xl mb-2">{t("investmentsPage.title")}</h1>
          <p className="text-muted-foreground">{t("investmentsPage.subtitle")}</p>
        </div>

        <div className="flex gap-2 mb-6 bg-card border border-border rounded-xl p-1">
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`flex-1 py-3 rounded-lg transition-all ${
              activeTab === "portfolio" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Wallet className="size-4" />
              <span>{t("investmentsPage.myPortfolio")}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("learn")}
            className={`flex-1 py-3 rounded-lg transition-all ${
              activeTab === "learn" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <BookOpen className="size-4" />
              <span>{t("investmentsPage.learn")}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("calculator")}
            className={`flex-1 py-3 rounded-lg transition-all ${
              activeTab === "calculator" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Target className="size-4" />
              <span>{t("investmentsPage.calculator")}</span>
            </div>
          </button>
        </div>

        {activeTab === "portfolio" ? (
          <div className="space-y-6">
            {/* ── Linked Bank Accounts (from Plaid) ── */}
            {plaidAccounts.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2">
                    <Wallet className="size-5 text-primary" />
                    Linked Accounts
                  </h3>
                  {plaidLoading && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" /> Syncing…
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
                  {plaidAccounts.map((acc) => (
                    <div key={acc.account_id} className="rounded-lg bg-muted/40 border border-border p-4">
                      <div className="text-xs text-muted-foreground mb-1 truncate">{acc.institutionName}</div>
                      <div className="font-medium truncate">{acc.name}</div>
                      {acc.mask && (
                        <div className="text-xs text-muted-foreground">••••{acc.mask}</div>
                      )}
                      <div className="mt-2 text-lg text-primary">
                        {formatCurrency(acc.balances.current ?? 0, acc.balances.iso_currency_code ?? currency)}
                      </div>
                      {acc.balances.available != null && acc.balances.available !== acc.balances.current && (
                        <div className="text-xs text-muted-foreground">
                          Available: {formatCurrency(acc.balances.available, acc.balances.iso_currency_code ?? currency)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">Total Balance</div>
                    <div className="text-base font-medium text-primary">{formatCurrency(totalPlaidBalance, currency)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">Total Spent</div>
                    <div className="text-base font-medium text-destructive">-{formatCurrency(plaidMonthlyExpenses, currency)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">Total Income</div>
                    <div className="text-base font-medium">{formatCurrency(plaidMonthlyIncome, currency)}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="text-sm text-muted-foreground mb-2">{t("investmentsPage.totalInvested")}</div>
                <div className="text-2xl">{formatCurrency(totalInvested, currency)}</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="text-sm text-muted-foreground mb-2">{t("investmentsPage.currentValue")}</div>
                <div className="text-2xl text-primary">{formatCurrency(currentValue, currency)}</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="text-sm text-muted-foreground mb-2">{t("investmentsPage.totalGainLoss")}</div>
                <div className={`text-2xl ${totalGain >= 0 ? "text-primary" : "text-destructive"}`}>
                  {totalGain >= 0 ? "+" : ""}
                  {formatCurrency(totalGain, currency)}
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="text-sm text-muted-foreground mb-2">{t("investmentsPage.return")}</div>
                <div className={`text-2xl flex items-center gap-1 ${parseFloat(totalGainPercent) >= 0 ? "text-primary" : "text-destructive"}`}>
                  {parseFloat(totalGainPercent) >= 0 ? <ArrowUpRight className="size-5" /> : <ArrowDownRight className="size-5" />}
                  {totalGainPercent}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="mb-4 flex items-center gap-2">
                  <Lightbulb className="size-5 text-primary" />
                  {t("investmentsPage.smartSuggestions")}
                </h3>
                <div className="space-y-3">
                  {smartSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.title}
                      className={`rounded-xl border p-4 ${getSuggestionClasses(suggestion.tone)}`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        {suggestion.icon}
                        <div className="font-medium">{suggestion.title}</div>
                      </div>
                      <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="mb-4 flex items-center gap-2">
                  <Wallet className="size-5 text-primary" />
                  {t("investmentsPage.connectionsTitle")}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("investmentsPage.connectionsDescription")}
                </p>
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                  <div className="text-base font-medium">{t("investmentsPage.comingSoon")}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="mb-4 flex items-center gap-2">
                  <PieChartIcon className="size-5 text-primary" />
                  {t("investmentsPage.portfolioDistribution")}
                </h3>
                {portfolioData.length > 0 ? (
                  <>
                    <div suppressHydrationWarning>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={portfolioData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {portfolioData.map((entry, index) => (
                              <Cell key={`portfolio-cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {portfolioData.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-sm">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">{t("investmentsPage.noInvestmentsYet")}</div>
                )}
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="mb-4 flex items-center gap-2">
                  <LineChart className="size-5 text-primary" />
                  {t("investmentsPage.portfolioPerformance")}
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="investments-colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                    <Area type="monotone" dataKey="value" stroke="var(--color-primary)" fillOpacity={1} fill="url(#investments-colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="flex items-center gap-2">
                  <Wallet className="size-5 text-primary" />
                  {t("investmentsPage.myHoldings")}
                </h3>
                <button
                  onClick={() => setShowAddInvestment(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Plus className="size-4" />
                  {t("investmentsPage.addInvestment")}
                </button>
              </div>
              <div className="divide-y divide-border">
                {isLoading ? (
                  <div className="p-12 text-center text-muted-foreground">{t("investmentsPage.loadingPortfolio")}</div>
                ) : portfolioWithTotals.length === 0 ? (
                  <div className="p-12 text-center">
                    <PieChartIcon className="size-12 mx-auto text-muted-foreground/50 mb-3" />
                    <h3 className="mb-2">{t("investmentsPage.startJourney")}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("investmentsPage.startJourneyDescription")}
                    </p>
                    <button
                      onClick={() => setShowAddInvestment(true)}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                    >
                      {t("investmentsPage.addInvestment")}
                    </button>
                  </div>
                ) : (
                  portfolioWithTotals.map((investment) => {
                    const prices = getInvestmentPricesInCurrency(investment, currency);
                    return (
                      <div key={investment.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                investment.type === "stock"
                                  ? "bg-primary/10 text-primary"
                                  : investment.type === "crypto"
                                    ? "bg-accent text-accent-foreground"
                                    : investment.type === "etf"
                                      ? "bg-secondary text-secondary-foreground"
                                      : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {getInvestmentIcon(investment.type)}
                            </div>
                            <div>
                              <div className="font-medium">{investment.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {t("investmentsPage.sharesEach", {
                                  shares: String(investment.shares),
                                  price: formatCurrency(prices.currentPrice, currency),
                                })}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t("investmentsPage.sourceCurrency", { currency: investment.currency })}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg">{formatCurrency(investment.currentValue, currency)}</div>
                            <div className={`text-sm flex items-center justify-end gap-1 ${investment.change >= 0 ? "text-primary" : "text-destructive"}`}>
                              {investment.change >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                              {investment.change >= 0 ? "+" : ""}
                              {investment.changePercent.toFixed(2)}%
                            </div>
                            <button
                              onClick={() => handleDeleteInvestment(investment.id)}
                              className="mt-2 inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                            >
                              <Trash2 className="size-3" />
                              {t("investmentsPage.remove")}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "learn" ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Lightbulb className="size-6 text-primary mt-1" />
                  <div>
                  <h3 className="mb-2">{t("investmentsPage.riskToleranceTitle")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{t("investmentsPage.riskToleranceDescription")}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => setSelectedRisk("low")}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedRisk === "low" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Shield className="size-5 mb-2 text-primary" />
                      <div className="font-medium mb-1">{t("investmentsPage.lowRisk")}</div>
                      <div className="text-xs text-muted-foreground">{t("investmentsPage.lowRiskDescription")}</div>
                    </button>
                    <button
                      onClick={() => setSelectedRisk("medium")}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedRisk === "medium" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Target className="size-5 mb-2 text-primary" />
                      <div className="font-medium mb-1">{t("investmentsPage.mediumRisk")}</div>
                      <div className="text-xs text-muted-foreground">{t("investmentsPage.mediumRiskDescription")}</div>
                    </button>
                    <button
                      onClick={() => setSelectedRisk("high")}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedRisk === "high" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Zap className="size-5 mb-2 text-primary" />
                      <div className="font-medium mb-1">{t("investmentsPage.highRisk")}</div>
                      <div className="text-xs text-muted-foreground">{t("investmentsPage.highRiskDescription")}</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {learningResources.map((resource) => (
                <details key={resource.title} className="bg-card border border-border rounded-xl overflow-hidden group">
                  <summary className="p-6 cursor-pointer hover:bg-muted/50 transition-colors list-none flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BookOpen className="size-5 text-primary" />
                      <div>
                        <h3>{resource.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                      </div>
                    </div>
                    <ChevronDown className="size-5 text-muted-foreground group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="p-6 pt-0 border-t border-border space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="size-4 text-amber-500" />
                      <span className="text-muted-foreground">{t("investmentsPage.riskLevel")}</span>
                      <span className="font-medium">{resource.risk}</span>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground mb-1">{t("investmentsPage.example")}</div>
                      <div className="text-sm">{resource.example}</div>
                    </div>
                    <div>
                      <div className="text-sm mb-2">{t("investmentsPage.studentTips")}</div>
                      <ul className="space-y-2">
                        {resource.tips.map((tip) => (
                          <li key={tip} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === "calculator" ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="mb-6 flex items-center gap-2">
                  <Target className="size-5 text-primary" />
                  {t("investmentsPage.calculatorTitle")}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">{t("investmentsPage.initialInvestment", { currency })}</label>
                    <input
                      type="number"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      placeholder="1000"
                      className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">{t("investmentsPage.monthlyContribution", { currency })}</label>
                    <input
                      type="number"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(e.target.value)}
                      placeholder="100"
                      className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">{t("investmentsPage.timeHorizon")}</label>
                    <input
                      type="number"
                      value={timeHorizon}
                      onChange={(e) => setTimeHorizon(e.target.value)}
                      placeholder="10"
                      className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">{t("investmentsPage.expectedAnnualReturn")}</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="0.5"
                        value={expectedReturn}
                        onChange={(e) => setExpectedReturn(e.target.value)}
                        className="flex-1"
                      />
                      <span className="font-medium w-12">{expectedReturn}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-6">
                <h3 className="mb-6 flex items-center gap-2">
                  <TrendingUp className="size-5 text-primary" />
                  {t("investmentsPage.projectedResults")}
                </h3>
                <div className="space-y-6">
                  <div className="bg-card rounded-xl p-6 text-center">
                    <div className="text-sm text-muted-foreground mb-2">{t("investmentsPage.futureValue")}</div>
                    <div className="text-4xl text-primary mb-2">{formatCurrency(parseFloat(calculateInvestmentGrowth()), currency)}</div>
                    <div className="text-sm text-muted-foreground">{t("investmentsPage.afterYears", { years: timeHorizon })}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card rounded-xl p-4">
                      <div className="text-xs text-muted-foreground mb-1">{t("investmentsPage.totalInvested")}</div>
                      <div className="text-xl">
                        {formatCurrency(
                          parseFloat(investmentAmount || "0") +
                            parseFloat(monthlyContribution || "0") * parseFloat(timeHorizon || "0") * 12,
                          currency,
                        )}
                      </div>
                    </div>
                    <div className="bg-card rounded-xl p-4">
                      <div className="text-xs text-muted-foreground mb-1">{t("investmentsPage.totalGainLoss")}</div>
                      <div className="text-xl text-primary">
                        {formatCurrency(
                          parseFloat(calculateInvestmentGrowth()) -
                            (parseFloat(investmentAmount || "0") +
                              parseFloat(monthlyContribution || "0") * parseFloat(timeHorizon || "0") * 12),
                          currency,
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-card rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="size-4 text-muted-foreground" />
                      <span className="text-sm">{t("investmentsPage.assumptions")}</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• {t("investmentsPage.assumptionsMonthly")}</li>
                      <li>• {t("investmentsPage.assumptionsHistorical")}</li>
                      <li>• {t("investmentsPage.assumptionsPastPerformance")}</li>
                      <li>• {t("investmentsPage.assumptionsActualReturns")}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="mb-4 flex items-center gap-2">
                <Lightbulb className="size-5 text-primary" />
                {t("investmentsPage.sampleScenarios")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    setInvestmentAmount("500");
                    setMonthlyContribution("50");
                    setTimeHorizon("5");
                    setExpectedReturn("7");
                  }}
                  className="p-4 border border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="size-4 text-primary" />
                    <span className="font-medium">{t("investmentsPage.cautiousStarter")}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("investmentsPage.scenarioDescription", {
                      initial: formatCurrency(500, currency),
                      monthly: formatCurrency(50, currency),
                      years: "5",
                      rate: "7",
                    })}
                  </div>
                </button>
                <button
                  onClick={() => {
                    setInvestmentAmount("1000");
                    setMonthlyContribution("100");
                    setTimeHorizon("10");
                    setExpectedReturn("8");
                  }}
                  className="p-4 border border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="size-4 text-primary" />
                    <span className="font-medium">{t("investmentsPage.balancedBuilder")}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("investmentsPage.scenarioDescription", {
                      initial: formatCurrency(1000, currency),
                      monthly: formatCurrency(100, currency),
                      years: "10",
                      rate: "8",
                    })}
                  </div>
                </button>
                <button
                  onClick={() => {
                    setInvestmentAmount("2000");
                    setMonthlyContribution("200");
                    setTimeHorizon("15");
                    setExpectedReturn("10");
                  }}
                  className="p-4 border border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="size-4 text-primary" />
                    <span className="font-medium">{t("investmentsPage.ambitiousInvestor")}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("investmentsPage.scenarioDescription", {
                      initial: formatCurrency(2000, currency),
                      monthly: formatCurrency(200, currency),
                      years: "15",
                      rate: "10",
                    })}
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {showAddInvestment ? (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3>{t("investmentsPage.addInvestmentTitle")}</h3>
              <button onClick={resetInvestmentForm} className="p-1 rounded-lg hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={newInvestment.name}
                onChange={(e) => setNewInvestment((current) => ({ ...current, name: e.target.value }))}
                placeholder={t("investmentsPage.investmentNamePlaceholder")}
                className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <select
                value={newInvestment.type}
                onChange={(e) => setNewInvestment((current) => ({ ...current, type: e.target.value as InvestmentType }))}
                className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="stock">{localizeInvestmentType("stock")}</option>
                <option value="crypto">{localizeInvestmentType("crypto")}</option>
                <option value="etf">{localizeInvestmentType("etf")}</option>
                <option value="bond">{localizeInvestmentType("bond")}</option>
              </select>
              <input
                type="number"
                step="0.00000001"
                value={newInvestment.shares}
                onChange={(e) => setNewInvestment((current) => ({ ...current, shares: e.target.value }))}
                placeholder={t("investmentsPage.sharesUnitsPlaceholder")}
                className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="number"
                step="0.01"
                value={newInvestment.purchasePrice}
                onChange={(e) => setNewInvestment((current) => ({ ...current, purchasePrice: e.target.value }))}
                placeholder={t("investmentsPage.purchasePricePlaceholder", { currency })}
                className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="number"
                step="0.01"
                value={newInvestment.currentPrice}
                onChange={(e) => setNewInvestment((current) => ({ ...current, currentPrice: e.target.value }))}
                placeholder={t("investmentsPage.currentPricePlaceholder", { currency })}
                className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={handleAddInvestment}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                {t("investmentsPage.saveInvestment")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
