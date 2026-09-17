import express from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const app = express();
const payload = JSON.parse(await readFile(new URL('../data/company.json', import.meta.url), 'utf8'));
const port = Number(process.env.PORT || 3002);

app.get('/api/company', (_request, response) => {
  response.set('Cache-Control', 'no-store');
  response.json(payload);
});

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
