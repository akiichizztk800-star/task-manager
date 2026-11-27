"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  type DayWish,
  type Employee,
  type MonthGrid,
  type PlannerStore,
  type ShiftPlan,
  DEFAULT_HOLIDAY_QUOTA,
  getNextMonth,
  removeEmployee,
  savePlan,
  setHolidayQuota,
  upsertEmployee,
  upsertPreferences,
} from "@/lib/planner";
import { getSupabase } from "@/lib/supabase";

type RemoteSnapshot = {
  store: PlannerStore | null;
  error: string | null;
};

type EmployeeRow = {
  id: string;
  name: string;
  supervisor: boolean;
  engineer: boolean;
};

type PreferenceRow = {
  employee_id: string;
  month: string;
  days: unknown;
};

type PlanRow = {
  month: string;
  holiday_quota: number;
  assignments: unknown;
};

const serverSnapshot: RemoteSnapshot = { store: null, error: null };
let snapshot: RemoteSnapshot = serverSnapshot;
const listeners = new Set<() => void>();
let started = false;

function emit(next: RemoteSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  start();
  return snapshot;
}

function getServerSnapshot() {
  return serverSnapshot;
}

function formatError(error: { message?: string; code?: string }) {
  const message = error.message ?? "Supabaseへの保存に失敗しました。";
  if (
    error.code === "PGRST205" ||
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("Could not find")
  ) {
    return "テーブルがまだありません。SupabaseのSQL Editorで supabase/schema.sql を実行してください。";
  }
  return message;
}

function isWish(value: unknown): value is DayWish {
  return value === "preferred" || value === "off" || value === "either" || value === "paid";
}

function readDays(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, DayWish] => isWish(entry[1])),
  );
}

function readAssignments(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string[]] =>
        Array.isArray(entry[1]) && entry[1].every((id) => typeof id === "string"),
    ),
  );
}

function toStore(employees: EmployeeRow[], preferences: PreferenceRow[], plans: PlanRow[]): PlannerStore {
  const holidayQuotas: Record<string, number> = {};
  const shiftPlans: ShiftPlan[] = [];
  for (const plan of plans) {
    holidayQuotas[plan.month] = plan.holiday_quota;
    const assignments = readAssignments(plan.assignments);
    if (Object.keys(assignments).length > 0) {
      shiftPlans.push({ month: plan.month, assignments });
    }
  }
  return {
    employees: employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      supervisor: employee.supervisor,
      engineer: employee.engineer,
    })),
    preferences: preferences.map((preference) => ({
      employeeId: preference.employee_id,
      month: preference.month,
      days: readDays(preference.days),
    })),
    plans: shiftPlans,
    holidayQuotas,
  };
}

async function refresh() {
  const db = getSupabase();
  const [employees, preferences, plans] = await Promise.all([
    db.from("employees").select("id, name, supervisor, engineer").order("created_at").order("id"),
    db.from("shift_preferences").select("employee_id, month, days"),
    db.from("shift_plans").select("month, holiday_quota, assignments"),
  ]);
  const error = employees.error ?? preferences.error ?? plans.error;
  if (error) {
    emit({ store: snapshot.store, error: formatError(error) });
    return;
  }
  emit({
    store: toStore(
      (employees.data ?? []) as EmployeeRow[],
      (preferences.data ?? []) as PreferenceRow[],
      (plans.data ?? []) as PlanRow[],
    ),
    error: null,
  });
}

function describeFailure(error: unknown) {
  if (error instanceof Error && error.message === "Failed to fetch") {
    return "Supabaseに接続できませんでした。通信環境を確認して、もう一度開いてください。";
  }
  return error instanceof Error ? error.message : "読み込みに失敗しました。";
}

function start() {
  if (started) return;
  started = true;
  queueMicrotask(() => {
    void refresh().catch((error: unknown) => {
      emit({ store: snapshot.store, error: describeFailure(error) });
    });
    try {
      const db = getSupabase();
      db.channel("planner-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, () => {
          void refresh();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "shift_preferences" }, () => {
          void refresh();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "shift_plans" }, () => {
          void refresh();
        })
        .subscribe();
      window.addEventListener("focus", () => {
        void refresh();
      });
    } catch (error) {
      emit({ store: snapshot.store, error: describeFailure(error) });
    }
  });
}

function useRemoteSnapshot() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    start();
  }, []);
  return current;
}

let cachedStamp = "";
let cachedMonth: MonthGrid | null = null;

function readMonth() {
  const today = new Date();
  const stamp = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  if (stamp !== cachedStamp || !cachedMonth) {
    cachedStamp = stamp;
    cachedMonth = getNextMonth(today);
  }
  return cachedMonth;
}

