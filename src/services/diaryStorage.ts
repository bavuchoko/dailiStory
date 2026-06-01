import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiaryEntry } from '../types/diary';
import { DEFAULT_FONT_SIZE } from '../types/diary';

/** 날짜(YYYY-MM-DD) → 일기 1건 */
type DiariesByDate = Record<string, DiaryEntry>;

const STORAGE_KEY = '@daily_story_by_date';
const LEGACY_STORAGE_KEY = '@daily_story_entries';

function normalizeEntry(
  e: Omit<DiaryEntry, 'tags'> & {
    tags?: string[];
    fontSize?: number;
    highlights?: import('../types/diary').HighlightRange[];
    strikethroughs?: import('../types/diary').StrikethroughRange[];
  },
): DiaryEntry {
  return {
    ...e,
    id: e.date,
    tags: e.tags ?? [],
    fontSize: e.fontSize ?? DEFAULT_FONT_SIZE,
    highlights: e.highlights ?? [],
    strikethroughs: e.strikethroughs ?? [],
  } as DiaryEntry;
}

function mergeSameDateEntries(entries: DiaryEntry[]): DiaryEntry {
  if (entries.length === 1) return { ...entries[0], id: entries[0].date };

  const sorted = [...entries].sort((a, b) => a.createdAt - b.createdAt);
  const textParts = sorted.map(e => e.text.trim()).filter(Boolean);
  const mergedText = textParts.join('\n\n');

  const imageUris: string[] = [];
  const seenImages = new Set<string>();
  const tags: string[] = [];
  const seenTags = new Set<string>();

  for (const e of sorted) {
    for (const uri of e.imageUris) {
      if (!seenImages.has(uri)) {
        seenImages.add(uri);
        imageUris.push(uri);
      }
    }
    for (const t of e.tags) {
      const trimmed = t.trim();
      if (trimmed && !seenTags.has(trimmed) && tags.length < 3) {
        seenTags.add(trimmed);
        tags.push(trimmed);
      }
    }
  }

  let offset = 0;
  const mergedHighlights: import('../types/diary').HighlightRange[] = [];
  const mergedStrikethroughs: import('../types/diary').StrikethroughRange[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    const t = e.text.trim();
    if (!t) continue;
    for (const h of e.highlights ?? []) {
      mergedHighlights.push({
        start: h.start + offset,
        end: h.end + offset,
        color: h.color,
      });
    }
    for (const s of e.strikethroughs ?? []) {
      mergedStrikethroughs.push({
        start: s.start + offset,
        end: s.end + offset,
      });
    }
    offset += t.length;
    if (i < sorted.length - 1) offset += 2;
  }

  const primary = sorted[sorted.length - 1];
  return normalizeEntry({
    ...primary,
    id: primary.date,
    text: mergedText,
    imageUris,
    tags,
    highlights: mergedHighlights,
    strikethroughs: mergedStrikethroughs,
    createdAt: sorted[0].createdAt,
    updatedAt: primary.createdAt,
  });
}

async function readStore(): Promise<DiariesByDate> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DiariesByDate;
      if (parsed && typeof parsed === 'object') {
        const store: DiariesByDate = {};
        for (const [date, entry] of Object.entries(parsed)) {
          store[date] = normalizeEntry({ ...entry, date, id: date });
        }
        return store;
      }
    }
  } catch {
    // fall through to legacy migration
  }

  return migrateLegacyStore();
}

async function migrateLegacyStore(): Promise<DiariesByDate> {
  const store: DiariesByDate = {};
  try {
    const legacyRaw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) return store;

    const list = JSON.parse(legacyRaw) as DiaryEntry[];
    if (!Array.isArray(list)) return store;

    const byDate = new Map<string, DiaryEntry[]>();
    for (const item of list) {
      const normalized = normalizeEntry(item);
      const listForDate = byDate.get(normalized.date) ?? [];
      listForDate.push(normalized);
      byDate.set(normalized.date, listForDate);
    }

    for (const [, group] of byDate) {
      const merged = mergeSameDateEntries(group);
      store[merged.date] = merged;
    }

    await writeStore(store);
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
  return store;
}

