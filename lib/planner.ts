export type DayWish = "preferred" | "off" | "either" | "paid";

export const DEFAULT_HOLIDAY_QUOTA = 8;

export type EmploymentType = "fulltime" | "parttime" | "doubletrack";

export type Employee = {
  id: string;
  name: string;
  code: string;
  employmentType: EmploymentType;
  supervisor: boolean;
  engineer: boolean;
};

export type MonthPreferences = {
  employeeId: string;
  month: string;
  days: Record<string, DayWish>;
};

export type ShiftPlan = {
  month: string;
  assignments: Record<string, string[]>;
};

export type PlannerStore = {
  employees: Employee[];
  preferences: MonthPreferences[];
  plans: ShiftPlan[];
  holidayQuotas: Record<string, number>;
};

export type HolidayGoal = {
  paid: number;
  locked: number;
  targetOff: number;
  targetWork: number;
};

export type CalendarDay = {
  iso: string;
  day: number;
  weekday: number;
};

export type MonthGrid = {
  key: string;
  year: number;
  month: number;
  label: string;
  cells: Array<CalendarDay | null>;
};

export type DayIssue = {
  iso: string;
  day: number;
  severe: boolean;
  messages: string[];
};

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;

export const SEED_EMPLOYEES: Employee[] = [
  { id: "emp-01", code: "E-01", name: "佐藤 美咲", employmentType: "fulltime", supervisor: true, engineer: false },
  { id: "emp-02", code: "E-02", name: "鈴木 大輔", employmentType: "fulltime", supervisor: true, engineer: false },
  { id: "emp-03", code: "E-03", name: "高橋 蓮", employmentType: "fulltime", supervisor: true, engineer: true },
  { id: "emp-04", code: "E-04", name: "田中 陽菜", employmentType: "fulltime", supervisor: false, engineer: true },
  { id: "emp-05", code: "E-05", name: "伊藤 颯", employmentType: "fulltime", supervisor: false, engineer: true },
  { id: "emp-06", code: "E-06", name: "渡辺 結衣", employmentType: "fulltime", supervisor: false, engineer: false },
  { id: "emp-07", code: "E-07", name: "山本 翔", employmentType: "parttime", supervisor: false, engineer: false },
  { id: "emp-08", code: "E-08", name: "中村 葵", employmentType: "parttime", supervisor: false, engineer: false },
  { id: "emp-09", code: "E-09", name: "小林 海斗", employmentType: "parttime", supervisor: false, engineer: false },
  { id: "emp-10", code: "E-10", name: "加藤 凛", employmentType: "doubletrack", supervisor: false, engineer: false },
  { id: "emp-11", code: "E-11", name: "吉田 大和", employmentType: "doubletrack", supervisor: false, engineer: false },
  { id: "emp-12", code: "E-12", name: "山田 杏", employmentType: "doubletrack", supervisor: false, engineer: false },
];

export function weekdayLabels() {
  return WEEKDAY_LABELS;
}

export function weekdayLabel(weekday: number) {
  return ["日", "月", "火", "水", "木", "金", "土"][weekday] ?? "";
}

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function employmentLabel(type: EmploymentType) {
  if (type === "parttime") return "アルバイト";
  if (type === "doubletrack") return "ダブルトラック";
  return "社員";
}

export function usesHolidayQuota(employee: Employee) {
  return employee.employmentType === "fulltime";
}

export function employeeLabel(employee: Employee, hideNames: boolean) {
  if (hideNames) return employee.code;
  return employee.name;
}

export function roleText(employee: Employee) {
  const roles: string[] = [];
  if (employee.supervisor) roles.push("責任者");
  if (employee.engineer) roles.push("エンジニア");
  if (roles.length === 0) roles.push("一般");
  return roles.join("・");
}

export function wishSymbol(wish: DayWish) {
  if (wish === "preferred") return "◎";
  if (wish === "off") return "×";
  if (wish === "paid") return "有";
  return "△";
}

