import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data', 'colony.json');

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
      theme: 'dubai-desert',
      sites: [],
      agents: [],
    };
    return fallback;
  }
  const raw = readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(raw) as ColonyLayout;
}

export function saveColony(layout: ColonyLayout): void {
  mkdirSync(dirname(DATA_PATH), { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(layout, null, 2) + '\n', 'utf8');
}