async function writeStore(store: DiariesByDate): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function entriesFromStore(store: DiariesByDate): DiaryEntry[] {
  return Object.values(store).sort((a, b) => b.date.localeCompare(a.date));
}

export function getDateString(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getAllEntries(): Promise<DiaryEntry[]> {
  const store = await readStore();
  return entriesFromStore(store);
}

export async function saveAllEntries(entries: DiaryEntry[]): Promise<void> {
  const store: DiariesByDate = {};
  const byDate = new Map<string, DiaryEntry[]>();

  for (const e of entries) {
    const normalized = normalizeEntry({ ...e, id: e.date });
    const group = byDate.get(normalized.date) ?? [];
    group.push(normalized);
    byDate.set(normalized.date, group);
  }

  for (const [, group] of byDate) {
    const merged = mergeSameDateEntries(group);
    store[merged.date] = merged;
  }

  await writeStore(store);
}

export async function clearAllEntries(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_KEY, LEGACY_STORAGE_KEY]);
}

/** 해당 날짜의 일기 (하루 1건) */
export async function getEntryByDate(date: Date): Promise<DiaryEntry | null> {
  const store = await readStore();
  return store[getDateString(date)] ?? null;
}

/** 하위 호환 — 0 또는 1건 */
export async function getEntriesByDate(date: Date): Promise<DiaryEntry[]> {
  const entry = await getEntryByDate(date);
  return entry ? [entry] : [];
}

export async function getEntryById(id: string): Promise<DiaryEntry | null> {
  const store = await readStore();
  return store[id] ?? Object.values(store).find(e => e.id === id) ?? null;
}

export async function saveEntryForDate(
  date: string,
  data: {
    text: string;
    imageUris: string[];
    tags?: string[];
    fontSize?: number;
    highlights?: import('../types/diary').HighlightRange[];
    strikethroughs?: import('../types/diary').StrikethroughRange[];
  },
): Promise<DiaryEntry> {
  const store = await readStore();
  const now = Date.now();
  const existing = store[date];

  const entry: DiaryEntry = normalizeEntry({
    id: date,
    date,
    text: data.text.trim(),
    imageUris: data.imageUris ?? [],
    tags: data.tags ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    fontSize: data.fontSize ?? existing?.fontSize ?? DEFAULT_FONT_SIZE,
    highlights: data.highlights ?? [],
    strikethroughs: data.strikethroughs ?? [],
  });

  store[date] = entry;
  await writeStore(store);
  return entry;
}

export async function addEntry(entry: {
  date: string;
  text: string;
  imageUris: string[];
  tags?: string[];
  fontSize?: number;
  highlights?: import('../types/diary').HighlightRange[];
  strikethroughs?: import('../types/diary').StrikethroughRange[];
}): Promise<DiaryEntry> {
  return saveEntryForDate(entry.date, entry);
}

export async function updateEntry(
  id: string,
  updates: {
    text?: string;
    imageUris?: string[];
    tags?: string[];
    fontSize?: number;
    highlights?: import('../types/diary').HighlightRange[];
    strikethroughs?: import('../types/diary').StrikethroughRange[];
  },
): Promise<DiaryEntry | null> {
  const store = await readStore();
  const existing = store[id] ?? Object.values(store).find(e => e.id === id);
  if (!existing) return null;

  return saveEntryForDate(existing.date, {
    text: updates.text ?? existing.text,
    imageUris: updates.imageUris ?? existing.imageUris,
    tags: updates.tags ?? existing.tags,
    fontSize: updates.fontSize ?? existing.fontSize,
    highlights: updates.highlights ?? existing.highlights,
    strikethroughs: updates.strikethroughs ?? existing.strikethroughs,
  });
}

export async function deleteEntry(id: string): Promise<boolean> {
  const store = await readStore();
  const date =
    store[id] ? id : Object.values(store).find(e => e.id === id)?.date;
  if (!date || !store[date]) return false;
  delete store[date];
  await writeStore(store);
  return true;
}

