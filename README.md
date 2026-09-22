# Bot Crossing

**Tony Stark–style garage HQ visualization** for William Rosado's AI agent team — a portfolio MVP with real-time bot status tracking.

Watch cute Astro-inspired robot agents work at holographic workstations in a high-tech garage environment. Each bot represents a member of William's Grok Bot agency team, showing real-time status (working, idle, blocked) with playful animations and glowing holographic UI.

> Original MIT-friendly project. Theme: Stark-style garage workshop (concrete floor, tool walls, holographic panels, glowing blue accents) — friendly robot crew energy.

## Features

- **Garage Environment:** Dark industrial backdrop with ceiling lights, tool racks, equipment bays, floating holograms, scan lines, and particle sparks
- **Cute Robot Agents:** Astro Bot-inspired original designs with big visor eyes, bounce animations, and expressive states
- **Team Roster:** William's actual Grok Bot team:
  - Chief of Staff (coordinator)
  - Client Sites (deployer)
  - Front-End Designer (designer)
  - Bot Crossing World (builder)
  - Assistant (helper)
  - Tradebot (analyst)
- **Workstations:** Holographic desks, server racks, charging bays, fabricators with active task visualization
- **Real-time Status:** Working bots animate at workstations; idle bots chill at charging pads; blocked bots show waiting indicators

## Requirements

- **Node.js 20+** (developed on Node 20)
- npm 9+

## Quick start

```bash
cd bot-crossing
npm install
npm run dev
```

Open **http://localhost:5173**

- UI + API share one process (`npm run dev`)
- API: `GET /api/team`, `GET /api/threads`, `GET /api/logs`, `GET /api/colony`

### Production build

```bash
npm run build
npm run preview
```

## Modes

| Mode | What happens |
|------|--------------|
| **Demo** | Mock threads + streaming log lines. Agents animate against demo sessions. |
| **Live** | Scans local Cursor / Claude Code paths for real sessions. Falls back to mock if none found. |
| **Team** | Shows William's team roster with rotating mock activity. Status can be updated via API. |

Toggle modes in the top bar. The status pill shows current mode and active bot count.

## Team API

### Get team status
```bash
GET /api/team
```
Returns current status of all team members.

### Update bot status
```bash
POST /api/team/:agentId/status
Content-Type: application/json

{
  "status": "working" | "idle" | "blocked",
  "task": "Optional current task description"
}
```
Use this to integrate with real orchestration — mark bots as working when they start tasks.

## Extending the Team

Edit `data/team.json` to add or modify team members:

```json
{
  "version": 1,
  "theme": "stark-garage",
  "workstations": [
    { "id": "ws-new", "name": "New Station", "x": 0.5, "y": 0.6, "kind": "holodesk" }
  ],
  "agents": [
    {
      "id": "bot-new",
      "name": "New Bot",
      "role": "specialist",
      "x": 0.5,
      "y": 0.55,
      "color": "#ff6b6b",
      "description": "Does something cool"
    }
  ]
}
```

Workstation kinds: `workbench`, `holodesk`, `server`, `charger`, `fabricator`

## Project Structure

```
src/
  world/
    garage.ts   — Stark-style garage environment renderer
    agents.ts   — Astro-inspired robot rendering + workstation drawing
    types.ts    — TypeScript interfaces
  ui/
    panel.ts    — Agent detail panel
    logs.ts     — Workflow log stream
  styles/
    main.css    — Sci-fi blue theme
  api.ts        — API client
  main.ts       — Canvas loop + mode switching

server/
  index.ts      — Express server + API routes
  team.ts       — Team status management
  colony.ts     — Colony layout persistence
  harnesses/    — Mock, Cursor, Claude adapters

data/
  team.json     — Team roster configuration
  colony.json   — Workstation + agent positions
```

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
