import { useQuery } from '@tanstack/react-query';
import type { BusinessNode } from './data';

export function useCompany() {
  return useQuery({
    queryKey: ['company'],
    queryFn: async ({ signal }): Promise<BusinessNode> => {
      const response = await fetch('/api/company', { signal });
      if (!response.ok) throw new Error(`The server returned ${response.status}.`);
      return response.json() as Promise<BusinessNode>;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
