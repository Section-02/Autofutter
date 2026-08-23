import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export function ScreenHeader({ title, onBack }: Readonly<{ title: string; onBack: () => void }>) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Back" hitSlop={12} onPress={onBack}>
        <SymbolView name="chevron.left" size={20} tintColor={colors.text} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg },
  title: { color: colors.text, fontSize: 15, fontWeight: '800', letterSpacing: 0.8 },
  spacer: { width: 20 },
});
