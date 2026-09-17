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
  const [retry, setRetry] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const state = useCompany(retry);

  return <main className="page">
    <div className="content">
      <h1>Clients</h1>
      {state.status === 'loading' && <div className="status-card" role="status">Loading client data…</div>}
      {state.status === 'error' && <div className="status-card" role="alert"><p>Couldn’t load client data: {state.message}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
      {state.status === 'success' && (() => {
        const root = state.data;
        const selected = selectedId ? findNode(root, selectedId) ?? root : root;
        return <>
          <Chart node={selected} />
          <HierarchyTable root={root} selectedId={selected.id} onSelect={node => setSelectedId(node.id)} />
        </>;
      })()}
    </div>
  </main>;
}