export function wishLabel(wish: DayWish) {
  if (wish === "preferred") return "出勤希望";
  if (wish === "off") return "休み希望";
  if (wish === "paid") return "有給";
  return "どちらでも可";
}

export function nextWish(wish: DayWish): DayWish {
  if (wish === "either") return "preferred";
  if (wish === "preferred") return "off";
  if (wish === "off") return "paid";
  return "either";
}

export function monthGrid(year: number, month: number): MonthGrid {
  const monthIndex = month - 1;
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const first = new Date(year, monthIndex, 1);
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: Array<CalendarDay | null> = Array.from({ length: lead }, () => null);

  for (let day = 1; day <= count; day += 1) {
    const date = new Date(year, monthIndex, day);
    cells.push({
      iso: `${key}-${String(day).padStart(2, "0")}`,
      day,
      weekday: date.getDay(),
    });
  }

  while (cells.length % 7 !== 0) cells.push(null);

  return {
    key,
    year,
    month,
    label: `${year}年${month}月`,
    cells,
  };
}

export function getNextMonth(base = new Date()): MonthGrid {
  const first = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return monthGrid(first.getFullYear(), first.getMonth() + 1);
}

export function listPlanningMonths(today = new Date()): MonthGrid[] {
  const cursor = new Date(2026, 11, 1);
  const horizon = new Date(today.getFullYear(), today.getMonth() + 12, 1);
  const stop = horizon < new Date(2027, 11, 1) ? new Date(2027, 11, 1) : horizon;
  const months: MonthGrid[] = [];
  while (cursor <= stop) {
    months.push(monthGrid(cursor.getFullYear(), cursor.getMonth() + 1));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export function weeksOf(month: MonthGrid): CalendarDay[][] {
  const weeks: CalendarDay[][] = [];
  let current: CalendarDay[] = [];
  for (const day of daysInMonth(month)) {
    const mondayIndex = (day.weekday + 6) % 7;
    if (mondayIndex === 0 && current.length > 0) {
      weeks.push(current);
      current = [];
    }
    current.push(day);
  }
  if (current.length > 0) weeks.push(current);
  return weeks;
}

export function weeklyOffTarget(dayCount: number) {
  return dayCount >= 2 ? 2 : 0;
}

export function daysInMonth(grid: MonthGrid) {
  return grid.cells.filter((cell): cell is CalendarDay => cell !== null);
}

export function seedWish(index: number, day: number, employee: Employee): DayWish {
  if (day === 20) return index < 8 ? "off" : "either";
  if (day === 15 && employee.supervisor) return "off";
  if (index === 0 && day === 10) return "paid";
  if (index === 11 && (day === 12 || day === 18)) return "paid";
  if ((day + index) % 7 === 0) return "off";
  if ((day + index * 3) % 4 === 0) return "preferred";
  return "either";
}

export function createSeed(monthKey: string, dayCount: number): PlannerStore {
  return {
    employees: SEED_EMPLOYEES,
    preferences: SEED_EMPLOYEES.map((employee, index) => ({
      employeeId: employee.id,
      month: monthKey,
      days: Object.fromEntries(
        Array.from({ length: dayCount }, (_, offset) => {
          const day = offset + 1;
          const iso = `${monthKey}-${String(day).padStart(2, "0")}`;
          return [iso, seedWish(index, day, employee)] as const;
        }).filter((entry) => entry[1] !== "either"),
      ),
    })),
    plans: [],
    holidayQuotas: { [monthKey]: DEFAULT_HOLIDAY_QUOTA },
  };
}

function isWish(value: unknown): value is DayWish {
  return value === "preferred" || value === "off" || value === "either" || value === "paid";
}

function parseQuotas(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isInteger(entry[1]) && entry[1] >= 0,
    ),
  );
}

