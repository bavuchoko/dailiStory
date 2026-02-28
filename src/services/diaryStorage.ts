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
