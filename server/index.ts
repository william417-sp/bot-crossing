import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { createApp } from './app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = Number(process.env.PORT) || 5173;
const isProd = process.env.NODE_ENV === 'production';

async function main() {
  const app = createApp();

  if (isProd) {
    const dist = join(ROOT, 'dist');
    if (!existsSync(dist)) {
      console.error('dist/ missing — run npm run build first');
      process.exit(1);
    }
    app.use(express.static(dist));
    app.get('*', (_req, res) => {
      res.sendFile(join(dist, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      root: ROOT,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = createHttpServer(app);
  server.listen(PORT, () => {
    console.log(`\n  Bot Crossing  ·  http://localhost:${PORT}`);
    console.log(`  Stark Garage  ·  William Rosado's Agency HQ`);
    console.log(`  API           ·  http://localhost:${PORT}/api/team`);
    console.log(`  Mode          ·  ${isProd ? 'production' : 'dev'}  ·  Node ${process.version}\n`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
