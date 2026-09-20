import express from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { BusinessNode } from '../src/report/data.js';
import { createLazyReportPage } from './report.ts';
import { companyForReportRange } from './demoData.ts';

const app = express();

// Vitest/Vite can rewrite import.meta.url to a non-file URL. Resolve static
// project assets from the module location in Node and fall back to cwd in tests.
const projectRoot = import.meta.url.startsWith('file:')
  ? resolve(dirname(fileURLToPath(import.meta.url)), '..')
  : process.cwd();
const payloadPath = resolve(projectRoot, 'data/company.json');
const avatarsDirectory = resolve(projectRoot, 'data/images/avatars');
const distDirectory = resolve(projectRoot, 'dist');
const payload: BusinessNode = JSON.parse(await readFile(payloadPath, 'utf8'));

function buildNodeIndex(root: BusinessNode): Map<string, BusinessNode> {
  const index = new Map<string, BusinessNode>();
  const visit = (node: BusinessNode) => {
    index.set(node.id, node);
    for (const child of [...(node.branches ?? []), ...(node.employees ?? []), ...(node.channels ?? [])]) visit(child);
  };
  visit(root);
  return index;
}

function sendReportError(response: express.Response, error: unknown) {
  if (error instanceof RangeError) return response.status(400).json({ error: error.message });
  throw error;
}

const childPageSize = 50;

function childPage(request: express.Request) {
  const offset = request.query.offset === undefined ? 0 : Number(request.query.offset);
  const limit = request.query.limit === undefined ? childPageSize : Number(request.query.limit);
  if (!Number.isInteger(offset) || offset < 0) throw new RangeError('offset must be a non-negative integer.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError('limit must be between 1 and 100.');
  return { offset, limit };
}

app.get('/api/report/children', (request, response) => {
  try {
    const parentId = request.query.parentId;
    if (typeof parentId !== 'string') return response.status(400).json({ error: 'parentId is required.' });
    const reportSource = companyForReportRange(payload, request.query.from, request.query.to);
    const nodesById = buildNodeIndex(reportSource);
    const node = nodesById.get(parentId);
    if (!node) return response.status(404).json({ error: 'Business node not found.' });

    const { offset, limit } = childPage(request);
    const report = createLazyReportPage(node, request.query.from, request.query.to, request.query.detail, offset, limit);
    response.set('Cache-Control', 'no-store');
    response.json(report);
  } catch (error) {
    return sendReportError(response, error);
  }
});

app.get('/api/report', (request, response) => {
  try {
    // The original period keeps the small supplied fixture. Generated periods
    // add a large deterministic branch so row virtualization is easy to demo.
    // Only the first page of root children is projected up front; deeper
    // levels and later child pages are requested as the virtualized tree needs them.
    const reportSource = companyForReportRange(payload, request.query.from, request.query.to);
    const report = createLazyReportPage(reportSource, request.query.from, request.query.to, request.query.detail, 0, childPageSize);
    response.set('Cache-Control', 'no-store');
    response.json(report);
  } catch (error) {
    return sendReportError(response, error);
  }
});
app.use('/api/avatars', express.static(avatarsDirectory, { maxAge: '1d' }));
app.use('/api', (_request, response) => response.sendStatus(404));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distDirectory));
  app.get('/{*path}', (_request, response) => response.sendFile(resolve(distDirectory, 'index.html')));
}


export { app };
