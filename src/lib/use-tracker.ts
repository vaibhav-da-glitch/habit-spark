import { useEffect, useMemo, useState } from "react";

export type CellState = "done" | "missed" | "today" | "future";

export type HabitGoal =
  | { kind: "daily" }
  | { kind: "weekly"; times: number }; // N times per week

export interface HabitRow {
  id: string;
  name: string;
  emoji: string;
  cells: CellState[];
  notes?: Record<number, string>; // dayIdx -> note
  goal?: HabitGoal;
}

export interface TrackerState {
  monthKey: string; // YYYY-MM
  daysInMonth: number;
  todayDay: number;
  habits: HabitRow[];
  sleep: number[];
  quit: { name: string; data: number[] };
  build: { name: string; data: number[] };
}

const STORAGE_PREFIX = "habit-tracker-";
const CURRENT_PTR = "habit-tracker-current"; // stores latest monthKey we saw

function calcMonth(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  return { year, month, daysInMonth, monthKey };
}

function todayInfo() {
  const t = new Date();
  return {
    year: t.getFullYear(),
    month: t.getMonth(),
    day: t.getDate(),
    daysInMonth: new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(),
    monthKey: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`,
  };
}

function emptyMonth(monthKey: string, daysInMonth: number, todayDay: number): TrackerState {
  const mkCells = (): CellState[] =>
    Array.from({ length: daysInMonth }, (_, i) =>
      i + 1 < todayDay ? "missed" : i + 1 === todayDay ? "today" : "future",
    );
  return {
    monthKey,
    daysInMonth,
    todayDay,
    habits: [
      { id: "h1", name: "Read 20 min", emoji: "📖", cells: mkCells(), notes: {}, goal: { kind: "daily" } },
      { id: "h2", name: "Workout", emoji: "🏋", cells: mkCells(), notes: {}, goal: { kind: "weekly", times: 3 } },
      { id: "h3", name: "Meditate", emoji: "🧘", cells: mkCells(), notes: {}, goal: { kind: "daily" } },
      { id: "h4", name: "No sugar", emoji: "🍃", cells: mkCells(), notes: {}, goal: { kind: "daily" } },
      { id: "h5", name: "Journal", emoji: "✍", cells: mkCells(), notes: {}, goal: { kind: "weekly", times: 5 } },
    ],
    sleep: Array.from({ length: daysInMonth }, () => 0),
    quit: { name: "Scrolling before bed", data: Array.from({ length: daysInMonth }, () => 0) },
    build: { name: "10 min morning walk", data: Array.from({ length: daysInMonth }, () => 0) },
  };
}

function loadMonth(monthKey: string): TrackerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + monthKey);
    return raw ? (JSON.parse(raw) as TrackerState) : null;
  } catch {
    return null;
  }
}

function listArchivedMonths(): string[] {
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(STORAGE_PREFIX) && /\d{4}-\d{2}$/.test(k)) {
      out.push(k.slice(STORAGE_PREFIX.length));
    }
  }
  return out.sort();
}

export function useTracker() {
  const cur = useMemo(() => todayInfo(), []);
  const [viewMonth, setViewMonth] = useState<string>(cur.monthKey);
  const [state, setState] = useState<TrackerState>(() =>
    emptyMonth(cur.monthKey, cur.daysInMonth, cur.day),
  );
  const [hydrated, setHydrated] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<string[]>([cur.monthKey]);

  const isCurrent = viewMonth === cur.monthKey;
  const isReadOnly = !isCurrent;

  // Initial hydrate: load current month from storage, refresh today markers, migrate legacy
  useEffect(() => {
    try {
      // legacy key migration
      const legacy = localStorage.getItem("habit-tracker-v1");
      if (legacy && !localStorage.getItem(STORAGE_PREFIX + cur.monthKey)) {
        try {
          const parsed = JSON.parse(legacy) as TrackerState;
          if (parsed?.monthKey) {
            localStorage.setItem(STORAGE_PREFIX + parsed.monthKey, legacy);
          }
        } catch {}
        localStorage.removeItem("habit-tracker-v1");
      }

      const raw = loadMonth(cur.monthKey);
      if (raw && raw.daysInMonth === cur.daysInMonth) {
        raw.todayDay = cur.day;
        raw.habits = raw.habits.map((h) => ({
          ...h,
          notes: h.notes ?? {},
          goal: h.goal ?? { kind: "daily" },
          cells: h.cells.map((c, i) => {
            if (i + 1 === cur.day && c === "future") return "today";
            if (i + 1 < cur.day && c === "future") return "missed";
            if (i + 1 > cur.day && c === "today") return "future";
            return c;
          }),
        }));
        setState(raw);
      }
      localStorage.setItem(CURRENT_PTR, cur.monthKey);
    } catch {}
    const months = listArchivedMonths();
    if (!months.includes(cur.monthKey)) months.push(cur.monthKey);
    setAvailableMonths(months.sort());
    setHydrated(true);
  }, [cur.monthKey, cur.daysInMonth, cur.day]);

  // Persist current view (only when editing the current month)
  useEffect(() => {
    if (!hydrated) return;
    if (state.monthKey !== cur.monthKey) return;
    localStorage.setItem(STORAGE_PREFIX + state.monthKey, JSON.stringify(state));
    setAvailableMonths((prev) => (prev.includes(state.monthKey) ? prev : [...prev, state.monthKey].sort()));
  }, [state, hydrated, cur.monthKey]);

  // Switch the viewed month
  const switchMonth = (monthKey: string) => {
    setViewMonth(monthKey);
    if (monthKey === cur.monthKey) {
      const fromStore = loadMonth(monthKey);
      setState(fromStore ?? emptyMonth(cur.monthKey, cur.daysInMonth, cur.day));
      return;
    }
    const stored = loadMonth(monthKey);
    if (stored) {
      // archive view — freeze todayDay to end of that month so nothing is "today"
      setState({ ...stored, todayDay: stored.daysInMonth + 1 });
    }
  };

  const goPrev = () => {
    const idx = availableMonths.indexOf(viewMonth);
    if (idx > 0) switchMonth(availableMonths[idx - 1]);
  };
  const goNext = () => {
    const idx = availableMonths.indexOf(viewMonth);
    if (idx >= 0 && idx < availableMonths.length - 1) switchMonth(availableMonths[idx + 1]);
  };

  // ---- mutations (only when editing current month) ----
  const guard = <T extends any[]>(fn: (...args: T) => void) =>
    (...args: T) => { if (!isReadOnly) fn(...args); };

  const cycleCell = guard((habitId: string, dayIdx: number) => {
    setState((s) => ({
      ...s,
      habits: s.habits.map((h) => {
        if (h.id !== habitId) return h;
        const curC = h.cells[dayIdx];
        const isPast = dayIdx + 1 < s.todayDay;
        const next: CellState =
          curC === "done" ? "missed" : curC === "missed" ? (isPast ? "done" : "future") : curC === "future" ? "done" : "done";
        const cells = [...h.cells];
        cells[dayIdx] = next === "future" && dayIdx + 1 === s.todayDay ? "today" : next;
        const notes = { ...(h.notes ?? {}) };
        if (cells[dayIdx] !== "done") delete notes[dayIdx];
        return { ...h, cells, notes };
      }),
    }));
  });

  const setNote = guard((habitId: string, dayIdx: number, note: string) => {
    setState((s) => ({
      ...s,
      habits: s.habits.map((h) => {
        if (h.id !== habitId) return h;
        const notes = { ...(h.notes ?? {}) };
        if (note.trim()) notes[dayIdx] = note.trim().slice(0, 200);
        else delete notes[dayIdx];
        return { ...h, notes };
      }),
    }));
  });

  const setSleep = guard((dayIdx: number, value: number) =>
    setState((s) => {
      const sleep = [...s.sleep];
      sleep[dayIdx] = Math.max(0, Math.min(12, Math.round(value * 10) / 10));
      return { ...s, sleep };
    }),
  );

  const cycleQuit = guard((dayIdx: number) =>
    setState((s) => {
      const data = [...s.quit.data];
      data[dayIdx] = (data[dayIdx] + 1) % 5;
      return { ...s, quit: { ...s.quit, data } };
    }),
  );

  const cycleBuild = guard((dayIdx: number) =>
    setState((s) => {
      const data = [...s.build.data];
      data[dayIdx] = (data[dayIdx] + 1) % 5;
      return { ...s, build: { ...s.build, data } };
    }),
  );

  const renameHabit = guard((id: string, name: string) =>
    setState((s) => ({ ...s, habits: s.habits.map((h) => (h.id === id ? { ...h, name: name.slice(0, 40) } : h)) })),
  );

  const setHabitGoal = guard((id: string, goal: HabitGoal) =>
    setState((s) => ({ ...s, habits: s.habits.map((h) => (h.id === id ? { ...h, goal } : h)) })),
  );

  const addHabit = guard((name: string, emoji = "✨") => {
    if (!name.trim()) return;
    setState((s) => ({
      ...s,
      habits: [
        ...s.habits,
        {
          id: `h${Date.now()}`,
          name: name.trim().slice(0, 40),
          emoji: emoji.slice(0, 2) || "✨",
          notes: {},
          goal: { kind: "daily" },
          cells: Array.from({ length: s.daysInMonth }, (_, i) =>
            i + 1 < s.todayDay ? "missed" : i + 1 === s.todayDay ? "today" : "future",
          ),
        },
      ],
    }));
  });

  const removeHabit = guard((id: string) =>
    setState((s) => ({ ...s, habits: s.habits.filter((h) => h.id !== id) })),
  );

  const reorderHabits = guard((fromId: string, toId: string) =>
    setState((s) => {
      const from = s.habits.findIndex((h) => h.id === fromId);
      const to = s.habits.findIndex((h) => h.id === toId);
      if (from === -1 || to === -1 || from === to) return s;
      const next = [...s.habits];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...s, habits: next };
    }),
  );

  const renameQuit = guard((name: string) =>
    setState((s) => ({ ...s, quit: { ...s.quit, name: name.slice(0, 60) } })),
  );
  const renameBuild = guard((name: string) =>
    setState((s) => ({ ...s, build: { ...s.build, name: name.slice(0, 60) } })),
  );

  const reset = () => {
    if (isReadOnly) return;
    localStorage.removeItem(STORAGE_PREFIX + cur.monthKey);
    setState(emptyMonth(cur.monthKey, cur.daysInMonth, cur.day));
  };

  return {
    state,
    hydrated,
    viewMonth,
    isReadOnly,
    isCurrent,
    availableMonths,
    goPrev,
    goNext,
    switchMonth,
    cycleCell,
    setNote,
    setSleep,
    cycleQuit,
    cycleBuild,
    renameHabit,
    setHabitGoal,
    addHabit,
    removeHabit,
    reorderHabits,
    renameQuit,
    renameBuild,
    reset,
  };
}

/** How many target days a habit should hit between day 1 and todayDay-1 (yesterday inclusive). */
function targetForElapsed(goal: HabitGoal | undefined, elapsedDays: number): number {
  if (!goal || goal.kind === "daily") return elapsedDays;
  // weekly N times → pro-rated: floor(elapsed/7)*N + min(elapsed%7, N)
  const fullWeeks = Math.floor(elapsedDays / 7);
  const rem = elapsedDays % 7;
  return fullWeeks * goal.times + Math.min(rem, goal.times);
}

export function computeStats(state: TrackerState) {
  const elapsed = Math.max(0, state.todayDay - 1);
  const perHabit = state.habits.map((h) => {
    let done = 0, streak = 0, run = 0;
    h.cells.forEach((c, i) => {
      if (i + 1 < state.todayDay) {
        if (c === "done") { done++; run++; streak = Math.max(streak, run); }
        else run = 0;
      }
    });
    const target = Math.max(1, targetForElapsed(h.goal, elapsed));
    const pct = Math.min(100, Math.round((done / target) * 100));
    return { id: h.id, name: h.name, pct, streak, done, target };
  });
  const overall = perHabit.length
    ? Math.round(perHabit.reduce((s, h) => s + h.pct, 0) / perHabit.length)
    : 0;
  const sleepVals = state.sleep.filter((v) => v > 0);
  const avgSleep = sleepVals.length ? sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length : 0;
  return { perHabit, overall, avgSleep };
}

export function goalLabel(goal?: HabitGoal): string {
  if (!goal || goal.kind === "daily") return "Every day";
  return `${goal.times}× / week`;
}
