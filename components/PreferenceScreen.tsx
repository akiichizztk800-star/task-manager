"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  type DayWish,
  employeeHolidayGoal,
  employeeLabel,
  holidayQuota,
  nextWish,
  roleText,
  usesHolidayQuota,
  weekdayLabels,
  wishLabel,
  wishSymbol,
} from "@/lib/planner";
import { useSiteSession } from "@/lib/site-session";
import { selectPlanningMonth, usePlanningMonth, usePlanningMonths } from "@/lib/use-month";
import {
  persistPreferences,
  usePlannerError,
  usePlannerStore,
} from "@/lib/use-planner";

export function PreferenceScreen() {
  const store = usePlannerStore();
  const connectionError = usePlannerError();
  const session = useSiteSession();
  const month = usePlanningMonth();
  const months = usePlanningMonths();
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
      setSavedName(employeeLabel(employee, session?.hideNames !== false));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "送信に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  const preferredCount = Object.values(days).filter((wish) => wish === "preferred").length;
  const offCount = Object.values(days).filter((wish) => wish === "off").length;
  const hideNames = session?.hideNames !== false;
  const quota = holidayQuota(store, month.key);
  const previewEmployee = employee;
  const previewPreferences = previewEmployee
    ? [
        ...store.preferences.filter(
          (item) => !(item.employeeId === previewEmployee.id && item.month === month.key),
        ),
        { employeeId: previewEmployee.id, month: month.key, days },
      ]
    : store.preferences;
  const goal = previewEmployee
    ? employeeHolidayGoal(previewEmployee, previewPreferences, month, quota)
    : null;
  const shownPaid = goal?.paid ?? 0;
  const shownTarget = goal?.targetOff ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">出勤希望を出す</h1>
      <p className="mt-2 text-stone-600">
        {hideNames ? "表示コード" : "名前"}を選び、対象月の各日を指定します。社員の有給は規定休日に加算されます。アルバイトとダブルトラックは規定休日の対象外です。未設定の日は △ です。
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
            <span className="text-sm font-medium text-stone-700">{hideNames ? "表示コード" : "名前"}</span>
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
                  {employeeLabel(item, hideNames)}（{roleText(item)}）
                </option>
              ))}
            </select>
          </label>

          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-stone-700">対象月</h2>
              <select
                value={month.key}
                onChange={(event) => {
                  selectPlanningMonth(event.target.value);
                  setDraft(null);
                  setDraftFor(null);
                }}
                className="mt-1 h-12 rounded-xl border border-stone-300 bg-white px-3 outline-none ring-teal-700 focus:ring-2"
              >
                {(months ?? [month]).map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-right text-sm text-stone-500">
              ◎ {preferredCount}日 / × {offCount}日 / 有 {shownPaid}日
            </p>
          </div>
          <p className="mt-2 text-sm text-stone-600">
            {employee && usesHolidayQuota(employee)
              ? `社員の規定休日は${quota}日です。有給${shownPaid}日と週2日の休日を含めた休みの目標は${shownTarget}日です。`
              : `この区分は規定休日の対象外です。希望の休みと、週あたり2日の休日を含めた目標は${shownTarget}日です。`}
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
              {hideNames ? savedName : `${savedName}さん`}の希望を保存しました。
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
