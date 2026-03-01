/** 본문 폰트 크기 (미지정 시 16) */
export const DEFAULT_FONT_SIZE = 16;

export const FONT_SIZE_OPTIONS = [14, 16, 18, 20, 22] as const;
export type FontSizeOption = (typeof FONT_SIZE_OPTIONS)[number];

/** 형광펜 하이라이트 구간 (문자 오프셋) */
export type HighlightRange = {
  start: number;
  end: number;
  color: string;
};

/** 취소선 구간 (문자 오프셋) */
export type StrikethroughRange = {
  start: number;
  end: number;
};

/** 형광펜 기본 색 (노란 형광펜) */
export const DEFAULT_HIGHLIGHT_COLOR = '#fff59d';

/** 형광펜 색상 선택 옵션 (초록, 파랑, 분홍, 보라, 노랑) */
export const HIGHLIGHT_COLOR_OPTIONS = [
  { color: '#a8e6cf' }, // 연두
  { color: '#a0d8ef' }, // 하늘
  { color: '#ffccbc' }, // 연분홍
  { color: '#e1bee7' }, // 연보라
  { color: '#fff59d' }, // 노랑
] as const;

export type DiaryEntry = {
  id: string;
  date: string;
  text: string;
  imageUris: string[];
  tags: string[];
  createdAt: number;
  /** 본문 폰트 크기 (선택, 기본 16) */
  fontSize?: number;
  /** 형광펜 하이라이트 구간 목록 */
  highlights?: HighlightRange[];
  /** 취소선 구간 목록 */
  strikethroughs?: StrikethroughRange[];
};
