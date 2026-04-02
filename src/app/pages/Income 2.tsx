import { Link } from "react-router";
import { ArrowLeft, TrendingUp, Briefcase, DollarSign } from "lucide-react";

export default function Income() {
  const incomeStreams = [
    { id: '1', name: 'Part-time Job', amount: 1200, frequency: 'Monthly', date: 'Mar 1, 2026' },
    { id: '2', name: 'Scholarship', amount: 600, frequency: 'Monthly', date: 'Mar 1, 2026' },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-primary text-primary-foreground px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:opacity-80">
              <ArrowLeft className="size-6" />
            </Link>
            <h1 className="text-white">Income</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-gradient-to-br from-primary to-[#52b788] text-white rounded-2xl p-6 mb-6 shadow-lg">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <TrendingUp className="size-5" />
            <span className="text-sm">Total Monthly Income</span>
          </div>
          <div className="text-4xl">$1,800.00</div>
        </div>

        <h3 className="mb-4">Income Sources</h3>
        <div className="space-y-3">
          {incomeStreams.map((income) => (
            <div key={income.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <Briefcase className="size-5" />
                  </div>
                  <div>
                    <div className="font-medium">{income.name}</div>
                    <div className="text-sm text-muted-foreground">{income.frequency}</div>
                    <div className="text-xs text-muted-foreground mt-1">{income.date}</div>
                  </div>
                </div>
                <div className="text-lg text-primary">+${income.amount.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-secondary border border-border rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">
              <DollarSign className="size-5" />
            </div>
            <div>
              <h4 className="mb-2">Budget Tip for Students</h4>
              <p className="text-sm text-muted-foreground">
                Try to save at least 20% of your income each month. Set up automatic transfers to a savings account to make it easier!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
