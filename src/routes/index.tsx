import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MonthlyScore } from "@/components/MonthlyScore";
import { MomentumConstellation } from "@/components/MomentumConstellation";
import { LineChart } from "@/components/LineChart";
import { computeStats, useTracker } from "@/lib/use-tracker";

export const Route = createFileRoute("/")({
  component: HabitTracker,
  head: () => ({
    meta: [
      { title: "Habit Tracker — Monthly Momentum" },
      { name: "description", content: "Interactive paper-textured habit tracker with circular progress and a momentum constellation." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500&display=swap" },
    ],
  }),
});

function HabitTracker() {
  const t = useTracker();
  const { state } = t;
  const { perHabit, overall, avgSleep } = useMemo(() => computeStats(state), [state]);
  const [newHabit, setNewHabit] = useState("");
  const [newEmoji, setNewEmoji] = useState("✨");

  const monthLabel = new Date().toLocaleString("default", { month: "long" }) + " " + new Date().getFullYear();
  const quitWins = state.quit.data.filter((v) => v >= 3).length;
  const buildWins = state.build.data.filter((v) => v >= 3).length;
  const bestStreak = perHabit.length ? Math.max(...perHabit.map((h) => h.streak)) : 0;

  const dayScores = useMemo(() => {
    return Array.from({ length: state.daysInMonth }, (_, i) => {
      if (!state.habits.length) return 0;
      const done = state.habits.reduce((s, h) => s + (h.cells[i] === "done" ? 1 : 0), 0);
      return done / state.habits.length;
    });
  }, [state.habits, state.daysInMonth]);

  return (
    <main className="min-h-screen px-5 py-8 md:py-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex items-baseline justify-between border-b border-border pb-4">
          <h1 className="font-serif text-4xl tracking-tight md:text-5xl">Habit Tracker</h1>
          <div className="flex items-center gap-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {monthLabel} · day {state.todayDay}/{state.daysInMonth}
            </div>
            <button
              onClick={() => { if (confirm("Reset this month?")) t.reset(); }}
              className="rounded border border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted"
            >
              Reset
            </button>
          </div>
        </header>

        {/* GRID + SCORE */}
        <section className="rounded-[10px] border border-border bg-card p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Tap a cell to cycle · done → missed → empty
            </div>
            <div className="flex gap-4 text-[10px] text-muted-foreground">
              <Legend swatch={<span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--accent)" }} />} label="Done" />
              <Legend swatch={<span className="h-2.5 w-2.5 rounded-full border border-border bg-muted" />} label="Missed" />
              <Legend swatch={<span className="h-2.5 w-2.5 rounded-full border border-dashed border-border" />} label="Empty" />
            </div>
          </div>

          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex-1 overflow-x-auto">
              <table className="border-collapse">
                <thead>
                  <tr>
                    <th></th>
                    {Array.from({ length: state.daysInMonth }, (_, i) => (
                      <th key={i} className="w-[22px] min-w-[22px] text-center text-[9px] font-normal text-muted-foreground py-1">
                        {(i + 1) % 5 === 0 || i === 0 ? i + 1 : ""}
                      </th>
                    ))}
                    <th className="pl-3 text-[9px] font-normal uppercase tracking-wider text-muted-foreground">%</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {state.habits.map((h) => {
                    const stat = perHabit.find((p) => p.id === h.id)!;
                    return (
                      <tr key={h.id} className="group">
                        <td className="whitespace-nowrap pr-3 py-1 text-[12px] font-medium">
                          <span className="mr-2">{h.emoji}</span>
                          <input
                            type="text"
                            value={h.name ?? ""}
                            onChange={(e) => t.renameHabit(h.id, e.target.value)}
                            maxLength={40}
                            className="bg-transparent outline-none border-b border-transparent focus:border-border w-[140px] py-0.5"
                          />
                        </td>
                        {h.cells.map((c, i) => {
                          const isToday = i + 1 === state.todayDay;
                          return (
                            <td key={i} className="px-[2px] py-1 text-center">
                              <button
                                onClick={() => t.cycleCell(h.id, i)}
                                disabled={i + 1 > state.todayDay}
                                title={`Day ${i + 1}: ${c}`}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full transition hover:scale-110 disabled:hover:scale-100 disabled:cursor-not-allowed"
                              >
                                {c === "done" && <span className="h-3.5 w-3.5 rounded-full" style={{ background: "var(--accent)" }} />}
                                {c === "missed" && <span className="h-3.5 w-3.5 rounded-full border border-border bg-muted" />}
                                {c === "today" && <span className={`h-3.5 w-3.5 rounded-full border-2 ${isToday ? "border-foreground animate-pulse" : "border-border border-dashed"}`} />}
                                {c === "future" && <span className="h-3.5 w-3.5 rounded-full border border-dashed border-border" />}
                              </button>
                            </td>
                          );
                        })}
                        <td className="pl-3 text-right font-mono text-[11px] text-muted-foreground">{stat.pct}</td>
                        <td className="pl-2">
                          <button
                            onClick={() => t.removeHabit(h.id)}
                            className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-danger text-xs px-1"
                            aria-label="Remove habit"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <form
                onSubmit={(e) => { e.preventDefault(); t.addHabit(newHabit, newEmoji); setNewHabit(""); setNewEmoji("✨"); }}
                className="mt-4 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  maxLength={2}
                  className="w-10 rounded border border-border bg-background px-2 py-1 text-center text-sm"
                  aria-label="Emoji"
                />
                <input
                  type="text"
                  value={newHabit}
                  onChange={(e) => setNewHabit(e.target.value)}
                  placeholder="Add a habit…"
                  maxLength={40}
                  className="flex-1 rounded border border-border bg-background px-3 py-1 text-[12px] outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="rounded px-3 py-1 text-[11px] uppercase tracking-wider text-background"
                  style={{ background: "var(--accent)" }}
                >
                  Add
                </button>
              </form>
            </div>

            <div className="flex flex-col items-center gap-3 md:border-l md:border-border md:pl-6">
              <MonthlyScore
                value={overall}
                daysInMonth={state.daysInMonth}
                todayDay={state.todayDay}
                dayScores={dayScores}
                size={210}
              />
              <div className="text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {overall >= 70 ? "On a roll" : overall >= 50 ? "Holding steady" : overall > 0 ? "Reset & ride" : "Tap to begin"}
              </div>
            </div>
          </div>
        </section>

        {/* CONSTELLATION + STATS */}
        <section className="grid gap-6 md:grid-cols-[1fr_auto]">
          <div className="rounded-[10px] border border-border bg-card p-5 md:p-6">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Momentum constellation
            </div>
            <p className="mb-4 font-serif text-lg italic text-foreground/80">Your shape this month.</p>
            <div className="flex justify-center">
              {state.habits.length >= 3 ? (
                <MomentumConstellation
                  habits={state.habits.map((h) => ({
                    name: h.name.split(" ")[0].slice(0, 8),
                    value: (perHabit.find((p) => p.id === h.id)?.pct ?? 0) / 100,
                  }))}
                  size={300}
                />
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">Add at least 3 habits to see your shape.</div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 md:w-[200px]">
            <StatCard label="Best streak" value={String(bestStreak)} unit="days" />
            <StatCard label="Avg sleep" value={avgSleep ? avgSleep.toFixed(1) : "—"} unit="hrs" />
            <StatCard label="Strong days" value={String(buildWins + quitWins)} unit="this mo" />
          </div>
        </section>

        {/* SLEEP — drag to set */}
        <section className="rounded-[10px] border border-border bg-card p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Sleep graph</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Click & drag vertically on a day to log hours</div>
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">avg <span className="text-foreground">{avgSleep ? avgSleep.toFixed(1) : "—"}h</span></div>
          </div>
          <LineChart
            data={state.sleep}
            maxY={10}
            ySteps={5}
            color="var(--blue)"
            unit="h"
            todayDay={state.todayDay}
            onSet={t.setSleep}
          />
        </section>

        {/* QUIT + BUILD — click to cycle */}
        <section className="grid gap-6 md:grid-cols-2">
          <EditableCard
            tagLabel="Quit this month"
            tagBg="var(--danger-soft)"
            tagColor="var(--danger)"
            name={state.quit.name}
            onRename={t.renameQuit}
            data={state.quit.data}
            color="var(--danger)"
            onCycle={t.cycleQuit}
            wins={quitWins}
            winLabel="Resisted strongly"
            todayDay={state.todayDay}
          />
          <EditableCard
            tagLabel="Build this month"
            tagBg="var(--accent-soft)"
            tagColor="var(--accent)"
            name={state.build.name}
            onRename={t.renameBuild}
            data={state.build.data}
            color="var(--accent)"
            onCycle={t.cycleBuild}
            wins={buildWins}
            winLabel="Showed up"
            todayDay={state.todayDay}
          />
        </section>

        <footer className="pt-2 text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Small steps · compounded daily · saved in your browser
        </footer>
      </div>
    </main>
  );
}

function Legend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return <span className="flex items-center gap-1.5">{swatch}{label}</span>;
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-[10px] border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-serif text-3xl" style={{ color: "var(--accent)" }}>{value}</span>
        <span className="text-[10px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function EditableCard(props: {
  tagLabel: string; tagBg: string; tagColor: string;
  name: string; onRename: (v: string) => void;
  data: number[]; color: string; onCycle: (i: number) => void;
  wins: number; winLabel: string; todayDay: number;
}) {
  return (
    <div className="rounded-[10px] border border-border bg-card p-5">
      <span className="inline-block rounded px-2 py-[3px] text-[10px] font-medium uppercase tracking-[0.1em]"
        style={{ background: props.tagBg, color: props.tagColor }}>
        {props.tagLabel}
      </span>
      <input
        type="text"
        value={props.name ?? ""}
        onChange={(e) => props.onRename(e.target.value)}
        maxLength={60}
        placeholder="Name this habit…"
        className="mt-2 mb-4 block w-full bg-transparent font-serif italic text-foreground/80 outline-none border-b border-transparent focus:border-border py-0.5"
      />
      <div className="text-[10px] text-muted-foreground mb-2">Click a day-tick to score 0 → 4</div>
      <LineChart
        data={props.data}
        maxY={4}
        ySteps={4}
        color={props.color}
        height={110}
        todayDay={props.todayDay}
        onCycle={props.onCycle}
      />
      <div className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {props.winLabel} · <span className="text-foreground">{props.wins} days</span>
      </div>
    </div>
  );
}