export function useNextMonth() {
  return useSyncExternalStore(subscribeToNothing, readMonth, serverMonth);
}

function subscribeToNothing() {
  return () => {};
}

function serverMonth() {
  return null;
}

export function usePlannerStore() {
  return useRemoteSnapshot().store;
}

export function usePlannerError() {
  return useRemoteSnapshot().error;
}

function requireStore() {
  if (!snapshot.store) throw new Error("データを読み込み中です。");
  return snapshot.store;
}

async function fail(error: { message?: string; code?: string }): Promise<never> {
  await refresh();
  throw new Error(formatError(error));
}

export async function persistEmployee(employee: Employee) {
  const next = upsertEmployee(requireStore(), employee);
  emit({ store: next, error: null });
  const { error } = await getSupabase().from("employees").upsert({
    id: employee.id,
    name: employee.name,
    supervisor: employee.supervisor,
    engineer: employee.engineer,
  });
  if (error) return fail(error);
}

export async function persistEmployeeRemoval(employeeId: string) {
  const next = removeEmployee(requireStore(), employeeId);
  emit({ store: next, error: null });
  const db = getSupabase();
  const removed = await db.from("employees").delete().eq("id", employeeId);
  if (removed.error) return fail(removed.error);
  await Promise.all(
    Object.entries(next.holidayQuotas).map(([month, holidayQuota]) =>
      db.from("shift_plans").upsert({
        month,
        holiday_quota: holidayQuota,
        assignments: next.plans.find((plan) => plan.month === month)?.assignments ?? {},
        updated_at: new Date().toISOString(),
      }),
    ),
  );
}

export async function persistPreferences(
  employeeId: string,
  month: string,
  days: Record<string, DayWish>,
) {
  const next = upsertPreferences(requireStore(), employeeId, month, days);
  emit({ store: next, error: null });
  const { error } = await getSupabase().from("shift_preferences").upsert(
    {
      employee_id: employeeId,
      month,
      days,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "employee_id,month" },
  );
  if (error) return fail(error);
}

export async function persistAssignments(month: string, assignments: Record<string, string[]>) {
  const current = requireStore();
  const next = savePlan(current, month, assignments);
  emit({ store: next, error: null });
  const { error } = await getSupabase().from("shift_plans").upsert({
    month,
    holiday_quota: next.holidayQuotas[month] ?? DEFAULT_HOLIDAY_QUOTA,
    assignments,
    updated_at: new Date().toISOString(),
  });
  if (error) return fail(error);
}

export async function persistHolidayQuota(month: string, quota: number) {
  const current = requireStore();
  const next = setHolidayQuota(current, month, quota);
  emit({ store: next, error: null });
  const { error } = await getSupabase().from("shift_plans").upsert({
    month,
    holiday_quota: next.holidayQuotas[month] ?? quota,
    assignments: next.plans.find((plan) => plan.month === month)?.assignments ?? {},
    updated_at: new Date().toISOString(),
  });
  if (error) return fail(error);
}

export async function persistDemoData(seed: PlannerStore) {
  const db = getSupabase();
  const cleared = await Promise.all([
    db.from("shift_preferences").delete().not("employee_id", "is", null),
    db.from("shift_plans").delete().not("month", "is", null),
  ]);
  const clearError = cleared.find((result) => result.error)?.error;
  if (clearError) return fail(clearError);
  const removedEmployees = await db.from("employees").delete().not("id", "is", null);
  if (removedEmployees.error) return fail(removedEmployees.error);

  emit({ store: seed, error: null });

  const insertedEmployees = await db.from("employees").insert(
    seed.employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      supervisor: employee.supervisor,
      engineer: employee.engineer,
    })),
  );
  if (insertedEmployees.error) return fail(insertedEmployees.error);

  if (seed.preferences.length > 0) {
    const insertedPreferences = await db.from("shift_preferences").insert(
      seed.preferences.map((preference) => ({
        employee_id: preference.employeeId,
        month: preference.month,
        days: preference.days,
      })),
    );
    if (insertedPreferences.error) return fail(insertedPreferences.error);
  }

  const insertedPlans = await db.from("shift_plans").insert(
    Object.entries(seed.holidayQuotas).map(([month, holidayQuota]) => ({
      month,
      holiday_quota: holidayQuota,
      assignments: seed.plans.find((plan) => plan.month === month)?.assignments ?? {},
    })),
  );
  if (insertedPlans.error) return fail(insertedPlans.error);
  await refresh();
}
