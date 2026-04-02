export interface Transaction {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  originalAmount: number;
  category: string;
  occurredOn: string;
  type: "income" | "expense";
  isRecurring: boolean;
  recurringActive: boolean;
  recurringFrequency: "daily" | "weekly" | "biweekly" | "monthly" | "yearly" | null;
  createdAt: string;
}

export interface TransactionInput {
  name: string;
  amount: number;
  currency?: string;
  originalAmount?: number;
  category: string;
  occurredOn: string;
  type: "income" | "expense";
  isRecurring?: boolean;
  recurringActive?: boolean;
  recurringFrequency?: "daily" | "weekly" | "biweekly" | "monthly" | "yearly";
}
