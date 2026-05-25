// Deterministic pseudo-random so SSR + client match.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface HabitRow {
  name: string;
  emoji: string;
  cells: ("done" | "missed" | "today" | "future")[];
  completionPct: number;
  streak: number;
}

export function buildHabitData() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDay = today.getDate();
  const rand = mulberry32(year * 100 + month);

  const seedHabits = [
    { name: "Read 20 min", emoji: "📖", rate: 0.78 },
    { name: "Workout", emoji: "🏋", rate: 0.62 },
    { name: "Meditate", emoji: "🧘", rate: 0.85 },
    { name: "No sugar", emoji: "🍃", rate: 0.55 },
    { name: "Journal", emoji: "✍", rate: 0.7 },
  ];

  const habits: HabitRow[] = seedHabits.map((h) => {
    const cells: HabitRow["cells"] = [];
    let done = 0, possible = 0, streak = 0, runningStreak = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (d < todayDay) {
        const isDone = rand() < h.rate;
        cells.push(isDone ? "done" : "missed");
        possible++;
        if (isDone) { done++; runningStreak++; streak = Math.max(streak, runningStreak); }
        else runningStreak = 0;
      } else if (d === todayDay) {
        cells.push("today");
      } else cells.push("future");
    }
    return {
      ...h,
      cells,
      completionPct: possible ? Math.round((done / possible) * 100) : 0,
      streak,
    };
  });

  const overall = Math.round(habits.reduce((s, h) => s + h.completionPct, 0) / habits.length);

  const sleepData = Array.from({ length: daysInMonth }, (_, i) =>
    i < todayDay - 1 ? Math.round((rand() * 3 + 5) * 10) / 10 : 0,
  );
  const quitData = Array.from({ length: daysInMonth }, (_, i) =>
    i < todayDay - 1 ? Math.round(rand() * 4) : 0,
  );
  const buildData = Array.from({ length: daysInMonth }, (_, i) =>
    i < todayDay - 1 ? Math.round(rand() * 4) : 0,
  );

  const monthLabel = today.toLocaleString("default", { month: "long" }) + " " + year;

  return { habits, overall, sleepData, quitData, buildData, daysInMonth, todayDay, monthLabel };
}
