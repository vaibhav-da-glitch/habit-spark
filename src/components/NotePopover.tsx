import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  initialValue: string;
  title: string;
  anchorRect: DOMRect | null;
  onSave: (value: string) => void;
  onClose: () => void;
}

export function NotePopover({ open, initialValue, title, anchorRect, onSave, onClose }: Props) {
  const [val, setVal] = useState(initialValue);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setVal(initialValue), [initialValue, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onSave(val);
        onClose();
      }
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, val, onSave, onClose]);

  if (!open || !anchorRect) return null;
  const top = anchorRect.bottom + window.scrollY + 6;
  const left = Math.max(8, Math.min(window.innerWidth - 248, anchorRect.left + window.scrollX - 100));

  return (
    <div
      ref={ref}
      className="fixed z-50 w-60 rounded-md border border-border bg-card p-3 shadow-lg"
      style={{ top, left }}
    >
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">{title}</div>
      <textarea
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        maxLength={200}
        rows={3}
        placeholder="e.g. ran 5k · felt great"
        className="w-full resize-none rounded border border-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-accent"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[9px] text-muted-foreground">{val.length}/200</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => { onSave(""); onClose(); }}
            className="rounded px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted"
          >
            Clear
          </button>
          <button
            onClick={() => { onSave(val); onClose(); }}
            className="rounded px-2 py-1 text-[10px] uppercase tracking-wider text-background"
            style={{ background: "var(--accent)" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
