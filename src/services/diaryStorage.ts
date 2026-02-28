import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiaryEntry } from '../types/diary';

const STORAGE_KEY = '@daily_story_entries';

export async function getAllEntries(): Promise<DiaryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as (Omit<DiaryEntry, 'tags'> & { tags?: string[] })[];
    return (Array.isArray(list) ? list : []).map(e => ({
      ...e,
      tags: e.tags ?? [],
    })) as DiaryEntry[];
  } catch {
    return [];
  }
}

export async function saveAllEntries(entries: DiaryEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getDateString(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getEntriesByDate(date: Date): Promise<DiaryEntry[]> {
  const dateStr = getDateString(date);
  const all = await getAllEntries();
  return all
    .filter(e => e.date === dateStr)
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** 같은 월·일(MM-DD)인 모든 연도 일기, 연도 내림차순(최신 먼저) */
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
    .sort((a, b) => {
      const yearA = parseInt(a.date.slice(0, 4), 10);
      const yearB = parseInt(b.date.slice(0, 4), 10);
      return yearB - yearA || a.createdAt - b.createdAt;
    });
}

export async function addEntry(entry: {
  date: string;
  text: string;
  imageUris: string[];
  tags?: string[];
}): Promise<DiaryEntry> {
  const all = await getAllEntries();
  const newEntry: DiaryEntry = {
    id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    date: entry.date,
    text: entry.text.trim(),
    imageUris: entry.imageUris ?? [],
    tags: entry.tags ?? [],
    createdAt: Date.now(),
  };
  all.push(newEntry);
  await saveAllEntries(all);
  return newEntry;
}

export async function getEntryById(id: string): Promise<DiaryEntry | null> {
  const all = await getAllEntries();
  return all.find(e => e.id === id) ?? null;
}

export async function updateEntry(
  id: string,
  updates: { text?: string; imageUris?: string[]; tags?: string[] },
): Promise<DiaryEntry | null> {
  const all = await getAllEntries();
  const idx = all.findIndex(e => e.id === id);
  if (idx === -1) return null;
  all[idx] = {
    ...all[idx],
    ...updates,
    text: updates.text !== undefined ? updates.text.trim() : all[idx].text,
    imageUris: updates.imageUris ?? all[idx].imageUris,
    tags: updates.tags ?? all[idx].tags,
  };
  await saveAllEntries(all);
  return all[idx];
}

export async function deleteEntry(id: string): Promise<boolean> {
  const all = await getAllEntries();
  const next = all.filter(e => e.id !== id);
  if (next.length === all.length) return false;
  await saveAllEntries(next);
  return true;
}

/** 태그가 하나 이상 포함된 일기 목록, 최신순 */
export async function getEntriesByTag(tag: string): Promise<DiaryEntry[]> {
  if (!tag.trim()) return [];
  const all = await getAllEntries();
  const lower = tag.trim().toLowerCase();
  return all
    .filter(e => e.tags.some(t => t.trim().toLowerCase() === lower))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** 일기에서 사용된 모든 태그 (중복 제거, 정렬) */
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
  /** 해당 연도에 일기를 쓴 날 수(유일한 날짜 개수) */
  daysWithEntries: number;
  /** 일기가 가장 많은 달 (1~12), 동점이면 최대 2개까지 [1월, 2월] 형식 */
  topMonths: number[];
  /** 월별 일기 건수 [1월, 2월, ..., 12월] */
  monthCounts: number[];
  /** 연도 내 가장 많이 달린 태그 순위 3위까지 (동점이면 같은 순위) */
  topTags: Array<{ tag: string; count: number; rank: number }>;
};

/** 특정 연도의 통계 */
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
  for (const [tag, count] of tagEntries) {
    if (topTags.length >= 3) break;
    if (count !== prevCount) rank += 1;
    topTags.push({ tag, count, rank });
    prevCount = count;
  }

  return {
    daysWithEntries: dateSet.size,
    topMonths,
    monthCounts,
    topTags,
  };
}
