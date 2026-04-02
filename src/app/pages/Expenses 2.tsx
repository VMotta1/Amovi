import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Filter, Search, ShoppingCart, Utensils, Bus, Film, Book } from "lucide-react";

interface Expense {
  id: string;
  name: string;
  amount: number;
  category: string;
  date: string;
}

export default function Expenses() {
  const [expenses] = useState<Expense[]>([
    { id: '1', name: 'Textbooks', amount: 150, category: 'Books', date: 'Mar 3, 2026' },
    { id: '2', name: 'Groceries', amount: 85.50, category: 'Food', date: 'Mar 5, 2026' },
    { id: '3', name: 'Bus Pass', amount: 50, category: 'Transport', date: 'Mar 7, 2026' },
    { id: '4', name: 'Coffee', amount: 24, category: 'Entertainment', date: 'Mar 8, 2026' },
    { id: '5', name: 'Lunch', amount: 40, category: 'Food', date: 'Mar 10, 2026' },
    { id: '6', name: 'Movie Night', amount: 200, category: 'Entertainment', date: 'Mar 12, 2026' },
  ]);

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'food':
        return <Utensils className="size-4" />;
      case 'books':
        return <Book className="size-4" />;
      case 'transport':
        return <Bus className="size-4" />;
      case 'entertainment':
        return <Film className="size-4" />;
      default:
        return <ShoppingCart className="size-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-primary text-primary-foreground px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/" className="hover:opacity-80">
              <ArrowLeft className="size-6" />
            </Link>
            <h1 className="text-white">Expenses</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-white/60" />
            <input
              type="text"
              placeholder="Search expenses..."
              className="w-full bg-white/20 text-white placeholder:text-white/60 pl-11 pr-4 py-3 rounded-lg outline-none focus:bg-white/30 transition-colors"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-sm text-muted-foreground">Total Expenses</div>
            <div className="text-3xl text-foreground">$549.50</div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent transition-colors">
            <Filter className="size-4" />
            Filter
          </button>
        </div>

        <div className="space-y-3">
          {expenses.map((expense) => (
            <div key={expense.id} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-accent-foreground">
                    {getCategoryIcon(expense.category)}
                  </div>
                  <div>
                    <div className="font-medium">{expense.name}</div>
                    <div className="text-sm text-muted-foreground">{expense.category}</div>
                    <div className="text-xs text-muted-foreground mt-1">{expense.date}</div>
                  </div>
                </div>
                <div className="text-lg">-${expense.amount.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
