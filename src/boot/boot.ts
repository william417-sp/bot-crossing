/**
 * AAA Console-style Boot Sequence
 * Immersive "just booted a blockbuster next-gen title" experience
 * Works with Three.js 3D world
 */

export interface BootCallbacks {
  onComplete: () => void;
  onProgress?: (phase: BootPhase, progress: number) => void;
}

export type BootPhase = 'init' | 'logo' | 'title' | 'flyIn' | 'complete';

interface BootState {
  phase: BootPhase;
  startTime: number;
  phaseStart: number;
  skipRequested: boolean;
  inputReceived: boolean;
  flyInProgress: number;
}

const PHASE_DURATIONS: Record<BootPhase, number> = {
  init: 600,
  logo: 2400,
  title: Infinity,
  flyIn: 2200,
  complete: 0,
};

let state: BootState = {
  phase: 'init',
  startTime: 0,
  phaseStart: 0,
  skipRequested: false,
  inputReceived: false,
  flyInProgress: 0,
};

let animFrame: number | null = null;
let callbacks: BootCallbacks | null = null;
let bootContainer: HTMLElement | null = null;

export function startBootSequence(cb: BootCallbacks): void {
  callbacks = cb;
  state = {
    phase: 'init',
    startTime: performance.now(),
    phaseStart: performance.now(),
    skipRequested: false,
    inputReceived: false,
    flyInProgress: 0,
  };

  createBootUI();
  setupInputHandlers();
  animFrame = requestAnimationFrame(bootLoop);
}

export function skipBoot(): void {
  state.skipRequested = true;
}

export function getBootState(): Readonly<BootState> {
  return state;
}

function createBootUI(): void {
  bootContainer = document.createElement('div');
  bootContainer.id = 'boot-screen';
  bootContainer.innerHTML = `
    <div class="boot-layer boot-dark"></div>
    <div class="boot-layer boot-vignette"></div>
    <div class="boot-layer boot-noise"></div>
    
    <div class="boot-content">
      <div class="boot-logo-section">
        <div class="studio-logo">
          <div class="studio-icon">
            <svg viewBox="0 0 64 64" class="hex-icon">
              <defs>
                <linearGradient id="bootGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#60a5fa"/>
                  <stop offset="50%" style="stop-color:#93c5fd"/>
                  <stop offset="100%" style="stop-color:#3b82f6"/>
                </linearGradient>
                <filter id="bootGlow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <polygon points="32,4 58,18 58,46 32,60 6,46 6,18" 
                       fill="none" stroke="url(#bootGrad)" stroke-width="2" 
                       filter="url(#bootGlow)" class="hex-outline"/>
              <circle cx="32" cy="32" r="12" fill="url(#bootGrad)" class="hex-core"/>
              <circle cx="32" cy="32" r="6" fill="#ffffff" class="hex-center"/>
            </svg>
          </div>
          <div class="studio-name">
            <span class="studio-main">BOT CROSSING</span>
            <span class="studio-sub">GROK BOT HQ</span>
          </div>
        </div>
      </div>
      
      <div class="boot-title-section">
        <div class="title-container">
          <h1 class="game-title">
            <span class="title-line title-bot">BOT</span>
            <span class="title-line title-crossing">CROSSING</span>
          </h1>
          <div class="title-subtitle">AGENCY HEADQUARTERS</div>
          <div class="title-prompt">
            <span class="prompt-text">PRESS ANY KEY</span>
            <span class="prompt-separator">—</span>
            <span class="prompt-alt">CLICK TO ENTER</span>
          </div>
        </div>
        <div class="title-footer">
          <div class="footer-line"></div>
          <span class="footer-text">A WILLIAM ROSADO PRODUCTION</span>
          <div class="footer-line"></div>
        </div>
      </div>
    </div>
    
    <button class="boot-skip" type="button" aria-label="Skip intro">
      <span>SKIP</span>
      <kbd>ESC</kbd>
    </button>
    
    <div class="boot-letterbox top"></div>
    <div class="boot-letterbox bottom"></div>
  `;

  document.body.appendChild(bootContainer);

  const skipBtn = bootContainer.querySelector('.boot-skip') as HTMLButtonElement;
  skipBtn?.addEventListener('click', () => skipBoot());
}

