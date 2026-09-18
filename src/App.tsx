import { useState } from 'react';
import { Chart } from './Chart';
import { HierarchyTable } from './HierarchyTable';
import { ReportControls } from './ReportControls';
import { childrenOf, type BusinessNode } from './data';
import { fullReportRange, reportData, type ReportDetail, type ReportRange } from './reportPeriod';
import { useCompany } from './useCompany';

function findNode(root: BusinessNode, id: string): BusinessNode | undefined {
  if (root.id === id) return root;
  for (const child of childrenOf(root)) {
    const result = findNode(child, id);
    if (result) return result;
  }
}

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [range, setRange] = useState<ReportRange>(fullReportRange);
  const [detail, setDetail] = useState<ReportDetail>('month');
  const company = useCompany();

  const statusClass = 'min-h-[100px] min-w-0 max-w-full overflow-hidden rounded-lg bg-white p-6 text-sm';

  return <main className="min-h-screen min-w-80 bg-paper px-4 pb-10 font-sans text-ink antialiased [font-synthesis:none] [text-rendering:optimizeLegibility] max-[601px]:px-3">
    <div className="mx-auto flex w-full max-w-[1408px] min-w-0 flex-col gap-4 pt-6 max-[601px]:pt-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[35px]/[44px] font-normal max-[601px]:text-[30px]/[40px]">Clients</h1>
        <ReportControls range={range} onRangeChange={setRange} detail={detail} onDetailChange={setDetail} />
      </header>
      {company.isPending && <div className={statusClass} role="status">Loading client data…</div>}
      {company.isError && <div className={statusClass} role="alert"><p className="mb-[14px]">Couldn’t load client data: {company.error.message}</p><button className="cursor-pointer rounded border border-ink bg-white px-3 py-[7px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795bd6]" type="button" onClick={() => void company.refetch()}>Try again</button></div>}
      {company.isSuccess && (() => {
        const report = reportData(company.data, range, detail);
        if (!report) return <section className={statusClass} role="status">Daily detail is unavailable because the source contains monthly client counts only.</section>;
        const root = report.root;
        const reportDetail = detail === 'year' ? 'year' : 'month';
        const selected = selectedId ? findNode(root, selectedId) ?? root : root;
        return <>
          {detail === 'year' && <p className="text-sm text-ink/60">Yearly values show the last available month in each year.</p>}
          <Chart node={selected} labels={report.labels} detail={reportDetail} />
          <HierarchyTable root={root} selectedId={selected.id} onSelect={node => setSelectedId(node.id)} labels={report.labels} detail={reportDetail} />
        </>;
      })()}
    </div>
  </main>;
}
