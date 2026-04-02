import { useMemo } from "react";
import { matchKnownSubscription, isAmountInPriceRange, type KnownSubscription } from "../lib/knownSubscriptions";
import type { Transaction } from "../types/transactions";
import type { Subscription } from "../types/finance";

export interface DetectedSubscription {
  known: KnownSubscription;
  /** The most recent matching transaction */
  latestTransaction: Transaction;
  /** The amount from the transaction */
  amount: number;
  /** The transaction date — used as estimated next renewal */
  lastSeenDate: string;
  /** How many times this was seen in the transaction list */
  occurrences: number;
}

/**
 * Scans a merged transaction list (Plaid + Supabase) for recurring subscription
 * charges and returns detected services that are NOT already in the user's saved
 * subscriptions list.
 */
export function useDetectedSubscriptions(
  transactions: Transaction[],
  savedSubscriptions: Subscription[],
): DetectedSubscription[] {
  return useMemo(() => {
    // Group transactions by their matched known subscription
    const byService = new Map<string, { known: KnownSubscription; txns: Transaction[] }>();

    for (const txn of transactions) {
      if (txn.type !== "expense") continue;

      const known = matchKnownSubscription(txn.name);
      if (!known) continue;

      if (!isAmountInPriceRange(txn.amount, known)) continue;

      const key = known.name;
      if (!byService.has(key)) {
        byService.set(key, { known, txns: [] });
      }
      byService.get(key)!.txns.push(txn);
    }

    // Filter out services already in savedSubscriptions
    const savedNames = new Set(
      savedSubscriptions.map((s) => s.name.toLowerCase()),
    );

    const results: DetectedSubscription[] = [];

    for (const [, { known, txns }] of byService) {
      if (savedNames.has(known.name.toLowerCase())) continue;

      // Sort by date descending, pick most recent
      txns.sort((a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime());
      const latest = txns[0];

      results.push({
        known,
        latestTransaction: latest,
        amount: latest.amount,
        lastSeenDate: latest.occurredOn,
        occurrences: txns.length,
      });
    }

    // Sort by amount descending (most expensive first)
    results.sort((a, b) => b.amount - a.amount);

    return results;
  }, [transactions, savedSubscriptions]);
}
