import { useState } from 'react';
import { Chart } from './Chart';
import { ErrorOverlay } from './ErrorOverlay';
import { HierarchyTable } from './HierarchyTable';
import { ReportControls } from './ReportControls';
import { Spinner } from './Spinner';
import { childrenOf, type BusinessNode } from './viewModel';
import { allowsDayDetail, detailForRange, fullReportRange, reportLabels, type ReportDetail, type ReportRange } from './reportPeriod';
import { useLoadReportChildren, useReport } from './useReport';


// findNode is O(n), but the BusinessNode tree stays small because company
// data is loaded incrementally, so the performance impact is negligible.
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
  const [childLoadError, setChildLoadError] = useState<{ nodeId: string; nodeName: string; message: string } | null>(null);
  const report = useReport(range, detail);
  const loadChildren = useLoadReportChildren(range, detail);

  function changeDetail(next: ReportDetail) {
    if (next === 'day' && !allowsDayDetail(range)) return;
    setChildLoadError(null);
    setDetail(next);
  }

  function changeRange(next: ReportRange) {
    setChildLoadError(null);
    setRange(next);
    setDetail(detailForRange(next));
  }

  function loadSelectedChildren(node: BusinessNode) {
    setChildLoadError(null);
    void loadChildren(node).catch(error => {
      const message = error instanceof Error ? error.message : 'Unknown error.';
      setChildLoadError({ nodeId: node.id, nodeName: node.name, message });
    });
  }

  return <main className="min-h-screen min-w-80 bg-paper px-4 pb-10 font-sans text-ink antialiased [font-synthesis:none] [text-rendering:optimizeLegibility] max-[601px]:px-3">
    <div className="mx-auto flex w-full max-w-[1408px] min-w-0 flex-col gap-4 pt-6 max-[601px]:pt-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[35px]/[44px] font-normal max-[601px]:text-[30px]/[40px]">Clients</h1>
        <ReportControls range={range} onRangeChange={changeRange} detail={detail} onDetailChange={changeDetail} />
      </header>
      {report.isPending && <Spinner />}
      {report.isError && <ErrorOverlay
        title="Couldn’t load client data"
        message={report.error.message}
        onRetry={() => void report.refetch()}
      />}
      {report.isSuccess && (() => {
        const labels = reportLabels(range, detail);
        const root = report.data;
        const selected = selectedId ? findNode(root, selectedId) ?? root : root;
        return <>
          <Chart node={selected} labels={labels} detail={detail} />
          {childLoadError?.nodeId === selected.id && <ErrorOverlay
            title={`Couldn’t load children for ${childLoadError.nodeName}`}
            message={childLoadError.message}
            onRetry={() => loadSelectedChildren(selected)}
          />}
          <HierarchyTable
            root={root}
            selectedId={selected.id}
            onSelect={node => {
              setSelectedId(node.id);
              loadSelectedChildren(node);
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
