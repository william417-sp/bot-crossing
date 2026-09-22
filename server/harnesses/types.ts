/** Shared thread / session model for harness adapters */

export type ThreadStatus = 'idle' | 'running' | 'waiting' | 'errored' | 'done';

export interface Thread {
  id: string;
  title: string;
  harness: 'mock' | 'cursor' | 'claude' | string;
  status: ThreadStatus;
  repo?: string;
  updatedAt: string; // ISO
  snippet?: string;
  agentName?: string;
}

export interface LogLine {
  id: string;
  threadId: string;
  timestamp: string; // ISO
  harness: string;
  level: 'info' | 'warn' | 'error' | 'action';
  message: string;
}

export interface HarnessAdapter {
  name: string;
  /** Scan local paths; return [] if nothing found or inaccessible */
  scanThreads(): Promise<Thread[]>;
  /** Recent log lines for a thread; may return [] */
  getLogs?(threadId: string): Promise<LogLine[]>;
}
