import { employmentLabel, type Employee } from "@/lib/planner";

export function RoleBadges({ employee }: { employee: Employee }) {
  const badges = [
    { label: employmentLabel(employee.employmentType), className: "bg-stone-200 text-stone-800" },
    employee.supervisor ? { label: "責任者", className: "bg-amber-100 text-amber-950" } : null,
    employee.engineer ? { label: "エンジニア", className: "bg-sky-100 text-sky-950" } : null,
  ].filter((badge) => badge !== null);

  const visible = badges;

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
