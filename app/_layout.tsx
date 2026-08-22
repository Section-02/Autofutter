import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { initializeExpoDatabase } from '@/data/database/database';
import { colors } from '@/theme/colors';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="nutrition-tracker.db" onInit={initializeExpoDatabase}>
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
