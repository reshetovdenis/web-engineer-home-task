import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Rectangle, ResponsiveContainer, XAxis, YAxis, type BarShapeProps } from 'recharts';
import { chartSeries, type BusinessNode } from './data';

interface Props { node: BusinessNode; labels: string[]; detail?: 'year' | 'month' | 'day' }

function initialChartWidth() {
  if (typeof window === 'undefined') return 1408;
  return Math.min(1408, window.innerWidth - (window.innerWidth <= 600 ? 24 : 32));
}

function yAxisTicks(values: number[]) {
  const maximum = Math.max(0, ...values);
  if (maximum === 0) return [0, 1];

  const targetStep = maximum / 4;
  const magnitude = 10 ** Math.floor(Math.log10(targetStep));
  const steps = [1, 2, 2.5, 5, 10].map(value => Math.max(1, value * magnitude));
  let step = steps.reduce((closest, candidate) =>
    Math.abs(candidate - targetStep) < Math.abs(closest - targetStep) ? candidate : closest);
  while (Math.ceil(maximum / step) > 5) {
    step = steps.find(candidate => candidate > step) ?? step * 2;
  }
  return Array.from({ length: Math.ceil(maximum / step) + 1 }, (_, index) => index * step);
}

export function Chart({ node, labels, detail = 'month' }: Props) {
  const [chartWidth, setChartWidth] = useState(initialChartWidth);
  const categoryWidth = (chartWidth - 70) / labels.length;
  const verticalLabels = categoryWidth < 65;
  const tickInterval = labels.length > 31 ? Math.max(0, Math.ceil(40 / categoryWidth) - 1) : 0;
  const xAxisHeight = verticalLabels ? (detail === 'month' ? 96 : 72) : 44;
  const xTickFontSize = detail === 'day' && labels.length > 24 && labels.length <= 31 && verticalLabels
    ? Math.max(7, Math.min(12, Math.floor(categoryWidth))) : 12;
  const series = chartSeries(node);
  const ticks = yAxisTicks(node.values);
  const ceiling = ticks.at(-1)!;
  const data = labels.map((month, index) => ({
    month,
    ...Object.fromEntries(series.map(part => [part.id, part.values[index]])),
  }));

  return <section className="min-w-0 max-w-full overflow-hidden rounded-lg bg-white" aria-label={`${detail === 'year' ? 'Yearly' : detail === 'day' ? 'Daily' : 'Monthly'} clients for ${node.name}`}>
    <div className="block h-[430px] w-full min-w-0 [&_.recharts-cartesian-axis-tick-value]:fill-ink/60 [&_.recharts-cartesian-axis-tick-value]:font-sans [&_.recharts-cartesian-axis-tick-value]:font-normal [&_.recharts-cartesian-axis-tick-value]:tabular-nums [&_.recharts-default-legend]:font-sans [&_.recharts-default-legend]:text-xs [&_.recharts-default-legend]:font-normal [&_.recharts-legend-item-text]:text-ink/60!" role="img" aria-label={`Stacked ${detail === 'year' ? 'yearly' : detail === 'day' ? 'daily' : 'monthly'} client chart for ${node.name}`}>
      <ResponsiveContainer width="100%" height={430} initialDimension={{ width: chartWidth, height: 430 }} onResize={setChartWidth}>
        <BarChart data={data} maxBarSize={88} barCategoryGap="10%"
          margin={{ top: 34, right: 16, bottom: 32, left: 0 }} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid-line)" strokeWidth={1} strokeDasharray="1 6" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} height={xAxisHeight}
            angle={verticalLabels ? -90 : 0} textAnchor={verticalLabels ? 'end' : 'middle'}
            tickMargin={verticalLabels ? 8 : 10} fontSize={xTickFontSize} ticks={labels}
            interval={tickInterval} tickFormatter={month => detail === 'month' ? month.replace(' ', ' 20') : month} />
          <YAxis width={54} axisLine={false} tickLine={false} tickMargin={12} fontSize={12}
            domain={[0, ceiling]} ticks={ticks} />
          <Legend position="bottom" iconType="rect" iconSize={8} />
          {series.map((part, partIndex) => <Bar key={part.id} dataKey={part.id} name={part.name}
            stackId="clients" fill={part.color} isAnimationActive={false}
            shape={(props: BarShapeProps) => {
              const values = props.payload as Record<string, number>;
              const roundTop = series.slice(partIndex + 1).every(upper => values[upper.id] <= 0);
              const roundBottom = series.slice(0, partIndex).every(lower => values[lower.id] <= 0);
              return <Rectangle {...props} radius={[roundTop ? 4 : 0, roundTop ? 4 : 0, roundBottom ? 4 : 0, roundBottom ? 4 : 0]} />;
            }} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>;
}
