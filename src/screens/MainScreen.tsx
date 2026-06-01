import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  PixelRatio,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getEntryByDate, getDateString } from '../services/diaryStorage';
import { getDisplayUri } from '../services/imageStorage';
import type { DiaryEntry } from '../types/diary';
import { BookIcon } from '../components/icons/BookIcon';
import { GiftIcon } from '../components/icons/GiftIcon';

const PHOTO_GAP = 8;
const RECENT_DAYS = 4;
const SCREEN_HORIZONTAL_PADDING = 24;
const CALENDAR_WEEKS_BEFORE = 52;
const CALENDAR_WEEKS_AFTER = 52;
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const VISIBLE_DAY_COUNT = 7;
const MONTH_LABEL_LINE_HEIGHT = 14;

type Props = {
  onPressDiary: () => void;
  onPressCollection: () => void;
  onPressDate?: (date: Date) => void;
};

type CalendarDay = {
  key: string;
  label: string;
  date: number;
  weekday: number;
  fullDate: Date;
  isToday: boolean;
  showMonthLabel: boolean;
  monthLabel: string;
};

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const weekday = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - weekday);
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildDay(date: Date, today: Date): CalendarDay {
  const weekday = date.getDay();
  return {
    key: getDateString(date),
    label: WEEKDAY_LABELS[weekday],
    date: date.getDate(),
    weekday,
    fullDate: date,
    isToday: isSameCalendarDay(date, today),
  };
}

function isDayBeforeLastDayOfMonth(date: Date): boolean {
  const tomorrow = addDays(date, 1);
  const dayAfterTomorrow = addDays(date, 2);
  return (
    tomorrow.getMonth() === date.getMonth() &&
    dayAfterTomorrow.getMonth() !== date.getMonth()
  );
}

function isDifferentMonth(a: Date, b: Date): boolean {
  return a.getMonth() !== b.getMonth() || a.getFullYear() !== b.getFullYear();
}

function shouldShowMonthLabel(
  date: Date,
  prevCalendarDay: Date | null,
): boolean {
  if (!prevCalendarDay) return true;
  if (isDifferentMonth(prevCalendarDay, date)) return true;
  return isDayBeforeLastDayOfMonth(date);
}

function buildCalendarDays(anchor: Date): CalendarDay[] {
  const today = new Date();
  const anchorWeekStart = getStartOfWeek(anchor);
  const firstWeekStart = addDays(anchorWeekStart, -CALENDAR_WEEKS_BEFORE * 7);
  const totalWeeks = CALENDAR_WEEKS_BEFORE + CALENDAR_WEEKS_AFTER + 1;
  const result: CalendarDay[] = [];
  let prevCalendarDay: Date | null = null;

  for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex += 1) {
    const weekStart = addDays(firstWeekStart, weekIndex * 7);
    const weekDates = Array.from({ length: 7 }, (_, dayIndex) =>
      addDays(weekStart, dayIndex),
    );

    for (let dayIndex = 0; dayIndex < weekDates.length; dayIndex += 1) {
      const date = weekDates[dayIndex];
      const base = buildDay(date, today);
      const showMonthLabel = shouldShowMonthLabel(date, prevCalendarDay);

      result.push({
        ...base,
        showMonthLabel,
        monthLabel: `${date.getMonth() + 1}월`,
      });

      prevCalendarDay = date;
    }
  }

  return result;
}

