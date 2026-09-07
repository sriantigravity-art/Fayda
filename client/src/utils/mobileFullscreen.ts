import { requestBrowserFullscreen, isBrowserFullscreen } from './fullscreenManager';

/**
 * Mobile Auto-Fullscreen Helper
 * Requests fullscreen on mobile devices upon user interaction (click or touchend).
 */
export function requestMobileFullscreen(): void {
  if (typeof window === 'undefined') return;

  const isRealMobile = 
    window.innerWidth < 768 && 
    (/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
     window.matchMedia('(max-width: 768px) and (pointer: coarse)').matches);

  if (!isRealMobile) return;
  if (isBrowserFullscreen()) return;

  requestBrowserFullscreen().catch(() => {});
}

/**
 * Initializes auto-fullscreen listeners for mobile devices.
 * Safely triggers on first user tap / click without violating Chrome's user gesture policy.
 */
export function initMobileAutoFullscreen(): () => void {
  if (typeof window === 'undefined') return () => {};

  const isRealMobile = 
    window.innerWidth < 768 && 
    (/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
     window.matchMedia('(max-width: 768px) and (pointer: coarse)').matches);

  if (!isRealMobile) return () => {};

  const handleFirstInteraction = () => {
    requestMobileFullscreen();
    cleanup();
  };

  const cleanup = () => {
    window.removeEventListener('click', handleFirstInteraction);
    window.removeEventListener('touchend', handleFirstInteraction);
  };

  window.addEventListener('click', handleFirstInteraction, { once: true });
  window.addEventListener('touchend', handleFirstInteraction, { once: true });

  return cleanup;
}
