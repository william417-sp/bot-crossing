import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { COLONY_PATH } from './paths.js';

const DATA_PATH = COLONY_PATH;

export interface ColonySite {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: string;
}

export interface ColonyAgent {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  role?: string;
}

export interface ColonyLayout {
  version: number;
  theme: string;
  sites: ColonySite[];
  agents: ColonyAgent[];
}

export function loadColony(): ColonyLayout {
  if (!existsSync(DATA_PATH)) {
    const fallback: ColonyLayout = {
      version: 1,
      theme: 'stark-garage',
      sites: [],
      agents: [],
    };
    return fallback;
  }
  const raw = readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(raw) as ColonyLayout;
}

export function saveColony(layout: ColonyLayout): { ok: boolean; readOnly?: boolean } {
  try {
    mkdirSync(dirname(DATA_PATH), { recursive: true });
    writeFileSync(DATA_PATH, JSON.stringify(layout, null, 2) + '\n', 'utf8');
    return { ok: true };
  } catch {
    // Read-only filesystem (e.g., Vercel) — layout not persisted
    return { ok: true, readOnly: true };
  }
}
