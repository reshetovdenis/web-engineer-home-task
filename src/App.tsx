import { useState } from 'react';
import { Chart } from './Chart';
import { HierarchyTable } from './HierarchyTable';
import { ReportControls } from './ReportControls';
import { childrenOf, type BusinessNode } from './viewModel';
import { allowsDayDetail, detailForRange, fullReportRange, reportLabels, type ReportDetail, type ReportRange } from './reportPeriod';
import { useLoadReportChildren, useReport } from './useReport';

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
  const report = useReport(range, detail);
  const loadChildren = useLoadReportChildren(range, detail);

  function changeDetail(next: ReportDetail) {
    if (next === 'day' && !allowsDayDetail(range)) return;
    setDetail(next);
  }

  function changeRange(next: ReportRange) {
    setRange(next);
    setDetail(detailForRange(next));
  }

  const statusClass = 'min-h-[100px] min-w-0 max-w-full overflow-hidden rounded-lg bg-white p-6 text-sm';

  return <main className="min-h-screen min-w-80 bg-paper px-4 pb-10 font-sans text-ink antialiased [font-synthesis:none] [text-rendering:optimizeLegibility] max-[601px]:px-3">
    <div className="mx-auto flex w-full max-w-[1408px] min-w-0 flex-col gap-4 pt-6 max-[601px]:pt-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[35px]/[44px] font-normal max-[601px]:text-[30px]/[40px]">Clients</h1>
        <ReportControls range={range} onRangeChange={changeRange} detail={detail} onDetailChange={changeDetail} />
      </header>
      {report.isPending && <div className={statusClass} role="status">Loading client data…</div>}
      {report.isError && <div className={statusClass} role="alert"><p className="mb-[14px]">Couldn’t load client data: {report.error.message}</p><button className="cursor-pointer rounded border border-ink bg-white px-3 py-[7px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795bd6]" type="button" onClick={() => void report.refetch()}>Try again</button></div>}
      {report.isSuccess && (() => {
        const labels = reportLabels(range, detail);
        const root = report.data;
        const selected = selectedId ? findNode(root, selectedId) ?? root : root;
        return <>
          <Chart node={selected} labels={labels} detail={detail} />
          <HierarchyTable
            root={root}
            selectedId={selected.id}
            onSelect={node => {
              setSelectedId(node.id);
              void loadChildren(node).catch(() => undefined);
            }}
            onLoadChildren={loadChildren}
            labels={labels}
            detail={detail}
          />
        </>;
      })()}
    </div>
  </main>;
}
