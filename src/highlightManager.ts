/**
 * Lightweight representation used during text-based comparison.
 * Intentionally separate from the storage `Highlight` type so there
 * is no circular dependency between modules.
 */
export interface HighlightItem {
  id: string;
  start: number; // character offset
  end: number;   // character offset (exclusive)
  text: string;  // the exact text that was highlighted
}

export interface HighlightInfo {
  highlightId: string;
  start: number;
  end: number;
  text: string;
}

/**
 * Compares highlights against the new document text.
 * - Highlights whose text is still present are kept and their offsets updated.
 * - Highlights whose text has been completely removed are dropped.
 */
export function compareAndUpdateHighlights(
  oldText: string,
  newText: string,
  highlights: HighlightItem[]
): HighlightItem[] {
  const updated: HighlightItem[] = [];

  for (const h of highlights) {
    // Prefer the stored text; fall back to slicing from oldText.
    const content = h.text || oldText.substring(h.start, h.end);
    if (!content) continue;

    const newIndex = newText.indexOf(content);
    if (newIndex !== -1) {
      updated.push({
        ...h,
        start: newIndex,
        end: newIndex + content.length,
        text: content,
      });
    }
    // If newIndex === -1 the text was removed → highlight is dropped.
  }

  return updated;
}

/**
 * Returns info about the highlight that contains the given character offset,
 * or null if the offset is not inside any highlight.
 */
export function getHighlightInfo(
  text: string,
  offset: number,
  highlights: HighlightItem[]
): HighlightInfo | null {
  for (const h of highlights) {
    if (h.start <= offset && offset < h.end) {
      return {
        highlightId: h.id,
        start: h.start,
        end: h.end,
        text: text.substring(h.start, h.end),
      };
    }
  }
  return null;
}

/**
 * Describes one atomic edit from VS Code's onDidChangeTextDocument event.
 * Mirrors the shape of vscode.TextDocumentContentChangeEvent so this module
 * stays free of a vscode import.
 */
export interface ContentChange {
  rangeOffset: number;  // start offset of the replaced range
  rangeLength: number;  // length of the replaced range (0 for pure insertions)
  text: string;         // replacement text (empty string for pure deletions)
}

/**
 * Adjusts highlight positions using the exact edit deltas reported by VS Code.
 *
 * Rules:
 *  - Edit entirely before a highlight   → shift both endpoints
 *  - Edit entirely after a highlight    → no change
 *  - Edit entirely inside a highlight   → shrink/grow the end endpoint
 *  - Edit covers the whole highlight
 *      with replacement text            → highlight spans the new text
 *      with no replacement (pure del)   → highlight is removed
 *  - Edit straddles the left boundary   → new start = end of inserted text
 *  - Edit straddles the right boundary  → trim end to start of edit
 */
export function adjustHighlightsForChanges(
  highlights: HighlightItem[],
  changes: readonly ContentChange[]
): HighlightItem[] {
  // Process changes from last to first so earlier shifts don't affect later offsets.
  const sorted = [...changes].sort((a, b) => b.rangeOffset - a.rangeOffset);

  let result: HighlightItem[] = [...highlights];

  for (const change of sorted) {
    const co      = change.rangeOffset;
    const cl      = change.rangeLength;
    const nl      = change.text.length;
    const editEnd = co + cl;          // exclusive end of the deleted range
    const delta   = nl - cl;         // net character shift

    const next: HighlightItem[] = [];

    for (const h of result) {
      const s = h.start;
      const e = h.end;

      // Edit is entirely after the highlight — no change.
      if (co >= e) {
        next.push(h);
        continue;
      }

      // Edit is entirely before the highlight — shift both endpoints.
      if (editEnd <= s) {
        next.push({ ...h, start: s + delta, end: e + delta });
        continue;
      }

      // Edit completely covers the highlight.
      if (co <= s && editEnd >= e) {
        if (nl === 0) {
          // Pure deletion of all highlighted chars → remove highlight.
          continue;
        }
        // Replacement exists → highlight spans the replacement text.
        next.push({ ...h, start: co, end: co + nl });
        continue;
      }

      // Edit is entirely inside the highlight — adjust the end endpoint.
      if (co >= s && editEnd <= e) {
        next.push({ ...h, end: e + delta });
        continue;
      }

      // Edit straddles the LEFT boundary (starts before, ends inside).
      if (co < s && editEnd > s && editEnd <= e) {
        next.push({ ...h, start: co + nl, end: e + delta });
        continue;
      }

      // Edit straddles the RIGHT boundary (starts inside, ends after).
      if (co >= s && co < e && editEnd > e) {
        // Trim the highlight to where the edit begins.
        const newEnd = co + nl;
        if (newEnd > s) {
          next.push({ ...h, end: newEnd });
        }
        continue;
      }

      next.push(h);
    }

    result = next.filter(h => h.start < h.end);
  }

  return result;
}

/** Convenience constructor for a HighlightItem. */
export function createHighlightItem(
  id: string,
  start: number,
  end: number,
  text: string
): HighlightItem {
  return { id, start, end, text };
}