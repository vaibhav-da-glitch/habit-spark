interface Props {
  data: number[];
  maxY: number;
  ySteps?: number;
  color: string;
  height?: number;
  unit?: string;
}

export function BarChart({ data, maxY, ySteps = 4, color, height = 120, unit = "" }: Props) {
  const ticks = Array.from({ length: ySteps }, (_, i) => Math.round(((ySteps - i) / ySteps) * maxY));
  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-col justify-between text-right pr-1" style={{ height }}>
        {ticks.map((t, i) => (
          <span key={i} className="text-[9px] text-muted-foreground leading-none">{t}</span>
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        <div
          className="flex items-end gap-[3px] border-l border-b border-border px-2"
          style={{ height }}
        >
          {data.map((v, i) => {
            const pct = maxY > 0 ? (v / maxY) * 100 : 0;
            return (
              <div
                key={i}
                className="group relative flex-1 rounded-t-[3px] min-w-[6px]"
                style={{
                  height: `${Math.max(pct, 1.5)}%`,
                  background: color,
                  opacity: v === 0 ? 0.12 : 0.85,
                  transition: "height 700ms cubic-bezier(.2,.8,.2,1), opacity 200ms",
                }}
              >
                <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[9px] text-background opacity-0 group-hover:opacity-100 transition">
                  {v}{unit}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-[3px] px-2 mt-1">
          {data.map((_, i) => (
            <span key={i} className="flex-1 text-center text-[8px] text-muted-foreground">
              {(i + 1) % 3 === 1 ? i + 1 : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