export const MainScreen: React.FC<Props> = ({
  onPressDiary,
  onPressCollection,
  onPressDate,
}) => {
  const today = useMemo(() => new Date(), []);
  const calendarDays = useMemo(() => buildCalendarDays(today), [today]);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const cardContentWidth = screenWidth - SCREEN_HORIZONTAL_PADDING * 2 - 16 * 2;
  const photoSize = (cardContentWidth - PHOTO_GAP * 3) / 4;
  const calendarWidth = screenWidth - SCREEN_HORIZONTAL_PADDING * 2;
  const dayItemWidth = PixelRatio.roundToNearestPixel(
    calendarWidth / VISIBLE_DAY_COUNT,
  );
  const daySnapOffsets = useMemo(
    () => calendarDays.map((_, index) => index * dayItemWidth),
    [calendarDays, dayItemWidth],
  );
  const calendarScrollRef = useRef<ScrollView>(null);
  const didInitialScroll = useRef(false);
  const todayDayIndex = useMemo(
    () => calendarDays.findIndex(d => d.key === getDateString(today)),
    [calendarDays, today],
  );

  const [dateOrder, setDateOrder] = useState<string[]>([]);
  const [entryByDate, setEntryByDate] = useState<Record<string, DiaryEntry | null>>({});

  const snapToNearestDay = useCallback(
    (offsetX: number, animated: boolean) => {
      const maxOffset = Math.max(0, (calendarDays.length - 1) * dayItemWidth);
      const index = Math.min(
        calendarDays.length - 1,
        Math.max(0, Math.round(offsetX / dayItemWidth)),
      );
      const targetX = Math.min(maxOffset, index * dayItemWidth);
      if (Math.abs(offsetX - targetX) > 0.5) {
        calendarScrollRef.current?.scrollTo({ x: targetX, animated });
      }
    },
    [calendarDays.length, dayItemWidth],
  );

  useLayoutEffect(() => {
    if (didInitialScroll.current || todayDayIndex < 0) return;
    const weekStartIndex = Math.floor(todayDayIndex / 7) * 7;
    calendarScrollRef.current?.scrollTo({
      x: weekStartIndex * dayItemWidth,
      animated: false,
    });
    didInitialScroll.current = true;
  }, [dayItemWidth, todayDayIndex]);

  useFocusEffect(
    useCallback(() => {
      const now = new Date();
      // 최근일기: 어제부터 4일치(어제~4일 전)
      const dates = Array.from({ length: RECENT_DAYS }, (_, i) =>
        addDays(now, -(i + 1)),
      );
      const order = dates.map(d => getDateString(d));
      setDateOrder(order);
      const load = async () => {
        const next: Record<string, DiaryEntry | null> = {};
        for (const d of dates) {
          const key = getDateString(d);
          next[key] = await getEntryByDate(d);
        }
        setEntryByDate(next);
      };
      load();
    }, []),
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop:
            insets.top + (Platform.OS === 'android' ? 24 : 8),
        },
      ]}>
      <Text style={styles.titleText}>Daily Story</Text>
      <View style={styles.weekContainer}>
        <ScrollView
          ref={calendarScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToOffsets={daySnapOffsets}
          snapToAlignment="start"
          disableIntervalMomentum
          onScrollEndDrag={e => {
            const velocityX = e.nativeEvent.velocity?.x ?? 0;
            if (Math.abs(velocityX) < 0.15) {
              snapToNearestDay(e.nativeEvent.contentOffset.x, true);
            }
          }}
          onMomentumScrollEnd={e =>
            snapToNearestDay(e.nativeEvent.contentOffset.x, true)
          }
          style={styles.weekScroll}
          contentContainerStyle={styles.weekScrollContent}>
          {calendarDays.map(item => {
            const dayTextStyle = item.isToday
              ? styles.weekItemTodayText
              : item.weekday === 0
                ? styles.weekDaySunday
                : item.weekday === 6
                  ? styles.weekDaySaturday
                  : null;

            return (
              <View key={item.key} style={[styles.weekColumn, { width: dayItemWidth }]}>
                {item.showMonthLabel ? (
                  <Text style={styles.weekMonthLabel}>{item.monthLabel}</Text>
                ) : (
                  <View style={styles.weekMonthPlaceholder} />
                )}
                <TouchableOpacity
                  onPress={() => onPressDate?.(item.fullDate)}
                  style={[
                    styles.weekItem,
                    item.isToday && styles.weekItemTodayContainer,
                  ]}
                  accessibilityLabel={`${item.label} ${item.date}일`}>
                  <Text style={[styles.weekDayLabel, dayTextStyle]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.weekDayNumber, dayTextStyle]}>
                    {item.date}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.cardRow}>
        <TouchableOpacity style={styles.card} onPress={onPressDiary}>
          <View style={styles.cardIconWrap}>
            <BookIcon size={70} color="#46484d" />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>일기장</Text>
            <Text style={styles.cardSubtitle}>오늘의 일기를 확인해요</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={onPressCollection}>
          <View style={styles.cardIconWrap}>
            <GiftIcon size={70} color="#46484d" />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>모아보기</Text>
            <Text style={styles.cardSubtitle}>지난 일기를 모아봐요</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.recentSectionTitle}>최근 일기</Text>
        <ScrollView
          style={styles.recentScroll}
          contentContainerStyle={styles.recentScrollContent}
          showsVerticalScrollIndicator={false}>
          {dateOrder.map(dateStr => {
            const dayEntry = entryByDate[dateStr];
            if (!dayEntry) return null;

            const [y, m, d] = dateStr.split('-').map(Number);
            const mergedText = (dayEntry.text ?? '').trim();
            const allPhotos = dayEntry.imageUris;

            return (
              <View key={dateStr} style={styles.recentDaySection}>
                <Text style={styles.recentDayHeader}>
                  {m}월 {d}일
                </Text>
                <TouchableOpacity
                  style={styles.recentCard}
                  activeOpacity={0.9}
                  onPress={() => onPressDate?.(new Date(y, m - 1, d))}>
                  <>
                    <Text
                      style={styles.recentMergedBody}
                      numberOfLines={3}
                      ellipsizeMode="tail">
                      {mergedText || ' '}
                    </Text>
                    {allPhotos.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.recentPhotoScroll}
                        contentContainerStyle={styles.recentPhotoScrollContent}>
                        {allPhotos.map((uri, i) => (
                          <Image
                            key={`${uri}-${i}`}
                            source={{ uri: getDisplayUri(uri) }}
                            style={[
                              styles.recentPhotoThumb,
                              {
                                width: photoSize,
                                height: photoSize,
                                marginRight:
                                  i < allPhotos.length - 1 ? PHOTO_GAP : 0,
                              },
                            ]}
                            resizeMode="cover"
                          />
                        ))}
                      </ScrollView>
                    )}
                  </>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
  },
  titleText: {
    fontSize: 32,
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
    alignSelf: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Pacifico' : 'Pacifico-Regular',
  },
  weekContainer: {
    marginBottom: 32,
  },
  weekScroll: {
    width: '100%',
  },
  weekScrollContent: {
    alignItems: 'flex-start',
  },
  weekColumn: {
    alignItems: 'center',
  },
  weekItem: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 8,
    minWidth: 36,
  },
  weekMonthLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    lineHeight: MONTH_LABEL_LINE_HEIGHT,
    marginBottom: 2,
  },
  weekMonthPlaceholder: {
    height: MONTH_LABEL_LINE_HEIGHT,
    marginBottom: 2,
  },
  weekItemTodayContainer: {
    backgroundColor: '#111827',
  },
  weekItemTodayText: {
    color: 'white',
    fontWeight: '600',
  },
  weekDayLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  weekDayNumber: {
    fontSize: 16,
    color: '#111827',
  },
  weekDaySunday: {
    color: '#DC2626',
  },
  weekDaySaturday: {
    color: '#2563EB',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 20,
    height: 250,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  cardIconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#46484d',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  recentSection: {
    flex: 1,
    marginTop: 24,
  },
  recentSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  recentScroll: {
    flex: 1,
  },
  recentScrollContent: {
    paddingBottom: 24,
  },
  recentDaySection: {
    marginBottom: 20,
  },
  recentDayHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  recentEmpty: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  recentMergedBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#111827',
    marginBottom: 16,
  },
  recentPhotoScroll: {
    marginBottom: 0,
  },
  recentPhotoScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentPhotoThumb: {
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
});

