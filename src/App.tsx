import { useState } from 'react';
import { Chart } from './Chart';
import { HierarchyTable } from './HierarchyTable';
import { childrenOf, type BusinessNode } from './data';
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
  const company = useCompany();

  const statusClass = 'min-h-[100px] min-w-0 max-w-full overflow-hidden rounded-lg bg-white p-6 text-sm';

  return <main className="min-h-screen min-w-80 bg-paper px-4 pb-10 font-sans text-ink antialiased [font-synthesis:none] [text-rendering:optimizeLegibility] max-[601px]:px-3">
    <div className="mx-auto flex w-full max-w-[1408px] min-w-0 flex-col gap-4 pt-6 max-[601px]:pt-5">
      <h1 className="text-[35px]/[44px] font-normal max-[601px]:text-[30px]/[40px]">Clients</h1>
      {company.isPending && <div className={statusClass} role="status">Loading client data…</div>}
      {company.isError && <div className={statusClass} role="alert"><p className="mb-[14px]">Couldn’t load client data: {company.error.message}</p><button className="cursor-pointer rounded border border-ink bg-white px-3 py-[7px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#795bd6]" type="button" onClick={() => void company.refetch()}>Try again</button></div>}
      {company.isSuccess && (() => {
        const root = company.data;
        const selected = selectedId ? findNode(root, selectedId) ?? root : root;
        return <>
          <Chart node={selected} />
          <HierarchyTable root={root} selectedId={selected.id} onSelect={node => setSelectedId(node.id)} />
        </>;
      })()}
    </div>
  </main>;
}
