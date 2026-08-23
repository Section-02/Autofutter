import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { adaptExpoDatabase, initializeExpoDatabase } from '@/data/database/database';
import {
  configureAppMaintenance,
  runAppMaintenance,
} from '@/services/retention/appMaintenance';
import { colors } from '@/theme/colors';

async function initializeApplicationDatabase(database: Parameters<typeof initializeExpoDatabase>[0]) {
  await initializeExpoDatabase(database);
  const connection = adaptExpoDatabase(database);
  configureAppMaintenance(connection);
  await runAppMaintenance();
}

export default function RootLayout() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void runAppMaintenance();
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <SQLiteProvider databaseName="nutrition-tracker.db" onInit={initializeApplicationDatabase}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SQLiteProvider>
  );
}