function isEmploymentType(value: unknown): value is EmploymentType {
  return value === "fulltime" || value === "parttime" || value === "doubletrack";
}

function isEmployee(value: unknown): value is Employee {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.code === "string" &&
    isEmploymentType(record.employmentType) &&
    typeof record.supervisor === "boolean" &&
    typeof record.engineer === "boolean"
  );
}

function isPreferences(value: unknown): value is MonthPreferences {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.employeeId !== "string" || typeof record.month !== "string") return false;
  if (!record.days || typeof record.days !== "object") return false;
  return Object.values(record.days as Record<string, unknown>).every(isWish);
}

function isPlan(value: unknown): value is ShiftPlan {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.month !== "string" || !record.assignments || typeof record.assignments !== "object") {
    return false;
  }
  return Object.values(record.assignments as Record<string, unknown>).every(
    (ids) => Array.isArray(ids) && ids.every((id) => typeof id === "string"),
  );
}

export function parseStore(raw: string): PlannerStore | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if (!Array.isArray(record.employees) || !record.employees.every(isEmployee)) return null;
    if (!Array.isArray(record.preferences) || !record.preferences.every(isPreferences)) return null;
    if (!Array.isArray(record.plans) || !record.plans.every(isPlan)) return null;
    return {
      employees: record.employees,
      preferences: record.preferences,
      plans: record.plans,
      holidayQuotas: parseQuotas(record.holidayQuotas),
    };
  } catch {
    return null;
  }
}

export function wishFor(
  preferences: MonthPreferences[],
  employeeId: string,
  month: string,
  iso: string,
): DayWish {
  const found = preferences.find(
    (item) => item.employeeId === employeeId && item.month === month,
  );
  return found?.days[iso] ?? "either";
}

export function holidayQuota(store: PlannerStore, monthKey: string) {
  const value = store.holidayQuotas[monthKey];
  return typeof value === "number" ? value : DEFAULT_HOLIDAY_QUOTA;
}

export function employeeHolidayGoal(
  employee: Employee,
  preferences: MonthPreferences[],
  month: MonthGrid,
  quota: number,
): HolidayGoal {
  const days = daysInMonth(month);
  let paid = 0;
  let locked = 0;
  for (const day of days) {
    const wish = wishFor(preferences, employee.id, month.key, day.iso);
    if (wish === "paid") {
      paid += 1;
      locked += 1;
    } else if (wish === "off") {
      locked += 1;
    }
  }
  const monthlyTarget = usesHolidayQuota(employee)
    ? Math.max(quota + paid, locked)
    : locked;
  const weeklyFloor = weeksOf(month).reduce((sum, week) => sum + weeklyOffTarget(week.length), 0);
  const targetOff = Math.min(days.length, Math.max(monthlyTarget, weeklyFloor));
  return { paid, locked, targetOff, targetWork: days.length - targetOff };
}

export function setHolidayQuota(store: PlannerStore, monthKey: string, days: number): PlannerStore {
  const quota = Math.max(0, Math.floor(days));
  return { ...store, holidayQuotas: { ...store.holidayQuotas, [monthKey]: quota } };
}

