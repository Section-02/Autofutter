import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { CalorieGaugeState } from '@/domain/nutrition/calorieGaugeCalculator';
import { colors } from '@/theme/colors';

const CENTER_X = 140;
const CENTER_Y = 125;
const RADIUS = 100;
const START_ANGLE = 150;
const NORMAL_DEGREES = 240;
const EXTENSION_DEGREES = 30;

function point(angle: number): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;
  return {
    x: CENTER_X + RADIUS * Math.cos(radians),
    y: CENTER_Y + RADIUS * Math.sin(radians),
  };
}

function arc(startAngle: number, endAngle: number): string {
  if (endAngle <= startAngle) return '';
  const start = point(startAngle);
  const end = point(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

type CalorieGaugeProps = { state: CalorieGaugeState };

export function CalorieGauge({ state }: CalorieGaugeProps) {
  const normalEnd = START_ANGLE + NORMAL_DEGREES * state.normalProgress;
  const extensionProgress = Math.min(
    state.redExtensionCalories / state.range.target,
    1,
  );
  const normalColor =
    state.normalArcColor === 'green' ? colors.calorieBelow : colors.calorieWithin;

  return (
    <View style={styles.container} accessibilityLabel="Daily calorie gauge">
      <Svg width="100%" height={210} viewBox="0 0 280 210">
        <Path
          d={arc(START_ANGLE, START_ANGLE + NORMAL_DEGREES)}
          fill="none"
          stroke={colors.border}
          strokeLinecap="round"
          strokeWidth={16}
        />
        {state.normalProgress > 0 ? (
          <Path
            d={arc(START_ANGLE, normalEnd)}
            fill="none"
            stroke={normalColor}
            strokeLinecap="round"
            strokeWidth={16}
          />
        ) : null}
        {extensionProgress > 0 ? (
          <Path
            d={arc(
              START_ANGLE + NORMAL_DEGREES,
              START_ANGLE + NORMAL_DEGREES + EXTENSION_DEGREES * extensionProgress,
            )}
            fill="none"
            stroke={colors.calorieOver}
            strokeLinecap="round"
            strokeWidth={16}
          />
        ) : null}
      </Svg>
      <View style={styles.centerText}>
        <Text style={styles.balance}>{Math.round(state.balance.calories).toLocaleString()}</Text>
        <Text style={styles.balanceLabel}>{state.balance.kind.toUpperCase()}</Text>
        <Text style={styles.total}>
          {state.consumedCalories.toLocaleString()} / {state.range.target.toLocaleString()} kcal
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 210, justifyContent: 'center' },
  centerText: { position: 'absolute', alignSelf: 'center', top: 70, alignItems: 'center' },
  balance: { color: colors.text, fontSize: 38, fontWeight: '700', fontVariant: ['tabular-nums'] },
  balanceLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1.4 },
  total: { color: colors.textMuted, fontSize: 14, marginTop: 16 },
});
