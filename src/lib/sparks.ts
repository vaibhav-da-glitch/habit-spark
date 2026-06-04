/** Spawn small CSS sparks around a target element. */
export function spawnSparks(target: Element, color = "var(--accent)", count = 10) {
  const rect = (target as HTMLElement).getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.className = "spark";
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const dist = 18 + Math.random() * 14;
    s.style.setProperty("--dx", `${Math.cos(a) * dist}px`);
    s.style.setProperty("--dy", `${Math.sin(a) * dist}px`);
    s.style.left = `${cx + window.scrollX - 2}px`;
    s.style.top = `${cy + window.scrollY - 2}px`;
    s.style.position = "absolute";
    s.style.background = color;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 700);
  }
}
