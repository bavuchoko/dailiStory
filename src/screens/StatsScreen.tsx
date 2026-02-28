import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { TabScreenLayout } from '../components/TabScreenLayout';
import { getYearStats, type YearStats } from '../services/diaryStorage';

const MONTH_NAMES = [
  '', '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

const PIE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#A855F7',
];

const PIE_SIZE = 100;
const PIE_R = 44;

function buildPiePaths(monthCounts: number[]): { path: string; color: string; month: number }[] {
  const total = monthCounts.reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  const segments: { path: string; color: string; month: number }[] = [];
  const cx = PIE_SIZE / 2;
  const cy = PIE_SIZE / 2;
  let startAngle = -Math.PI / 2;
  for (let m = 0; m < 12; m++) {
    const count = monthCounts[m] ?? 0;
    if (count === 0) continue;
    let angle = (count / total) * 2 * Math.PI;
    if (angle >= 2 * Math.PI - 0.001) angle = 2 * Math.PI - 0.001;
    const endAngle = startAngle + angle;
    const x1 = cx + PIE_R * Math.cos(startAngle);
    const y1 = cy + PIE_R * Math.sin(startAngle);
    const x2 = cx + PIE_R * Math.cos(endAngle);
    const y2 = cy + PIE_R * Math.sin(endAngle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${PIE_R} ${PIE_R} 0 ${large} 1 ${x2} ${y2} Z`;
    segments.push({ path, color: PIE_COLORS[m], month: m + 1 });
    startAngle = endAngle;
  }
  return segments;
}

export const StatsScreen: React.FC = () => {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [stats, setStats] = useState<YearStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getYearStats(year)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [year]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <TabScreenLayout>
      <View style={styles.yearRow}>
        <TouchableOpacity
          style={styles.yearBtn}
          onPress={() => setYear(y => y - 1)}>
          <Text style={styles.yearBtnText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.yearText}>{year}년</Text>
        <TouchableOpacity
          style={styles.yearBtn}
          onPress={() => setYear(y => y + 1)}>
          <Text style={styles.yearBtnText}>▶</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : stats ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>일기 쓴 날</Text>
            <Text style={styles.cardValue}>
              {stats.daysWithEntries}
              <Text style={styles.cardUnit}>일</Text>
            </Text>
            <Text style={styles.cardHint}>한 해 동안 일기를 쓴 날짜</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.monthRow}>
              <View style={styles.monthLeft}>
                <Text style={styles.cardLabel2}>가장 일기가 많은 달</Text>
                <View style={styles.monthValueRow}>
                  <Text style={styles.monthValue}>
                    {stats.topMonths.length > 0
                      ? stats.topMonths.map(m => MONTH_NAMES[m]).join(', ')
                      : '-'}
                  </Text>
                  {stats.topMonths.length > 0 ? (
                    <Text style={styles.monthCount}>
                      ({stats.monthCounts[stats.topMonths[0] - 1] ?? 0}건)
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.monthHint}>
                  {stats.topMonths.length > 0
                    ? '한 해 동안 일기를 가장 많은 쓴 달'
                    : '일기가 없습니다'}
                </Text>
              </View>
              {(() => {
                const segments = buildPiePaths(stats.monthCounts);
                if (segments.length === 0) return null;
                return (
                  <View style={styles.pieChartWrap}>
                    <Svg width={PIE_SIZE} height={PIE_SIZE} viewBox={`0 0 ${PIE_SIZE} ${PIE_SIZE}`}>
                      {segments.map((s, i) => (
                        <Path key={i} d={s.path} fill={s.color} />
                      ))}
                    </Svg>
                  </View>
                );
              })()}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>가장 많이 사용한 태그 TOP 3</Text>
            <View style={styles.rankList}>
              {stats.topTags.length === 0 ? (
                <Text style={styles.rankEmpty}>태그가 없습니다</Text>
              ) : (
                stats.topTags.map((item, i) => (
                  <View key={i} style={styles.rankRow}>
                    <Text style={styles.rankNum}>{item.rank}위</Text>
                    <Text style={styles.rankTag} numberOfLines={1}>
                      {item.tag}
                    </Text>
                    <Text style={styles.rankCount}>{item.count}건</Text>
                  </View>
                ))
              )}
            </View>
            <Text style={styles.cardHint}>한 해 일기에 달린 태그 순위</Text>
          </View>
        </ScrollView>
      ) : null}
    </TabScreenLayout>
  );
};

const styles = StyleSheet.create({
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 20,
  },
  yearBtn: {
    padding: 12,
  },
  yearBtnText: {
    fontSize: 18,
    color: '#6B7280',
  },
  yearText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    minWidth: 64,
    textAlign: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
  },
  cardLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  cardLabel2: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 14,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  monthLeft: {
    flexShrink: 1,
  },
  pieChartWrap: {
    width: PIE_SIZE,
    height: PIE_SIZE,
    flexShrink: 0,
  },
  monthValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  monthValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  monthCount: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  monthHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 18,
  },
  cardUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  cardHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  rankList: {
    marginTop: 4,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  rankNum: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    width: 32,
  },
  rankTag: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  rankCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  rankEmpty: {
    fontSize: 15,
    color: '#9CA3AF',
    paddingVertical: 12,
  },
});
