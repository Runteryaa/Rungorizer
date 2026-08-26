import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SQLite from 'expo-sqlite';
import { getDatabase, getSetting, setSetting } from '../db/database';

interface DbContextValue {
  db: SQLite.SQLiteDatabase | null;
  isReady: boolean;
  refresh: () => void;
  refreshKey: number;
  silentSave: boolean;
  setSilentSave: (val: boolean) => Promise<void>;
}

const DbContext = createContext<DbContextValue>({
  db: null,
  isReady: false,
  refresh: () => {},
  refreshKey: 0,
  silentSave: false,
  setSilentSave: async () => {},
});

export function DbProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [silentSave, setSilentSaveState] = useState(false);

  useEffect(() => {
    getDatabase().then(async (database) => {
      setDb(database);
      const val = await getSetting(database, 'silent_save', '0');
      setSilentSaveState(val === '1');
      setIsReady(true);
    });
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const setSilentSave = useCallback(
    async (val: boolean) => {
      setSilentSaveState(val);
      if (db) {
        await setSetting(db, 'silent_save', val ? '1' : '0');
      }
    },
    [db]
  );

  return (
    <DbContext.Provider
      value={{
        db,
        isReady,
        refresh,
        refreshKey,
        silentSave,
        setSilentSave,
      }}
    >
      {children}
    </DbContext.Provider>
  );
}

export function useDb() {
  return useContext(DbContext);
}
