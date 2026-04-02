import { useState } from "react";
import { Link } from "react-router";
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
  ChevronUp,
  Zap,
  Shield,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import Layout from "../components/Layout";

interface Investment {
  id: string;
  name: string;
  type: 'stock' | 'crypto' | 'etf' | 'bond';
  amount: number;
  shares: number;
  currentPrice: number;
  purchasePrice: number;
  change: number;
  changePercent: number;
}

export default function Investments() {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'learn' | 'calculator'>('portfolio');
  const [showAddInvestment, setShowAddInvestment] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<'low' | 'medium' | 'high' | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('10');
  const [expectedReturn, setExpectedReturn] = useState('7');

  const [portfolio, setPortfolio] = useState<Investment[]>([
    {
      id: '1',
      name: 'S&P 500 ETF',
      type: 'etf',
      amount: 500,
      shares: 2.5,
      currentPrice: 220,
      purchasePrice: 200,
      change: 50,
      changePercent: 10
    },
    {
      id: '2',
      name: 'Bitcoin',
      type: 'crypto',
      amount: 300,
      shares: 0.005,
      currentPrice: 62000,
      purchasePrice: 60000,
      change: 10,
      changePercent: 3.33
    },
    {
      id: '3',
      name: 'Apple Inc.',
      type: 'stock',
      amount: 400,
      shares: 2,
      currentPrice: 210,
      purchasePrice: 200,
      change: 20,
      changePercent: 5
    }
  ]);

  const totalInvested = portfolio.reduce((sum, inv) => sum + (inv.shares * inv.purchasePrice), 0);
  const currentValue = portfolio.reduce((sum, inv) => sum + inv.amount, 0);
  const totalGain = currentValue - totalInvested;
  const totalGainPercent = ((totalGain / totalInvested) * 100).toFixed(2);

  // Portfolio distribution data
  const portfolioData = [
    { name: 'Stocks', value: portfolio.filter(i => i.type === 'stock').reduce((sum, i) => sum + i.amount, 0) },
    { name: 'Crypto', value: portfolio.filter(i => i.type === 'crypto').reduce((sum, i) => sum + i.amount, 0) },
    { name: 'ETFs', value: portfolio.filter(i => i.type === 'etf').reduce((sum, i) => sum + i.amount, 0) },
    { name: 'Bonds', value: portfolio.filter(i => i.type === 'bond').reduce((sum, i) => sum + i.amount, 0) }
  ].filter(item => item.value > 0);

  const COLORS = ['#A0C878', '#DDEB9D', '#8AB060', '#6B9440'];

  // Performance chart data
  const performanceData = [
    { month: 'Jan', value: 1000 },
    { month: 'Feb', value: 1050 },
    { month: 'Mar', value: 1100 },
    { month: 'Apr', value: 1080 },
    { month: 'May', value: 1150 },
    { month: 'Jun', value: currentValue }
  ];

  const getInvestmentIcon = (type: string) => {
    switch (type) {
      case 'stock':
        return <LineChart className="size-4" />;
      case 'crypto':
        return <Zap className="size-4" />;
      case 'etf':
        return <PieChartIcon className="size-4" />;
      case 'bond':
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
    
    for (let i = 0; i < months; i++) {
      futureValue += monthly * Math.pow(1 + rate / 12, months - i);
    }

    return futureValue.toFixed(2);
  };

  const learningResources = [
    {
      title: "What are Stocks?",
      description: "Stocks represent ownership in a company. When you buy a stock, you become a shareholder.",
      risk: "Medium to High",
      example: "Buying Apple stock means owning a tiny piece of Apple Inc.",
      tips: [
        "Start with companies you know and use",
        "Diversify across different sectors",
        "Think long-term (5+ years)"
      ]
    },
    {
      title: "Understanding Crypto",
      description: "Cryptocurrency is digital money that uses blockchain technology. Bitcoin and Ethereum are popular examples.",
      risk: "Very High",
      example: "Bitcoin is like digital gold - limited supply, used as a store of value.",
      tips: [
        "Only invest what you can afford to lose",
        "Start with small amounts to learn",
        "Research thoroughly before buying"
      ]
    },
    {
      title: "ETFs (Exchange-Traded Funds)",
      description: "ETFs are like investment baskets containing many stocks. They offer instant diversification.",
      risk: "Low to Medium",
      example: "S&P 500 ETF contains stocks of 500 large US companies.",
      tips: [
        "Great for beginners",
        "Lower fees than mutual funds",
        "Built-in diversification"
      ]
    },
    {
      title: "Bonds Explained",
      description: "Bonds are loans you give to companies or governments. They pay you interest over time.",
      risk: "Low",
      example: "Government bonds are very safe but offer lower returns.",
      tips: [
        "Good for preserving capital",
        "Provides steady income",
        "Less volatile than stocks"
      ]
    }
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl mb-2">💰 Investment Learning Hub</h1>
          <p className="text-muted-foreground">Learn to invest wisely and grow your wealth</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-card border border-border rounded-xl p-1">
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex-1 py-3 rounded-lg transition-all ${
              activeTab === 'portfolio'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-muted'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Wallet className="size-4" />
              <span>My Portfolio</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('learn')}
            className={`flex-1 py-3 rounded-lg transition-all ${
              activeTab === 'learn'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-muted'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <BookOpen className="size-4" />
              <span>Learn</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex-1 py-3 rounded-lg transition-all ${
              activeTab === 'calculator'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-muted'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Target className="size-4" />
              <span>Calculator</span>
            </div>
          </button>
        </div>

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            {/* Portfolio Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="text-sm text-muted-foreground mb-2">Total Invested</div>
                <div className="text-2xl">${totalInvested.toFixed(2)}</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="text-sm text-muted-foreground mb-2">Current Value</div>
                <div className="text-2xl text-primary">${currentValue.toFixed(2)}</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="text-sm text-muted-foreground mb-2">Total Gain/Loss</div>
                <div className={`text-2xl ${totalGain >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {totalGain >= 0 ? '+' : ''}{totalGain.toFixed(2)}
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="text-sm text-muted-foreground mb-2">Return</div>
                <div className={`text-2xl flex items-center gap-1 ${parseFloat(totalGainPercent) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {parseFloat(totalGainPercent) >= 0 ? <ArrowUpRight className="size-5" /> : <ArrowDownRight className="size-5" />}
                  {totalGainPercent}%
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Portfolio Distribution */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="mb-4 flex items-center gap-2">
                  <PieChartIcon className="size-5 text-primary" />
                  Portfolio Distribution
                </h3>
                {portfolioData.length > 0 ? (
                  <>
                    <div suppressHydrationWarning>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={portfolioData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
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
                  <div className="text-center text-muted-foreground py-8">
                    No investments yet
                  </div>
                )}
              </div>

              {/* Performance Chart */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="mb-4 flex items-center gap-2">
                  <LineChart className="size-5 text-primary" />
                  Portfolio Performance
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="investments-colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="var(--color-primary)" fillOpacity={1} fill="url(#investments-colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Holdings List */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="flex items-center gap-2">
                  <Wallet className="size-5 text-primary" />
                  My Holdings
                </h3>
                <button 
                  onClick={() => setShowAddInvestment(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Plus className="size-4" />
                  Add Investment
                </button>
              </div>
              <div className="divide-y divide-border">
                {portfolio.length === 0 ? (
                  <div className="p-12 text-center">
                    <PieChartIcon className="size-12 mx-auto text-muted-foreground/50 mb-3" />
                    <h3 className="mb-2">Start Your Investment Journey</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add your first investment to start tracking your portfolio
                    </p>
                    <button 
                      onClick={() => setShowAddInvestment(true)}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Add Investment
                    </button>
                  </div>
                ) : (
                  portfolio.map((investment) => (
                    <div key={investment.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            investment.type === 'stock' ? 'bg-primary/10 text-primary' :
                            investment.type === 'crypto' ? 'bg-accent text-accent-foreground' :
                            investment.type === 'etf' ? 'bg-secondary text-secondary-foreground' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {getInvestmentIcon(investment.type)}
                          </div>
                          <div>
                            <div className="font-medium">{investment.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {investment.shares} shares · ${investment.currentPrice.toFixed(2)} each
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg">${investment.amount.toFixed(2)}</div>
                          <div className={`text-sm flex items-center justify-end gap-1 ${
                            investment.change >= 0 ? 'text-primary' : 'text-destructive'
                          }`}>
                            {investment.change >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                            {investment.change >= 0 ? '+' : ''}{investment.changePercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Learn Tab */}
        {activeTab === 'learn' && (
          <div className="space-y-6">
            {/* Risk Assessment */}
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <Lightbulb className="size-6 text-primary mt-1" />
                <div>
                  <h3 className="mb-2">Start with Your Risk Tolerance</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Understanding your risk tolerance helps you choose the right investments
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => setSelectedRisk('low')}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedRisk === 'low'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Shield className="size-5 mb-2 text-primary" />
                      <div className="font-medium mb-1">Low Risk</div>
                      <div className="text-xs text-muted-foreground">
                        Prefer stability, minimal losses
                      </div>
                    </button>
                    <button
                      onClick={() => setSelectedRisk('medium')}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedRisk === 'medium'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Target className="size-5 mb-2 text-primary" />
                      <div className="font-medium mb-1">Medium Risk</div>
                      <div className="text-xs text-muted-foreground">
                        Balanced approach, some volatility OK
                      </div>
                    </button>
                    <button
                      onClick={() => setSelectedRisk('high')}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedRisk === 'high'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Zap className="size-5 mb-2 text-primary" />
                      <div className="font-medium mb-1">High Risk</div>
                      <div className="text-xs text-muted-foreground">
                        Seeking high returns, comfortable with losses
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Investment Types */}
            <div className="space-y-4">
              {learningResources.map((resource, index) => (
                <details key={index} className="bg-card border border-border rounded-xl overflow-hidden group">
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
                      <span className="text-muted-foreground">Risk Level:</span>
                      <span className="font-medium">{resource.risk}</span>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground mb-1">Example:</div>
                      <div className="text-sm">{resource.example}</div>
                    </div>

                    <div>
                      <div className="text-sm mb-2">💡 Student Tips:</div>
                      <ul className="space-y-2">
                        {resource.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="flex items-start gap-2 text-sm">
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

            {/* Important Notes */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h3 className="text-amber-900 dark:text-amber-200 mb-2">Important Investment Principles</h3>
                  <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-300">
                    <li>• <strong>Never invest money you can't afford to lose</strong> - Keep emergency savings separate</li>
                    <li>• <strong>Diversify your portfolio</strong> - Don't put all your eggs in one basket</li>
                    <li>• <strong>Invest for the long-term</strong> - Time in the market beats timing the market</li>
                    <li>• <strong>Do your research</strong> - Understand what you're investing in</li>
                    <li>• <strong>Start small</strong> - Learn with small amounts before scaling up</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calculator Tab */}
        {activeTab === 'calculator' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Input Section */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="mb-6 flex items-center gap-2">
                  <Target className="size-5 text-primary" />
                  Investment Growth Calculator
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Initial Investment ($)</label>
                    <input
                      type="number"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      placeholder="1000"
                      className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Monthly Contribution ($)</label>
                    <input
                      type="number"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(e.target.value)}
                      placeholder="100"
                      className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Time Horizon (Years)</label>
                    <input
                      type="number"
                      value={timeHorizon}
                      onChange={(e) => setTimeHorizon(e.target.value)}
                      placeholder="10"
                      className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Expected Annual Return (%)</label>
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
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Conservative</span>
                      <span>Aggressive</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Section */}
              <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-6">
                <h3 className="mb-6 flex items-center gap-2">
                  <TrendingUp className="size-5 text-primary" />
                  Projected Results
                </h3>
                <div className="space-y-6">
                  <div className="bg-card rounded-xl p-6 text-center">
                    <div className="text-sm text-muted-foreground mb-2">Future Value</div>
                    <div className="text-4xl text-primary mb-2">
                      ${calculateInvestmentGrowth()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      after {timeHorizon} years
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card rounded-xl p-4">
                      <div className="text-xs text-muted-foreground mb-1">Total Invested</div>
                      <div className="text-xl">
                        ${(parseFloat(investmentAmount || '0') + (parseFloat(monthlyContribution || '0') * parseFloat(timeHorizon || '0') * 12)).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-card rounded-xl p-4">
                      <div className="text-xs text-muted-foreground mb-1">Total Earnings</div>
                      <div className="text-xl text-primary">
                        ${(parseFloat(calculateInvestmentGrowth()) - (parseFloat(investmentAmount || '0') + (parseFloat(monthlyContribution || '0') * parseFloat(timeHorizon || '0') * 12))).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-card rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="size-4 text-muted-foreground" />
                      <span className="text-sm">Assumptions</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Returns are compounded monthly</li>
                      <li>• Historical average S&P 500 return: ~10% annually</li>
                      <li>• Past performance doesn't guarantee future results</li>
                      <li>• Actual returns may vary significantly</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Sample Scenarios */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="mb-4 flex items-center gap-2">
                <Lightbulb className="size-5 text-primary" />
                Sample Student Investment Scenarios
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    setInvestmentAmount('500');
                    setMonthlyContribution('50');
                    setTimeHorizon('5');
                    setExpectedReturn('7');
                  }}
                  className="p-4 border border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="size-4 text-primary" />
                    <span className="font-medium">Cautious Starter</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    $500 initial + $50/month for 5 years at 7% return
                  </div>
                </button>
                <button
                  onClick={() => {
                    setInvestmentAmount('1000');
                    setMonthlyContribution('100');
                    setTimeHorizon('10');
                    setExpectedReturn('8');
                  }}
                  className="p-4 border border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="size-4 text-primary" />
                    <span className="font-medium">Balanced Builder</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    $1,000 initial + $100/month for 10 years at 8% return
                  </div>
                </button>
                <button
                  onClick={() => {
                    setInvestmentAmount('2000');
                    setMonthlyContribution('200');
                    setTimeHorizon('15');
                    setExpectedReturn('10');
                  }}
                  className="p-4 border border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="size-4 text-primary" />
                    <span className="font-medium">Ambitious Investor</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    $2,000 initial + $200/month for 15 years at 10% return
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Investment Modal (placeholder) */}
      {showAddInvestment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3>Add Investment (Demo)</h3>
              <button onClick={() => setShowAddInvestment(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              This is a demo feature. In a real app, you would connect to a brokerage API or manually track your investments here.
            </p>
            <button 
              onClick={() => setShowAddInvestment(false)}
              className="w-full mt-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}