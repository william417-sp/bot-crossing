import type { Agent, LogLinePayload } from '../world/types';

export function showAgentPanel(agent: Agent, logs: LogLinePayload[]): void {
  const panel = document.getElementById('agent-panel')!;
  panel.classList.remove('hidden');
  document.getElementById('panel-title')!.textContent = agent.name;

  const meta = document.getElementById('panel-meta')!;
  const roleDisplay = agent.role || 'bot';
  const taskDisplay = agent.threadTitle || '—';
  
  meta.innerHTML = `
    <div class="meta-row"><span class="meta-label">Role</span><span>${escapeHtml(roleDisplay)}</span></div>
    <div class="meta-row"><span class="meta-label">Task</span><span>${escapeHtml(taskDisplay)}</span></div>
    <div class="meta-row"><span class="meta-label">Harness</span><span>${escapeHtml(agent.harness)}</span></div>
    <div class="meta-row"><span class="meta-label">State</span><span>
      <span class="status ${escapeHtml(agent.state)}">${escapeHtml(agent.state)}</span>
      ${agent.teamStatus ? `<span class="status ${escapeHtml(agent.teamStatus)}">${escapeHtml(agent.teamStatus)}</span>` : ''}
    </span></div>
  `;

  const ul = document.getElementById('panel-logs')!;
  ul.innerHTML = '';
  const recent = logs.slice(-8);
  if (!recent.length) {
    const li = document.createElement('li');
    li.textContent = 'No activity yet.';
    ul.appendChild(li);
  } else {
    for (const line of recent) {
      const li = document.createElement('li');
      li.textContent = line.message;
      ul.appendChild(li);
    }
  }
}

export function hideAgentPanel(): void {
  document.getElementById('agent-panel')!.classList.add('hidden');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
