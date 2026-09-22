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
import { getTeam, getMockTeamActivity, updateAgentStatus } from './team.js';

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

  // Team API endpoints
  app.get('/api/team', (_req, res) => {
    try {
      const team = getMockTeamActivity();
      res.json(team);
    } catch (err) {
      console.error('[api/team]', err);
      res.status(500).json({ error: 'Failed to load team' });
    }
  });

  app.post('/api/team/:agentId/status', (req, res) => {
    try {
      const { agentId } = req.params;
      const { status, task } = req.body as { status?: string; task?: string };
      
      if (!status || !['idle', 'working', 'blocked'].includes(status)) {
        res.status(400).json({ error: 'Invalid status. Must be: idle, working, or blocked' });
        return;
      }
      
      const result = updateAgentStatus(agentId, status as 'idle' | 'working' | 'blocked', task);
      if (!result.success) {
        res.status(404).json({ error: result.error });
        return;
      }
      
      res.json({ ok: true, agentId, status, task });
    } catch (err) {
      console.error('[api/team/:id/status]', err);
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  app.get('/api/logs', async (req, res) => {
    try {
      const threadId = req.query.threadId ? String(req.query.threadId) : undefined;
      const modeParam = String(req.query.mode || 'demo');
      const mode = modeParam === 'live' ? 'live' : 'demo';
      const teamMode = modeParam === 'team';
      
      if (threadId) {
        const lines = await getLogsForThread(threadId, mode);
        res.json({ threadId, lines });
        return;
      }
      res.json({ threadId: null, lines: getMockLogs(undefined, 30, teamMode) });
    } catch (err) {
      console.error('[api/logs]', err);
      res.status(500).json({ error: 'Failed to load logs' });
    }
  });

  app.get('/api/logs/next', (req, res) => {
    const teamMode = req.query.team === '1';
    res.json({ line: makeMockLog(undefined, teamMode) });
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
    console.log(`  Stark Garage  ·  William Rosado's Agency HQ`);
    console.log(`  API           ·  http://localhost:${PORT}/api/team`);
    console.log(`  Mode          ·  ${isProd ? 'production' : 'dev'}  ·  Node ${process.version}\n`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
