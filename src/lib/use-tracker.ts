import { useEffect, useState } from "react";

export type CellState = "done" | "missed" | "today" | "future";

export interface HabitRow {
  id: string;
  name: string;
  emoji: string;
  cells: CellState[];
}

export interface TrackerState {
  monthKey: string; // YYYY-MM
  daysInMonth: number;
  todayDay: number;
  habits: HabitRow[];
  sleep: number[]; // hours, 0 = empty
  quit: { name: string; data: number[] }; // 0-4
  build: { name: string; data: number[] };
}

function today() {
  const t = new Date();
  return {
    year: t.getFullYear(),
    month: t.getMonth(),
    day: t.getDate(),
    daysInMonth: new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(),
    monthKey: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`,
  };
}

function emptyMonth(): TrackerState {
  const { daysInMonth, day, monthKey } = today();
  const mkCells = (): CellState[] =>
    Array.from({ length: daysInMonth }, (_, i) =>
      i + 1 < day ? "missed" : i + 1 === day ? "today" : "future",
    );
  return {
    monthKey,
    daysInMonth,
    todayDay: day,
    habits: [
      { id: "h1", name: "Read 20 min", emoji: "📖", cells: mkCells() },
      { id: "h2", name: "Workout", emoji: "🏋", cells: mkCells() },
      { id: "h3", name: "Meditate", emoji: "🧘", cells: mkCells() },
      { id: "h4", name: "No sugar", emoji: "🍃", cells: mkCells() },
      { id: "h5", name: "Journal", emoji: "✍", cells: mkCells() },
    ],
    sleep: Array.from({ length: daysInMonth }, () => 0),
    quit: { name: "Scrolling before bed", data: Array.from({ length: daysInMonth }, () => 0) },
    build: { name: "10 min morning walk", data: Array.from({ length: daysInMonth }, () => 0) },
  };
}

const KEY = "habit-tracker-v1";

export function useTracker() {
  const [state, setState] = useState<TrackerState>(() => emptyMonth());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const cur = today();
      if (raw) {
        const parsed = JSON.parse(raw) as TrackerState;
        if (parsed.monthKey === cur.monthKey && parsed.daysInMonth === cur.daysInMonth) {
          // refresh today marker
          parsed.todayDay = cur.day;
          parsed.habits = parsed.habits.map((h) => ({
            ...h,
            cells: h.cells.map((c, i) => {
              if (i + 1 === cur.day && c === "future") return "today";
              if (i + 1 < cur.day && c === "future") return "missed";
              return c;
            }),
          }));
          setState(parsed);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const cycleCell = (habitId: string, dayIdx: number) => {
    setState((s) => ({
      ...s,
      habits: s.habits.map((h) => {
        if (h.id !== habitId) return h;
        const cur = h.cells[dayIdx];
        const next: CellState =
          cur === "done" ? "missed" : cur === "missed" ? "future" : cur === "future" ? "done" : "done";
        const cells = [...h.cells];
        cells[dayIdx] = next === "future" && dayIdx + 1 === s.todayDay ? "today" : next;
        return { ...h, cells };
      }),
    }));
  };

  const setSleep = (dayIdx: number, value: number) =>
    setState((s) => {
      const sleep = [...s.sleep];
      sleep[dayIdx] = Math.max(0, Math.min(12, Math.round(value * 10) / 10));
      return { ...s, sleep };
    });

  const cycleQuit = (dayIdx: number) =>
    setState((s) => {
      const data = [...s.quit.data];
      data[dayIdx] = (data[dayIdx] + 1) % 5;
      return { ...s, quit: { ...s.quit, data } };
    });

  const cycleBuild = (dayIdx: number) =>
    setState((s) => {
      const data = [...s.build.data];
      data[dayIdx] = (data[dayIdx] + 1) % 5;
      return { ...s, build: { ...s.build, data } };
    });

  const renameHabit = (id: string, name: string) =>
    setState((s) => ({ ...s, habits: s.habits.map((h) => (h.id === id ? { ...h, name: name.slice(0, 40) } : h)) }));

  const addHabit = (name: string, emoji = "✨") => {
    if (!name.trim()) return;
    setState((s) => ({
      ...s,
      habits: [
        ...s.habits,
        {
          id: `h${Date.now()}`,
          name: name.trim().slice(0, 40),
          emoji: emoji.slice(0, 2) || "✨",
          cells: Array.from({ length: s.daysInMonth }, (_, i) =>
            i + 1 < s.todayDay ? "missed" : i + 1 === s.todayDay ? "today" : "future",
          ),
        },
      ],
    }));
  };

  const removeHabit = (id: string) =>
    setState((s) => ({ ...s, habits: s.habits.filter((h) => h.id !== id) }));

  const renameQuit = (name: string) =>
    setState((s) => ({ ...s, quit: { ...s.quit, name: name.slice(0, 60) } }));
  const renameBuild = (name: string) =>
    setState((s) => ({ ...s, build: { ...s.build, name: name.slice(0, 60) } }));

  const reset = () => {
    localStorage.removeItem(KEY);
    setState(emptyMonth());
  };

  return {
    state,
    hydrated,
    cycleCell,
    setSleep,
    cycleQuit,
    cycleBuild,
    renameHabit,
    addHabit,
    removeHabit,
    renameQuit,
    renameBuild,
    reset,
  };
}

export function computeStats(state: TrackerState) {
  const perHabit = state.habits.map((h) => {
    let done = 0, possible = 0, streak = 0, run = 0;
    h.cells.forEach((c, i) => {
      if (i + 1 < state.todayDay) {
        possible++;
        if (c === "done") { done++; run++; streak = Math.max(streak, run); }
        else run = 0;
      }
    });
    return { id: h.id, name: h.name, pct: possible ? Math.round((done / possible) * 100) : 0, streak };
  });
  const overall = perHabit.length
    ? Math.round(perHabit.reduce((s, h) => s + h.pct, 0) / perHabit.length)
    : 0;
  const sleepVals = state.sleep.filter((v) => v > 0);
  const avgSleep = sleepVals.length ? sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length : 0;
  return { perHabit, overall, avgSleep };
}
