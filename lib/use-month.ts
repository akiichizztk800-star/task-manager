"use client";

import { useSyncExternalStore } from "react";
import { listPlanningMonths, type MonthGrid } from "@/lib/planner";

const STORAGE_KEY = "shift-planner.month";
const listeners = new Set<() => void>();
let cachedMonths: MonthGrid[] | null = null;
let cachedKey = "";

function months() {
  const today = new Date();
  const stamp = `${today.getFullYear()}-${today.getMonth()}`;
  if (!cachedMonths || cachedKey !== stamp) {
    cachedKey = stamp;
    cachedMonths = listPlanningMonths(today);
  }
  return cachedMonths;
}

function selectedKey() {
  if (typeof window === "undefined") return months()[0]?.key ?? "2026-12";
  return window.sessionStorage.getItem(STORAGE_KEY) || months()[0]?.key || "2026-12";
}

function selectedMonth() {
  const available = months();
  return available.find((month) => month.key === selectedKey()) ?? available[0] ?? null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePlanningMonths() {
  return useSyncExternalStore(subscribe, months, () => null);
}

export function usePlanningMonth() {
  return useSyncExternalStore(subscribe, selectedMonth, () => null);
}

export function selectPlanningMonth(key: string) {
  window.sessionStorage.setItem(STORAGE_KEY, key);
  listeners.forEach((listener) => listener());
}