export async function deleteEntryByDate(date: Date): Promise<boolean> {
  const store = await readStore();
  const dateStr = getDateString(date);
  if (!store[dateStr]) return false;
  delete store[dateStr];
  await writeStore(store);
  return true;
}

export async function getEntriesByMonthDay(
  month: number,
  day: number,
): Promise<DiaryEntry[]> {
  const mm = `${month}`.padStart(2, '0');
  const dd = `${day}`.padStart(2, '0');
  const suffix = `-${mm}-${dd}`;
  const all = await getAllEntries();
  return all
    .filter(e => e.date.endsWith(suffix))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getEntriesByTag(tag: string): Promise<DiaryEntry[]> {
  if (!tag.trim()) return [];
  const all = await getAllEntries();
  const lower = tag.trim().toLowerCase();
  return all.filter(e =>
    e.tags.some(t => t.trim().toLowerCase() === lower),
  );
}

export async function getAllTags(): Promise<string[]> {
  const all = await getAllEntries();
  const set = new Set<string>();
  for (const e of all) {
    for (const t of e.tags) {
      const trimmed = t.trim();
      if (trimmed) set.add(trimmed);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export type YearStats = {
  daysWithEntries: number;
  topMonths: number[];
  monthCounts: number[];
  topTags: Array<{ tag: string; count: number; rank: number }>;
};

export async function getYearStats(year: number): Promise<YearStats> {
  const all = await getAllEntries();
  const prefix = `${year}-`;
  const inYear = all.filter(e => e.date.startsWith(prefix));

  const dateSet = new Set<string>();
  const monthDates: Record<number, Set<string>> = {};
  const tagCount: Record<string, number> = {};

  for (const e of inYear) {
    dateSet.add(e.date);
    const month = parseInt(e.date.slice(5, 7), 10);
    if (!monthDates[month]) monthDates[month] = new Set();
    monthDates[month].add(e.date);
    for (const t of e.tags) {
      const key = t.trim();
      if (key) tagCount[key] = (tagCount[key] ?? 0) + 1;
    }
  }

  const monthCount: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    monthCount[m] = monthDates[m]?.size ?? 0;
  }
  let maxCount = 0;
  for (let m = 1; m <= 12; m++) {
    const c = monthCount[m] ?? 0;
    if (c > maxCount) maxCount = c;
  }
  const topMonths: number[] = [];
  for (let m = 1; m <= 12 && topMonths.length < 2; m++) {
    if ((monthCount[m] ?? 0) === maxCount && maxCount > 0) {
      topMonths.push(m);
    }
  }

  const monthCounts = Array.from({ length: 12 }, (_, i) => monthCount[i + 1] ?? 0);

  const tagEntries = Object.entries(tagCount).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });
  const topTags: Array<{ tag: string; count: number; rank: number }> = [];
  let prevCount = -1;
  let rank = 0;
  for (const [t, count] of tagEntries) {
    if (topTags.length >= 3) break;
    if (count !== prevCount) rank += 1;
    topTags.push({ tag: t, count, rank });
    prevCount = count;
  }

  return {
    daysWithEntries: dateSet.size,
    topMonths,
    monthCounts,
    topTags,
  };
}

export async function seedYearFromTemplate(templateDate: string): Promise<number> {
  const store = await readStore();
  const template = store[templateDate];
  if (!template) return 0;

  const [y] = templateDate.split('-').map(Number);
  let added = 0;

  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = `${m}`.padStart(2, '0');
      const dd = `${d}`.padStart(2, '0');
      const dateStr = `${y}-${mm}-${dd}`;
      if (dateStr === templateDate || store[dateStr]) continue;

      const baseTime = new Date(y, m - 1, d).getTime();
      store[dateStr] = normalizeEntry({
        ...template,
        id: dateStr,
        date: dateStr,
        createdAt: baseTime,
        updatedAt: baseTime,
      });
      added++;
    }
  }

  await writeStore(store);
  return added;
}
