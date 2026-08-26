import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  FoodForm,
  type FoodFormInitialValues,
  type FoodFormSubmission,
} from '@/components/food/FoodForm';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { FoodService } from '@/services/foods/foodService';
import type { UsdaPortion } from '@/services/usda/usdaTypes';
import { deliverRecipeIngredient } from '@/services/recipes/recipeIngredientHandoff';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { todayLocalDate } from '@/utils/dates';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function optionalNumber(value: string | undefined): number | null {
  if (value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function portionConversions(value: string | undefined): UsdaPortion[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((portion): portion is UsdaPortion => {
      if (typeof portion !== 'object' || portion === null) return false;
      const candidate = portion as Partial<UsdaPortion>;
      return typeof candidate.label === 'string' && candidate.label.trim().length > 0 &&
        typeof candidate.amount === 'number' && Number.isFinite(candidate.amount) && candidate.amount > 0 &&
        typeof candidate.gramWeightG === 'number' && Number.isFinite(candidate.gramWeightG) && candidate.gramWeightG > 0 &&
        (candidate.volumeUnit === null || candidate.volumeUnit === 'teaspoon' ||
          candidate.volumeUnit === 'tablespoon' || candidate.volumeUnit === 'cup') &&
        (candidate.sourceId === null || typeof candidate.sourceId === 'string');
    });
  } catch {
    return [];
  }
}

export default function NewFoodScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const database = useAppDatabase();
  const service = useMemo(() => new FoodService(database), [database]);
  const [busy, setBusy] = useState(false);
  const sourceType = first(params.sourceType) === 'usda' ? 'usda' : 'custom';
  const requestedReturn = first(params.returnTo);
  const returnTo = requestedReturn === 'log' ? 'log' : requestedReturn === 'recipe' ? 'recipe' : 'foods';
  const sourceId = first(params.sourceId) ?? null;
  const usdaPortions = sourceType === 'usda'
    ? portionConversions(first(params.portionConversions))
    : [];
  const returnToken = first(params.returnToken);
  const date = first(params.date) ?? todayLocalDate();

  const initialValues: FoodFormInitialValues = {
    name: first(params.name) ?? first(params.query) ?? '',
    referenceWeightG: optionalNumber(first(params.referenceWeightG)),
    calories: optionalNumber(first(params.calories)),
    proteinG: optionalNumber(first(params.proteinG)),
    fatG: optionalNumber(first(params.fatG)),
    carbsG: optionalNumber(first(params.carbsG)),
    sodiumMg: optionalNumber(first(params.sodiumMg)),
    cholesterolMg: optionalNumber(first(params.cholesterolMg)),
    standardPortionLabel: '',
    standardPortionWeightG: null,
  };

  const create = async (values: FoodFormSubmission) =>
    service.create({
      ...values,
      source: { type: sourceType, id: sourceId },
      portionConversions: usdaPortions.map((portion) => ({
        ...portion,
        sourceType: 'usda' as const,
      })),
    });

  const save = async (values: FoodFormSubmission) => {
    setBusy(true);
    try {
      const food = await create(values);
      if (returnTo === 'log') {
        router.replace({
          pathname: '/log/amount',
          params: { date, kind: 'food', id: food.id },
        });
      } else if (returnTo === 'recipe' && sourceType === 'usda') {
        deliverRecipeIngredient(returnToken, food);
        router.dismiss(2);
      } else {
        if (returnTo === 'recipe') deliverRecipeIngredient(returnToken, food);
        router.back();
      }
    } finally {
      setBusy(false);
    }
  };

  const saveForLater = async (values: FoodFormSubmission) => {
    setBusy(true);
    try {
      await create(values);
      router.replace({ pathname: '/', params: { date } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          {sourceType === 'usda' ? 'REVIEW FOOD' : 'NEW FOOD'}
        </Text>
        <View style={styles.spacer} />
      </View>
      <FoodForm
        busy={busy}
        initialValues={initialValues}
        onSubmit={save}
        provenanceLabel={
          sourceType === 'usda' ? `USDA FoodData Central · FDC ${sourceId}` : undefined
        }
        secondarySubmitLabel={returnTo === 'log' ? 'SAVE FOR LATER' : undefined}
        onSecondarySubmit={returnTo === 'log' ? saveForLater : undefined}
        submitLabel={returnTo === 'log' ? 'SAVE & USE' : 'SAVE FOOD'}
      />
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
});
