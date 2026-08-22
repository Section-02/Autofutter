import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { FoodRecord } from '@/data/repositories/foodRepository';
import { FoodRepository } from '@/data/repositories/foodRepository';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { registerRecipeIngredientHandoff } from '@/services/recipes/recipeIngredientHandoff';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Props = Readonly<{
  visible: boolean;
  title?: string;
  onClose: () => void;
  onSelect: (food: FoodRecord) => void;
}>;

function suggestedName(value: string): string {
  return value.trim().toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

export function IngredientPicker({ visible, title = 'ADD INGREDIENT', onClose, onSelect }: Props) {
  const database = useAppDatabase();
  const repository = useMemo(() => new FoodRepository(database), [database]);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<FoodRecord[]>([]);
  const returnToken = useId();

  useEffect(
    () => registerRecipeIngredientHandoff(returnToken, onSelect),
    [onSelect, returnToken],
  );

  useFocusEffect(useCallback(() => {
    if (!visible) return undefined;
    let active = true;
    repository.listActive(query, 'name', 50).then((rows) => active && setFoods(rows));
    return () => { active = false; };
  }, [query, repository, visible]));

  const createCustom = () => {
    onClose();
    router.push({ pathname: '/foods/new', params: { returnTo: 'recipe', returnToken, query: suggestedName(query) } });
  };
  const searchUsda = () => {
    onClose();
    router.push({ pathname: '/foods/usda', params: { returnTo: 'recipe', returnToken, query: query.trim() } });
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close ingredient picker" hitSlop={12} onPress={onClose}>
            <SymbolView name="xmark" size={18} tintColor={colors.text} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.content}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Search your foods..."
            placeholderTextColor={colors.textMuted}
            style={styles.search}
            value={query}
          />
          <ScrollView keyboardShouldPersistTaps="handled">
            {foods.map((food) => (
              <Pressable
                key={food.id}
                onPress={() => { onSelect(food); onClose(); }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.name}>{food.name}</Text>
                  <Text style={styles.detail}>{Number(food.calories.toFixed(2))} kcal / {Number(food.reference_weight_g.toFixed(2))} g</Text>
                </View>
                <SymbolView name="chevron.right" size={15} tintColor={colors.textMuted} />
              </Pressable>
            ))}
            {foods.length === 0 ? <Text style={styles.empty}>No matching saved foods.</Text> : null}
            <View style={styles.actions}>
              <Pressable onPress={createCustom} style={styles.action}>
                <Text style={styles.actionText}>+ Create Custom Food</Text>
              </Pressable>
              <Pressable onPress={searchUsda} style={styles.action}>
                <Text style={styles.actionText}>Search USDA</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg },
  title: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 },
  spacer: { width: 18 },
  content: { flex: 1, paddingHorizontal: spacing.screenHorizontal },
  search: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 16, height: 48, paddingHorizontal: spacing.md },
  row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 64 },
  rowText: { flex: 1 },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' },
  detail: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  empty: { color: colors.textMuted, marginVertical: spacing.xl, textAlign: 'center' },
  actions: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.md },
  action: { justifyContent: 'center', minHeight: 50 },
  actionText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.55 },
});
