"use client";

import Link from "next/link";
import { leaveSite } from "@/components/SiteGate";
import { resetPlanner } from "@/lib/use-planner";
import { useSiteSession } from "@/lib/site-session";

const links = [
  { href: "/employees", id: "employees", label: "従業員" },
  { href: "/staff", id: "staff", label: "希望" },
  { href: "/manager", id: "manager", label: "シフト" },
] as const;

export function SiteHeader({
  current,
}: {
  current: "home" | "employees" | "staff" | "manager";
}) {
  const session = useSiteSession();
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-teal-700">試作</p>
          <p className="truncate text-lg font-semibold tracking-tight text-stone-900">
            シフト作成
          </p>
        </Link>
        <nav className="flex gap-1 rounded-full bg-stone-100 p-1">
          {links.map((link) => {
            const active = current === link.id;
            return (
              <Link
                key={link.id}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-full bg-stone-900 px-3 py-2 text-sm font-medium text-white"
                    : "rounded-full px-3 py-2 text-sm font-medium text-stone-600 hover:text-stone-900"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        {session ? (
          <button
            type="button"
            onClick={() => {
              resetPlanner();
              leaveSite();
            }}
            className="text-sm text-stone-500 hover:text-stone-900"
          >
            {session.name}から出る
          </button>
        ) : null}
      </div>
    </header>
  );
}
