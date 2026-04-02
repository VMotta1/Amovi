import { useEffect, useState } from "react";
import { getCachedUserSettings, getUserSettings } from "../lib/settings";
import { useAuth } from "../providers/AuthProvider";

export function useUserCurrency() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState(() => (user ? getCachedUserSettings(user.id)?.currency ?? "USD" : "USD"));

  useEffect(() => {
    if (!user) {
      setCurrency("USD");
      return;
    }

    const cachedSettings = getCachedUserSettings(user.id);
    if (cachedSettings) {
      setCurrency(cachedSettings.currency);
    }

    let isMounted = true;

    const loadCurrency = async () => {
      try {
        const settings = await getUserSettings(user.id);
        if (isMounted) {
          setCurrency(settings.currency);
        }
      } catch {
        if (isMounted) {
          setCurrency("USD");
        }
      }
    };

    if (!cachedSettings) {
      loadCurrency();
    }

    const handleSettingsUpdated = () => {
      loadCurrency();
    };

    window.addEventListener("settingsUpdated", handleSettingsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("settingsUpdated", handleSettingsUpdated);
    };
  }, [user]);

  return currency;
}
