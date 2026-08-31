import React, { useState, useEffect, useRef } from 'react';
import { FastForward } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !sessionStorage.getItem('fayda_splash_seen');
  });
  const [isFading, setIsFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768 || window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDismiss = () => {
    if (isFading || !isVisible) return;
    try {
      sessionStorage.setItem('fayda_splash_seen', 'true');
    } catch {}
    setIsFading(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onFinish) onFinish();
    }, 400);
  };

  useEffect(() => {
    if (!isVisible) return;

    // Fast safety fallback: auto-dismiss after 3.5s max
    const safetyTimer = setTimeout(() => {
      handleDismiss();
    }, 3500);

    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // If autoplay blocked, dismiss immediately so site is visible
        handleDismiss();
      });
    }

    return () => clearTimeout(safetyTimer);
  }, [isVisible, isMobile]);

  if (!isVisible) return null;

  const videoSrc = isMobile ? '/Fayda_logo_9-16.mp4' : '/Fayda_logo_16-9.mp4';

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[99999] bg-black flex items-center justify-center overflow-hidden select-none transition-opacity duration-400 ease-out cursor-pointer ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Responsive Video: 16:9 for Desktop, 9:16 for Mobile */}
      <video
        key={videoSrc}
        ref={videoRef}
        className="w-full h-full max-w-full max-h-full object-contain"
        autoPlay
        muted
        playsInline
        onEnded={handleDismiss}
        onError={handleDismiss}
      >
        <source src={videoSrc} type="video/mp4" />
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

