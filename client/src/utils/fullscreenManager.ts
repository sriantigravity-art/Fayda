/**
 * Cross-Browser Fullscreen Manager for Fayda Terminal
 * Optimized for Google Chrome (Desktop & Mobile), Edge, Safari, Firefox, and PWAs.
 */

// Vendor prefix types helper
interface VendorDocument extends Document {
  webkitFullscreenElement?: Element;
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitFullscreenEnabled?: boolean;
  mozFullScreenEnabled?: boolean;
  msFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
}

interface VendorElement extends HTMLElement {
  webkitRequestFullscreen?: (options?: any) => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}

/**
 * Returns true if the document or window is currently in fullscreen mode.
 * Supports standard W3C, WebKit (Chrome/Safari), Gecko (Firefox), MS (IE/Edge Legacy),
 * and Chrome/Windows F11 window geometry detection.
 */
export function isBrowserFullscreen(): boolean {
  if (typeof document === 'undefined') return false;

  const doc = document as VendorDocument;
  const isNative = Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );

  if (isNative) return true;

  // Detect Chrome / Windows native F11 full-screen window geometry
  if (typeof window !== 'undefined' && window.screen) {
    const isF11Mode = 
      Math.abs(window.innerHeight - window.screen.height) <= 3 &&
      Math.abs(window.innerWidth - window.screen.width) <= 3;
    if (isF11Mode) return true;
  }

  // Fallback CSS pseudo-fullscreen flag
  return document.body.classList.contains('terminal-fullscreen-active');
}

/**
 * Requests full-screen mode on the root element.
 * Gracefully tries modern Chrome standards with options, without options,
 * falls back to document.body, vendor prefixes, and finally robust CSS viewport mode.
 */
export async function requestBrowserFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  const docEl = document.documentElement as VendorElement;
  const body = document.body as VendorElement;

  // 1. Standard W3C requestFullscreen (Chrome 71+, Edge 79+, Firefox 64+, Safari 16.4+)
  if (docEl.requestFullscreen) {
    try {
      // Try with navigationUI: 'auto' for modern Chromium
      await docEl.requestFullscreen({ navigationUI: 'auto' } as any);
      return true;
    } catch {
      // Some Chromium variants or contexts fail with options parameter, retry plain
      try {
        await docEl.requestFullscreen();
        return true;
      } catch {
        // Fall back to document.body if documentElement failed
        try {
          if (body.requestFullscreen) {
            await body.requestFullscreen();
            return true;
          }
        } catch {}
      }
    }
  }

  // 2. WebKit vendor prefix (Safari, older Chrome, iOS WebViews)
  if (docEl.webkitRequestFullscreen) {
    try {
      const res = docEl.webkitRequestFullscreen();
      if (res && typeof (res as any).then === 'function') {
        await res;
      }
      return true;
    } catch {}
  }
  if (body.webkitRequestFullscreen) {
    try {
      const res = body.webkitRequestFullscreen();
      if (res && typeof (res as any).then === 'function') {
        await res;
      }
      return true;
    } catch {}
  }

  // 3. Firefox Gecko vendor prefix
  if (docEl.mozRequestFullScreen) {
    try {
      docEl.mozRequestFullScreen();
      return true;
    } catch {}
  }

  // 4. Microsoft Trident/EdgeHTML vendor prefix
  if (docEl.msRequestFullscreen) {
    try {
      docEl.msRequestFullscreen();
      return true;
    } catch {}
  }

  // 5. High-fidelity CSS pseudo-fullscreen fallback (for restricted Chrome iframes or Safari iOS)
  document.body.classList.add('terminal-fullscreen-active');
  return true;
}

/**
 * Exits full-screen mode cleanly.
 * Only calls exitFullscreen if native fullscreen is actually engaged to avoid
 * Chrome "Document not in fullscreen mode" TypeError exceptions.
 */
export async function exitBrowserFullscreen(): Promise<void> {
  if (typeof document === 'undefined') return;

  const doc = document as VendorDocument;
  const isNative = Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );

  if (isNative) {
    try {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    } catch (err) {
      console.warn('[FullscreenManager] Native exit failed:', err);
    }
  }

  // Always remove the CSS pseudo-fullscreen fallback class
  document.body.classList.remove('terminal-fullscreen-active');
}

/**
 * Toggles fullscreen mode between active and inactive.
 */
export async function toggleBrowserFullscreen(): Promise<boolean> {
  if (isBrowserFullscreen()) {
    await exitBrowserFullscreen();
    return false;
  } else {
    return await requestBrowserFullscreen();
  }
}

/**
 * Subscribes to all native fullscreen change events and window resize events
 * so that state across HeaderBar, CommandPalette, and browser F11 remain 100% in sync.
 */
export function subscribeToFullscreen(onChange: (isFullscreen: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const handleStateUpdate = () => {
    const active = isBrowserFullscreen();
    // If native fullscreen was exited via ESC, ensure the CSS fallback class is purged
    const doc = document as VendorDocument;
    const isNative = Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
    if (!isNative && !active) {
      document.body.classList.remove('terminal-fullscreen-active');
    }
    onChange(active);
  };

  const events = [
    'fullscreenchange',
    'webkitfullscreenchange',
    'mozfullscreenchange',
    'MSFullscreenChange'
  ];

  events.forEach((ev) => document.addEventListener(ev, handleStateUpdate, false));
  window.addEventListener('resize', handleStateUpdate, false);

  // Initial check
  handleStateUpdate();

  return () => {
    events.forEach((ev) => document.removeEventListener(ev, handleStateUpdate, false));
    window.removeEventListener('resize', handleStateUpdate, false);
  };
}
