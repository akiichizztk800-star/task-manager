"use client";

import { FormEvent, useState } from "react";
import {
  type Employee,
  type EmploymentType,
  createSeed,
  daysInMonth,
  employmentLabel,
  normalizeName,
} from "@/lib/planner";
import { useSiteSession } from "@/lib/site-session";
import { usePlanningMonth } from "@/lib/use-month";
import {
  persistDemoData,
  persistEmployee,
  persistEmployeeRemoval,
  persistHideNames,
  usePlannerError,
  usePlannerStore,
} from "@/lib/use-planner";
import { RoleBadges } from "@/components/RoleBadges";

const emptyDraft = {
  name: "",
  code: "",
  employmentType: "fulltime" as EmploymentType,
  supervisor: false,
  engineer: false,
};

export function EmployeeScreen() {
  const store = usePlannerStore();
  const connectionError = usePlannerError();
  const session = useSiteSession();
  const month = usePlanningMonth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!store) {
    return (
      <main className="px-4 py-8 text-stone-600">
        {connectionError ?? "読み込み中…"}
      </main>
    );
  }

  const supervisorCount = store.employees.filter((employee) => employee.supervisor).length;
  const engineerCount = store.employees.filter((employee) => employee.engineer).length;

  function startEdit(employee: Employee) {
    setEditingId(employee.id);
    setDraft({
      name: employee.name,
      code: employee.code,
      employmentType: employee.employmentType,
      supervisor: employee.supervisor,
      engineer: employee.engineer,
    });
    setError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = normalizeName(draft.name);
    if (!name) {
      setError("名前を入力してください。");
      return;
    }
    const code = draft.code.trim().toUpperCase();
    if (!code) {
      setError("表示コードを入力してください。");
      return;
    }
    const duplicate = store!.employees.some(
      (employee) => employee.id !== editingId && normalizeName(employee.name) === name,
    );
    if (duplicate) {
      setError("同じ名前の従業員がいます。");
      return;
    }
    const duplicateCode = store!.employees.some(
      (employee) => employee.id !== editingId && employee.code.toUpperCase() === code,
    );
    if (duplicateCode) {
      setError("同じ表示コードの従業員がいます。");
      return;
    }
    setBusy(true);
    try {
      await persistEmployee({
        id: editingId ?? crypto.randomUUID(),
        name,
        code,
        employmentType: draft.employmentType,
        supervisor: draft.supervisor,
        engineer: draft.engineer,
      });
      setEditingId(null);
      setDraft(emptyDraft);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(employee: Employee) {
    if (!window.confirm(`${employee.name}さんを削除しますか？`)) return;
    setBusy(true);
    try {
      await persistEmployeeRemoval(employee.id);
      if (editingId === employee.id) {
        setEditingId(null);
        setDraft(emptyDraft);
      }
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "削除に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  async function restoreSeed() {
    if (!window.confirm("この拠点の従業員、希望、確定シフトを、12名のデモデータで上書きします。他の拠点は変わりません。")) return;
    if (!month) return;
    setBusy(true);
    try {
      await persistDemoData(createSeed(month.key, daysInMonth(month).length));
      setEditingId(null);
      setDraft(emptyDraft);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "初期化に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">従業員</h1>
          <p className="mt-2 text-stone-600">
            {session?.name}の従業員です。責任者 {supervisorCount}名、エンジニア {engineerCount}名、合計 {store.employees.length}名。
            社員だけが規定休日数の対象です。名前を隠すと、希望とシフト表には表示コードだけが出ます。
          </p>
        </div>
          <button
          type="button"
          onClick={() => void restoreSeed()}
          disabled={busy}
          className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-600 hover:border-stone-500 disabled:opacity-50"
        >
          デモデータ初期化
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-stone-700">
          {editingId ? "従業員を編集" : "従業員を追加"}
        </h2>
        <label className="mt-3 block">
          <span className="text-sm text-stone-600">名前</span>
          <input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="例: 佐々木 葵"
            className="mt-1 h-12 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 outline-none ring-teal-700 focus:bg-white focus:ring-2"
          />
        </label>
        <label className="mt-3 block">
          <span className="text-sm text-stone-600">表示コード</span>
          <input
            value={draft.code}
            onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
            placeholder="例: E-13"
            className="mt-1 h-12 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 outline-none ring-teal-700 focus:bg-white focus:ring-2"
          />
        </label>
        <label className="mt-3 block">
          <span className="text-sm text-stone-600">区分</span>
          <select
            value={draft.employmentType}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                employmentType: event.target.value as EmploymentType,
              }))
            }
            className="mt-1 h-12 w-full rounded-xl border border-stone-300 bg-white px-3 outline-none ring-teal-700 focus:ring-2"
          >
            <option value="fulltime">{employmentLabel("fulltime")}</option>
            <option value="parttime">{employmentLabel("parttime")}</option>
            <option value="doubletrack">{employmentLabel("doubletrack")}</option>
          </select>
        </label>
        <fieldset className="mt-4 flex flex-wrap gap-4">
          <legend className="sr-only">役割</legend>
          <label className="flex items-center gap-2 text-sm text-stone-800">
            <input
              type="checkbox"
              checked={draft.supervisor}
              onChange={(event) =>
                setDraft((current) => ({ ...current, supervisor: event.target.checked }))
              }
              className="size-4 accent-teal-700"
            />
            責任者
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-800">
            <input
              type="checkbox"
              checked={draft.engineer}
              onChange={(event) =>
                setDraft((current) => ({ ...current, engineer: event.target.checked }))
              }
              className="size-4 accent-teal-700"
            />
            エンジニア
          </label>
        </fieldset>
        <label className="mt-4 flex items-center gap-2 text-sm text-stone-800">
          <input
            type="checkbox"
            checked={session?.hideNames !== false}
            onChange={(event) => void persistHideNames(event.target.checked)}
            className="size-4 accent-teal-700"
          />
          希望とシフト表では名前を出さない
        </label>
        {error ? (
          <p className="mt-3 text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-xl bg-stone-900 px-5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {editingId ? "更新する" : "追加する"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setDraft(emptyDraft);
                setError(null);
              }}
              className="h-11 rounded-xl px-4 text-sm text-stone-600 hover:text-stone-900"
            >
              キャンセル
            </button>
          ) : null}
        </div>
      </form>

      <ul className="mt-6 divide-y divide-stone-200 overflow-hidden rounded-3xl border border-stone-200 bg-white">
        {store.employees.length === 0 ? (
          <li className="px-5 py-8 text-center text-stone-500">従業員はまだいません。</li>
        ) : (
          store.employees.map((employee) => (
            <li key={employee.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-stone-900">
                  {employee.name}
                  <span className="ml-2 text-sm font-normal text-stone-500">{employee.code}</span>
                </p>
                <div className="mt-1">
                  <RoleBadges employee={employee} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => startEdit(employee)}
                className="text-sm text-stone-600 hover:text-stone-900"
              >
                編集
              </button>
              <button
                type="button"
                onClick={() => onDelete(employee)}
                className="text-sm text-stone-500 hover:text-rose-700"
              >
                削除
              </button>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
