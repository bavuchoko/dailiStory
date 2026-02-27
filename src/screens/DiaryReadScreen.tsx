import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeatherIcon from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'DiaryRead'>;

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdayLabels[date.getDay()];
  return `${year}년 ${month}월 ${day}일 (${weekday})`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

function addYears(date: Date, amount: number) {
  const next = new Date(date);
  next.setFullYear(date.getFullYear() + amount);
  return next;
}

export const DiaryReadScreen: React.FC<Props> = ({ route, navigation }) => {
  const initialDate = useMemo(
    () => (route.params?.date ? new Date(route.params.date) : new Date()),
    [route.params?.date],
  );
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef(false);

  const runSlideTransition = (
    direction: 'up' | 'down' | 'left' | 'right',
    updateDate: () => void,
  ) => {
    if (isAnimatingRef.current) {
      return;
    }

    const { width, height } = Dimensions.get('window');
    let outX = 0;
    let outY = 0;
    let inX = 0;
    let inY = 0;

    switch (direction) {
      case 'up':
        outY = -height;
        inY = height;
        break;
      case 'down':
        outY = height;
        inY = -height;
        break;
      case 'left':
        outX = -width;
        inX = width;
        break;
      case 'right':
        outX = width;
        inX = -width;
        break;
      default:
        break;
    }

    const activeValue =
      direction === 'left' || direction === 'right' ? translateX : translateY;

    isAnimatingRef.current = true;

    Animated.timing(activeValue, {
      toValue: direction === 'left' || direction === 'right' ? outX : outY,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      updateDate();

      translateX.setValue(
        direction === 'left' || direction === 'right' ? inX : 0,
      );
      translateY.setValue(
        direction === 'up' || direction === 'down' ? inY : 0,
      );

      Animated.timing(activeValue, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        isAnimatingRef.current = false;
      });
    });
  };

  const handleSwipeRelease = (
    _evt: GestureResponderEvent,
    gestureState: PanResponderGestureState,
  ) => {
    const { dx, dy } = gestureState;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < 30 && absDy < 30) {
      return;
    }

    if (absDy > absDx) {
      if (dy < 0) {
        runSlideTransition('up', () =>
          setCurrentDate(prev => addDays(prev, 1)),
        );
      } else {
        runSlideTransition('down', () =>
          setCurrentDate(prev => addDays(prev, -1)),
        );
      }
    } else {
      if (dx < 0) {
        runSlideTransition('left', () =>
          setCurrentDate(prev => addYears(prev, 1)),
        );
      } else {
        runSlideTransition('right', () =>
          setCurrentDate(prev => addYears(prev, -1)),
        );
      }
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10,
      onPanResponderRelease: handleSwipeRelease,
    }),
  ).current;

  const handlePressToday = () => {
    setCurrentDate(new Date());
  };

  const handleOpenCalendar = () => {
    navigation.navigate('YearCalendar', {
      date: currentDate.toISOString(),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container} {...panResponder.panHandlers}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleOpenCalendar}
            style={styles.topBarLeft}>
            <FeatherIcon name="calendar" size={22} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePressToday} style={styles.todayButton}>
            <Text style={styles.topBarToday}>오늘</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>{formatDate(currentDate)}</Text>
        </View>

        <View style={styles.bodyWrapper}>
          <Animated.View
            style={{
              flex: 1,
              transform: [
                { translateX: translateX },
                { translateY: translateY },
              ],
            }}>
            <View style={styles.content}>
              <Text style={styles.diaryPlaceholder}>
                해당 날짜의 일기가 없습니다.
              </Text>
              <Text style={styles.helperText}>
                위/아래로 스와이프하면 하루씩, 좌/우로 스와이프하면 1년씩 이동합니다.
              </Text>
            </View>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: '#F9FAFB',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  topBarLeft: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  topBarToday: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  todayButton: {
    marginLeft: 8,
  },
  dateHeader: {
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    height: 180,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  dateHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  content: {
    flex: 1,
    marginTop: 0,
    marginHorizontal: 0,
    backgroundColor: '#FFFFFF',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  bodyWrapper: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  diaryPlaceholder: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 12,
  },
  helperText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});

