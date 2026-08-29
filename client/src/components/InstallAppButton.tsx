import React, { useState, useEffect } from 'react';
import { Download, Smartphone, CheckCircle, Share, PlusSquare } from 'lucide-react';

export const InstallAppButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);

  const isIos = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );

  useEffect(() => {
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (isIos && !isStandalone) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // If browser doesn't support beforeinstallprompt or already handled, show quick alert
      alert('To install Fayda on Desktop/Mobile:\n1. Click the browser settings menu (⋮ or Share icon).\n2. Select "Install Fayda" or "Add to Home screen".');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-mono text-bull bg-bull/10 border border-bull/30 rounded-lg">
        <CheckCircle className="w-3 h-3" />
        <span>Fayda App Installed</span>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-mono font-bold rounded-xl border transition-all duration-200 shadow-sm bg-gradient-to-r from-accent-cyan/15 via-bull/15 to-accent-cyan/15 border-accent-cyan/50 text-accent-cyan hover:bg-accent-cyan/25 hover:border-accent-cyan hover:shadow-[0_0_12px_rgba(0,229,255,0.3)] animate-pulse"
        title="Install Fayda App on Desktop (Windows/Mac) or Mobile (Android/iOS)"
      >
        <Download className="w-3.5 h-3.5 text-accent-cyan" />
        <span className="hidden md:inline">Install App</span>
        <span className="md:hidden">App</span>
      </button>

      {/* iOS Safari Installation Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-terminal-card border border-terminal-border rounded-2xl p-4 max-w-sm w-full font-mono shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-terminal-border">
              <span className="font-bold text-xs text-terminal-text flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-accent-cyan" />
                <span>Install Fayda on iPhone / iPad</span>
              </span>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="text-terminal-muted hover:text-terminal-text font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <ol className="space-y-2.5 text-xs text-terminal-muted leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="p-1 rounded bg-terminal-panel border border-terminal-border text-accent-cyan font-bold">1</span>
                <span>Tap the <strong className="text-terminal-text">Share button</strong> <Share className="w-3.5 h-3.5 inline text-accent-cyan mx-0.5" /> at the bottom of Safari.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="p-1 rounded bg-terminal-panel border border-terminal-border text-accent-cyan font-bold">2</span>
                <span>Scroll down and tap <strong className="text-terminal-text">"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-bull mx-0.5" />.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="p-1 rounded bg-terminal-panel border border-terminal-border text-accent-cyan font-bold">3</span>
                <span>Tap <strong className="text-bull">Add</strong> in the top-right corner to launch Fayda as a standalone app!</span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-1.5 rounded-xl bg-accent-cyan text-terminal-bg font-black text-xs uppercase transition shadow-md hover:opacity-90"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
