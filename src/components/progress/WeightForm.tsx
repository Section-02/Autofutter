import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { WeightInput } from '@/services/progress/weightService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { formatLongLocalDate, parseLocalDate, toLocalDateString, todayLocalDate } from '@/utils/dates';

type Props = Readonly<{
  busy: boolean;
  initialDate: string;
  initialWeightLb?: number;
  onDelete?: () => void;
  onSubmit: (input: WeightInput) => void;
  submitLabel: string;
}>;

export function WeightForm({ busy, initialDate, initialWeightLb, onDelete, onSubmit, submitLabel }: Props) {
  const [date, setDate] = useState(initialDate);
  const [weight, setWeight] = useState(initialWeightLb === undefined ? '' : initialWeightLb.toFixed(1));
  const [pickerOpen, setPickerOpen] = useState(false);
  const parsedWeight = Number(weight);
  const valid = weight.trim() !== '' && Number.isFinite(parsedWeight) && parsedWeight > 0;

  return (
    <>
      <View style={styles.content}>
        <Text style={styles.label}>WEIGHT</Text>
        <View style={styles.weightRow}>
          <TextInput
            accessibilityLabel="Weight in pounds"
            autoFocus={initialWeightLb === undefined}
            keyboardType="decimal-pad"
            onChangeText={setWeight}
            placeholder="0.0"
            placeholderTextColor={colors.textMuted}
            selectTextOnFocus
            style={styles.weightInput}
            value={weight}
          />
          <Text style={styles.unit}>lb</Text>
        </View>
        <Text style={styles.label}>DATE</Text>
        <Pressable onPress={() => setPickerOpen(true)} style={styles.dateButton}>
          <Text style={styles.dateText}>{formatLongLocalDate(date)}</Text>
        </Pressable>
        {onDelete ? (
          <Pressable disabled={busy} onPress={onDelete} style={styles.deleteButton}>
            <Text style={styles.deleteText}>Delete Weigh-In</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.action}>
        <Pressable
          disabled={busy || !valid}
          onPress={() => onSubmit({ date, weightLb: parsedWeight })}
          style={[styles.saveButton, (busy || !valid) && styles.dim]}
        >
          <Text style={styles.saveText}>{busy ? 'SAVING…' : submitLabel}</Text>
        </Pressable>
      </View>
      <Modal animationType="slide" transparent visible={pickerOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SELECT DATE</Text>
              <Pressable onPress={() => setPickerOpen(false)}><Text style={styles.done}>Done</Text></Pressable>
            </View>
            <DateTimePicker
              display="inline"
              maximumDate={parseLocalDate(todayLocalDate())}
              mode="date"
              onChange={(_, selected) => { if (selected !== undefined) setDate(toLocalDateString(selected)); }}
              value={parseLocalDate(date)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: spacing.screenHorizontal, paddingTop: spacing.lg },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.lg },
  weightRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  weightInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 24, minHeight: 58, paddingHorizontal: spacing.md, width: 145 },
  unit: { color: colors.textMuted, fontSize: 18 },
  dateButton: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.md },
  dateText: { color: colors.text, fontSize: 16 },
  deleteButton: { marginTop: spacing.xxl, paddingVertical: spacing.md },
  deleteText: { color: colors.calorieOver, fontSize: 15 },
  action: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  saveButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, justifyContent: 'center', minHeight: 50 },
  saveText: { color: colors.surface, fontSize: 15, fontWeight: '800', letterSpacing: 0.6 },
  dim: { opacity: 0.5 },
  modalBackdrop: { backgroundColor: 'rgba(0,0,0,0.25)', flex: 1, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, paddingBottom: spacing.xxl },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  modalTitle: { color: colors.text, fontSize: 14, fontWeight: '700', letterSpacing: 0.8 },
  done: { color: colors.accent, fontSize: 16, fontWeight: '700' },
});
