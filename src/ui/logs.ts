import type { LogLinePayload } from '../world/types';

const streamEl = () => document.getElementById('log-stream')!;

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return '--:--:--';
  }
}

export function renderLogLines(lines: LogLinePayload[], append = false): void {
  const el = streamEl();
  if (!append) el.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const line of lines) {
    frag.appendChild(makeLogRow(line));
  }
  el.appendChild(frag);
  el.scrollTop = el.scrollHeight;
}

export function appendLogLine(line: LogLinePayload): void {
  const el = streamEl();
  el.appendChild(makeLogRow(line));
  while (el.children.length > 80) {
    el.removeChild(el.firstChild!);
  }
  el.scrollTop = el.scrollHeight;
}

function makeLogRow(line: LogLinePayload): HTMLElement {
  const row = document.createElement('div');
  row.className = 'log-line';
  const source = line.agentName || line.harness;
  row.innerHTML = `
    <span class="ts">${formatTime(line.timestamp)}</span>
    <span class="harness">${escapeHtml(source)}</span>
    <span class="msg level-${escapeHtml(line.level)}">${escapeHtml(line.message)}</span>
  `;
  return row;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function setLogModeLabel(text: string): void {
  const el = document.getElementById('log-mode-label');
  if (el) el.textContent = text;
}
