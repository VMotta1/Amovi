import { supabase } from "../../lib/supabase";
import { convertCurrency } from "./currency";
import type { InvestmentPosition, InvestmentPositionInput } from "../types/investments";

interface InvestmentRow {
  id: string;
  user_id: string;
  name: string;
  type: "stock" | "crypto" | "etf" | "bond";
  shares: number;
  purchase_price: number;
  current_price: number;
  currency: string | null;
  original_purchase_price: number | null;
  original_current_price: number | null;
  created_at: string;
}

const investmentSelect = `
  id,
  user_id,
  name,
  type,
  shares,
  purchase_price,
  current_price,
  currency,
  original_purchase_price,
  original_current_price,
  created_at
`;

function mapInvestment(row: InvestmentRow): InvestmentPosition {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    shares: Number(row.shares),
    purchasePrice: Number(row.purchase_price),
    currentPrice: Number(row.current_price),
    currency: row.currency ?? "USD",
    originalPurchasePrice: Number(row.original_purchase_price ?? row.purchase_price),
    originalCurrentPrice: Number(row.original_current_price ?? row.current_price),
    createdAt: row.created_at,
  };
}

export async function listInvestments(userId: string) {
  const { data, error } = await supabase
    .from("investments")
    .select(investmentSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapInvestment(row as InvestmentRow));
}

export async function createInvestment(userId: string, input: InvestmentPositionInput) {
  const { data, error } = await supabase
    .from("investments")
    .insert({
      user_id: userId,
      name: input.name,
      type: input.type,
      shares: input.shares,
      purchase_price: input.purchasePrice,
      current_price: input.currentPrice,
      currency: input.currency ?? "USD",
      original_purchase_price: input.originalPurchasePrice ?? input.purchasePrice,
      original_current_price: input.originalCurrentPrice ?? input.currentPrice,
    })
    .select(investmentSelect)
    .single();

  if (error) throw error;
  return mapInvestment(data as InvestmentRow);
}

export async function updateInvestment(
  userId: string,
  investmentId: string,
  updates: Partial<InvestmentPositionInput>,
) {
  const payload = {
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.type !== undefined ? { type: updates.type } : {}),
    ...(updates.shares !== undefined ? { shares: updates.shares } : {}),
    ...(updates.purchasePrice !== undefined ? { purchase_price: updates.purchasePrice } : {}),
    ...(updates.currentPrice !== undefined ? { current_price: updates.currentPrice } : {}),
    ...(updates.currency !== undefined ? { currency: updates.currency } : {}),
    ...(updates.originalPurchasePrice !== undefined
      ? { original_purchase_price: updates.originalPurchasePrice }
      : {}),
    ...(updates.originalCurrentPrice !== undefined
      ? { original_current_price: updates.originalCurrentPrice }
      : {}),
  };

  const { data, error } = await supabase
    .from("investments")
    .update(payload)
    .eq("id", investmentId)
    .eq("user_id", userId)
    .select(investmentSelect)
    .single();

  if (error) throw error;
  return mapInvestment(data as InvestmentRow);
}

export async function removeInvestment(userId: string, investmentId: string) {
  const { error } = await supabase
    .from("investments")
    .delete()
    .eq("id", investmentId)
    .eq("user_id", userId);

  if (error) throw error;
}

export function getInvestmentPricesInCurrency(investment: InvestmentPosition, currency: string) {
  return {
    purchasePrice: convertCurrency(investment.originalPurchasePrice, investment.currency, currency),
    currentPrice: convertCurrency(investment.originalCurrentPrice, investment.currency, currency),
  };
}

export function getInvestmentTotalsInCurrency(investment: InvestmentPosition, currency: string) {
  const { purchasePrice, currentPrice } = getInvestmentPricesInCurrency(investment, currency);
  const invested = purchasePrice * investment.shares;
  const currentValue = currentPrice * investment.shares;
  const change = currentValue - invested;
  const changePercent = invested > 0 ? (change / invested) * 100 : 0;

  return {
    invested,
    currentValue,
    change,
    changePercent,
    purchasePrice,
    currentPrice,
  };
}
