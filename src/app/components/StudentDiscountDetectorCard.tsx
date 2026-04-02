import { BadgeDollarSign, ExternalLink, GraduationCap } from "lucide-react";
import { formatCurrency } from "../lib/currency";
import type { StudentDiscountOpportunity } from "../../shared/studentDiscountDetector";

interface StudentDiscountDetectorCardProps {
  opportunities: StudentDiscountOpportunity[];
  currency: string;
  isLoading: boolean;
}

export default function StudentDiscountDetectorCard({
  opportunities,
  currency,
  isLoading,
}: StudentDiscountDetectorCardProps) {
  const totalMonthlySavings = opportunities.reduce(
    (sum, opportunity) => sum + opportunity.estimatedMonthlySavings,
    0,
  );
  const totalYearlySavings = opportunities.reduce(
    (sum, opportunity) => sum + opportunity.estimatedYearlySavings,
    0,
  );

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="mb-2 flex items-center gap-2">
            <GraduationCap className="size-5 text-primary" />
            Student Discount Detector
          </h3>
          <p className="text-sm text-muted-foreground">
            We only flag likely student offers. Bambu does not switch plans automatically.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:min-w-[260px]">
          <div className="rounded-lg bg-primary/10 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Monthly upside</div>
            <div className="mt-1 text-lg font-semibold text-primary">
              {formatCurrency(totalMonthlySavings, currency)}
            </div>
          </div>
          <div className="rounded-lg bg-muted/70 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Yearly upside</div>
            <div className="mt-1 text-lg font-semibold">
              {formatCurrency(totalYearlySavings, currency)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {isLoading ? (
          <div className="rounded-lg bg-muted px-4 py-5 text-sm text-muted-foreground">
            Scanning recurring transactions for eligible student offers...
          </div>
        ) : opportunities.length === 0 ? (
          <div className="rounded-lg bg-muted px-4 py-5 text-sm text-muted-foreground">
            No eligible student discount subscriptions were detected yet. Add more subscription history or set your country in Settings.
          </div>
        ) : (
          opportunities.map((opportunity) => (
            <div
              key={opportunity.serviceId}
              className="rounded-xl border border-border bg-muted/40 px-4 py-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold">{opportunity.serviceName}</div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] ${
                        opportunity.matchConfidence === "high"
                          ? "bg-primary/15 text-primary"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {opportunity.matchConfidence === "high" ? "Matched" : "Possible match"}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Detected from {opportunity.normalizedMerchant} • billed{" "}
                    {opportunity.currentBillingCadence === "yearly" ? "yearly" : "monthly"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Verification: {opportunity.verificationMethod}
                  </div>
                </div>

                <a
                  href={opportunity.offerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Student offer
                  <ExternalLink className="size-4" />
                </a>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
                <div className="rounded-lg bg-card px-3 py-3">
                  <div className="text-xs text-muted-foreground">Current monthly spend</div>
                  <div className="mt-1 font-semibold">
                    {formatCurrency(opportunity.currentMonthlySpend, currency)}
                  </div>
                </div>
                <div className="rounded-lg bg-card px-3 py-3">
                  <div className="text-xs text-muted-foreground">Student price</div>
                  <div className="mt-1 font-semibold">
                    {formatCurrency(opportunity.studentPriceMonthly, currency)}
                  </div>
                </div>
                <div className="rounded-lg bg-card px-3 py-3">
                  <div className="text-xs text-muted-foreground">Regular benchmark</div>
                  <div className="mt-1 font-semibold">
                    {formatCurrency(opportunity.regularPriceMonthly, currency)}
                  </div>
                </div>
                <div className="rounded-lg bg-card px-3 py-3">
                  <div className="text-xs text-muted-foreground">Monthly savings</div>
                  <div className="mt-1 font-semibold text-primary">
                    {formatCurrency(opportunity.estimatedMonthlySavings, currency)}
                  </div>
                </div>
                <div className="rounded-lg bg-card px-3 py-3">
                  <div className="text-xs text-muted-foreground">Yearly savings</div>
                  <div className="mt-1 flex items-center gap-2 font-semibold text-primary">
                    <BadgeDollarSign className="size-4" />
                    {formatCurrency(opportunity.estimatedYearlySavings, currency)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
