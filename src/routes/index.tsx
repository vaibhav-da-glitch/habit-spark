import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronLeft, ChevronRight, Download, Share2, CalendarDays, LayoutGrid } from "lucide-react";
import html2canvas from "html2canvas";
import { MonthlyScore } from "@/components/MonthlyScore";
import { MomentumConstellation } from "@/components/MomentumConstellation";
import { LineChart } from "@/components/LineChart";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotePopover } from "@/components/NotePopover";
import { computeStats, goalLabel, useTracker, type HabitRow } from "@/lib/use-tracker";
import { spawnSparks } from "@/lib/sparks";

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

function formatMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
}

function HabitTracker() {
  const t = useTracker();
  const { state, isReadOnly, viewMonth, availableMonths } = t;
  const { perHabit, overall, avgSleep } = useMemo(() => computeStats(state), [state]);
  const [newHabit, setNewHabit] = useState("");
  const [newEmoji, setNewEmoji] = useState("✨");
  const [view, setView] = useState<"grid" | "today">("grid");
  const shareRef = useRef<HTMLDivElement>(null);

  const [notePopover, setNotePopover] = useState<{ habitId: string; dayIdx: number; rect: DOMRect } | null>(null);

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

  const idx = availableMonths.indexOf(viewMonth);
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < availableMonths.length - 1;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) t.reorderHabits(String(active.id), String(over.id));
  };

  const handleCellClick = (habitId: string, dayIdx: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const habit = state.habits.find((h) => h.id === habitId);
    if (!habit) return;
    const cur = habit.cells[dayIdx];
    t.cycleCell(habitId, dayIdx);
    // pop animation + sparks on transition to done (cur was "missed" or "today" or "future" → "done")
    if (cur !== "done" && !isReadOnly) {
      const target = e.currentTarget;
      target.classList.remove("animate-cell-pop");
      void target.offsetWidth;
      target.classList.add("animate-cell-pop");
      // The next state will be "done" only when cur was today/future. cycle: done→missed, missed→future, future/today→done
      const becomesDone = cur === "future" || cur === "today";
      if (becomesDone) spawnSparks(target, "var(--accent)", 10);
    }
  };

  const openNote = (habitId: string, dayIdx: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (isReadOnly) return;
    const habit = state.habits.find((h) => h.id === habitId);
    if (!habit || habit.cells[dayIdx] !== "done") return;
    setNotePopover({ habitId, dayIdx, rect: e.currentTarget.getBoundingClientRect() });
  };

  const exportCSV = () => {
    const days = state.daysInMonth;
    const header = ["Habit", "Emoji", "Goal", ...Array.from({ length: days }, (_, i) => `Day ${i + 1}`), "Streak", "Completion %"];
    const rows = state.habits.map((h) => {
      const stat = perHabit.find((p) => p.id === h.id);
      return [
        h.name,
        h.emoji,
        goalLabel(h.goal),
        ...h.cells.map((c) => (c === "done" ? "done" : c === "missed" ? "missed" : "empty")),
        String(stat?.streak ?? 0),
        String(stat?.pct ?? 0),
      ];
    });
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `habits-${viewMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sharePNG = async () => {
    if (!shareRef.current) return;
    const bg = getComputedStyle(document.body).backgroundColor;
    const canvas = await html2canvas(shareRef.current, { backgroundColor: bg, scale: 2 });
    const link = document.createElement("a");
    link.download = `habits-${viewMonth}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <main className="min-h-screen px-5 py-8 md:py-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {/* HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h1 className="font-serif text-4xl tracking-tight md:text-5xl">Habit Tracker</h1>
            <div className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <button
                onClick={t.goPrev}
                disabled={!canPrev}
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-card disabled:opacity-30 hover:bg-muted"
                aria-label="Previous month"
              ><ChevronLeft size={12} /></button>
              <span className="min-w-[140px] text-center">
                {formatMonth(viewMonth)}{isReadOnly ? " · read-only" : ` · day ${state.todayDay}/${state.daysInMonth}`}
              </span>
              <button
                onClick={t.goNext}
                disabled={!canNext}
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-card disabled:opacity-30 hover:bg-muted"
                aria-label="Next month"
              ><ChevronRight size={12} /></button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView(view === "grid" ? "today" : "grid")}
              className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted"
            >
              {view === "grid" ? <CalendarDays size={12} /> : <LayoutGrid size={12} />}
              {view === "grid" ? "Today" : "Month"}
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted"
            ><Download size={12} /> CSV</button>
            <button
              onClick={sharePNG}
              className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted"
            ><Share2 size={12} /> Share</button>
            <ThemeToggle />
            {!isReadOnly && (
              <button
                onClick={() => { if (confirm("Reset this month?")) t.reset(); }}
                className="rounded border border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted"
              >Reset</button>
            )}
          </div>
        </header>

        {isReadOnly && (
          <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
            Viewing archived month — editing is disabled. Use ▶ to return to the current month.
          </div>
        )}

        {/* TODAY VIEW */}
        {view === "today" ? (
          <section className="rounded-[10px] border border-border bg-card p-5 md:p-6">
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Today · {state.todayDay}</div>
              <p className="font-serif text-2xl italic text-foreground/80">A quick morning check-in.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {state.habits.map((h) => {
                const dayIdx = state.todayDay - 1;
                const done = h.cells[dayIdx] === "done";
                return (
                  <button
                    key={h.id}
                    onClick={(e) => handleCellClick(h.id, dayIdx, e as any)}
                    disabled={isReadOnly}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${done ? "border-accent bg-accent-soft/40" : "border-border hover:bg-muted"}`}
                  >
                    <span className="text-3xl">{h.emoji}</span>
                    <div className="flex-1">
                      <div className="font-serif text-lg leading-tight">{h.name}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{goalLabel(h.goal)}</div>
                    </div>
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${done ? "border-accent" : "border-border"}`}
                      style={{ background: done ? "var(--accent)" : "transparent" }}
                    >
                      {done && <span className="text-background text-xs">✓</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <>
            {/* GRID + SCORE */}
            <section ref={shareRef} className="rounded-[10px] border border-border bg-card p-5 md:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {isReadOnly ? `Archive · ${formatMonth(viewMonth)}` : "Tap a cell to cycle · click a green cell to add a note"}
                </div>
                <div className="flex gap-4 text-[10px] text-muted-foreground">
                  <Legend swatch={<span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--accent)" }} />} label="Done" />
                  <Legend swatch={<span className="h-2.5 w-2.5 rounded-full border border-border bg-muted" />} label="Missed" />
                  <Legend swatch={<span className="h-2.5 w-2.5 rounded-full border border-dashed border-border" />} label="Empty" />
                </div>
              </div>

              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex-1 overflow-x-auto">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={state.habits.map((h) => h.id)} strategy={verticalListSortingStrategy}>
                      <table className="border-collapse">
                        <thead>
                          <tr>
                            <th></th>
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
                          {state.habits.map((h) => (
                            <SortableHabitRow
                              key={h.id}
                              habit={h}
                              stat={perHabit.find((p) => p.id === h.id)!}
                              todayDay={state.todayDay}
                              isReadOnly={isReadOnly}
                              onCellClick={handleCellClick}
                              onCellContext={openNote}
                              onRename={t.renameHabit}
                              onRemove={t.removeHabit}
                              onSetGoal={t.setHabitGoal}
                            />
                          ))}
                        </tbody>
                      </table>
                    </SortableContext>
                  </DndContext>

                  {!isReadOnly && (
                    <form
                      onSubmit={(e) => { e.preventDefault(); t.addHabit(newHabit, newEmoji); setNewHabit(""); setNewEmoji("✨"); }}
                      className="mt-4 flex items-center gap-2"
                    >
                      <input
                        type="text" value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} maxLength={2}
                        className="w-10 rounded border border-border bg-background px-2 py-1 text-center text-sm" aria-label="Emoji"
                      />
                      <input
                        type="text" value={newHabit} onChange={(e) => setNewHabit(e.target.value)}
                        placeholder="Add a habit…" maxLength={40}
                        className="flex-1 rounded border border-border bg-background px-3 py-1 text-[12px] outline-none focus:border-accent"
                      />
                      <button type="submit" className="rounded px-3 py-1 text-[11px] uppercase tracking-wider text-background" style={{ background: "var(--accent)" }}>
                        Add
                      </button>
                    </form>
                  )}
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
                <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Momentum constellation</div>
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

            {/* SLEEP */}
            <section className="rounded-[10px] border border-border bg-card p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Sleep graph</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Drag vertically (mouse or finger) to log hours</div>
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">avg <span className="text-foreground">{avgSleep ? avgSleep.toFixed(1) : "—"}h</span></div>
              </div>
              <LineChart
                data={state.sleep} maxY={12} ySteps={6} color="var(--blue)"
                unit="h" todayDay={state.todayDay} onSet={t.setSleep} disabled={isReadOnly}
              />
            </section>

            {/* QUIT + BUILD */}
            <section className="grid gap-6 md:grid-cols-2">
              <EditableCard
                tagLabel="Quit this month" tagBg="var(--danger-soft)" tagColor="var(--danger)"
                name={state.quit.name} onRename={t.renameQuit}
                data={state.quit.data} color="var(--danger)" onCycle={t.cycleQuit}
                wins={quitWins} winLabel="Resisted strongly" todayDay={state.todayDay} disabled={isReadOnly}
              />
              <EditableCard
                tagLabel="Build this month" tagBg="var(--accent-soft)" tagColor="var(--accent)"
                name={state.build.name} onRename={t.renameBuild}
                data={state.build.data} color="var(--accent)" onCycle={t.cycleBuild}
                wins={buildWins} winLabel="Showed up" todayDay={state.todayDay} disabled={isReadOnly}
              />
            </section>
          </>
        )}

        <footer className="pt-2 text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Small steps · compounded daily · saved in your browser
        </footer>
      </div>

      {notePopover && (() => {
        const habit = state.habits.find((h) => h.id === notePopover.habitId);
        const initial = habit?.notes?.[notePopover.dayIdx] ?? "";
        return (
          <NotePopover
            open
            title={`${habit?.emoji} ${habit?.name} · day ${notePopover.dayIdx + 1}`}
            initialValue={initial}
            anchorRect={notePopover.rect}
            onSave={(v) => t.setNote(notePopover.habitId, notePopover.dayIdx, v)}
            onClose={() => setNotePopover(null)}
          />
        );
      })()}
    </main>
  );
}

function SortableHabitRow({
  habit, stat, todayDay, isReadOnly, onCellClick, onCellContext, onRename, onRemove, onSetGoal,
}: {
  habit: HabitRow;
  stat: { pct: number; streak: number };
  todayDay: number;
  isReadOnly: boolean;
  onCellClick: (id: string, i: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onCellContext: (id: string, i: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onRename: (id: string, v: string) => void;
  onRemove: (id: string) => void;
  onSetGoal: (id: string, goal: ReturnType<typeof goalToObj>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id, disabled: isReadOnly });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const [goalOpen, setGoalOpen] = useState(false);

  return (
    <tr ref={setNodeRef} style={style} className="group">
      <td className="w-4 pr-1 align-middle">
        <button
          {...attributes} {...listeners}
          disabled={isReadOnly}
          className="text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing disabled:opacity-0"
          aria-label="Reorder"
        ><GripVertical size={12} /></button>
      </td>
      <td className="whitespace-nowrap pr-3 py-1 text-[12px] font-medium relative">
        <span className="mr-2">{habit.emoji}</span>
        <input
          type="text" value={habit.name ?? ""} onChange={(e) => onRename(habit.id, e.target.value)}
          maxLength={40} disabled={isReadOnly}
          className="bg-transparent outline-none border-b border-transparent focus:border-border w-[140px] py-0.5"
        />
        <button
          onClick={() => setGoalOpen((o) => !o)}
          disabled={isReadOnly}
          className="block text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >{goalLabel(habit.goal)} {!isReadOnly && "▾"}</button>
        {goalOpen && !isReadOnly && (
          <div className="absolute z-30 mt-1 w-44 rounded-md border border-border bg-card p-2 shadow-lg">
            <button
              onClick={() => { onSetGoal(habit.id, { kind: "daily" }); setGoalOpen(false); }}
              className="block w-full text-left rounded px-2 py-1 text-[11px] hover:bg-muted"
            >Every day</button>
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => { onSetGoal(habit.id, { kind: "weekly", times: n }); setGoalOpen(false); }}
                className="block w-full text-left rounded px-2 py-1 text-[11px] hover:bg-muted"
              >{n}× per week</button>
            ))}
          </div>
        )}
      </td>
      {habit.cells.map((c, i) => {
        const isToday = i + 1 === todayDay;
        const hasNote = !!habit.notes?.[i];
        return (
          <td key={i} className="px-[2px] py-1 text-center relative">
            <button
              onClick={(e) => {
                if (c === "done" && !isReadOnly && (e.shiftKey || e.altKey)) {
                  onCellContext(habit.id, i, e);
                } else {
                  onCellClick(habit.id, i, e);
                }
              }}
              onContextMenu={(e) => { e.preventDefault(); onCellContext(habit.id, i, e as any); }}
              disabled={isReadOnly || i + 1 > todayDay}
              title={hasNote ? habit.notes![i] : `Day ${i + 1}: ${c}`}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full transition hover:scale-110 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {c === "done" && <span className="h-3.5 w-3.5 rounded-full" style={{ background: "var(--accent)" }} />}
              {c === "missed" && <span className="h-3.5 w-3.5 rounded-full border border-border bg-muted" />}
              {c === "today" && <span className={`h-3.5 w-3.5 rounded-full border-2 ${isToday ? "border-foreground animate-pulse" : "border-border border-dashed"}`} />}
              {c === "future" && <span className="h-3.5 w-3.5 rounded-full border border-dashed border-border" />}
            </button>
            {hasNote && (
              <span
                className="pointer-events-none absolute right-[3px] top-[3px] h-1 w-1 rounded-full"
                style={{ background: "var(--blue)" }}
              />
            )}
          </td>
        );
      })}
      <td className="pl-3 text-right font-mono text-[11px] text-muted-foreground">{stat.pct}</td>
      <td className="pl-2">
        {!isReadOnly && (
          <button
            onClick={() => onRemove(habit.id)}
            className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-danger text-xs px-1"
            aria-label="Remove habit"
          >✕</button>
        )}
      </td>
    </tr>
  );
}

