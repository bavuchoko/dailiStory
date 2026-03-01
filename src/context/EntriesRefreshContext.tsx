import React, { createContext, useCallback, useContext, useState } from 'react';

type EntriesRefreshContextValue = {
  /** 변경 시 일기 목록을 다시 불러야 함 (백업 복원 등) */
  entriesVersion: number;
  /** 복원 등으로 데이터가 바뀌었을 때 호출 */
  bumpEntriesVersion: () => void;
};

const EntriesRefreshContext = createContext<EntriesRefreshContextValue | null>(null);

export function EntriesRefreshProvider({ children }: { children: React.ReactNode }) {
  const [entriesVersion, setEntriesVersion] = useState(0);
  const bumpEntriesVersion = useCallback(() => {
    setEntriesVersion(v => v + 1);
  }, []);
  return (
    <EntriesRefreshContext.Provider value={{ entriesVersion, bumpEntriesVersion }}>
      {children}
    </EntriesRefreshContext.Provider>
  );
}

export function useEntriesRefresh(): EntriesRefreshContextValue {
  const ctx = useContext(EntriesRefreshContext);
  if (!ctx) {
    return {
      entriesVersion: 0,
      bumpEntriesVersion: () => {},
    };
  }
  return ctx;
}
