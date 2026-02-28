import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getEntriesByDate, getDateString } from '../services/diaryStorage';
import type { DiaryEntry } from '../types/diary';
import { BookIcon } from '../components/icons/BookIcon';
import { GiftIcon } from '../components/icons/GiftIcon';

const PHOTO_GAP = 8;
const RECENT_DAYS = 4;

type Props = {
  onPressDiary: () => void;
  onPressCollection: () => void;
  onPressDate?: (date: Date) => void;
};

type WeekDay = {
  key: string;
  label: string;
  date: number;
  isToday: boolean;
};

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 (일) - 6 (토)
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function buildWeek(date: Date): WeekDay[] {
  const today = new Date();
  const start = getStartOfWeek(date);
  const labels = ['일', '월', '화', '수', '목', '금', '토'];

  return Array.from({ length: 7 }).map((_, index) => {
    const current = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + index,
    );

    const isToday =
      current.getFullYear() === today.getFullYear() &&
      current.getMonth() === today.getMonth() &&
      current.getDate() === today.getDate();

    return {
      key: `${current.toISOString()}`,
      label: labels[current.getDay()],
      date: current.getDate(),
      isToday,
    };
  });
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

export const MainScreen: React.FC<Props> = ({
  onPressDiary,
  onPressCollection,
  onPressDate,
}) => {
  const today = new Date();
  const week = buildWeek(today);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const cardContentWidth = screenWidth - 24 * 2 - 16 * 2;
  const photoSize = (cardContentWidth - PHOTO_GAP * 3) / 4;

  const [dateOrder, setDateOrder] = useState<string[]>([]);
  const [entriesByDate, setEntriesByDate] = useState<Record<string, DiaryEntry[]>>({});

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
        const next: Record<string, DiaryEntry[]> = {};
        for (const d of dates) {
          const key = getDateString(d);
          next[key] = await getEntriesByDate(d);
        }
        setEntriesByDate(next);
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
        <View style={styles.weekRow}>
          {week.map(item => (
            <View
              key={item.key}
              style={[
                styles.weekItem,
                item.isToday && styles.weekItemTodayContainer,
              ]}>
              <Text
                style={[
                  styles.weekDayLabel,
                  item.isToday && styles.weekItemTodayText,
                ]}>
                {item.label}
              </Text>
              <Text
                style={[
                  styles.weekDayNumber,
                  item.isToday && styles.weekItemTodayText,
                ]}>
                {item.date}
              </Text>
            </View>
          ))}
        </View>
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
            const dateEntries = entriesByDate[dateStr] ?? [];
            if (dateEntries.length === 0) return null;

            const [y, m, d] = dateStr.split('-').map(Number);
            const mergedText = [...dateEntries]
              .sort((a, b) => a.createdAt - b.createdAt)
              .map(e => (e.text ?? '').trim())
              .filter(t => t.length > 0)
              .join('\n');
            const allPhotos = dateEntries.flatMap(e => e.imageUris);

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
                            source={{ uri }}
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
    paddingHorizontal: 24,
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
  weekItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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

