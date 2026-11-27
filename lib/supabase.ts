import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { currentSiteSession, encodePasscode } from "@/lib/site-session";

let client: SupabaseClient | null = null;

function fetchWithSite(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const session = currentSiteSession();
  if (session) {
    headers.set("x-site-id", session.id);
    headers.set("x-site-key", encodePasscode(session.passcode));
  }
  return fetch(input, { ...init, headers });
}

export function getSupabase() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabaseの環境変数が設定されていません。");
  }
  client = createClient(url, key, {
    global: {
      fetch: fetchWithSite,
    },
  });
  return client;
}
