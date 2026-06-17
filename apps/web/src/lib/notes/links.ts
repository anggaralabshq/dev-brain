/**
 * Note link extraction & utilities.
 * `[[note-title]]` syntax in markdown is parsed and resolved to actual note IDs.
 */

/** Extract all [[note-slug]] references from a string. */
export function extractNoteLinks(content: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const matches = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    matches.add(slugifyNoteRef(m[1]));
  }
  return Array.from(matches);
}

/** Convert any string to a URL-safe note slug. */
export function slugifyNoteRef(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Generate first 200 chars of plain-text excerpt from HTML or markdown. */
export function makeExcerpt(content: string, max = 200): string {
  const plain = content
    .replace(/<[^>]+>/g, " ")           // strip HTML tags
    .replace(/&nbsp;/g, " ")            // common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\[\[([^\]]+)\]\]/g, "$1") // [[link]] → text
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? plain.slice(0, max) + "…" : plain;
}