function setupInputHandlers(): void {
  const handleInput = (e: Event) => {
    if (state.phase === 'title' && !state.inputReceived) {
      state.inputReceived = true;
      transitionPhase('flyIn');
      
      if (e instanceof KeyboardEvent && e.key === 'Escape') {
        return;
      }
    }
  };

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      skipBoot();
    }
  };

  window.addEventListener('keydown', handleInput);
  window.addEventListener('keydown', handleEscape);
  window.addEventListener('click', handleInput);
  window.addEventListener('touchstart', handleInput, { passive: true });

  const cleanup = () => {
    window.removeEventListener('keydown', handleInput);
    window.removeEventListener('keydown', handleEscape);
    window.removeEventListener('click', handleInput);
    window.removeEventListener('touchstart', handleInput);
  };

  (window as unknown as Record<string, unknown>).__bootCleanup = cleanup;
}

function transitionPhase(next: BootPhase): void {
  state.phase = next;
  state.phaseStart = performance.now();

  if (bootContainer) {
    bootContainer.dataset.phase = next;
  }

  callbacks?.onProgress?.(next, 0);
}

function bootLoop(ts: number): void {
  const elapsed = ts - state.phaseStart;
  const duration = PHASE_DURATIONS[state.phase];
  const progress = Math.min(1, elapsed / duration);

  if (state.skipRequested) {
    completeBoot();
    return;
  }

  callbacks?.onProgress?.(state.phase, progress);

  switch (state.phase) {
    case 'init':
      if (progress >= 1) {
        transitionPhase('logo');
      }
      break;

    case 'logo':
      updateLogoPhase(progress);
      if (progress >= 1) {
        transitionPhase('title');
      }
      break;

    case 'title':
      updateTitlePhase(ts);
      break;

    case 'flyIn':
      state.flyInProgress = easeOutCubic(progress);
      updateFlyInPhase(state.flyInProgress);
      if (progress >= 1) {
        completeBoot();
        return;
      }
      break;
  }

  animFrame = requestAnimationFrame(bootLoop);
}

function updateLogoPhase(progress: number): void {
  if (!bootContainer) return;

  const logo = bootContainer.querySelector('.studio-logo') as HTMLElement;
  if (logo) {
    const fadeIn = Math.min(1, progress * 3);
    const fadeOut = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
    logo.style.opacity = String(fadeIn * fadeOut);
    logo.style.transform = `scale(${0.9 + fadeIn * 0.1}) translateY(${(1 - fadeIn) * 20}px)`;
  }
}

function updateTitlePhase(ts: number): void {
  if (!bootContainer) return;

  const prompt = bootContainer.querySelector('.title-prompt') as HTMLElement;
  if (prompt) {
    const pulse = 0.6 + 0.4 * Math.sin(ts / 400);
    prompt.style.opacity = String(pulse);
  }
}

function updateFlyInPhase(progress: number): void {
  if (!bootContainer) return;

  const content = bootContainer.querySelector('.boot-content') as HTMLElement;
  if (content) {
    const scale = 1 + progress * 2;
    const opacity = 1 - progress;
    content.style.transform = `scale(${scale})`;
    content.style.opacity = String(opacity);
  }

  const letterboxes = bootContainer.querySelectorAll('.boot-letterbox') as NodeListOf<HTMLElement>;
  letterboxes.forEach((lb) => {
    lb.style.height = `${Math.max(0, 8 - progress * 8)}%`;
  });

  bootContainer.style.opacity = String(1 - progress * 0.3);
}

function completeBoot(): void {
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }

  const cleanup = (window as unknown as Record<string, () => void>).__bootCleanup;
  cleanup?.();

  if (bootContainer) {
    bootContainer.classList.add('boot-exit');
    setTimeout(() => {
      bootContainer?.remove();
      bootContainer = null;
    }, 600);
  }

  state.phase = 'complete';
  callbacks?.onComplete();
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function getFlyInProgress(): number {
  return state.phase === 'flyIn' ? state.flyInProgress : 
         state.phase === 'complete' ? 1 : 0;
}

export function isBootComplete(): boolean {
  return state.phase === 'complete';
}
