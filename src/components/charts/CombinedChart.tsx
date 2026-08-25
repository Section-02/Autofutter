import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import type { WeightRecord } from '@/data/repositories/weightRepository';
import type { CalorieProgressPoint, ProgressGoalPoint } from '@/services/progress/progressService';
import { colors } from '@/theme/colors';
import { ChartShell } from './ChartShell';
import { ChartDateLabels } from './ChartDateLabels';
import { calorieScale, chartStartDate, goalForTimelineDate, timelineDates, weightScale } from './chartTimeline';

type Props = Readonly<{
  weights: WeightRecord[];
  calories: CalorieProgressPoint[];
  goals: ProgressGoalPoint[];
  startDate: string | null;
  endDate: string;
}>;

const HEIGHT = 220;
const TOP = 12;
const BOTTOM = 18;
const LEFT = 48;
const RIGHT = 52;

function ordinal(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year!, month! - 1, day!);
}

function pathFor<T>(points: T[], x: (point: T) => number, y: (point: T) => number): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point)} ${y(point)}`).join(' ');
}

function targetBandPath(
  dates: string[],
  goals: ProgressGoalPoint[],
  xDate: (date: string) => number,
  yCalories: (value: number) => number,
): string {
  const ranges = dates.map((date) => goalForTimelineDate(goals, date));
  const firstDate = dates[0];
  const firstRange = ranges[0];
  if (firstDate === undefined || firstRange === undefined) return '';

  let path = `M ${xDate(firstDate)} ${yCalories(firstRange.upper)}`;
  for (let index = 1; index < dates.length; index += 1) {
    const date = dates[index]!;
    const previous = ranges[index - 1]!;
    const current = ranges[index]!;
    path += ` L ${xDate(date)} ${yCalories(previous.upper)}`;
    path += ` L ${xDate(date)} ${yCalories(current.upper)}`;
  }

  const lastIndex = dates.length - 1;
  path += ` L ${xDate(dates[lastIndex]!)} ${yCalories(ranges[lastIndex]!.lower)}`;
  for (let index = lastIndex; index > 0; index -= 1) {
    const date = dates[index]!;
    const previousDate = dates[index - 1]!;
    const previous = ranges[index - 1]!;
    path += ` L ${xDate(date)} ${yCalories(previous.lower)}`;
    path += ` L ${xDate(previousDate)} ${yCalories(previous.lower)}`;
  }
  return `${path} Z`;
}

export function CombinedChart({ weights, calories, goals, startDate, endDate }: Props) {
  const domainStart = chartStartDate(startDate, endDate, weights, calories);
  const dates = timelineDates(domainStart, endDate);
  const goalRanges = dates.map((date) => goalForTimelineDate(goals, date));
  const weight = weightScale(weights.map(({ weight_lb }) => weight_lb));
  const calorieMax = calorieScale([
    ...calories.map(({ calories: value }) => value),
    ...goalRanges.map(({ upper }) => upper),
  ]);
  const startOrdinal = ordinal(domainStart);
  const ordinalSpan = Math.max(1, ordinal(endDate) - startOrdinal);

  return (
    <ChartShell empty={weights.length === 0 && calories.length === 0} emptyText="No completed calorie days or weigh-ins in this range.">
      {(width) => {
        const plotWidth = Math.max(1, width - LEFT - RIGHT);
        const plotHeight = HEIGHT - TOP - BOTTOM;
        const xDate = (date: string) => LEFT + ((ordinal(date) - startOrdinal) / ordinalSpan) * plotWidth;
        const yWeight = (value: number) => TOP + (1 - (value - weight.offset) / weight.span) * plotHeight;
        const yCalories = (value: number) => TOP + (1 - value / calorieMax) * plotHeight;
        const bandPath = targetBandPath(dates, goals, xDate, yCalories);
        return (
          <>
            <Svg height={HEIGHT} width={width}>
              <Path d={bandPath} fill={colors.calorieBand} opacity={0.7} />
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                const y = TOP + fraction * plotHeight;
                return <LineGroup key={fraction} calorie={calorieMax * (1 - fraction)} weight={weight.offset + weight.span * (1 - fraction)} width={width} y={y} />;
              })}
              <Line x1={LEFT} x2={LEFT} y1={TOP} y2={TOP + plotHeight} stroke={colors.border} />
              <Line x1={width - RIGHT} x2={width - RIGHT} y1={TOP} y2={TOP + plotHeight} stroke={colors.border} />
              <Line x1={LEFT} x2={width - RIGHT} y1={TOP + plotHeight} y2={TOP + plotHeight} stroke={colors.border} />
              {weights.length > 1 ? <Path d={pathFor(weights, (point) => xDate(point.date), (point) => yWeight(point.weight_lb))} fill="none" stroke={colors.accent} strokeWidth={2} /> : null}
              {calories.length > 1 ? <Path d={pathFor(calories, (point) => xDate(point.date), (point) => yCalories(point.calories))} fill="none" stroke={colors.calorieWithin} strokeWidth={2} /> : null}
              {weights.map((point) => <Circle key={point.id} cx={xDate(point.date)} cy={yWeight(point.weight_lb)} fill={colors.accent} r={3.5} />)}
              {calories.map((point) => <Circle key={point.date} cx={xDate(point.date)} cy={yCalories(point.calories)} fill={colors.calorieWithin} r={3.5} />)}
              <SvgText fill={colors.textMuted} fontSize={9} x={LEFT} y={9}>lb</SvgText>
              <SvgText fill={colors.textMuted} fontSize={9} textAnchor="end" x={width - RIGHT} y={9}>kcal</SvgText>
            </Svg>
            <ChartDateLabels dates={dates} leftInset={LEFT} rightInset={RIGHT} />
          </>
        );
      }}
    </ChartShell>
  );
}

function LineGroup({ calorie, weight, width, y }: Readonly<{ calorie: number; weight: number; width: number; y: number }>) {
  return (
    <>
      <Line x1={LEFT} x2={width - RIGHT} y1={y} y2={y} stroke={colors.border} strokeDasharray="4 6" />
      <SvgText fill={colors.textMuted} fontSize={9} textAnchor="end" x={LEFT - 5} y={y + 3}>{Math.round(weight)}</SvgText>
      <SvgText fill={colors.textMuted} fontSize={9} x={width - RIGHT + 5} y={y + 3}>{Math.round(calorie).toLocaleString()}</SvgText>
    </>
  );
}
