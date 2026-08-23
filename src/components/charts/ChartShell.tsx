import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Props = Readonly<{
  children: ReactNode | ((width: number) => ReactNode);
  empty: boolean;
  emptyText: string;
}>;

export function ChartShell({ children, empty, emptyText }: Props) {
  const [width, setWidth] = useState(0);
  return (
    <View
      onLayout={(event) => setWidth(Math.floor(event.nativeEvent.layout.width))}
      style={styles.container}
    >
      {empty ? <Text style={styles.empty}>{emptyText}</Text> : width > 0 ? (
        <View style={styles.chart}>{typeof children === 'function' ? children(width) : children}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 275, overflow: 'hidden' },
  chart: { paddingTop: spacing.sm },
  empty: { color: colors.textMuted, fontSize: 14, paddingVertical: 90, textAlign: 'center' },
});
