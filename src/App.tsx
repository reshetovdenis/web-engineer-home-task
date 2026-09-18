import { useState } from 'react';
import { Chart } from './Chart';
import { HierarchyTable } from './HierarchyTable';
import { ReportControls } from './ReportControls';
import { childrenOf, type BusinessNode } from './data';
import { fullReportRange, isOriginalMonthlyReport, reportData, reportPage, type ReportDetail, type ReportRange } from './reportPeriod';
import { useCompany } from './useCompany';
import { useGeneratedReport } from './useGeneratedReport';

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
  const company = useCompany();
  const originalMonthly = isOriginalMonthlyReport(range, detail);
  const generatedReport = useGeneratedReport(range, detail, !originalMonthly && company.isSuccess, company.data);

  function changeDetail(next: ReportDetail) {
    setDetail(next);
    setPage(0);
  }

  function changeRange(next: ReportRange) {
    setRange(next);
    setPage(0);
  }

  const statusClass = 'min-h-[100px] min-w-0 max-w-full overflow-hidden rounded-lg bg-white p-6 text-sm';

  return <main className="min-h-screen min-w-80 bg-paper px-4 pb-10 font-sans text-ink antialiased [font-synthesis:none] [text-rendering:optimizeLegibility] max-[601px]:px-3">
    <div className="mx-auto flex w-full max-w-[1408px] min-w-0 flex-col gap-4 pt-6 max-[601px]:pt-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[35px]/[44px] font-normal max-[601px]:text-[30px]/[40px]">Clients</h1>
        <ReportControls range={range} onRangeChange={changeRange} detail={detail} onDetailChange={changeDetail} />
      </header>
      {company.isPending && <div className={statusClass} role="status">Loading client data…</div>}
      {company.isError && <div className={statusClass} role="alert"><p className="mb-[14px]">Couldn’t load client data: {company.error.message}</p><button className="cursor-pointer rounded border border-ink bg-white px-3 py-[7px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795bd6]" type="button" onClick={() => void company.refetch()}>Try again</button></div>}
      {company.isSuccess && (() => {
        if (!originalMonthly && generatedReport.isPending) return <section className={statusClass} role="status">Loading report…</section>;
        if (!originalMonthly && generatedReport.isError) return <section className={statusClass} role="alert">Couldn’t load report: {generatedReport.error.message} <button type="button" className="ml-2 cursor-pointer underline" onClick={() => void generatedReport.refetch()}>Try again</button></section>;
        const report = originalMonthly ? reportData(company.data, range, 'month') : generatedReport.data;
        if (!report) return null;
        const pageSize = detail === 'day' ? 31 : detail === 'month' ? 12 : 10;
        const pageCount = Math.ceil(report.labels.length / pageSize);
        const currentPage = Math.min(page, pageCount - 1);
        const visible = reportPage(report.root, report.labels, currentPage * pageSize, pageSize);
        const root = visible.root;
        const selected = selectedId ? findNode(root, selectedId) ?? root : root;
        return <>
          {pageCount > 1 && <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink/70">
            <span>Showing {visible.labels[0]} – {visible.labels.at(-1)} ({currentPage + 1} of {pageCount})</span>
            <div className="flex gap-2">
              <button type="button" className="cursor-pointer rounded border border-ink/20 bg-white px-3 py-2 disabled:cursor-default disabled:opacity-40" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button>
              <button type="button" className="cursor-pointer rounded border border-ink/20 bg-white px-3 py-2 disabled:cursor-default disabled:opacity-40" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)}>Next</button>
            </div>
          </div>}
          <Chart node={selected} labels={visible.labels} detail={detail} />
          <HierarchyTable root={root} selectedId={selected.id} onSelect={node => setSelectedId(node.id)} labels={visible.labels} detail={detail} />
        </>;
      })()}
    </div>
  </main>;
}
