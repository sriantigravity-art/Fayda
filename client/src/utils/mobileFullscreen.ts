/**
 * Mobile Auto-Fullscreen Helper
 * Automatically puts the app in full screen mode by default on mobile page load
 * and seamlessly requests fullscreen on the very first touch/interaction.
 */

export function requestMobileFullscreen(): void {
  if (typeof window === 'undefined') return;

  const isMobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;
  if (!isMobile) return;

  const doc = document as any;
  const isFs = !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement ||
    document.body.classList.contains('terminal-fullscreen-active')
  );

  if (isFs) return;

  const docEl = document.documentElement as any;
  try {
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen();
    } else if (docEl.mozRequestFullScreen) {
      docEl.mozRequestFullScreen();
    } else if (docEl.msRequestFullscreen) {
      docEl.msRequestFullscreen();
    }
  } catch {}
}

/**
 * Initializes auto-fullscreen listeners for mobile devices.
 * Dual-stage: attempts on mount + activates on very first user gesture.
 */
export function initMobileAutoFullscreen(): () => void {
  if (typeof window === 'undefined') return () => {};

  const isMobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;
  if (!isMobile) return () => {};

  // Stage 1: Immediate attempt on load (works in PWA / standalone / WebViews)
  requestMobileFullscreen();

  // Stage 2: Immediate full-screen trigger on first touch / tap / click
  const handleFirstInteraction = () => {
    requestMobileFullscreen();
    cleanup();
  };

  const cleanup = () => {
    window.removeEventListener('touchstart', handleFirstInteraction);
    window.removeEventListener('touchend', handleFirstInteraction);
    window.removeEventListener('pointerdown', handleFirstInteraction);
    window.removeEventListener('click', handleFirstInteraction);
  };

  window.addEventListener('touchstart', handleFirstInteraction, { passive: true, once: true });
  window.addEventListener('touchend', handleFirstInteraction, { passive: true, once: true });
  window.addEventListener('pointerdown', handleFirstInteraction, { passive: true, once: true });
  window.addEventListener('click', handleFirstInteraction, { passive: true, once: true });

  return cleanup;
}
