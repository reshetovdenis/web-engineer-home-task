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
  const angledLabels = categoryWidth < 65;
  const tickStep = angledLabels ? Math.ceil(48 / categoryWidth) : 1;
  const shownMonths = months.filter((_, index) => index % tickStep === 0 || index === months.length - 1);
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
          margin={{ top: 34, right: 16, bottom: 48, left: 0 }} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="#141413" strokeOpacity={0.12} />
          <XAxis dataKey="month" axisLine={false} tickLine={false} height={angledLabels ? 64 : 28}
            angle={angledLabels ? -45 : 0} textAnchor={angledLabels ? 'end' : 'middle'}
            tickMargin={angledLabels ? 12 : 10} fontSize={12} ticks={shownMonths}
            interval={0} tickFormatter={month => month.replace(' ', ' 20')} />
          <YAxis width={54} axisLine={false} tickLine={false} tickMargin={12}
            domain={[0, ceiling]} ticks={[0, ceiling / 4, ceiling / 2, ceiling * 3 / 4, ceiling]} />
          <Legend verticalAlign="bottom" iconType="rect" iconSize={8} wrapperStyle={{ top: 398 }} />
          {series.map(part => <Bar key={part.id} dataKey={part.id} name={part.name}
            stackId="clients" fill={part.color} isAnimationActive={false} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>;
}
