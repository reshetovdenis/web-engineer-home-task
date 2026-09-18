import { useState } from 'react';
import { Chart } from './Chart';
import { HierarchyTable } from './HierarchyTable';
import { ReportControls } from './ReportControls';
import { childrenOf, type BusinessNode } from './data';
import { detailForRange, fullReportRange, reportLabels, reportPage, type ReportDetail, type ReportRange } from './reportPeriod';
import { useReport } from './useReport';

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
  const [page, setPage] = useState(0);
  const report = useReport(range, detail);

  function changeDetail(next: ReportDetail) {
    setDetail(next);
    setPage(0);
  }

  function changeRange(next: ReportRange) {
    setRange(next);
    setDetail(detailForRange(next));
    setPage(0);
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
        const pageSize = detail === 'day' ? 31 : detail === 'month' ? 12 : 10;
        const pageCount = Math.ceil(labels.length / pageSize);
        const currentPage = Math.min(page, pageCount - 1);
        const visible = reportPage(report.data, labels, currentPage * pageSize, pageSize);
        const root = visible.root;
        const selected = selectedId ? findNode(root, selectedId) ?? root : root;
        return <>
          {pageCount > 1 && <div className="flex items-center justify-end gap-3 text-right text-sm text-ink/70 max-[601px]:gap-1 max-[601px]:text-[clamp(10px,2.9vw,14px)]">
            <span className="whitespace-nowrap">Showing {visible.labels[0]} – {visible.labels.at(-1)} ({currentPage + 1} of {pageCount})</span>
            <div className="flex shrink-0 gap-2 max-[601px]:gap-1">
              <button type="button" className="cursor-pointer rounded border border-ink/20 bg-white px-3 py-2 disabled:cursor-default disabled:opacity-40 max-[601px]:px-1.5 max-[601px]:py-1.5" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button>
              <button type="button" className="cursor-pointer rounded border border-ink/20 bg-white px-3 py-2 disabled:cursor-default disabled:opacity-40 max-[601px]:px-1.5 max-[601px]:py-1.5" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)}>Next</button>
            </div>
          </div>}
          <Chart node={selected} labels={visible.labels} detail={detail} />
          <HierarchyTable root={root} selectedId={selected.id} onSelect={node => setSelectedId(node.id)} labels={visible.labels} detail={detail} />
        </>;
      })()}
    </div>
  </main>;
}
