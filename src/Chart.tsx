import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { chartSeries, months, type BusinessNode } from './data';

interface Props { node: BusinessNode }

export function Chart({ node }: Props) {
  const series = chartSeries(node);
  const ceiling = Math.ceil(Math.max(...node.values, 400) / 100) * 100;
  const data = months.map((month, index) => ({
    month,
    existing: series[0].values[index],
    organic: series[1].values[index],
    paid: series[2].values[index],
  }));

  return <section className="chart-panel" aria-label={`Monthly clients for ${node.name}`}>
    <div className="chart" role="img" aria-label={`Stacked monthly client chart for ${node.name}`}>
      <ResponsiveContainer width="100%" height={430} initialDimension={{ width: 1408, height: 430 }}>
        <BarChart data={data} maxBarSize={88} barCategoryGap="10%"
          margin={{ top: 34, right: 16, bottom: 48, left: 0 }} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="#141413" strokeOpacity={0.12} />
          <XAxis dataKey="month" axisLine={false} tickLine={false} height={28}
            tickMargin={10} interval="preserveStartEnd" tickFormatter={month => month.replace(' ', ' 20')} />
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
