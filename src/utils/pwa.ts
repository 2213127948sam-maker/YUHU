import { useSyncExternalStore } from 'react';
export type CacheState = 'checking' | 'ready' | 'updateAvailable' | 'updating' | 'unsupported' | 'failed' | 'development';
let state: CacheState = 'checking';
let registration: ServiceWorkerRegistration | undefined;
let started = false;
const listeners = new Set<() => void>();
function setState(next: CacheState) { state = next; listeners.forEach(fn => fn()); }
export function useCacheState() {
  return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => state);
}
function syncState() {
  if (state === 'updating') return;
  if (registration?.waiting) setState('updateAvailable');
  else if (navigator.serviceWorker.controller) setState('ready');
}
export function applyCacheUpdate() {
  if (!registration?.waiting) return;
  setState('updating');
  registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
}
export async function installCache() {
  if (started) return;
  started = true;
  if (!import.meta.env.PROD) { setState('development'); return; }
  if (!('serviceWorker' in navigator) || !window.isSecureContext) { setState('unsupported'); return; }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (state === 'updating') window.location.reload();
    else syncState();
  });
  try {
    registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' });
    const observeInstall = () => {
      const worker = registration?.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') syncState();
        if (worker.state === 'redundant' && !navigator.serviceWorker.controller) setState('failed');
      });
    };
    registration.addEventListener('updatefound', observeInstall);
    observeInstall();
    syncState();
    await navigator.serviceWorker.ready;
    syncState();
    const check = () => { if (navigator.onLine) void registration?.update().catch(() => {}); };
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    window.setInterval(check, 60 * 60 * 1000);
  } catch { setState(navigator.serviceWorker.controller ? 'ready' : 'failed'); }
}
export const cacheLabels: Record<CacheState, string> = {
  checking: '离线缓存准备中', ready: '离线缓存已就绪', updateAvailable: '新版本已下载，可更新数据',
  updating: '正在切换到新版本…', unsupported: '当前浏览器未启用离线缓存',
  failed: '离线缓存安装失败', development: '开发预览未启用离线缓存',
};
