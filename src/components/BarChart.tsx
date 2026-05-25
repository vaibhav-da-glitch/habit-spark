import { useEffect, useRef, useState } from "react";

interface Props {
  data: number[];
  maxY: number;
  ySteps?: number;
  color: string;
  height?: number;
  unit?: string;
  todayDay: number;
  /** click-cycle mode for quit/build */
  onCycle?: (dayIdx: number) => void;
  /** drag-set mode for sleep */
  onSet?: (dayIdx: number, value: number) => void;
}

export function BarChart({
  data, maxY, ySteps = 4, color, height = 120, unit = "", todayDay, onCycle, onSet,
}: Props) {
  const ticks = Array.from({ length: ySteps }, (_, i) => Math.round(((ySteps - i) / ySteps) * maxY));
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const valueFromY = (clientY: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const pct = 1 - Math.max(0, Math.min(1, (clientY - r.top) / r.height));
    return Math.round(pct * maxY * 10) / 10;
  };

  useEffect(() => {
    if (dragging === null || !onSet) return;
    const move = (e: MouseEvent) => onSet(dragging, valueFromY(e.clientY));
    const up = () => setDragging(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [dragging, onSet]);

  return (
    <div className="flex items-end gap-2 select-none">
      <div className="flex flex-col justify-between text-right pr-1" style={{ height }}>
        {ticks.map((t, i) => (
          <span key={i} className="text-[9px] text-muted-foreground leading-none">{t}</span>
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        <div
          ref={trackRef}
          className="relative flex items-end gap-[3px] border-l border-b border-border px-2"
          style={{ height }}
        >
          {data.map((v, i) => {
            const pct = maxY > 0 ? (v / maxY) * 100 : 0;
            const isToday = i + 1 === todayDay;
            const interactive = !!(onCycle || onSet);
            return (
              <div
                key={i}
                className={`group relative flex-1 min-w-[6px] flex items-end h-full ${interactive ? "cursor-pointer" : ""}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                onClick={() => onCycle?.(i)}
                onMouseDown={(e) => {
                  if (!onSet) return;
                  e.preventDefault();
                  setDragging(i);
                  onSet(i, valueFromY(e.clientY));
                }}
              >
                <div
                  className="w-full rounded-t-[3px] transition-[height,opacity] duration-300"
                  style={{
                    height: `${Math.max(pct, v > 0 ? 2 : 0)}%`,
                    background: color,
                    opacity: v === 0 ? (hover === i ? 0.3 : 0.1) : 0.85,
                    outline: isToday ? "1px dashed var(--foreground)" : "none",
                    outlineOffset: "2px",
                  }}
                />
                {hover === i && (
                  <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[9px] text-background">
                    d{i + 1}: {v}{unit}{onCycle && v === 0 ? " · click" : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-[3px] px-2 mt-1">
          {data.map((_, i) => (
            <span key={i} className="flex-1 text-center text-[8px] text-muted-foreground">
              {(i + 1) % 5 === 0 || i === 0 ? i + 1 : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
