import DateTimePicker from '@react-native-community/datetimepicker';
import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import {
  addLocalDays,
  formatLongLocalDate,
  parseLocalDate,
  toLocalDateString,
  todayLocalDate,
} from '@/utils/dates';

type DateNavigatorProps = { date: string; onChange: (date: string) => void };

export function DateNavigator({ date, onChange }: DateNavigatorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const today = todayLocalDate();

  return (
    <>
      <View style={styles.row}>
        <Pressable
          accessibilityLabel="Previous day"
          hitSlop={12}
          onPress={() => onChange(addLocalDays(date, -1))}
        >
          <SymbolView name="chevron.left" size={19} tintColor={colors.text} />
        </Pressable>
        <Pressable onPress={() => setPickerOpen(true)}>
          <Text style={styles.date}>{formatLongLocalDate(date)}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Next day"
          disabled={date >= today}
          hitSlop={12}
          onPress={() => onChange(addLocalDays(date, 1))}
        >
          <SymbolView
            name="chevron.right"
            size={19}
            tintColor={date >= today ? colors.border : colors.text}
          />
        </Pressable>
      </View>
      <Modal animationType="slide" transparent visible={pickerOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SELECT DATE</Text>
              <Pressable onPress={() => setPickerOpen(false)}>
                <Text style={styles.done}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              display="inline"
              maximumDate={parseLocalDate(today)}
              mode="date"
              value={parseLocalDate(date)}
              onChange={(_, selected) => {
                if (selected !== undefined) onChange(toLocalDateString(selected));
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  date: { color: colors.text, fontSize: 16, fontWeight: '600' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, paddingBottom: spacing.xxl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: colors.text, fontSize: 14, fontWeight: '700', letterSpacing: 0.8 },
  done: { color: colors.accent, fontSize: 16, fontWeight: '700' },
});
