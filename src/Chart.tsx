import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { chartSeries, months, type BusinessNode } from './data';

interface Props { node: BusinessNode }

function initialChartWidth() {
  if (typeof window === 'undefined') return 1408;
  return Math.min(1408, window.innerWidth - (window.innerWidth <= 600 ? 24 : 32));
}

export function Chart({ node }: Props) {
  const [chartWidth, setChartWidth] = useState(initialChartWidth);
  const categoryWidth = (chartWidth - 70) / months.length;
  const verticalLabels = categoryWidth < 65;
  const series = chartSeries(node);
  const ceiling = Math.ceil(Math.max(...node.values, 400) / 100) * 100;
  const data = months.map((month, index) => ({
    month,
    existing: series[0].values[index],
    organic: series[1].values[index],
    paid: series[2].values[index],
  }));

  return <section className="min-w-0 max-w-full overflow-hidden rounded-lg bg-white" aria-label={`Monthly clients for ${node.name}`}>
    <div className="block h-[430px] w-full min-w-0 [&_.recharts-cartesian-axis-tick-value]:fill-ink/60 [&_.recharts-cartesian-axis-tick-value]:font-sans [&_.recharts-cartesian-axis-tick-value]:text-xs [&_.recharts-cartesian-axis-tick-value]:font-normal [&_.recharts-cartesian-axis-tick-value]:tabular-nums [&_.recharts-default-legend]:font-sans [&_.recharts-default-legend]:text-xs [&_.recharts-default-legend]:font-normal [&_.recharts-legend-item-text]:text-ink/60!" role="img" aria-label={`Stacked monthly client chart for ${node.name}`}>
      <ResponsiveContainer width="100%" height={430} initialDimension={{ width: chartWidth, height: 430 }} onResize={setChartWidth}>
        <BarChart data={data} maxBarSize={88} barCategoryGap="10%"
          margin={{ top: 34, right: 16, bottom: 32, left: 0 }} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid-line)" strokeWidth={1} strokeDasharray="1 6" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} height={verticalLabels ? 72 : 28}
            angle={verticalLabels ? -90 : 0} textAnchor={verticalLabels ? 'end' : 'middle'}
            tickMargin={verticalLabels ? 8 : 10} fontSize={12} ticks={months}
            interval={0} tickFormatter={month => month.replace(' ', ' 20')} />
          <YAxis width={54} axisLine={false} tickLine={false} tickMargin={12}
            domain={[0, ceiling]} ticks={[0, ceiling / 4, ceiling / 2, ceiling * 3 / 4, ceiling]} />
          <Legend align="center" verticalAlign="bottom" iconType="rect" iconSize={8}
            wrapperStyle={{ top: 398, left: 0, width: '100%' }} />
          {series.map(part => <Bar key={part.id} dataKey={part.id} name={part.name}
            stackId="clients" fill={part.color} isAnimationActive={false} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>;
}
