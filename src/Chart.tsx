import { chartSeries, months, type BusinessNode } from './data';

interface Props { node: BusinessNode }

export function Chart({ node }: Props) {
  const series = chartSeries(node);
  const max = Math.max(...node.values, 400);
  const ceiling = Math.ceil(max / 100) * 100;
  const width = 1408;
  const height = 430;
  const plotBottom = 354;
  const plotHeight = 320;
  const firstBarX = 66;
  const barWidth = 88;
  const step = 111.5;

  return <section className="chart-panel" aria-label={`Monthly clients for ${node.name}`}>
    <div className="chart-scroll">
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Stacked monthly client chart for ${node.name}`}>
        <desc>Monthly reported totals split into existing clients, new organic and new paid. Reported totals are also in the table below.</desc>
        {[4, 3, 2, 1, 0].map(tick => {
          const value = ceiling * tick / 4;
          const y = plotBottom - value / ceiling * plotHeight;
          return <g key={tick}><line x1="54" x2="1392" y1={y} y2={y} className="grid-line" /><text x="42" y={y + 4} textAnchor="end" className="axis-label">{value}</text></g>;
        })}
        {months.map((month, monthIndex) => {
          const x = firstBarX + monthIndex * step;
          let cumulative = 0;
          return <g key={month}>
            {series.map(part => {
              const value = part.values[monthIndex];
              const segmentHeight = value / ceiling * plotHeight;
              cumulative += value;
              return <rect key={part.id} x={x} y={plotBottom - cumulative / ceiling * plotHeight} width={barWidth} height={segmentHeight} fill={part.color} data-series={part.name} data-month={month} data-value={value}>
                <title>{month}: {part.name}, {value} clients</title>
              </rect>;
            })}
            <text x={x + barWidth / 2} y="382" textAnchor="middle" className="axis-label">{month.replace(' ', ' 20')}</text>
          </g>;
        })}
        <g className="chart-legend" transform="translate(564 406)">
          {series.map((part, index) => {
            const x = [0, 114, 214][index];
            return <g key={part.id} transform={`translate(${x} 0)`}><rect x="0" y="-4" width="8" height="8" fill={part.color} /><text x="12" y="0" dominantBaseline="middle" className="legend-label">{part.name}</text></g>;
          })}
        </g>
      </svg>
    </div>
  </section>;
}