// Helper type witness for TS in SortableHabitRow props
function goalToObj(): { kind: "daily" } | { kind: "weekly"; times: number } { return { kind: "daily" }; }

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
  wins: number; winLabel: string; todayDay: number; disabled?: boolean;
}) {
  return (
    <div className="rounded-[10px] border border-border bg-card p-5">
      <span className="inline-block rounded px-2 py-[3px] text-[10px] font-medium uppercase tracking-[0.1em]"
        style={{ background: props.tagBg, color: props.tagColor }}>
        {props.tagLabel}
      </span>
      <input
        type="text" value={props.name ?? ""} onChange={(e) => props.onRename(e.target.value)}
        maxLength={60} placeholder="Name this habit…" disabled={props.disabled}
        className="mt-2 mb-4 block w-full bg-transparent font-serif italic text-foreground/80 outline-none border-b border-transparent focus:border-border py-0.5"
      />
      <div className="text-[10px] text-muted-foreground mb-2">Click a day-tick to score 0 → 4</div>
      <LineChart
        data={props.data} maxY={4} ySteps={4} color={props.color}
        height={110} todayDay={props.todayDay} onCycle={props.onCycle} disabled={props.disabled}
      />
      <div className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {props.winLabel} · <span className="text-foreground">{props.wins} days</span>
      </div>
    </div>
  );
}
