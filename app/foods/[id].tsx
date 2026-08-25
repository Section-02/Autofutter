import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  FoodForm,
  type FoodFormSubmission,
} from '@/components/food/FoodForm';
import type { FoodRecord } from '@/data/repositories/foodRepository';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import {
  FoodInUseError,
  FoodService,
} from '@/services/foods/foodService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

function first(value: string | string[] | undefined): string {
  const result = Array.isArray(value) ? value[0] : value;
  if (!result) throw new Error('Food identifier is required.');
  return result;
}

export default function EditFoodScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = first(params.id);
  const database = useAppDatabase();
  const service = useMemo(() => new FoodService(database), [database]);
  const router = useRouter();
  const [food, setFood] = useState<FoodRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    service.find(id).then(setFood).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Food could not be loaded.');
    });
  }, [id, service]);

  const save = async (values: FoodFormSubmission) => {
    setBusy(true);
    try {
      await service.update(id, values);
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const deleteFood = () => {
    Alert.alert(
      'Delete Food?',
      'It will disappear from lists and search. You can restore it later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await service.softDelete(id);
              router.back();
            } catch (caught) {
              const message =
                caught instanceof FoodInUseError
                  ? `This food is used by an active recipe: ${caught.recipeNames.join(', ')}. Edit that recipe before deleting the food.`
                  : caught instanceof Error
                    ? caught.message
                    : 'Food could not be deleted.';
              Alert.alert('Food Not Deleted', message);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>EDIT FOOD</Text>
        <View style={styles.spacer} />
      </View>
      {error ? <Text style={styles.message}>{error}</Text> : null}
      {!food && !error ? <ActivityIndicator color={colors.accent} /> : null}
      {food ? (
        <FoodForm
          busy={busy}
          initialValues={{
            name: food.name,
            referenceWeightG: food.reference_weight_g,
            calories: food.calories,
            proteinG: food.protein_g,
            fatG: food.fat_g,
            carbsG: food.carbs_g,
            sodiumMg: food.sodium_mg,
            cholesterolMg: food.cholesterol_mg,
            standardPortionLabel: food.standard_portion_label ?? '',
            standardPortionWeightG: food.standard_portion_weight_g,
          }}
          onDelete={deleteFood}
          onSubmit={save}
          provenanceLabel={
            food.source_type === 'usda'
              ? `USDA FoodData Central · FDC ${food.source_id}`
              : undefined
          }
          submitLabel="SAVE FOOD"
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 },
  spacer: { width: 20 },
  message: { color: colors.calorieOver, padding: spacing.lg, textAlign: 'center' },
});
