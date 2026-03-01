/** 본문 폰트 크기 (미지정 시 16) */
export const DEFAULT_FONT_SIZE = 16;

export const FONT_SIZE_OPTIONS = [14, 16, 18, 20, 22] as const;
export type FontSizeOption = (typeof FONT_SIZE_OPTIONS)[number];

export type DiaryEntry = {
  id: string;
  date: string;
  text: string;
  imageUris: string[];
  tags: string[];
  createdAt: number;
  /** 본문 폰트 크기 (선택, 기본 16) */
  fontSize?: number;
};
