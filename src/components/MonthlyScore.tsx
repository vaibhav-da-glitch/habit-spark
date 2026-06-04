interface DayScore {
  day: number;
  pct: number; // 0..1 completion that day
  isToday: boolean;
  isFuture: boolean;
}

interface Props {
  /** 0-100 overall */
  value: number;
  daysInMonth: number;
  todayDay: number;
  /** Per-day completion (0..1) across all habits */
  dayScores: number[];
  size?: number;
}

/**
 * A creative monthly score dial. Outer ring = days of the month, each rendered
 * as a radial tick whose length encodes that day's habit completion. Inner
 * ring = animated progress arc for the monthly average. Center = the score.
 */
export function MonthlyScore({ value, daysInMonth, todayDay, dayScores, size = 200 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const tickInner = outerR - 18;
  const ringR = outerR - 28;
  const ringStroke = 8;
  const c = 2 * Math.PI * ringR;
  const v = Math.max(0, Math.min(100, value));
  const offset = c - (v / 100) * c;

  const ticks = Array.from({ length: daysInMonth }, (_, i) => {
    const angle = (i / daysInMonth) * Math.PI * 2 - Math.PI / 2;
    const day = i + 1;
    const isToday = day === todayDay;
    const isFuture = day > todayDay;
    const pct = dayScores[i] ?? 0;
    const len = isFuture ? 4 : 4 + pct * 14;
    const x1 = cx + Math.cos(angle) * tickInner;
    const y1 = cy + Math.sin(angle) * tickInner;
    const x2 = cx + Math.cos(angle) * (tickInner + len);
    const y2 = cy + Math.sin(angle) * (tickInner + len);
    return { x1, y1, x2, y2, isToday, isFuture, pct, day };
  });

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <linearGradient id="ms-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--blue)" />
          </linearGradient>
        </defs>

        {/* Day ticks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.isFuture ? "var(--border)" : t.isToday ? "var(--foreground)" : "url(#ms-grad)"}
            strokeWidth={t.isToday ? 2.2 : 1.6}
            strokeLinecap="round"
            opacity={t.isFuture ? 0.4 : 0.35 + t.pct * 0.65}
          />
        ))}

        {/* Track ring */}
        <circle cx={cx} cy={cy} r={ringR} fill="none" stroke="var(--border)" strokeWidth={ringStroke} />

        {/* Progress arc */}
        <circle
          cx={cx} cy={cy} r={ringR}
          fill="none"
          stroke="url(#ms-grad)"
          strokeWidth={ringStroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)" }}
        />

        {/* Today marker dot on progress ring */}
        {(() => {
          const angle = (todayDay / daysInMonth) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * ringR;
          const y = cy + Math.sin(angle) * ringR;
          return <circle cx={x} cy={y} r={3} fill="var(--foreground)" />;
        })()}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Monthly</div>
        <div className="font-serif text-5xl leading-none mt-0.5" style={{ color: "var(--accent)" }}>
          {Math.round(v)}
          <span className="text-xl text-muted-foreground">%</span>
        </div>
        <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          day {todayDay}/{daysInMonth}
        </div>
      </div>
    </div>
  );
}
