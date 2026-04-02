import { Link, useLocation } from "react-router";
import {
  Home,
  BarChart3,
  TrendingDown,
  Target,
  TrendingUp,
  Settings,
  Repeat,
  Sparkles,
} from "lucide-react";
import { useI18n } from "../providers/I18nProvider";
import { cn } from "./ui/utils";

interface NavigationProps {
  onNavigate?: () => void;
}

export default function Navigation({ onNavigate }: NavigationProps) {
  const location = useLocation();
  const { t } = useI18n();

  const navItems = [
    { to: "/", icon: Home, label: t("nav.home") },
    { to: "/analytics", icon: BarChart3, label: t("nav.analytics") },
    { to: "/transactions", icon: TrendingDown, label: t("nav.transactions") },
    { to: "/subscriptions", icon: Repeat, label: t("nav.subscriptions") },
    { to: "/investments", icon: TrendingUp, label: t("nav.investments") },
    { to: "/budget-goals", icon: Target, label: t("nav.budgetGoals") },
    { to: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  return (
    <nav className="flex flex-col flex-1 px-3 py-4 gap-1 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.to;

        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
            )}
            <Icon className="size-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}

      {/* Divider */}
      <div className="mt-auto pt-4 border-t border-border">
        <Link
          to="/upload"
          onClick={onNavigate}
          className={cn(
            "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            location.pathname === "/upload" || location.pathname === "/results"
              ? "bg-accent/10 text-accent"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          {(location.pathname === "/upload" || location.pathname === "/results") && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-accent" />
          )}
          <Sparkles className="size-4 shrink-0" />
          <span>AI Discount Scanner</span>
        </Link>
      </div>
    </nav>
  );
}
