import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function findDataDir(): string {
  const candidates = [
    join(__dirname, '..', 'data'),
    join(process.cwd(), 'data'),
    resolve('data'),
  ];
  
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  
  return candidates[0];
}

export const DATA_DIR = findDataDir();
export const TEAM_PATH = join(DATA_DIR, 'team.json');
export const COLONY_PATH = join(DATA_DIR, 'colony.json');
export const STATUS_PATH = join(DATA_DIR, 'team-status.json');
