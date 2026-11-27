"use client";

import { useState } from "react";
import Link from "next/link";
import { RoleBadges } from "@/components/RoleBadges";
import {
  assessPlan,
  assessWeeklyOffs,
  daysInMonth,
  employeeHolidayGoal,
  employeeLabel,
  generateAssignments,
  holidayQuota,
  toggleAssignment,
  usesHolidayQuota,
  weekdayLabel,
  wishFor,
  wishLabel,
  wishSymbol,
  workdayCount,
} from "@/lib/planner";
import { useSiteSession } from "@/lib/site-session";
import { selectPlanningMonth, usePlanningMonth, usePlanningMonths } from "@/lib/use-month";
import {
  persistAssignments,
  persistHolidayQuota,
  usePlannerError,
  usePlannerStore,
} from "@/lib/use-planner";

const rules = [
  "絶対: 休み希望（×）と有給の日は割り当てない",
  "絶対: 毎日5人以上を出勤にする",
  "絶対: 毎日、責任者を1人以上入れる",
  "絶対: 月曜始まりの各週で、2日以上休ませる（週の日数が2日未満の端数は除く）",
  "努力: 毎日、エンジニアを1人以上入れる",
  "休日: 社員だけ、規定休日数に有給日数を足した日数だけ休ませる",
];

