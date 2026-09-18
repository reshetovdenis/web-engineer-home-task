import express from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { BusinessNode } from '../src/data.js';
import { createReport } from './report.ts';

const app = express();
const payload: BusinessNode = JSON.parse(await readFile(new URL('../data/company.json', import.meta.url), 'utf8'));
const avatarsDirectory = fileURLToPath(new URL('../data/images/avatars/', import.meta.url));
const port = Number(process.env.PORT || 3002);

app.get('/api/report', (request, response) => {
  try {
    const report = createReport(payload, request.query.from, request.query.to, request.query.detail);
    response.set('Cache-Control', 'no-store');
    response.json(report);
  } catch (error) {
    if (error instanceof RangeError) return response.status(400).json({ error: error.message });
    throw error;
  }
});
app.use('/api/avatars', express.static(avatarsDirectory, { maxAge: '1d' }));
app.use('/api', (_request, response) => response.sendStatus(404));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(fileURLToPath(new URL('../dist/', import.meta.url))));
  app.get('/{*path}', (_request, response) => response.sendFile(fileURLToPath(new URL('../dist/index.html', import.meta.url))));
}

app.listen(port, error => {
  if (error) {
    console.error(`Could not start Cool Startup API on port ${port}:`, error);
    process.exitCode = 1;
    return;
  }
  console.log(`Cool Startup API listening on http://localhost:${port}`);
});
