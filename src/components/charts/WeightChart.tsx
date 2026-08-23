import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { Fragment } from 'react';

import type { WeightRecord } from '@/data/repositories/weightRepository';
import { colors } from '@/theme/colors';
import { ChartShell } from './ChartShell';
import { ChartDateLabels } from './ChartDateLabels';
import { chartStartDate, timelineDates, weightScale } from './chartTimeline';

type Props = Readonly<{
  points: WeightRecord[];
  startDate: string | null;
  endDate: string;
}>;

const HEIGHT = 220;
const TOP = 12;
const BOTTOM = 18;
const LEFT = 48;
const RIGHT = 8;

function ordinal(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year!, month! - 1, day!);
}

export function WeightChart({ points, startDate, endDate }: Props) {
  const domainStart = chartStartDate(startDate, endDate, points);
  const dates = timelineDates(domainStart, endDate);
  const scale = weightScale(points.map(({ weight_lb }) => weight_lb));
  const startOrdinal = ordinal(domainStart);
  const ordinalSpan = Math.max(1, ordinal(endDate) - startOrdinal);

  return (
    <ChartShell empty={points.length === 0} emptyText="No weight logged in this range.">
      {(width) => {
        const plotWidth = Math.max(1, width - LEFT - RIGHT);
        const plotHeight = HEIGHT - TOP - BOTTOM;
        const xDate = (date: string) => LEFT + ((ordinal(date) - startOrdinal) / ordinalSpan) * plotWidth;
        const yWeight = (value: number) => TOP + (1 - (value - scale.offset) / scale.span) * plotHeight;
        const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xDate(point.date)} ${yWeight(point.weight_lb)}`).join(' ');
        return (
          <>
            <Svg height={HEIGHT} width={width}>
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                const y = TOP + fraction * plotHeight;
                return (
                  <Fragment key={fraction}>
                    <Line x1={LEFT} x2={width - RIGHT} y1={y} y2={y} stroke={colors.border} strokeDasharray="4 6" />
                    <SvgText fill={colors.textMuted} fontSize={9} textAnchor="end" x={LEFT - 5} y={y + 3}>{Math.round(scale.offset + scale.span * (1 - fraction))}</SvgText>
                  </Fragment>
                );
              })}
              <Line x1={LEFT} x2={LEFT} y1={TOP} y2={TOP + plotHeight} stroke={colors.border} />
              <Line x1={LEFT} x2={width - RIGHT} y1={TOP + plotHeight} y2={TOP + plotHeight} stroke={colors.border} />
              {points.length > 1 ? <Path d={path} fill="none" stroke={colors.accent} strokeWidth={2} /> : null}
              {points.map((point) => <Circle key={point.id} cx={xDate(point.date)} cy={yWeight(point.weight_lb)} fill={colors.accent} r={3.5} />)}
              <SvgText fill={colors.textMuted} fontSize={9} x={LEFT} y={9}>lb</SvgText>
            </Svg>
            <ChartDateLabels dates={dates} leftInset={LEFT} rightInset={RIGHT} />
          </>
        );
      }}
    </ChartShell>
  );
}
