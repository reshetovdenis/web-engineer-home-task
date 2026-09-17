import { useEffect, useState } from 'react';
import type { BusinessNode } from './data';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: BusinessNode };

export function useCompany(retry: number): State {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetch('/api/company', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(`The server returned ${response.status}.`);
        return response.json() as Promise<BusinessNode>;
      })
      .then(data => setState({ status: 'success', data }))
      .catch(error => {
        if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
      });
    return () => controller.abort();
  }, [retry]);

  return state;
}
