import { forwardRef, useId } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export const NumericTextInput = forwardRef<TextInput, TextInputProps>(
  function NumericTextInput({ inputAccessoryViewID, keyboardType = 'decimal-pad', ...props }, ref) {
    const generatedId = `numeric-keyboard-${useId().replace(/:/g, '')}`;
    const accessoryId = inputAccessoryViewID ?? generatedId;

    return (
      <>
        <TextInput
          {...props}
          inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : undefined}
          keyboardType={keyboardType}
          ref={ref}
        />
        {Platform.OS === 'ios' ? (
          <InputAccessoryView nativeID={accessoryId}>
            <View style={styles.accessory}>
              <Pressable accessibilityRole="button" hitSlop={8} onPress={Keyboard.dismiss}>
                <Text style={styles.done}>Done</Text>
              </Pressable>
            </View>
          </InputAccessoryView>
        ) : null}
      </>
    );
  },
);

const styles = StyleSheet.create({
  accessory: {
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  done: { color: colors.accent, fontSize: 17, fontWeight: '700' },
});
