"use client";

import { useSyncExternalStore } from "react";

export type SiteSession = {
  id: string;
  name: string;
  passcode: string;
  hideNames: boolean;
};

const STORAGE_KEY = "shift-planner.site";
const listeners = new Set<() => void>();
let snapshot: SiteSession | null = null;
let loaded = false;

function readStorage(): SiteSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SiteSession>;
    if (!parsed.id || !parsed.name || !parsed.passcode) return null;
    return {
      id: parsed.id,
      name: parsed.name,
      passcode: parsed.passcode,
      hideNames: parsed.hideNames !== false,
    };
  } catch {
    return null;
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  snapshot = readStorage();
  loaded = true;
}

function emit(next: SiteSession | null) {
  snapshot = next;
  loaded = true;
  if (typeof window !== "undefined") {
    if (next) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  ensureLoaded();
  return snapshot;
}

function getServerSnapshot() {
  return null;
}

export function useSiteSession() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function currentSiteSession() {
  ensureLoaded();
  return snapshot;
}

export function saveSiteSession(next: SiteSession) {
  emit(next);
}

export function clearSiteSession() {
  emit(null);
}

export function encodePasscode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}
