import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { CalorieGaugeState } from '@/domain/nutrition/calorieGaugeCalculator';
import { colors } from '@/theme/colors';

const CENTER_X = 140;
const CENTER_Y = 125;
const RADIUS = 100;
const START_ANGLE = 150;
const GREEN_END_ANGLE = 330;
const YELLOW_END_ANGLE = 375;
const RED_END_ANGLE = 390;
const STROKE_WIDTH = 16;

function point(angle: number): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;
  return { x: CENTER_X + RADIUS * Math.cos(radians), y: CENTER_Y + RADIUS * Math.sin(radians) };
}

function arc(startAngle: number, endAngle: number): string {
  if (endAngle <= startAngle) return '';
  const start = point(startAngle);
  const end = point(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function progressEnd(start: number, end: number, progress: number): number {
  return start + (end - start) * Math.max(0, Math.min(progress, 1));
}

type CalorieGaugeProps = { state: CalorieGaugeState };

export function CalorieGauge({ state }: CalorieGaugeProps) {
  const { consumedCalories, range } = state;
  const greenProgress = range.lower === 0 ? 1 : consumedCalories / range.lower;
  const toleranceWidth = range.upper - range.lower;
  const yellowProgress = toleranceWidth === 0
    ? consumedCalories >= range.target ? 1 : 0
    : (consumedCalories - range.lower) / toleranceWidth;
  const redScale = Math.max(range.upper - range.target, range.target * 0.1, 1);
  const redProgress = (consumedCalories - range.upper) / redScale;
  const redEnd = progressEnd(YELLOW_END_ANGLE, RED_END_ANGLE, redProgress);
  const redEndPoint = point(redEnd);

  return (
    <View style={styles.container} accessibilityLabel="Daily calorie gauge">
      <Svg width="100%" height={210} viewBox="0 0 280 210">
        <Path d={arc(START_ANGLE, RED_END_ANGLE)} fill="none" stroke={colors.border} strokeLinecap="round" strokeWidth={STROKE_WIDTH} />
        {greenProgress > 0 ? <Path d={arc(START_ANGLE, progressEnd(START_ANGLE, GREEN_END_ANGLE, greenProgress))} fill="none" stroke={colors.calorieBelow} strokeLinecap="round" strokeWidth={STROKE_WIDTH} /> : null}
        {yellowProgress > 0 ? <Path d={arc(GREEN_END_ANGLE, progressEnd(GREEN_END_ANGLE, YELLOW_END_ANGLE, yellowProgress))} fill="none" stroke={colors.calorieWithin} strokeWidth={STROKE_WIDTH} /> : null}
        {redProgress > 0 ? (
          <>
            <Path d={arc(YELLOW_END_ANGLE, redEnd)} fill="none" stroke={colors.calorieOver} strokeWidth={STROKE_WIDTH} />
            <Circle cx={redEndPoint.x} cy={redEndPoint.y} fill={colors.calorieOver} r={STROKE_WIDTH / 2} />
          </>
        ) : null}
      </Svg>
      <View style={styles.centerText}>
        <Text style={styles.balance}>{Math.round(state.balance.calories).toLocaleString()}</Text>
        <Text style={styles.balanceLabel}>{state.balance.kind.toUpperCase()}</Text>
        <Text style={styles.total}>{state.consumedCalories.toLocaleString()} / {state.range.target.toLocaleString()} kcal</Text>
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
