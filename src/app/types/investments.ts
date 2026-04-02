export interface InvestmentPosition {
  id: string;
  userId: string;
  name: string;
  type: "stock" | "crypto" | "etf" | "bond";
  shares: number;
  purchasePrice: number;
  currentPrice: number;
  currency: string;
  originalPurchasePrice: number;
  originalCurrentPrice: number;
  createdAt: string;
}

export interface InvestmentPositionInput {
  name: string;
  type: "stock" | "crypto" | "etf" | "bond";
  shares: number;
  purchasePrice: number;
  currentPrice: number;
  currency?: string;
  originalPurchasePrice?: number;
  originalCurrentPrice?: number;
}
