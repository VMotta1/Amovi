import { useState } from "react";
import { useLocation, useNavigate } from "react-router";

interface MatchedDeal {
  service: string;
  category: string;
  currently_paying: number;
  student_price: number;
  monthly_savings: number;
  annual_savings: number;
  how_to_claim: string;
  verification: string;
  note?: string | null;
  confidence: string;
}

interface UnmatchedSub {
  service_name: string;
  monthly_amount: number;
  reason: string;
}

interface Results {
  detected_subscriptions: unknown[];
  matched_deals: MatchedDeal[];
  unmatched_subscriptions: UnmatchedSub[];
  total_monthly_savings: number;
  total_annual_savings: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Music Streaming": "🎵",
  "Video Streaming": "🎬",
  "Shopping & Streaming": "📦",
  "Productivity": "📝",
  "Writing & AI": "✍️",
  "Design & Creative": "🎨",
  "VPN & Security": "🔒",
  "Cloud Storage": "☁️",
  "Online Learning": "📚",
  "Developer Tools": "💻",
  "Wellness": "🧘",
  "Website Builder": "🌐",
  "Project Management": "📋",
  "Mobile": "📱",
  "Software": "⚙️",
};

function fmt(n: number) {
  return n.toFixed(2);
}

function ConfidencePill({ level }: { level: string }) {
  const colors =
    level === "high"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
      : level === "medium"
      ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
      : "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors}`}>
      {level} confidence
    </span>
  );
}

function DealCard({ deal }: { deal: MatchedDeal }) {
  const [open, setOpen] = useState(false);
  const icon = CATEGORY_ICONS[deal.category] ?? "💡";
  const isFree = deal.student_price === 0;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-colors">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">{deal.service}</h3>
                <ConfidencePill level={deal.confidence} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{deal.category}</p>
            </div>
          </div>

          {/* Savings badge */}
          <div className="shrink-0 text-right">
            <div className="bg-accent/15 border border-accent/20 rounded-xl px-3 py-1.5">
              <p className="text-xs text-accent/80 font-medium">Save</p>
              <p className="text-lg font-bold text-accent leading-tight">
                ${fmt(deal.monthly_savings)}<span className="text-xs font-normal">/mo</span>
              </p>
            </div>
          </div>
        </div>

        {/* Price comparison */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 bg-secondary rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">You're paying</p>
            <p className="text-lg font-bold text-foreground">${fmt(deal.currently_paying)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
          </div>

          <div className="text-muted-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>

          <div className="flex-1 bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
            <p className="text-xs text-primary/80 mb-0.5">Student price</p>
            <p className="text-lg font-bold text-primary">
              {isFree ? (
                <span className="text-emerald-400">FREE</span>
              ) : (
                <>${fmt(deal.student_price)}<span className="text-xs font-normal text-primary/70">/mo</span></>
              )}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Annual savings: <span className="text-foreground font-semibold">${fmt(deal.annual_savings)}/yr</span>
          </p>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            How to claim
            <svg
              className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded claim instructions */}
      {open && (
        <div className="border-t border-border bg-secondary/40 px-5 py-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Instructions</p>
            <p className="text-sm text-foreground leading-relaxed">{deal.how_to_claim}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Verification:</p>
            <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">
              {deal.verification}
            </span>
          </div>
          {deal.note && (
            <div className="flex gap-2 items-start bg-accent/10 border border-accent/20 rounded-lg px-3 py-2.5">
              <span className="text-sm">💡</span>
              <p className="text-xs text-accent/90 leading-relaxed">{deal.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const results = location.state?.results as Results | undefined;

  if (!results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No results found. Please analyze your transactions first.</p>
          <button
            onClick={() => navigate("/")}
            className="bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const { matched_deals, unmatched_subscriptions, total_monthly_savings, total_annual_savings } = results;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L10.5 6H14L10.5 9.5L12 14L8 11.5L4 14L5.5 9.5L2 6H5.5L8 1Z" fill="white" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight">Amovi</span>
          </div>
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Analyze again
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Summary banner */}
        {matched_deals.length > 0 ? (
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-accent/10 border border-primary/30 rounded-2xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm text-primary/80 font-medium mb-1">Student discounts available</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  You could save{" "}
                  <span className="text-primary">${fmt(total_monthly_savings)}/month</span>
                </h2>
                <p className="text-muted-foreground mt-1">
                  That's <span className="text-accent font-semibold">${fmt(total_annual_savings)} per year</span> back in your pocket
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <div className="bg-background/50 rounded-xl px-4 py-3 text-center border border-border/50">
                  <p className="text-2xl font-bold text-foreground">{matched_deals.length}</p>
                  <p className="text-xs text-muted-foreground">deals found</p>
                </div>
                <div className="bg-background/50 rounded-xl px-4 py-3 text-center border border-border/50">
                  <p className="text-2xl font-bold text-accent">${fmt(total_annual_savings)}</p>
                  <p className="text-xs text-muted-foreground">saved/year</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 mb-8 text-center">
            <p className="text-3xl mb-2">🎓</p>
            <h2 className="text-xl font-semibold text-foreground mb-1">No student deals found</h2>
            <p className="text-muted-foreground text-sm">
              We didn't detect any subscriptions with available student discounts.
            </p>
          </div>
        )}

        {/* Matched deals */}
        {matched_deals.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">
                {matched_deals.length}
              </span>
              Student discounts available
            </h2>
            <div className="space-y-4">
              {matched_deals.map((deal) => (
                <DealCard key={deal.service} deal={deal} />
              ))}
            </div>
          </section>
        )}

        {/* Unmatched subscriptions */}
        {unmatched_subscriptions.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-xs text-muted-foreground font-bold">
                {unmatched_subscriptions.length}
              </span>
              No student deals found for these
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              We detected these subscriptions but couldn't find a matching student discount.
            </p>
            <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {unmatched_subscriptions.map((sub, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{sub.service_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{sub.reason}</p>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium shrink-0">
                    ${fmt(sub.monthly_amount)}/mo
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
