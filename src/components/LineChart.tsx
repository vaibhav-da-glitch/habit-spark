import { useEffect, useRef, useState } from "react";

interface Props {
  data: number[];
  maxY: number;
  ySteps?: number;
  color: string;
  height?: number;
  unit?: string;
  todayDay: number;
  step?: number;
  onCycle?: (dayIdx: number) => void;
  onSet?: (dayIdx: number, value: number) => void;
  disabled?: boolean;
}

export function LineChart({
  data, maxY, ySteps = 4, color, height = 130, unit = "", todayDay, step, onCycle, onSet, disabled = false,
}: Props) {
  const ticks = Array.from({ length: ySteps + 1 }, (_, i) => Math.round(((ySteps - i) / ySteps) * maxY));
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 100;
  const H = 100;
  const pad = 4;
  const n = data.length;
  const xAt = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, n - 1);
  const yAt = (v: number) => H - pad - (Math.max(0, Math.min(maxY, v)) / Math.max(1, maxY)) * (H - pad * 2);

  const snap = (v: number) => {
    if (step && step > 0) return Math.round(v / step) * step;
    return Math.round(v * 10) / 10;
  };
  const valueFromY = (clientY: number) => {
    const el = wrapRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const padFrac = pad / H;
    const raw = 1 - (clientY - r.top) / r.height;
    const pct = Math.max(0, Math.min(1, (raw - padFrac) / (1 - 2 * padFrac)));
    return snap(pct * maxY);
  };
  const dayFromX = (clientX: number) => {
    const el = wrapRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const padFrac = pad / W;
    const raw = (clientX - r.left) / r.width;
    const pct = Math.max(0, Math.min(1, (raw - padFrac) / (1 - 2 * padFrac)));
    return Math.round(pct * (n - 1));
  };

  useEffect(() => {
    if (dragging === null || !onSet || disabled) return;
    const move = (e: MouseEvent) => onSet(dayFromX(e.clientX), valueFromY(e.clientY));
    const up = () => setDragging(null);
    const tmove = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      e.preventDefault();
      onSet(dayFromX(e.touches[0].clientX), valueFromY(e.touches[0].clientY));
    };
    const tend = () => setDragging(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", tmove, { passive: false });
    window.addEventListener("touchend", tend);
    window.addEventListener("touchcancel", tend);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", tmove);
      window.removeEventListener("touchend", tend);
      window.removeEventListener("touchcancel", tend);
    };
  }, [dragging, onSet, disabled]);

  const filledPoints = data
    .map((v, i) => ({ v, i }))
    .filter((p) => p.i + 1 <= todayDay && p.v > 0);
  const linePath = filledPoints.map((p, k) => `${k === 0 ? "M" : "L"} ${xAt(p.i)} ${yAt(p.v)}`).join(" ");
  const areaPath = filledPoints.length
    ? `${linePath} L ${xAt(filledPoints[filledPoints.length - 1].i)} ${H - pad} L ${xAt(filledPoints[0].i)} ${H - pad} Z`
    : "";

  const startSet = (clientX: number, clientY: number) => {
    if (!onSet || disabled) return;
    const i = dayFromX(clientX);
    setDragging(i);
    onSet(i, valueFromY(clientY));
  };

  return (
    <div className="flex gap-2 select-none">
      <div className="flex flex-col justify-between text-right pr-1" style={{ height, paddingTop: `${(pad / H) * 100}%`, paddingBottom: `${(pad / H) * 100}%` }}>
        {ticks.map((t, i) => (
          <span key={i} className="text-[9px] text-muted-foreground leading-none">{t}{unit}</span>
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        <div
          ref={wrapRef}
          className="relative border-l border-b border-border touch-none"
          style={{ height }}
          onMouseDown={(e) => { e.preventDefault(); startSet(e.clientX, e.clientY); }}
          onTouchStart={(e) => {
            if (!onSet || !e.touches[0]) return;
            e.preventDefault();
            startSet(e.touches[0].clientX, e.touches[0].clientY);
          }}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            {ticks.map((_, i) => {
              const y = pad + (i * (H - pad * 2)) / ySteps;
              return <line key={i} x1={pad} x2={W - pad} y1={y} y2={y} stroke="var(--border)" strokeWidth={0.3} strokeDasharray="0.6 1" />;
            })}
            {areaPath && <path d={areaPath} fill={color} opacity={0.12} />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth={0.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 1px " + color + ")" }}
              />
            )}
          </svg>
          {data.map((v, i) => {
            const isToday = i + 1 === todayDay;
            const isFuture = i + 1 > todayDay;
            const filled = v > 0;
            const left = `${xAt(i)}%`;
            const top = `${yAt(v)}%`;
            const interactive = !!(onCycle || onSet) && !isFuture && !disabled;
            return (
              <div key={i} className="absolute" style={{ left, top, transform: "translate(-50%, -50%)" }}>
                {onCycle && !isFuture && !disabled && (
                  <div
                    className="absolute inset-y-0 cursor-pointer"
                    style={{ left: `calc(${xAt(i)}% - 6px)`, width: 12 }}
                    onClick={() => onCycle(i)}
                  />
                )}
                <button
                  type="button"
                  disabled={!interactive}
                  onClick={() => onCycle?.(i)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                  className={`block rounded-full transition-transform ${interactive ? "hover:scale-150 cursor-pointer" : "cursor-default"}`}
                  style={{
                    width: filled ? 9 : 5,
                    height: filled ? 9 : 5,
                    background: filled ? color : "transparent",
                    border: `1.5px solid ${filled ? color : "var(--border)"}`,
                    boxShadow: isToday ? `0 0 0 2px var(--background), 0 0 0 3px ${color}` : "none",
                  }}
                  aria-label={`Day ${i + 1}: ${v}${unit}`}
                />
                {hover === i && (
                  <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-7 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[9px] text-background">
                    d{i + 1} · {v}{unit}{onCycle && interactive ? " · tap +" : ""}
                  </div>
                )}
              </div>
            );
          })}
          <div
            className="pointer-events-none absolute top-0 bottom-0 border-l border-dashed border-foreground/30"
            style={{ left: `${xAt(todayDay - 1)}%` }}
          />
        </div>
        <div className="relative mt-1 h-3">
          {data.map((_, i) => {
            const show = (i + 1) % 5 === 0 || i === 0 || i + 1 === data.length;
            if (!show) return null;
            return (
              <span
                key={i}
                className="absolute -translate-x-1/2 text-[8px] text-muted-foreground"
                style={{ left: `${xAt(i)}%` }}
              >
                {i + 1}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
