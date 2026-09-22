# Bot Crossing

**Dubai-desert pixel colony** for AI agent workflows — a portfolio MVP with a local harness foundation.

Watch pixel agents (Claude, Cursor, Builder, Scout, …) path across sand dunes and build at scaffolding sites while a workflow log streams beside them. Demo mode uses rich mock data; Live mode best-effort scans local Cursor / Claude Code session paths and falls back to mock when none exist.

> Original MIT-friendly project. Theme: Dubai desert (dunes, heat haze, skyline silhouettes, golden hour) — not space.

## Requirements

- **Node.js 20+** (developed on Node 20; does not require Node 22)
- npm 9+

## Quick start

```bash
cd bot-crossing
npm install
npm run dev
```

Open **http://localhost:5173**

- UI + API share one process (`npm run dev`)
- API: `GET /api/threads`, `GET /api/logs`, `GET /api/colony`

### Production build

```bash
npm run build
npm run preview
```

## Demo vs Live

| Mode | What happens |
|------|----------------|
| **Demo** | Always uses mock threads + streaming mock log lines. Agents animate against demo sessions. |
| **Live** | Scans known local Cursor / Claude Code paths. If any sessions are found, those threads are returned. If none, safely falls back to mock (no errors, no uploads). |

Toggle in the top bar. The status pill shows `mock harness` or `live · N sessions` / `live · no sessions (mock)`.

**Privacy:** Live mode only reads local filesystem paths on your machine. Nothing is uploaded. No secrets are collected.

## Harness adapters

```
server/harnesses/
  types.ts    — shared Thread / LogLine model
  mock.ts     — rich demo threads + log templates
  cursor.ts   — best-effort Cursor transcript/project scan (Linux/macOS)
  claude.ts   — best-effort Claude Code session dirs
  index.ts    — merge; prefer live if any, else mock
```

Paths probed (examples): `~/.cursor/projects`, `~/.claude/projects`, `~/.claude/sessions`, plus common macOS Application Support locations. Missing dirs → empty array.

Colony layout is persisted in `data/colony.json` (sites + optional agent positions).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Express + Vite middleware (UI + API) |
| `npm run build` | Compile server TS + Vite client build |
| `npm run preview` | Serve production build with the same API |
| `npm run typecheck` | Client + server `tsc --noEmit` |

## Stack

- Vite + TypeScript + Canvas 2D (no Three.js)
- Express API co-located via Vite middleware mode in dev
- Node 20+

## License

MIT
