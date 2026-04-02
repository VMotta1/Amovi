import {
  ShoppingCart,
  Utensils,
  Bus,
  Film,
  Book,
  TrendingUp,
  DollarSign,
  Home,
  Heart,
  Zap,
  Landmark,
  Wifi,
  PiggyBank,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  FOOD_AND_DRINK: Utensils,
  "Food and Drink": Utensils,
  TRANSPORTATION: Bus,
  TRAVEL: Bus,
  Travel: Bus,
  ENTERTAINMENT: Film,
  Recreation: Film,
  GENERAL_MERCHANDISE: ShoppingCart,
  Shops: ShoppingCart,
  GENERAL_SERVICES: Zap,
  Service: Wifi,
  RENT_AND_UTILITIES: Home,
  MEDICAL: Heart,
  PERSONAL_CARE: Heart,
  EDUCATION: Book,
  TRANSFER_IN: DollarSign,
  TRANSFER_OUT: DollarSign,
  Transfer: DollarSign,
  Payment: DollarSign,
  INCOME: DollarSign,
  LOAN_PAYMENTS: Landmark,
  BANK_FEES: Landmark,
  GOVERNMENT_AND_NON_PROFIT: Landmark,
  Savings: PiggyBank,
};

export function getCategoryIcon(
  category: string,
  type?: "income" | "expense"
): React.ReactNode {
  if (type === "income") {
    return <TrendingUp className="size-4" />;
  }

  const Icon = CATEGORY_ICON_MAP[category];
  if (Icon) {
    return <Icon className="size-4" />;
  }

  const lower = category.toLowerCase();
  if (lower.includes("food") || lower.includes("drink")) return <Utensils className="size-4" />;
  if (lower.includes("transport") || lower.includes("travel")) return <Bus className="size-4" />;
  if (lower.includes("entertain") || lower.includes("recreation")) return <Film className="size-4" />;
  if (lower.includes("book") || lower.includes("education")) return <Book className="size-4" />;
  if (lower.includes("job") || lower.includes("income") || lower.includes("scholarship"))
    return <TrendingUp className="size-4" />;
  if (lower.includes("saving") || lower.includes("goal") || lower.includes("piggy"))
    return <PiggyBank className="size-4" />;

  return <ShoppingCart className="size-4" />;
}
