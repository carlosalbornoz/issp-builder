const ALLOWED_TAGS = new Set(["strong", "em", "u", "ul", "li", "br"]);
// document.execCommand("bold"/"italic") produces <b>/<i> in Chrome, not
// <strong>/<em> — normalize them so formatting survives sanitization.
const TAG_ALIASES: Record<string, string> = { b: "strong", i: "em" };
const RICH_TAG_RE = /<(strong|em|u|ul|li|br)[ >/]/i;

export function isRichText(value: string): boolean {
  return RICH_TAG_RE.test(value);
}

export function sanitizeRichText(html: string): string {
  return html.replace(/<\/?([a-zA-Z0-9]+)[^>]*>/g, (match, rawTag: string) => {
    const tag = TAG_ALIASES[rawTag.toLowerCase()] ?? rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    const isClosing = match.startsWith("</");
    if (tag === "br") return isClosing ? "" : "<br>";
    return isClosing ? `</${tag}>` : `<${tag}>`;
  });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function legacyToHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}
