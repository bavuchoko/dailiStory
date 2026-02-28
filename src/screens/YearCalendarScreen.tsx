import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'YearCalendar'>;

const months = Array.from({ length: 12 }).map((_, index) => ({
  key: `${index + 1}`,
  month: index + 1,
}));

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
  baseDate?: Date,
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
      !!baseDate &&
      date.getFullYear() === baseDate.getFullYear() &&
      date.getMonth() === baseDate.getMonth() &&
      date.getDate() === baseDate.getDate();
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

export const YearCalendarScreen: React.FC<Props> = ({ route, navigation }) => {
  const baseDate = useMemo(() => new Date(route.params.date), [route.params.date]);
  const [year, setYear] = useState<number>(baseDate.getFullYear());
  const selectedMonth = baseDate.getMonth() + 1;

  const handleSwipeRelease = (
    _evt: GestureResponderEvent,
    gestureState: PanResponderGestureState,
  ) => {
    const { dx, dy } = gestureState;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDy < 30 || absDy <= absDx) {
      return;
    }

    if (dy < 0) {
      setYear(prev => prev + 1);
    } else {
      setYear(prev => prev - 1);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dy) > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderRelease: handleSwipeRelease,
    }),
  ).current;

  const handlePressMonth = (month: number) => {
    navigation.navigate('MonthCalendar', {
      year,
      month,
      date: baseDate.toISOString(),
      returnTo: route.params.returnTo,
    });
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Text style={styles.yearText}>{year}년</Text>

      <FlatList
        data={months}
        numColumns={3}
        scrollEnabled={false}
        contentContainerStyle={styles.grid}
        keyExtractor={item => item.key}
        renderItem={({ item }) => {
          const grid = buildMonthGrid(year, item.month, baseDate);
          const isSelectedMonth = item.month === selectedMonth;
          const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

          return (
            <TouchableOpacity
              style={styles.monthItem}
              onPress={() => handlePressMonth(item.month)}>
              <Text
                style={[
                  styles.monthTitle,
                  isSelectedMonth && styles.monthTitleSelected,
                ]}>
                {item.month}월
              </Text>

              <View style={styles.weekdayRow}>
                {weekdayLabels.map(label => (
                  <Text key={label} style={styles.weekdayText}>
                    {label}
                  </Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {grid.map(cell => {
                  if (!cell.day) {
                    return <View key={cell.key} style={styles.dayCellEmpty} />;
                  }

                  return (
                    <View key={cell.key} style={styles.dayCell}>
                      <Text
                        style={[
                          styles.dayText,
                          cell.isToday && styles.dayTextToday,
                          cell.isSelected && styles.dayTextSelected,
                        ]}>
                        {cell.day}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </TouchableOpacity>
          );
        }}
      />
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
  yearText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 16,
  },
  grid: {
    paddingTop: 8,
  },
  monthItem: {
    flex: 1,
    margin: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  monthTitleSelected: {
    color: '#DC2626',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    color: '#9CA3AF',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: `${100 / 7}%`,
    paddingVertical: 2,
  },
  dayCell: {
    width: `${100 / 7}%`,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 9,
    color: '#111827',
  },
  dayTextToday: {
    color: '#0EA5E9',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#0EA5E9',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

