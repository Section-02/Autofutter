import { LineChart, type lineDataItem } from 'react-native-gifted-charts';

import type { CalorieProgressPoint, ProgressGoalPoint } from '@/services/progress/progressService';
import { colors } from '@/theme/colors';
import { ChartShell } from './ChartShell';
import { ChartDateLabels } from './ChartDateLabels';
import { calorieScale, chartStartDate, goalForTimelineDate, timelineDates } from './chartTimeline';

type Props = Readonly<{
  points: CalorieProgressPoint[];
  startDate: string | null;
  endDate: string;
  goals: ProgressGoalPoint[];
}>;

export function CalorieChart({ points, startDate, endDate, goals }: Props) {
  const actual = new Map(points.map((point) => [point.date, point]));
  const dates = timelineDates(chartStartDate(startDate, endDate, [], points), endDate);
  const data: lineDataItem[] = [];
  const target: lineDataItem[] = [];
  const band: { lower: number; upper: number }[] = [];
  dates.forEach((date) => {
    const point = actual.get(date);
    const goal = goalForTimelineDate(goals, date);
    data.push({ value: point?.calories, hideDataPoint: point === undefined });
    target.push({ value: goal.target });
    band.push({ lower: goal.lower, upper: goal.upper });
  });
  const maxValue = calorieScale(points.flatMap(({ calories, upper }) => [calories, upper]));

  return (
    <ChartShell empty={points.length === 0} emptyText="No completed calorie days in this range.">
      {(width) => (
        <><LineChart
          adjustToWidth
          color={colors.calorieWithin}
          color2={colors.textMuted}
          data={data}
          data2={target}
          dataPointsColor={colors.calorieWithin}
          dataPointsRadius={3}
          disableScroll
          endSpacing={8}
          extrapolateMissingValues={false}
          height={205}
          hideDataPoints2
          initialSpacing={8}
          interpolateMissingValues
          isAnimated={false}
          maxValue={maxValue}
          noOfSections={4}
          parentWidth={width}
          rulesColor={colors.border}
          showDataPointsForMissingValues={false}
          spreadAreaColor={colors.calorieBand}
          spreadAreaData={band}
          spreadAreaOpacity={0.7}
          stepChart2
          strokeDashArray2={[5, 4]}
          thickness={2}
          thickness2={1.5}
          width={Math.max(220, width - 58)}
          xAxisColor={colors.border}
          xAxisLabelsHeight={0}
          yAxisColor={colors.border}
          yAxisLabelSuffix=""
          yAxisLabelWidth={46}
          yAxisTextStyle={{ color: colors.textMuted, fontSize: 9 }}
        /><ChartDateLabels dates={dates} leftInset={46} /></>
      )}
    </ChartShell>
  );
}
