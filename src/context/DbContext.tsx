import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SQLite from 'expo-sqlite';
import { getDatabase } from '../db/database';

interface DbContextValue {
  db: SQLite.SQLiteDatabase | null;
  isReady: boolean;
  refresh: () => void;
  refreshKey: number;
}

const DbContext = createContext<DbContextValue>({
  db: null,
  isReady: false,
  refresh: () => {},
  refreshKey: 0,
});

export function DbProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getDatabase().then((database) => {
      setDb(database);
      setIsReady(true);
    });
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <DbContext.Provider value={{ db, isReady, refresh, refreshKey }}>
      {children}
    </DbContext.Provider>
  );
}

export function useDb() {
  return useContext(DbContext);
}
