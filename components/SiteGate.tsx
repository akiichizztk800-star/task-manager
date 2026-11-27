"use client";

import { FormEvent, useState } from "react";
import { clearSiteSession, saveSiteSession, useSiteSession } from "@/lib/site-session";
import { getSupabase } from "@/lib/supabase";

type SiteProfile = {
  id: string;
  name: string;
  hide_names: boolean;
};

export function SiteGate({ children }: { children: React.ReactNode }) {
  const session = useSiteSession();
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return children;

  async function submit(create: boolean, event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data, error: rpcError } = await getSupabase().rpc(
        create ? "create_site" : "enter_site",
        { p_name: name, p_passcode: passcode },
      );
      if (rpcError) throw new Error(rpcError.message);
      const profile = data as SiteProfile | null;
      if (!profile?.id) {
        throw new Error("拠点名か合言葉が違います。");
      }
      saveSiteSession({
        id: profile.id,
        name: profile.name,
        passcode,
        hideNames: profile.hide_names !== false,
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "拠点を確認できませんでした。";
      setError(
        message.includes("enter_site") || message.includes("schema cache") || message.includes("Could not find")
          ? "SupabaseのSQL Editorで supabase/migration-sites.sql を実行してください。"
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <p className="text-sm font-medium text-teal-700">拠点</p>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">合言葉を入力</h1>
      <p className="mt-2 text-sm text-stone-600">
        合言葉が一致した拠点の従業員だけを読み込みます。他の拠点の名前は表示されません。
      </p>
      <form onSubmit={(event) => void submit(false, event)} className="mt-6 space-y-3">
        <label className="block text-sm text-stone-700">
          拠点名
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-stone-300 px-3 outline-none ring-teal-700 focus:ring-2"
          />
        </label>
        <label className="block text-sm text-stone-700">
          合言葉
          <input
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            autoComplete="current-password"
            className="mt-1 h-12 w-full rounded-xl border border-stone-300 px-3 outline-none ring-teal-700 focus:ring-2"
          />
        </label>
        {error ? (
          <p className="text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="h-12 w-full rounded-xl bg-stone-900 text-sm font-medium text-white disabled:opacity-50"
        >
          この拠点に入る
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit(true)}
          className="h-12 w-full rounded-xl border border-stone-300 text-sm text-stone-700 disabled:opacity-50"
        >
          新しい拠点を作る
        </button>
      </form>
    </main>
  );
}

export function leaveSite() {
  clearSiteSession();
}