export function generateAssignments(
  employees: Employee[],
  preferences: MonthPreferences[],
  month: MonthGrid,
  quota: number,
): Record<string, string[]> {
  const days = daysInMonth(month);
  const weeks = weeksOf(month);
  const weekIndexByIso = new Map<string, number>();
  weeks.forEach((week, weekIndex) => {
    week.forEach((day) => weekIndexByIso.set(day.iso, weekIndex));
  });
  const states = employees.map((employee) => {
    const goal = employeeHolidayGoal(employee, preferences, month, quota);
    return { employee, ...goal, work: 0, off: 0, weekOff: 0 };
  });
  const assignments: Record<string, string[]> = {};
  let currentWeek = -1;

  days.forEach((day, index) => {
    const weekIndex = weekIndexByIso.get(day.iso) ?? 0;
    if (weekIndex !== currentWeek) {
      currentWeek = weekIndex;
      states.forEach((state) => {
        state.weekOff = 0;
      });
    }
    const week = weeks[weekIndex] ?? [day];
    const dayPos = Math.max(0, week.findIndex((item) => item.iso === day.iso));
    const daysLeftInWeek = week.length - dayPos;
    const weekTarget = weeklyOffTarget(week.length);
    const daysLeft = days.length - index;
    const wishOf = (employee: Employee) => wishFor(preferences, employee.id, month.key, day.iso);
    const available = states.filter((state) => {
      const wish = wishOf(state.employee);
      return wish !== "off" && wish !== "paid";
    });
    const mustWork = new Set(
      available
        .filter((state) => state.targetWork - state.work >= daysLeft)
        .map((state) => state.employee.id),
    );
    const mustOff = new Set(
      available
        .filter(
          (state) =>
            state.targetOff - state.off >= daysLeft ||
            (weekTarget > 0 && weekTarget - state.weekOff >= daysLeftInWeek),
        )
        .map((state) => state.employee.id),
    );
    const chosen = new Set<string>();

    function score(state: (typeof states)[number]) {
      const workNeed = state.targetWork - state.work;
      const offNeed = state.targetOff - state.off;
      const wishBonus = wishOf(state.employee) === "preferred" ? 0.35 : 0;
      const weekNeed = Math.max(0, weekTarget - state.weekOff);
      return workNeed / daysLeft - offNeed / daysLeft - weekNeed * 0.45 + wishBonus;
    }

    function ranked(pool: typeof states, allowMustOff: boolean) {
      return pool
        .filter(
          (state) =>
            !chosen.has(state.employee.id) && (allowMustOff || !mustOff.has(state.employee.id)),
        )
        .sort((a, b) => {
          const scoreDiff = score(b) - score(a);
          if (Math.abs(scoreDiff) > 0.0001) return scoreDiff;
          const wishDiff =
            (wishOf(a.employee) === "preferred" ? 0 : 1) - (wishOf(b.employee) === "preferred" ? 0 : 1);
          if (wishDiff !== 0) return wishDiff;
          const workDiff = a.work - b.work;
          if (workDiff !== 0) return workDiff;
          return a.employee.name.localeCompare(b.employee.name, "ja");
        });
    }

    function choose(state: (typeof states)[number]) {
      chosen.add(state.employee.id);
    }

    for (const state of available) {
      if (mustWork.has(state.employee.id)) choose(state);
    }

    function ensure(match: (employee: Employee) => boolean) {
      if (states.some((state) => chosen.has(state.employee.id) && match(state.employee))) return;
      const preferred = ranked(
        available.filter((state) => match(state.employee)),
        false,
      )[0];
      const fallback = ranked(
        available.filter((state) => match(state.employee)),
        true,
      )[0];
      const next = preferred ?? fallback;
      if (next) choose(next);
    }

    ensure((employee) => employee.supervisor);
    ensure((employee) => employee.engineer);

    const remainingWork = states.reduce(
      (sum, state) => sum + Math.max(0, state.targetWork - state.work),
      0,
    );
    const ideal = Math.min(available.length, Math.max(5, Math.round(remainingWork / daysLeft)));

    while (chosen.size < ideal) {
      const next = ranked(available, false).find((state) => state.targetWork - state.work > 0);
      if (!next) break;
      choose(next);
    }

    while (chosen.size < 5) {
      const next = ranked(available, true)[0];
      if (!next) break;
      choose(next);
    }

    for (const state of states) {
      if (chosen.has(state.employee.id)) state.work += 1;
      else {
        state.off += 1;
        state.weekOff += 1;
      }
    }

    assignments[day.iso] = employees
      .filter((employee) => chosen.has(employee.id))
      .map((employee) => employee.id);
  });

  return assignments;
}

