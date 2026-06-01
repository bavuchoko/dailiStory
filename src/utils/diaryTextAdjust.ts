import type { HighlightRange, StrikethroughRange } from '../types/diary';

export function adjustHighlightsForTextChange(
  oldText: string,
  newText: string,
  highlights: HighlightRange[],
): HighlightRange[] {
  const oldLen = oldText.length;
  const newLen = newText.length;
  let firstDiff = 0;
  while (
    firstDiff < oldLen &&
    firstDiff < newLen &&
    oldText[firstDiff] === newText[firstDiff]
  ) {
    firstDiff++;
  }
  const delta = newLen - oldLen;
  const out: HighlightRange[] = [];
  for (const h of highlights) {
    let start = h.start;
    let end = h.end;
    if (end <= firstDiff) {
      // unchanged
    } else if (start >= firstDiff) {
      start = Math.max(0, start + delta);
      end = Math.min(newLen, end + delta);
    } else {
      end = Math.min(newLen, end + delta);
    }
    if (start < end && end <= newLen) {
      out.push({ start, end, color: h.color });
    }
  }
  return out;
}

export function adjustStrikethroughsForTextChange(
  oldText: string,
  newText: string,
  strikethroughs: StrikethroughRange[],
): StrikethroughRange[] {
  const oldLen = oldText.length;
  const newLen = newText.length;
  let firstDiff = 0;
  while (
    firstDiff < oldLen &&
    firstDiff < newLen &&
    oldText[firstDiff] === newText[firstDiff]
  ) {
    firstDiff++;
  }
  const delta = newLen - oldLen;
  const out: StrikethroughRange[] = [];
  for (const s of strikethroughs) {
    let start = s.start;
    let end = s.end;
    if (end <= firstDiff) {
      // unchanged
    } else if (start >= firstDiff) {
      start = Math.max(0, start + delta);
      end = Math.min(newLen, end + delta);
    } else {
      end = Math.min(newLen, end + delta);
    }
    if (start < end && end <= newLen) {
      out.push({ start, end });
    }
  }
  return out;
}