export function PlannerScreen() {
  const store = usePlannerStore();
  const connectionError = usePlannerError();
  const session = useSiteSession();
  const month = usePlanningMonth();
  const months = usePlanningMonths();
  const [actionError, setActionError] = useState<string | null>(null);

  const days = month ? daysInMonth(month) : [];
  const plan = store && month ? (store.plans.find((item) => item.month === month.key) ?? null) : null;
  const hideNames = session?.hideNames !== false;
  const issues = store && plan ? assessPlan(store.employees, plan.assignments, days) : [];
  const weeklyIssues = store && plan && month ? assessWeeklyOffs(store.employees, plan.assignments, month, hideNames) : [];

  if (!store || !month) {
    return <main className="px-4 py-8 text-stone-600">{connectionError ?? "読み込み中…"}</main>;
  }

  const issueByIso = new Map(issues.map((issue) => [issue.iso, issue]));
  const activeMonth = month;
  const activeStore = store;

  const quota = holidayQuota(activeStore, activeMonth.key);

  async function generate() {
    if (plan && !window.confirm("現在のシフト表と手修正を破棄して、作り直します。")) return;
    try {
      await persistAssignments(
        activeMonth.key,
        generateAssignments(activeStore.employees, activeStore.preferences, activeMonth, quota),
      );
      setActionError(null);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "生成結果の保存に失敗しました。");
    }
  }

  async function changeQuota(raw: string) {
    if (raw.trim() === "") return;
    const next = Number(raw);
    if (!Number.isInteger(next)) return;
    try {
      await persistHolidayQuota(activeMonth.key, Math.min(days.length, next));
      setActionError(null);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "規定休日数の保存に失敗しました。");
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">シフトを自動生成</h1>
          <p className="mt-2 text-stone-600">
            2026年12月以降の月を選べます。規定休日数は社員だけに適用します。アルバイトとダブルトラックは、希望の休みと週2日の休日だけを守ります。
          </p>
        </div>
        <label className="text-sm text-stone-700">
          対象月
          <select
            value={month.key}
            onChange={(event) => selectPlanningMonth(event.target.value)}
            className="mt-1 block h-12 rounded-xl border border-stone-300 bg-white px-3 outline-none ring-teal-700 focus:ring-2"
          >
            {(months ?? [month]).map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-stone-700">
          社員の規定休日数
          <input
            type="number"
            min={0}
            max={days.length}
            inputMode="numeric"
            value={quota}
            aria-label={`${month.label}の規定休日数`}
            onChange={(event) => void changeQuota(event.target.value)}
            className="mt-1 block h-12 w-28 rounded-xl border border-stone-300 bg-white px-3 outline-none ring-teal-700 focus:ring-2"
          />
        </label>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={store.employees.length === 0}
          className="h-12 rounded-xl bg-teal-700 px-5 text-sm font-medium text-white hover:bg-teal-800 disabled:bg-stone-300"
        >
          シフトを自動生成する
        </button>
      </div>

      <ol className="mt-5 grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
        {rules.map((rule) => (
          <li key={rule} className="rounded-2xl bg-white px-4 py-3">
            {rule}
          </li>
        ))}
      </ol>
      {actionError ? (
        <p className="mt-4 text-sm text-rose-700" role="alert">
          {actionError}
        </p>
      ) : null}

      {store.employees.length === 0 ? (
        <p className="mt-6 text-stone-600">
          従業員がいないため生成できません。
          <Link href="/employees" className="ml-2 underline">
            従業員を追加
          </Link>
        </p>
      ) : null}

      {!plan ? (
        <div className="mt-6 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
          <p className="text-lg font-medium text-stone-800">まだシフト表はありません</p>
          <p className="mt-2 text-stone-500">上のボタンを押すと、保存済みの希望から表を作ります。</p>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl bg-white px-4 py-3 text-sm">
            {issues.length === 0 && weeklyIssues.length === 0 ? (
              <p className="text-teal-800">すべての日で、5人以上かつ責任者1人以上を満たしています。</p>
            ) : (
              <ul className="space-y-1">
                {issues.map((issue) => (
                  <li key={issue.iso} className={issue.severe ? "text-rose-800" : "text-amber-800"}>
                    {month.month}月{issue.day}日: {issue.messages.join("、")}
                    {issue.severe ? "（要確認）" : "（努力目標）"}
                  </li>
                ))}
                {weeklyIssues.map((issue) => (
                  <li key={issue} className="text-amber-800">
                    {issue}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-stone-500">
              マスの「有」は有給です。クリックで出勤と休みを切り替えられます。赤は絶対条件の未達、黄はエンジニア不在です。
            </p>
          </div>

          <div className="mt-4 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-max border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 border-b border-r border-stone-200 bg-stone-50 px-4 py-3 text-left font-medium text-stone-600">
                      従業員
                    </th>
                    {days.map((day) => {
                      const issue = issueByIso.get(day.iso);
                      return (
                        <th
                          key={day.iso}
                          className={
                            issue?.severe
                              ? "min-w-12 border-b border-rose-200 bg-rose-100 px-1 py-2 text-center font-medium text-rose-800"
                              : issue
                                ? "min-w-12 border-b border-amber-200 bg-amber-100 px-1 py-2 text-center font-medium text-amber-900"
                                : day.weekday === 0
                                  ? "min-w-12 border-b border-stone-200 px-1 py-2 text-center font-medium text-rose-600"
                                  : day.weekday === 6
                                    ? "min-w-12 border-b border-stone-200 px-1 py-2 text-center font-medium text-sky-700"
                                    : "min-w-12 border-b border-stone-200 px-1 py-2 text-center font-medium text-stone-500"
                          }
                        >
                          <span className="block text-stone-900">{day.day}</span>
                          <span className="block text-[11px]">{weekdayLabel(day.weekday)}</span>
                        </th>
                      );
                    })}
                    <th className="border-b border-stone-200 px-3 py-3 text-left font-medium text-stone-500">
                      出勤 / 休日
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {store.employees.map((employee, index) => {
                    const rowBg = index % 2 === 1 ? "bg-stone-50" : "bg-white";
                    return (
                      <tr key={employee.id}>
                        <th
                          scope="row"
                          className={`sticky left-0 z-10 border-r border-t border-stone-200 px-4 py-2 text-left ${rowBg}`}
                        >
                          <span className="block font-medium text-stone-900">{employeeLabel(employee, hideNames)}</span>
                          <RoleBadges employee={employee} />
                        </th>
                        {days.map((day) => {
                          const working = (plan.assignments[day.iso] ?? []).includes(employee.id);
                          const wish = wishFor(store.preferences, employee.id, month.key, day.iso);
                          const paid = wish === "paid";
                          const issue = issueByIso.get(day.iso);
                          const status = working ? "出勤" : paid ? "有給" : "休み";
                          return (
                            <td
                              key={day.iso}
                              className={
                                issue?.severe
                                  ? "border-t border-rose-100 bg-rose-50 p-1 text-center"
                                  : issue
                                    ? "border-t border-amber-100 bg-amber-50 p-1 text-center"
                                    : "border-t border-stone-100 p-1 text-center"
                              }
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  const next = toggleAssignment(store, month.key, day.iso, employee.id);
                                  const assignments = next.plans.find((item) => item.month === month.key)?.assignments;
                                  if (!assignments) return;
                                  void persistAssignments(month.key, assignments).catch((caught: unknown) => {
                                    setActionError(
                                      caught instanceof Error ? caught.message : "シフトの保存に失敗しました。",
                                    );
                                  });
                                }}
                                aria-pressed={working}
                                aria-label={`${employeeLabel(employee, hideNames)} ${month.month}月${day.day}日 ${status}、希望は${wishLabel(wish)}`}
                                className={
                                  working
                                    ? "flex h-11 w-full flex-col items-center justify-center rounded-lg bg-teal-700 text-white"
                                    : paid
                                      ? "flex h-11 w-full flex-col items-center justify-center rounded-lg bg-violet-700 text-white"
                                      : "flex h-11 w-full flex-col items-center justify-center rounded-lg text-stone-400 hover:bg-white"
                                }
                              >
                                <span className="text-xs font-semibold">
                                  {working ? "出" : paid ? "有" : "休"}
                                </span>
                                {working || !paid ? (
                                  <span className="text-[11px] leading-none">{wishSymbol(wish)}</span>
                                ) : (
                                  <span className="text-[10px] leading-none">有給</span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                        <td className="border-t border-stone-100 px-3 text-center text-xs font-medium text-stone-700">
                          {(() => {
                            const goal = employeeHolidayGoal(
                              employee,
                              store.preferences,
                              month,
                              quota,
                            );
                            const worked = workdayCount(plan.assignments, employee.id);
                            const off = days.length - worked;
                            const matched = off === goal.targetOff;
                            return (
                              <>
                                <span className="block">出{worked}</span>
                                <span className={matched ? "block text-stone-500" : "block text-rose-700"}>
                                  休{off}/{goal.targetOff}
                                </span>
                                {goal.paid > 0 ? (
                                  <span className="block text-violet-700">有{goal.paid}</span>
                                ) : null}
                                {usesHolidayQuota(employee) ? null : (
                                  <span className="block text-stone-400">規定外</span>
                                )}
                              </>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th className="sticky left-0 z-10 border-r border-t border-stone-200 bg-stone-50 px-4 py-2 text-left text-xs font-medium text-stone-500">
                      出勤人数
                    </th>
                    {days.map((day) => {
                      const ids = plan.assignments[day.iso] ?? [];
                      const count = ids.length;
                      const supervisors = store.employees.filter(
                        (employee) => ids.includes(employee.id) && employee.supervisor,
                      ).length;
                      const engineers = store.employees.filter(
                        (employee) => ids.includes(employee.id) && employee.engineer,
                      ).length;
                      return (
                        <td
                          key={day.iso}
                          className={
                            issueByIso.get(day.iso)?.severe
                              ? "border-t border-rose-200 bg-rose-100 px-1 py-2 text-center"
                              : issueByIso.get(day.iso)
                                ? "border-t border-amber-200 bg-amber-100 px-1 py-2 text-center"
                                : "border-t border-stone-200 bg-stone-50 px-1 py-2 text-center"
                          }
                        >
                          <span className="block text-xs font-semibold text-stone-800">{count}</span>
                          <span className="block text-[10px] text-stone-500">
                            責{supervisors} 技{engineers}
                          </span>
                        </td>
                      );
                    })}
                    <td className="border-t border-stone-200 bg-stone-50" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
