export type HomeStackParamList = {
  Splash: undefined;
  Main: undefined;
  Collection: {
    date?: string;
  } | undefined;
  DiaryRead: {
    date?: string;
  } | undefined;
  YearCalendar: {
    date: string;
    returnTo?: 'DiaryRead' | 'Collection';
  };
  MonthCalendar: {
    year: number;
    month: number;
    date?: string;
    returnTo?: 'DiaryRead' | 'Collection';
  };
};

export type RootStackParamList = {
  Tabs: undefined;
  DiaryWrite: { date?: string; entryId?: string } | undefined;
};

export type TabParamList = {
  ReminderTab: undefined;
  SearchTab: undefined;
  HomeTab: undefined;
  StatsTab: undefined;
  BackupTab: undefined;
};

