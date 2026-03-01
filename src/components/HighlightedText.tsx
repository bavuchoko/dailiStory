import React from 'react';
import {
  Text,
  type StyleProp,
  type TextStyle,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';
import type { HighlightRange, StrikethroughRange } from '../types/diary';

type Props = {
  text: string;
  highlights?: HighlightRange[];
  strikethroughs?: StrikethroughRange[];
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  onTextLayout?: (e: NativeSyntheticEvent<TextLayoutEventData>) => void;
};

/**
 * 하이라이트 구간이 적용된 텍스트를 렌더링.
 * highlights는 start 오름차순으로 정렬된 비중첩 구간으로 처리.
 */
/** 구간 [start, end)가 [r.start, r.end)와 겹치는지 */
function overlaps(
  start: number,
  end: number,
  r: { start: number; end: number },
): boolean {
  return start < r.end && end > r.start;
}

export const HighlightedText: React.FC<Props> = ({
  text,
  highlights = [],
  strikethroughs = [],
  style,
  numberOfLines,
  ellipsizeMode,
  onTextLayout,
}) => {
  const len = text.length;
  if (len === 0) {
    return <Text style={style}> </Text>;
  }

  const sortedHighlights = [...highlights]
    .filter(h => h.start < h.end && h.end > 0 && h.start < len)
    .map(h => ({
      start: Math.max(0, h.start),
      end: Math.min(len, h.end),
      color: h.color,
    }))
    .sort((a, b) => a.start - b.start);

  const sortedStrike = [...strikethroughs]
    .filter(s => s.start < s.end && s.end > 0 && s.start < len)
    .map(s => ({
      start: Math.max(0, s.start),
      end: Math.min(len, s.end),
    }))
    .sort((a, b) => a.start - b.start);

  const breakpoints = new Set<number>([0, len]);
  for (const h of sortedHighlights) {
    breakpoints.add(h.start);
    breakpoints.add(h.end);
  }
  for (const s of sortedStrike) {
    breakpoints.add(s.start);
    breakpoints.add(s.end);
  }
  const points = Array.from(breakpoints).sort((a, b) => a - b);

  const segments: { start: number; end: number; color?: string; strike?: boolean }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    if (start >= end) continue;
    const color = sortedHighlights.find(h => overlaps(start, end, h))?.color;
    const strike = sortedStrike.some(s => overlaps(start, end, s));
    segments.push({ start, end, color, strike });
  }
  if (segments.length === 0) {
    segments.push({ start: 0, end: len });
  }

  return (
    <Text
      style={style}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      onTextLayout={onTextLayout}>
      {segments.map((seg, i) => {
        const slice = text.slice(seg.start, seg.end);
        const segStyle = [
          style,
          seg.color ? { backgroundColor: seg.color } : null,
          seg.strike ? { textDecorationLine: 'line-through' as const } : null,
        ].filter(Boolean);
        return (
          <Text key={i} style={segStyle}>
            {slice}
          </Text>
        );
      })}
    </Text>
  );
};
