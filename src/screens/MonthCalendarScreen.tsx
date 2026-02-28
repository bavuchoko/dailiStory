import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'MonthCalendar'>;

type DayCell = {
  key: string;
  day: number | null;
  isToday: boolean;
  isSelected: boolean;
  weekday: number | null;
};

function buildMonthGrid(
  year: number,
  month: number,
  selectedDate?: Date,
): DayCell[] {
  const firstDay = new Date(year, month - 1, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const today = new Date();

  const cells: DayCell[] = [];

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({
      key: `empty-${i}`,
      day: null,
      isToday: false,
      isSelected: false,
      weekday: null,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    const isSelected =
      !!selectedDate &&
      date.getFullYear() === selectedDate.getFullYear() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getDate() === selectedDate.getDate();
    const weekday = date.getDay();

    cells.push({
      key: `day-${day}`,
      day,
      isToday,
      isSelected,
      weekday,
    });
  }

  return cells;
}

export const MonthCalendarScreen: React.FC<Props> = ({
  route,
  navigation,
}) => {
  const { year, month, date, returnTo } = route.params;
  const selectedDate = date ? new Date(date) : undefined;

  const grid = useMemo(
    () => buildMonthGrid(year, month, selectedDate),
    [year, month, date],
  );

  const handlePressDay = (day: number | null) => {
    if (!day) {
      return;
    }

    const selected = new Date(year, month - 1, day);
    if (returnTo === 'Collection') {
      navigation.navigate('Collection', { date: selected.toISOString() });
      return;
    }

    navigation.navigate('DiaryRead', { date: selected.toISOString() });
  };

  const labels = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {year}년 {month}월
      </Text>

      <View style={styles.weekHeaderRow}>
        {labels.map(label => (
          <Text key={label} style={styles.weekHeaderText}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map(cell => {
          if (!cell.day) {
            return <View key={cell.key} style={styles.dayCellEmpty} />;
          }

          return (
            <TouchableOpacity
              key={cell.key}
              style={styles.dayCell}
              onPress={() => handlePressDay(cell.day)}>
              <View
                style={[
                  styles.dayCircle,
                  cell.isToday && styles.dayCircleToday,
                  cell.isSelected && styles.dayCircleSelected,
                ]}>
                <Text
                  style={[
                    styles.dayText,
                    cell.weekday === 0 && styles.dayTextSunday,
                    cell.weekday === 6 && styles.dayTextSaturday,
                    cell.isToday && styles.dayTextToday,
                    cell.isSelected && styles.dayTextSelected,
                  ]}>
                  {cell.day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: '#6B7280',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  dayCellEmpty: {
    width: `${100 / 7}%`,
    paddingVertical: 12,
  },
  dayCell: {
    width: `${100 / 7}%`,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: {
    backgroundColor: '#E0F2FE', // 오늘: 하늘색 배경
  },
  dayText: {
    fontSize: 14,
    color: '#111827',
  },
  dayTextSunday: {
    color: '#DC2626',
  },
  dayTextSaturday: {
    color: '#2563EB',
  },
  dayTextToday: {
    color: '#0F172A',
    fontWeight: '600',
  },
  dayCircleSelected: {
    backgroundColor: '#0EA5E9', // 현재 보고 있는 날짜: 진한 파란색
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

