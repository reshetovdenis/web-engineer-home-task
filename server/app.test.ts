import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import company from '../data/company.json';
import { app } from './app.ts';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = await new Promise<Server>(resolve => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not determine test server address.');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

async function get(path: string) {
  return fetch(`${baseUrl}${path}`);
}

describe('report API', () => {
  it('serves the lazy root report and paginated child contract', async () => {
    const rootResponse = await get('/api/report?from=2024-02-01&to=2025-01-31&detail=month');
    expect(rootResponse.status).toBe(200);
    expect(rootResponse.headers.get('cache-control')).toBe('no-store');
    const root = await rootResponse.json();
    expect(root.id).toBe(company.id);
    expect(root.branches).toHaveLength(company.branches!.length);
    expect(root.branches[0].employees).toBeUndefined();
    expect(root.branches[0].hasChildren).toBe(true);
    expect(root.branches[0].childrenLoaded).toBe(false);

    const parentId = encodeURIComponent(company.branches![0].id);
    const childResponse = await get(`/api/report/children?parentId=${parentId}&from=2024-02-01&to=2025-01-31&detail=month&offset=0&limit=2`);
    expect(childResponse.status).toBe(200);
    expect(childResponse.headers.get('cache-control')).toBe('no-store');
    const branch = await childResponse.json();
    expect(branch.id).toBe(company.branches![0].id);
    expect(branch.childCount).toBe(company.branches![0].employees!.length);
    expect(branch.employees).toHaveLength(2);
    expect(branch.childrenLoaded).toBe(false);
    expect(branch.employees[0].channels).toBeUndefined();
  });

  it.each([
    ['/api/report/children?from=2024-02-01&to=2025-01-31&detail=month', 400],
    ['/api/report/children?parentId=missing&from=2024-02-01&to=2025-01-31&detail=month', 404],
    [`/api/report/children?parentId=${encodeURIComponent(company.branches![0].id)}&from=2024-02-01&to=2025-01-31&detail=month&offset=-1`, 400],
    [`/api/report/children?parentId=${encodeURIComponent(company.branches![0].id)}&from=2024-02-01&to=2025-01-31&detail=month&limit=101`, 400],
    ['/api/report?from=2024-02-01&to=2025-01-31&detail=week', 400],
    ['/api/report?from=2025-02-30&to=2025-03-01&detail=month', 400],
    ['/api/report?from=2019-12-31&to=2024-01-01&detail=month', 400],
    ['/api/report?from=2024-01-15&to=2025-01-16&detail=day', 400],
  ])('returns the expected status for invalid request %s -> %i', async (path, expectedStatus) => {
    expect((await get(path)).status).toBe(expectedStatus);
  });
});
