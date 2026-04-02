import { useState } from "react";
import { Link } from "react-router";
import { 
  ArrowLeft, 
  Repeat, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  DollarSign, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Tag
} from "lucide-react";
import Layout from "../components/Layout";

interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDate: string;
  isActive: boolean;
}

export default function RecurringTransactions() {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([
    { id: '1', name: 'Rent', amount: 800, category: 'Housing', type: 'expense', frequency: 'monthly', nextDate: 'Apr 1, 2026', isActive: true },
    { id: '2', name: 'Netflix', amount: 15.99, category: 'Entertainment', type: 'expense', frequency: 'monthly', nextDate: 'Apr 5, 2026', isActive: true },
    { id: '3', name: 'Part-time Job', amount: 1200, category: 'Job', type: 'income', frequency: 'monthly', nextDate: 'Apr 1, 2026', isActive: true },
    { id: '4', name: 'Gym Membership', amount: 30, category: 'Other', type: 'expense', frequency: 'monthly', nextDate: 'Apr 10, 2026', isActive: false },
  ]);

  const [addingRecurring, setAddingRecurring] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: '',
    type: 'expense' as 'income' | 'expense',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
  });

  const expenseCategories = ['Housing', 'Food', 'Books', 'Transport', 'Entertainment', 'Shopping', 'Other'];
  const incomeCategories = ['Job', 'Scholarship', 'Allowance', 'Other'];

  const handleToggleActive = (id: string) => {
    setRecurring(recurring.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this recurring transaction?')) {
      setRecurring(recurring.filter(r => r.id !== id));
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.amount || !formData.category) {
      alert('Please fill in all fields');
      return;
    }

    if (editingId) {
      setRecurring(recurring.map(r => 
        r.id === editingId 
          ? { ...r, ...formData, amount: parseFloat(formData.amount) }
          : r
      ));
      setEditingId(null);
    } else {
      const newRecurring: RecurringTransaction = {
        id: String(Date.now()),
        name: formData.name,
        amount: parseFloat(formData.amount),
        category: formData.category,
        type: formData.type,
        frequency: formData.frequency,
        nextDate: 'Apr 15, 2026',
        isActive: true,
      };
      setRecurring([...recurring, newRecurring]);
    }

    setFormData({ name: '', amount: '', category: '', type: 'expense', frequency: 'monthly' });
    setAddingRecurring(false);
  };

  const handleEdit = (transaction: RecurringTransaction) => {
    setFormData({
      name: transaction.name,
      amount: String(transaction.amount),
      category: transaction.category,
      type: transaction.type,
      frequency: transaction.frequency,
    });
    setEditingId(transaction.id);
    setAddingRecurring(true);
  };

  const activeRecurring = recurring.filter(r => r.isActive);
  const inactiveRecurring = recurring.filter(r => !r.isActive);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Add Button */}
        <button
          onClick={() => {
            setFormData({ name: '', amount: '', category: '', type: 'expense', frequency: 'monthly' });
            setEditingId(null);
            setAddingRecurring(true);
          }}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <Plus className="size-5" />
          Add Recurring Transaction
        </button>

        {/* Active Recurring Transactions */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <Repeat className="size-5 text-primary" />
            Active Recurring ({activeRecurring.length})
          </h3>
          {activeRecurring.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active recurring transactions
            </div>
          ) : (
            <div className="space-y-3">
              {activeRecurring.map((transaction) => (
                <div key={transaction.id} className="bg-secondary rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium">{transaction.name}</div>
                      <div className="text-sm text-muted-foreground">{transaction.category} • {transaction.frequency}</div>
                    </div>
                    <div className={`text-lg ${transaction.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <Calendar className="size-3 inline mr-1" />
                      Next: {transaction.nextDate}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(transaction)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(transaction.id)}
                        className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200 transition-colors"
                      >
                        Pause
                      </button>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inactive Recurring Transactions */}
        {inactiveRecurring.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="mb-4 text-muted-foreground">Paused ({inactiveRecurring.length})</h3>
            <div className="space-y-3">
              {inactiveRecurring.map((transaction) => (
                <div key={transaction.id} className="bg-muted/50 rounded-lg p-4 opacity-60">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium">{transaction.name}</div>
                      <div className="text-sm text-muted-foreground">{transaction.category} • {transaction.frequency}</div>
                    </div>
                    <div className={`text-lg ${transaction.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Paused
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(transaction.id)}
                        className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
                      >
                        Resume
                      </button>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-gradient-to-r from-[#e8f5e8] to-[#d8f3dc] border border-primary/20 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl">🐼</div>
            <div>
              <h4 className="mb-2 text-primary">About Recurring Transactions</h4>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li>• Automatically track regular income and expenses</li>
                <li>• Set frequency: daily, weekly, monthly, or yearly</li>
                <li>• Pause transactions temporarily without deleting them</li>
                <li>• Stay on top of subscriptions and recurring payments 📅</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {addingRecurring && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full">
            <div className="sticky top-0 bg-primary text-primary-foreground px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-white">{editingId ? 'Edit' : 'Add'} Recurring Transaction</h2>
              <button onClick={() => setAddingRecurring(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Type Toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormData({ ...formData, type: 'expense', category: '' })}
                  className={`py-2 rounded-lg transition-all ${
                    formData.type === 'expense'
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  Expense
                </button>
                <button
                  onClick={() => setFormData({ ...formData, type: 'income', category: '' })}
                  className={`py-2 rounded-lg transition-all ${
                    formData.type === 'income'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  Income
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1">
                  <Tag className="size-4" />
                  Description
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Netflix Subscription"
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1">
                  <DollarSign className="size-4" />
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1">
                  <Tag className="size-4" />
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select category</option>
                  {(formData.type === 'expense' ? expenseCategories : incomeCategories).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1">
                  <Repeat className="size-4" />
                  Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <button
                onClick={handleSave}
                className={`w-full py-3 rounded-lg transition-all ${
                  formData.type === 'expense'
                    ? 'bg-destructive text-destructive-foreground hover:opacity-90'
                    : 'bg-primary text-primary-foreground hover:opacity-90'
                }`}
              >
                {editingId ? 'Save Changes' : `Add ${formData.type === 'expense' ? 'Expense' : 'Income'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}