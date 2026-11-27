"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  type DayWish,
  employeeHolidayGoal,
  holidayQuota,
  nextWish,
  roleText,
  weekdayLabels,
  wishLabel,
  wishSymbol,
} from "@/lib/planner";
import {
  persistPreferences,
  useNextMonth,
  usePlannerError,
  usePlannerStore,
} from "@/lib/use-planner";

export function PreferenceScreen() {
  const store = usePlannerStore();
  const connectionError = usePlannerError();
  const month = useNextMonth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, DayWish> | null>(null);
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!store || !month) {
    return <main className="px-4 py-8 text-stone-600">{connectionError ?? "読み込み中…"}</main>;
  }

  const activeId = employeeId ?? store.employees[0]?.id ?? null;
  const employee = store.employees.find((item) => item.id === activeId) ?? null;
  const saved = store.preferences.find(
    (item) => item.employeeId === activeId && item.month === month.key,
  );
  const days = draftFor === activeId && draft ? draft : (saved?.days ?? {});

  function wishOn(iso: string): DayWish {
    return days[iso] ?? "either";
  }

  function cycle(iso: string) {
    if (!activeId) return;
    const base = { ...(draftFor === activeId && draft ? draft : (saved?.days ?? {})) };
    const next = nextWish(base[iso] ?? "either");
    if (next === "either") delete base[iso];
    else base[iso] = next;
    setDraft(base);
    setDraftFor(activeId);
    setSavedName(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!employee) return;
    setBusy(true);
    try {
      await persistPreferences(employee.id, month!.key, days);
      setDraft(null);
      setDraftFor(null);
      setSavedName(employee.name);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "送信に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  const preferredCount = Object.values(days).filter((wish) => wish === "preferred").length;
  const offCount = Object.values(days).filter((wish) => wish === "off").length;
  const quota = holidayQuota(store, month.key);
  const goal = employee
    ? employeeHolidayGoal(employee.id, store.preferences, month, quota)
    : null;
  const draftPaid = Object.values(days).filter((wish) => wish === "paid").length;
  const shownPaid = draftFor === activeId && draft ? draftPaid : (goal?.paid ?? 0);
  const shownTarget = quota + shownPaid;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">出勤希望を出す</h1>
      <p className="mt-2 text-stone-600">
        名前を選び、{month.label}の各日を指定します。有給にした日は休みになり、その日数は規定休日数に加算されます。未設定の日は △ です。
      </p>

      {store.employees.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white px-4 py-6 text-stone-600">
          従業員がいないため希望を送れません。
          <Link href="/employees" className="ml-2 underline">
            従業員を追加
          </Link>
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">名前</span>
            <select
              value={activeId ?? ""}
              onChange={(event) => {
                setEmployeeId(event.target.value);
                setDraft(null);
                setDraftFor(null);
                setSavedName(null);
              }}
              className="mt-2 h-12 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 outline-none ring-teal-700 focus:bg-white focus:ring-2"
            >
              {store.employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}（{roleText(item)}）
                </option>
              ))}
            </select>
          </label>

          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-stone-700">対象月</h2>
              <p className="mt-1 text-lg font-semibold text-stone-900">{month.label}</p>
            </div>
            <p className="text-right text-sm text-stone-500">
              ◎ {preferredCount}日 / × {offCount}日 / 有 {shownPaid}日
            </p>
          </div>
          <p className="mt-2 text-sm text-stone-600">
            規定休日は{quota}日です。有給{shownPaid}日を加算すると、休みの目標は{shownTarget}日です。
          </p>
          <p className="mt-1 text-sm text-stone-500">日付を押すたびに △ → ◎ → × → 有 → △ と変わります。</p>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-stone-500">
            {weekdayLabels().map((label) => (
              <div
                key={label}
                className={
                  label === "日" ? "py-2 text-rose-600" : label === "土" ? "py-2 text-sky-700" : "py-2"
                }
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {month.cells.map((cell, index) =>
              cell ? (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => cycle(cell.iso)}
                  aria-label={`${month.month}月${cell.day}日 ${wishLabel(wishOn(cell.iso))}`}
                  className={
                    wishOn(cell.iso) === "preferred"
                      ? "flex h-14 flex-col items-center justify-center rounded-xl bg-teal-700 text-white"
                      : wishOn(cell.iso) === "paid"
                        ? "flex h-14 flex-col items-center justify-center rounded-xl bg-violet-700 text-white"
                        : wishOn(cell.iso) === "off"
                          ? "flex h-14 flex-col items-center justify-center rounded-xl bg-rose-100 text-rose-800"
                          : "flex h-14 flex-col items-center justify-center rounded-xl bg-stone-50 text-stone-700 hover:bg-stone-100"
                  }
                >
                  <span className="text-[11px] leading-none">{cell.day}</span>
                  <span className="text-lg leading-none">{wishSymbol(wishOn(cell.iso))}</span>
                </button>
              ) : (
                <div key={`empty-${index}`} className="h-14" />
              ),
            )}
          </div>

          {error ? (
            <p className="mt-4 text-sm text-rose-700" role="alert">
              {error}
            </p>
          ) : null}
          {savedName ? (
            <p className="mt-4 text-sm text-teal-800" role="status">
              {savedName}さんの希望を保存しました。
              <Link href="/manager" className="ml-2 underline">
                シフト作成へ
              </Link>
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 h-12 w-full rounded-xl bg-stone-900 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            希望を送信
          </button>
        </form>
      )}
    </main>
  );
}
