import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  getLogsForThread,
  getMergedThreads,
  getMockLogs,
  makeMockLog,
} from './harnesses/index.js';
import { loadColony, saveColony, type ColonyLayout } from './colony.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = Number(process.env.PORT) || 5173;
const isProd = process.env.NODE_ENV === 'production';

async function main() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, name: 'bot-crossing', node: process.version });
  });

  app.get('/api/threads', async (req, res) => {
    try {
      const mode = String(req.query.mode || 'demo');
      const forceMock = mode !== 'live';
      const result = await getMergedThreads(forceMock);
      if (mode === 'live' && result.source === 'mock') {
        res.json({
          ...result,
          note: 'No local Cursor/Claude sessions found; showing mock fallback.',
        });
        return;
      }
      res.json(result);
    } catch (err) {
      console.error('[api/threads]', err);
      res.status(500).json({ error: 'Failed to load threads' });
    }
  });

  app.get('/api/logs', async (req, res) => {
    try {
      const threadId = req.query.threadId ? String(req.query.threadId) : undefined;
      const mode = (String(req.query.mode || 'demo') === 'live' ? 'live' : 'demo') as
        | 'demo'
        | 'live';
      if (threadId) {
        const lines = await getLogsForThread(threadId, mode);
        res.json({ threadId, lines });
        return;
      }
      res.json({ threadId: null, lines: getMockLogs(undefined, 30) });
    } catch (err) {
      console.error('[api/logs]', err);
      res.status(500).json({ error: 'Failed to load logs' });
    }
  });

  app.get('/api/logs/next', (_req, res) => {
    res.json({ line: makeMockLog() });
  });

  app.get('/api/colony', (_req, res) => {
    try {
      res.json(loadColony());
    } catch (err) {
      console.error('[api/colony]', err);
      res.status(500).json({ error: 'Failed to load colony' });
    }
  });

  app.put('/api/colony', (req, res) => {
    try {
      const body = req.body as ColonyLayout;
      if (!body || typeof body !== 'object' || !Array.isArray(body.sites)) {
        res.status(400).json({ error: 'Invalid colony layout' });
        return;
      }
      saveColony(body);
      res.json({ ok: true });
    } catch (err) {
      console.error('[api/colony put]', err);
      res.status(500).json({ error: 'Failed to save colony' });
    }
  });

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
    console.log(`  API            ·  http://localhost:${PORT}/api/threads`);
    console.log(`  Mode           ·  ${isProd ? 'production' : 'dev'}  ·  Node ${process.version}\n`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
