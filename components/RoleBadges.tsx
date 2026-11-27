import type { Employee } from "@/lib/planner";

export function RoleBadges({ employee }: { employee: Employee }) {
  const badges = [
    employee.supervisor ? { label: "責任者", className: "bg-amber-100 text-amber-950" } : null,
    employee.engineer ? { label: "エンジニア", className: "bg-sky-100 text-sky-950" } : null,
  ].filter((badge) => badge !== null);

  const visible = badges.length > 0 ? badges : [{ label: "一般", className: "bg-stone-100 text-stone-600" }];

  return (
    <span className="flex flex-wrap gap-1">
      {visible.map((badge) => (
        <span
          key={badge.label}
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      ))}
    </span>
  );
}
