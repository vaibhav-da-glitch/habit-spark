import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { CircularProgress } from "@/components/CircularProgress";
import { MomentumConstellation } from "@/components/MomentumConstellation";
import { BarChart } from "@/components/BarChart";
import { buildHabitData } from "@/lib/habit-data";

export const Route = createFileRoute("/")({
  component: HabitTracker,
  head: () => ({
    meta: [
      { title: "Habit Tracker — Monthly Momentum" },
      { name: "description", content: "A calm, paper-textured habit tracker with circular progress and a momentum constellation." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500&display=swap" },
    ],
  }),
});

function HabitTracker() {
  const data = useMemo(() => buildHabitData(), []);
  const { habits, overall, sleepData, quitData, buildData, daysInMonth, todayDay, monthLabel } = data;

  const avgSleep = useMemo(() => {
    const s = sleepData.filter((x) => x > 0);
    return s.length ? (s.reduce((a, b) => a + b, 0) / s.length).toFixed(1) : "0";
  }, [sleepData]);

  const quitWins = quitData.filter((v) => v >= 3).length;
  const buildWins = buildData.filter((v) => v >= 3).length;

  return (
    <main className="min-h-screen px-5 py-8 md:py-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {/* HEADER */}
        <header className="flex items-baseline justify-between border-b border-border pb-4">
          <h1 className="font-serif text-4xl tracking-tight md:text-5xl">Habit Tracker</h1>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {monthLabel} · day {todayDay}/{daysInMonth}
          </div>
        </header>

        {/* TOP: GRID + CIRCLE */}
        <section className="rounded-[10px] border border-border bg-card p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Day of the month
            </div>
            <div className="flex gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--accent)" }} />
                Done
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-border bg-muted" />
                Missed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-border" />
                Upcoming
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex-1 overflow-x-auto">
              <table className="border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-[10px] font-normal text-muted-foreground pr-3"></th>
                    {Array.from({ length: daysInMonth }, (_, i) => (
                      <th key={i} className="w-[22px] min-w-[22px] text-center text-[9px] font-normal text-muted-foreground py-1">
                        {(i + 1) % 5 === 0 || i === 0 ? i + 1 : ""}
                      </th>
                    ))}
                    <th className="pl-3 text-[9px] font-normal uppercase tracking-wider text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {habits.map((h) => (
                    <tr key={h.name} className="group">
                      <td className="whitespace-nowrap pr-3 py-1 text-[12px] font-medium">
                        <span className="mr-2">{h.emoji}</span>{h.name}
                      </td>
                      {h.cells.map((c, i) => (
                        <td key={i} className="px-[2px] py-1 text-center">
                          {c === "done" && (
                            <span className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: "var(--accent)" }} />
                          )}
                          {c === "missed" && (
                            <span className="inline-block h-3.5 w-3.5 rounded-full border border-border bg-muted" />
                          )}
                          {c === "today" && (
                            <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-foreground animate-pulse" />
                          )}
                          {c === "future" && (
                            <span className="inline-block h-3.5 w-3.5 rounded-full border border-dashed border-border" />
                          )}
                        </td>
                      ))}
                      <td className="pl-3 text-right font-mono text-[11px] text-muted-foreground">{h.completionPct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center gap-3 md:border-l md:border-border md:pl-6">
              <CircularProgress value={overall} size={140} stroke={10} sublabel="Monthly score" />
              <div className="text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {overall >= 70 ? "On a roll" : overall >= 50 ? "Holding steady" : "Reset & ride"}
              </div>
            </div>
          </div>
        </section>

        {/* CREATIVE: CONSTELLATION + STATS */}
        <section className="grid gap-6 md:grid-cols-[1fr_auto]">
          <div className="rounded-[10px] border border-border bg-card p-5 md:p-6">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Momentum constellation
            </div>
            <p className="mb-4 font-serif text-lg italic text-foreground/80">
              Your shape this month.
            </p>
            <div className="flex justify-center">
              <MomentumConstellation
                habits={habits.map((h) => ({ name: h.name.split(" ")[0], value: h.completionPct / 100 }))}
                size={300}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 md:w-[200px]">
            <StatCard label="Best streak" value={Math.max(...habits.map((h) => h.streak)).toString()} unit="days" />
            <StatCard label="Avg sleep" value={avgSleep} unit="hrs" />
            <StatCard label="Strong days" value={String(buildWins + quitWins)} unit="this mo" />
          </div>
        </section>

        {/* SLEEP */}
        <section className="rounded-[10px] border border-border bg-card p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Sleep graph</div>
            <div className="font-mono text-[11px] text-muted-foreground">avg <span className="text-foreground">{avgSleep}h</span></div>
          </div>
          <BarChart data={sleepData} maxY={8} ySteps={4} color="var(--blue)" unit="h" />
        </section>

        {/* QUIT + BUILD */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[10px] border border-border bg-card p-5">
            <span className="inline-block rounded px-2 py-[3px] text-[10px] font-medium uppercase tracking-[0.1em]"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
              Quit this month
            </span>
            <p className="mt-2 mb-4 font-serif italic text-foreground/80">Scrolling before bed</p>
            <BarChart data={quitData} maxY={4} ySteps={4} color="var(--danger)" height={100} />
            <div className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Resisted strongly · <span className="text-foreground">{quitWins} days</span>
            </div>
          </div>

          <div className="rounded-[10px] border border-border bg-card p-5">
            <span className="inline-block rounded px-2 py-[3px] text-[10px] font-medium uppercase tracking-[0.1em]"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              Build this month
            </span>
            <p className="mt-2 mb-4 font-serif italic text-foreground/80">10 min morning walk</p>
            <BarChart data={buildData} maxY={4} ySteps={4} color="var(--accent)" height={100} />
            <div className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Showed up · <span className="text-foreground">{buildWins} days</span>
            </div>
          </div>
        </section>

        <footer className="pt-2 text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Small steps · compounded daily
        </footer>
      </div>
    </main>
  );
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
