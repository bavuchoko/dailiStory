import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { HomeStackParamList } from '../navigation/types';
import { TabScreenLayout } from '../components/TabScreenLayout';
import { CalendarWeekIcon } from '../components/icons/CalendarWeekIcon';
import { getEntriesByMonthDay } from '../services/diaryStorage';
import type { DiaryEntry } from '../types/diary';

type Props = NativeStackScreenProps<HomeStackParamList, 'Collection'>;

/** 일기 목록을 날짜(YYYY-MM-DD) 기준으로 그룹 */
function groupEntriesByDate(entries: DiaryEntry[]): Map<string, DiaryEntry[]> {
  const map = new Map<string, DiaryEntry[]>();
  for (const e of entries) {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  }
  return map;
}

/** 오늘(월·일)에 해당하는 연도별 날짜 문자열 목록. 최신 연도 먼저, 최근 10년 */
function getYearDatesForMonthDay(
  month: number,
  day: number,
  baseYear: number,
): string[] {
  const mm = `${month}`.padStart(2, '0');
  const dd = `${day}`.padStart(2, '0');
  const result: string[] = [];
  for (let y = baseYear; y >= baseYear - 9; y--) {
    const dt = new Date(y, month - 1, day);
    // 2/29 같은 경우, 존재하지 않는 연도는 제외
    if (dt.getFullYear() === y && dt.getMonth() === month - 1 && dt.getDate() === day) {
      result.push(`${y}-${mm}-${dd}`);
    }
  }
  return result;
}

function formatSectionHeader(dateStr: string): string {
  const [y] = dateStr.split('-').map(Number);
  const shortYear = y % 100;
  return `${shortYear}년`;
}

function dateStrToIso(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toISOString();
}

function formatEntryTime(createdAt: number): string {
  const d = new Date(createdAt);
  const h = `${d.getHours()}`.padStart(2, '0');
  const m = `${d.getMinutes()}`.padStart(2, '0');
  return `${h}:${m}`;
}

const PHOTO_GAP = 8;
/** TabScreenLayout paddingHorizontal 24*2 + card padding 16*2 */
const HORIZONTAL_INSET = 24 * 2 + 16 * 2;

export const CollectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { width: screenWidth } = useWindowDimensions();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const visibleWidth = screenWidth - HORIZONTAL_INSET;
  const photoSize = (visibleWidth - PHOTO_GAP * 3) / 4;

  useFocusEffect(
    useCallback(() => {
      getEntriesByMonthDay(month, day).then(setEntries);
    }, [month, day]),
  );

  useFocusEffect(
    useCallback(() => {
      // 달력에서 돌아올 때 선택 날짜 반영
      if (route.params?.date) {
        setCurrentDate(new Date(route.params.date));
      }
    }, [route.params?.date]),
  );

  const grouped = groupEntriesByDate(entries);
  const yearDates = getYearDatesForMonthDay(month, day, currentDate.getFullYear());

  const handleOpenCalendar = () => {
    navigation.navigate('YearCalendar', {
      date: currentDate.toISOString(),
      returnTo: 'Collection',
    });
  };

  const handlePressToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <TabScreenLayout>
      <View style={styles.headerRow}>
        <Text style={styles.todayHeader}>
          {month}월 {day}일
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handlePressToday}
            style={styles.headerTodayBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.headerTodayText}>오늘</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOpenCalendar}
            style={styles.headerCalendarBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <CalendarWeekIcon size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {yearDates.map(dateStr => {
          const dateEntries = grouped.get(dateStr) ?? [];
          const allPhotos = dateEntries.flatMap(e => e.imageUris);
          const mergedText = [...dateEntries]
            .sort((a, b) => a.createdAt - b.createdAt)
            .map(e => (e.text ?? '').trim())
            .filter(t => t.length > 0)
            .join('\n');
          return (
            <View key={dateStr} style={styles.section}>
              <Text style={styles.sectionHeader}>
                {formatSectionHeader(dateStr)}
              </Text>
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate('DiaryRead', { date: dateStrToIso(dateStr) })
                }>
                {dateEntries.length === 0 ? (
                  <View style={styles.emptySection}>
                    <Text style={styles.empty}>이 날짜의 일기가 없습니다.</Text>
                  </View>
                ) : (
                  <>
                    <Text
                      style={styles.mergedBody}
                      numberOfLines={5}
                      ellipsizeMode="tail">
                      {mergedText || ' '}
                    </Text>
                    {allPhotos.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.photoScroll}
                        contentContainerStyle={styles.photoScrollContent}>
                        {allPhotos.map((uri, i) => (
                          <Image
                            key={`${uri}-${i}`}
                            source={{ uri }}
                            style={[
                              styles.photoThumb,
                              {
                                width: photoSize,
                                height: photoSize,
                                marginRight: i < allPhotos.length - 1 ? PHOTO_GAP : 0,
                              },
                            ]}
                            resizeMode="cover"
                          />
                        ))}
                      </ScrollView>
                    )}
                    <TouchableOpacity style={styles.shareRow}>
                      <Text style={styles.shareText}>공유</Text>
                    </TouchableOpacity>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </TabScreenLayout>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayHeader: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  headerTodayBtn: {
    marginRight: 8,
  },
  headerTodayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  headerCalendarBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  emptySection: {
    paddingVertical: 12,
    paddingLeft: 4,
  },
  empty: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  photoScroll: {
    marginBottom: 16,
  },
  photoScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoThumb: {
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  mergedBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#111827',
    marginBottom: 16,
  },
  shareRow: {
    alignSelf: 'flex-start',
  },
  shareText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
