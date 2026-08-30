import React, { useState, useEffect, useRef } from 'react';
import { FastForward } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleDismiss = () => {
    if (isFading || !isVisible) return;
    setIsFading(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onFinish) onFinish();
    }, 500);
  };

  useEffect(() => {
    // Safety fallback: auto-dismiss after 10s if video finishes or gets stuck
    const safetyTimer = setTimeout(() => {
      handleDismiss();
    }, 10000);

    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay may need user gesture on some browsers
      });
    }

    return () => clearTimeout(safetyTimer);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-black flex items-center justify-center overflow-hidden select-none transition-opacity duration-500 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Responsive Video: 100% fits mobile, tablet, and desktop screens without cropping */}
      <video
        ref={videoRef}
        className="w-full h-full max-w-full max-h-full object-contain"
        autoPlay
        muted
        playsInline
        onEnded={handleDismiss}
      >
        <source src="/fayda-splash.mp4" type="video/mp4" />
      </video>

      {/* Top Right Skip Button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-4 right-4 z-50 px-3 py-1.5 rounded-xl border border-accent-cyan/40 bg-black/60 backdrop-blur-md text-accent-cyan hover:bg-accent-cyan/20 hover:border-accent-cyan font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] cursor-pointer"
        title="Skip Intro"
      >
        <span className="tracking-wider uppercase text-[11px]">SKIP</span>
        <FastForward className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
