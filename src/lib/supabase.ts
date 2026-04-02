import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

function readEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const envUrl = readEnv(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const envKey =
  readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  readEnv(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined);

const supabaseUrl = envUrl ?? `https://${projectId}.supabase.co`;
const supabaseKey = envKey ?? publicAnonKey;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export { supabaseKey, supabaseUrl };
