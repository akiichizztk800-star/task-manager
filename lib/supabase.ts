import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { currentSiteSession, encodePasscode } from "@/lib/site-session";

let client: SupabaseClient | null = null;
let clientStamp = "";

export function getSupabase() {
  const session = currentSiteSession();
  const stamp = session ? `${session.id}:${session.passcode}` : "";
  if (client && clientStamp === stamp) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabaseの環境変数が設定されていません。");
  }
  client = createClient(url, key, {
    global: {
      headers: session
        ? {
            "x-site-id": session.id,
            "x-site-key": encodePasscode(session.passcode),
          }
        : {},
    },
  });
  clientStamp = stamp;
  return client;
}