export function assessDay(employees: Employee[], workingIds: string[]): Omit<DayIssue, "iso" | "day"> | null {
  const working = employees.filter((employee) => workingIds.includes(employee.id));
  const messages: string[] = [];
  if (working.length < 5) messages.push(`出勤${working.length}人（5人未満）`);
  if (!working.some((employee) => employee.supervisor)) messages.push("責任者が不在");
  const noEngineer = !working.some((employee) => employee.engineer);
  if (noEngineer) messages.push("エンジニアが不在");
  if (messages.length === 0) return null;
  return {
    severe: working.length < 5 || !working.some((employee) => employee.supervisor),
    messages,
  };
}

export function assessWeeklyOffs(
  employees: Employee[],
  assignments: Record<string, string[]>,
  month: MonthGrid,
  hideNames: boolean,
): string[] {
  return weeksOf(month).flatMap((week) => {
    const target = weeklyOffTarget(week.length);
    if (target === 0) return [];
    const start = week[0];
    return employees.flatMap((employee) => {
      const offs = week.filter((day) => !(assignments[day.iso] ?? []).includes(employee.id)).length;
      if (offs >= target) return [];
      return [
        `${employeeLabel(employee, hideNames)} ${month.month}月${start.day}日の週は休日${offs}日（${target}日未満）`,
      ];
    });
  });
}

export function assessPlan(
  employees: Employee[],
  assignments: Record<string, string[]>,
  days: CalendarDay[],
): DayIssue[] {
  return days.flatMap((day) => {
    const issue = assessDay(employees, assignments[day.iso] ?? []);
    if (!issue) return [];
    return [{ iso: day.iso, day: day.day, ...issue }];
  });
}

export function upsertEmployee(store: PlannerStore, employee: Employee): PlannerStore {
  const exists = store.employees.some((item) => item.id === employee.id);
  return {
    ...store,
    employees: exists
      ? store.employees.map((item) => (item.id === employee.id ? employee : item))
      : [...store.employees, employee],
  };
}

export function removeEmployee(store: PlannerStore, employeeId: string): PlannerStore {
  return {
    ...store,
    employees: store.employees.filter((employee) => employee.id !== employeeId),
    preferences: store.preferences.filter((item) => item.employeeId !== employeeId),
    plans: store.plans.map((plan) => ({
      ...plan,
      assignments: Object.fromEntries(
        Object.entries(plan.assignments).map(([iso, ids]) => [
          iso,
          ids.filter((id) => id !== employeeId),
        ]),
      ),
    })),
  };
}

export function upsertPreferences(
  store: PlannerStore,
  employeeId: string,
  month: string,
  days: Record<string, DayWish>,
): PlannerStore {
  const next: MonthPreferences = { employeeId, month, days };
  return {
    ...store,
    preferences: [
      ...store.preferences.filter(
        (item) => !(item.employeeId === employeeId && item.month === month),
      ),
      next,
    ],
  };
}

export function savePlan(
  store: PlannerStore,
  month: string,
  assignments: Record<string, string[]>,
): PlannerStore {
  const next: ShiftPlan = { month, assignments };
  return {
    ...store,
    plans: [...store.plans.filter((plan) => plan.month !== month), next],
  };
}

export function toggleAssignment(
  store: PlannerStore,
  month: string,
  iso: string,
  employeeId: string,
): PlannerStore {
  const plan = store.plans.find((item) => item.month === month);
  if (!plan) return store;
  const current = new Set(plan.assignments[iso] ?? []);
  if (current.has(employeeId)) current.delete(employeeId);
  else current.add(employeeId);
  const order = store.employees.map((employee) => employee.id);
  const ids = order.filter((id) => current.has(id));
  return savePlan(store, month, { ...plan.assignments, [iso]: ids });
}

export function workdayCount(assignments: Record<string, string[]>, employeeId: string) {
  return Object.values(assignments).filter((ids) => ids.includes(employeeId)).length;
}
