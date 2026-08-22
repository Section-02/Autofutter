import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { adaptExpoDatabase } from '@/data/database/database';
import type { DatabaseConnection } from '@/data/database/types';

export function useAppDatabase(): DatabaseConnection {
  const sqliteDatabase = useSQLiteContext();
  return useMemo(() => adaptExpoDatabase(sqliteDatabase), [sqliteDatabase]);
}
