import { useEffect, useState } from "react";
import { X, DollarSign, Calendar, Tag, FileText, Repeat, Globe, ChevronDown } from "lucide-react";
import { convertCurrency, EXCHANGE_RATES } from "../lib/currency";
import { useI18n } from "../providers/I18nProvider";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: {
    name: string;
    amount: number;
    category: string;
    type: 'income' | 'expense';
    occurredOn: string;
    currency?: string;
    originalAmount?: number;
    isRecurring?: boolean;
    recurringFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  }) => Promise<void>;
  defaultCurrency?: string;
  exchangeRates?: { [key: string]: number };
}

export default function AddTransactionModal({ isOpen, onClose, onAddTransaction, defaultCurrency = 'USD', exchangeRates }: AddTransactionModalProps) {
  const { t, localizeCategory, localizeFrequency } = useI18n();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    setSelectedCurrency(defaultCurrency);
  }, [defaultCurrency]);

  const expenseCategories = ['Food', 'Books', 'Transport', 'Entertainment', 'Shopping', 'Other'];
  const incomeCategories = ['Job', 'Scholarship', 'Allowance', 'Gift', 'Other'];

  // Default exchange rates if none provided
  const rates = exchangeRates || EXCHANGE_RATES;

  const currencySymbols: { [key: string]: string } = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'CAD': 'C$',
    'AUD': 'A$',
    'JPY': '¥',
    'CNY': '¥',
  };

  // Convert amount from selected currency to default currency
  const convertToDefaultCurrency = (value: number, fromCurrency: string): number => {
    return convertCurrency(value, fromCurrency, defaultCurrency);
  };

  // Calculate converted amount for display
  const getConvertedAmount = (): string => {
    if (!amount || selectedCurrency === defaultCurrency) return '';
    const convertedValue = convertToDefaultCurrency(parseFloat(amount), selectedCurrency);
    return convertedValue.toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const resolvedName = name.trim();
    const resolvedCategory = category === '__custom__' ? customCategory.trim() : category.trim();
    const parsedAmount = parseFloat(amount);

    if (!resolvedName || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !resolvedCategory) {
      setSubmitError(t("addTransaction.fillAllFields"));
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const convertedAmount = convertToDefaultCurrency(parsedAmount, selectedCurrency);

      await onAddTransaction({
        name: resolvedName,
        amount: convertedAmount,
        category: resolvedCategory,
        type,
        occurredOn: date,
        currency: selectedCurrency,
        originalAmount: parsedAmount,
        isRecurring,
        recurringFrequency
      });

      setName('');
      setAmount('');
      setCategory('');
      setCustomCategory('');
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedCurrency(defaultCurrency);
      setIsRecurring(false);
      setRecurringFrequency('monthly');
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t("addTransaction.fillAllFields"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-primary text-primary-foreground px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-white">{t("addTransaction.title")}</h2>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {submitError ? (
            <div className="md:col-span-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          ) : null}

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-3 md:col-span-2">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-3 rounded-lg transition-all ${
                type === 'expense'
                  ? 'bg-destructive text-destructive-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              {t("addTransaction.expense")}
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-3 rounded-lg transition-all ${
                type === 'income'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              {t("addTransaction.income")}
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <FileText className="size-4" />
              {t("addTransaction.description")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'expense' ? t("addTransaction.expensePlaceholder") : t("addTransaction.incomePlaceholder")}
              className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <DollarSign className="size-4" />
              {t("addTransaction.amount")}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbols[selectedCurrency]}</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Tag className="size-4" />
              {t("addTransaction.category")}
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full appearance-none px-4 py-3 pr-11 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                required
              >
                <option value="">{t("addTransaction.selectCategory")}</option>
                {(type === 'expense' ? expenseCategories : incomeCategories).map((cat) => (
                  <option key={cat} value={cat}>{localizeCategory(cat)}</option>
                ))}
                <option value="__custom__">{t("addTransaction.customCategory")}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            {category === '__custom__' ? (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder={t("addTransaction.customCategoryPlaceholder")}
                className="mt-3 w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                required
              />
            ) : null}
          </div>

          {/* Date */}
          <div>
            <label className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Calendar className="size-4" />
              {t("addTransaction.date")}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              required
            />
          </div>

          {/* Currency Selector */}
          <div>
            <label className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Globe className="size-4" />
              {t("addTransaction.paymentCurrency")}
            </label>
            <div className="relative">
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full appearance-none px-4 py-3 pr-11 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                {Object.keys(rates).map((cur) => (
                  <option key={cur} value={cur}>
                    {cur} ({currencySymbols[cur]})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            
            {/* Conversion Preview */}
            {selectedCurrency !== defaultCurrency && amount && parseFloat(amount) > 0 && (
              <div className="mt-3 p-3 bg-gradient-to-r from-primary/10 to-[#52b788]/10 border border-primary/20 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">{t("addTransaction.convertedTo", { currency: defaultCurrency })}</div>
                <div className="text-lg text-primary">
                  {currencySymbols[selectedCurrency]}{amount} {selectedCurrency} = {currencySymbols[defaultCurrency]}{getConvertedAmount()} {defaultCurrency}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t("addTransaction.rate", {
                    from: selectedCurrency,
                    value: (rates[defaultCurrency] / rates[selectedCurrency]).toFixed(4),
                    to: defaultCurrency,
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Recurring */}
          <div>
            <label className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Repeat className="size-4" />
              {t("addTransaction.recurringTransaction")}
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm">{t("addTransaction.makeRecurring")}</span>
              </label>
              
              {isRecurring && (
                <div className="pl-6">
                  <label className="text-xs text-muted-foreground mb-2 block">{t("addTransaction.frequency")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['daily', 'weekly', 'biweekly', 'monthly', 'yearly'] as const).map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setRecurringFrequency(freq)}
                        className={`py-2 px-3 rounded-lg text-sm capitalize transition-all ${
                          recurringFrequency === freq
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-muted text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        {localizeFrequency(freq)}
                      </button>
                    ))}
                  </div>
                  {isRecurring && (
                    <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        {t("addTransaction.repeats", { frequency: localizeFrequency(recurringFrequency).toLowerCase() })}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-lg transition-all shadow-md md:col-span-2 ${
              isSubmitting
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : type === 'expense'
                ? 'bg-destructive text-destructive-foreground hover:opacity-90'
                : 'bg-primary text-primary-foreground hover:opacity-90'
            }`}
          >
            {isSubmitting ? t("common.saving") : type === 'expense' ? t("addTransaction.addExpense") : t("addTransaction.addIncome")}
          </button>
        </form>
      </div>
    </div>
  );
}
