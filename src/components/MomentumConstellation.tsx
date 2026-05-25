interface Habit {
  name: string;
  value: number; // 0-1
}

// A radial polar chart — each habit is an axis, the polygon shows your shape this month.
export function MomentumConstellation({ habits, size = 260 }: { habits: Habit[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 36;
  const n = habits.length;

  const point = (i: number, r: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r] as const;
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const polygon = habits
    .map((h, i) => point(i, radius * Math.max(0.04, h.value)).join(","))
    .join(" ");

  return (
    <svg width={size} height={size}>
      {rings.map((r, idx) => (
        <polygon
          key={idx}
          points={habits.map((_, i) => point(i, radius * r).join(",")).join(" ")}
          fill="none"
          stroke="var(--border)"
          strokeDasharray={idx === rings.length - 1 ? "0" : "2 4"}
        />
      ))}
      {habits.map((_, i) => {
        const [x, y] = point(i, radius);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeDasharray="2 4" />;
      })}
      <polygon
        points={polygon}
        fill="oklch(0.48 0.09 155 / 0.18)"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        style={{ transition: "all 900ms cubic-bezier(.2,.8,.2,1)" }}
      />
      {habits.map((h, i) => {
        const [px, py] = point(i, radius * Math.max(0.04, h.value));
        const [lx, ly] = point(i, radius + 18);
        return (
          <g key={h.name}>
            <circle cx={px} cy={py} r={3.5} fill="var(--accent)" />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9"
              fontFamily="DM Mono, monospace"
              fill="var(--muted-foreground)"
              style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              {h.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
