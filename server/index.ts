import { app } from './app.js';

const port = Number(process.env.PORT || 3002);

app.listen(port, error => {
  if (error) {
    console.error(`Could not start Cool Startup API on port ${port}:`, error);
    process.exitCode = 1;
    return;
  }
  console.log(`Cool Startup API listening on http://localhost:${port}`);
});
