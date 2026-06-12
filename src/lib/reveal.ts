/**
 * Usability principle 1: adding an item must have a visible consequence at the
 * point of attention. After appending a new list item, call revealNewItem(id)
 * with the element carrying data-reveal-id={id} — it scrolls the item into
 * view, focuses its first input, and pulses a highlight ring.
 */
export function revealNewItem(id: string) {
  // Double rAF: wait for React to commit and the browser to lay out the new node.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // The same id may exist in both a desktop and a mobile rendering — pick the visible one.
      const candidates = Array.from(document.querySelectorAll(`[data-reveal-id="${CSS.escape(id)}"]`));
      const el = candidates.find((c) => c instanceof HTMLElement && c.offsetParent !== null);
      if (!(el instanceof HTMLElement)) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = el.querySelector<HTMLElement>("input, textarea, select");
      input?.focus({ preventScroll: true });
      el.classList.add("reveal-highlight");
      window.setTimeout(() => el.classList.remove("reveal-highlight"), 1800);
    });
  });
}
