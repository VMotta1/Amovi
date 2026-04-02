import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Home, BarChart3, TrendingDown, Target, TrendingUp, Settings, Repeat } from "lucide-react";
import { useI18n } from "../providers/I18nProvider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { cn } from "./ui/utils";

interface NavigationProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export default function Navigation({ mobileOpen = false, onMobileOpenChange }: NavigationProps) {
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

  useEffect(() => {
    onMobileOpenChange?.(false);
  }, [location.pathname, onMobileOpenChange]);

  return (
    <>
      <nav className="fixed inset-x-0 top-28 z-40 hidden h-16 border-b border-border bg-card px-6 shadow-sm md:block">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary",
                )}
              >
                <Icon className="size-6" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {onMobileOpenChange ? (
        <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
          <SheetContent side="left" className="w-[86%] max-w-xs border-r bg-card p-0">
            <SheetHeader className="border-b border-border px-5 py-5 text-left">
              <SheetTitle className="text-base">Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-2 px-3 py-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => onMobileOpenChange(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="size-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}
