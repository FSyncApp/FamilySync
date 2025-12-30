import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const extra =
  (Constants.expoConfig?.extra as any) ??
  (Constants.manifest as any)?.extra ??
  {};

const url = extra.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = extra.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "Supabase env missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in app.json extra"
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "");
