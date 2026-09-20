import React, { useState, useRef, useEffect } from 'react';
import {
  Crown,
  Search,
  Settings,
  ChevronDown,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import type { TerminalMode } from '../../context/TerminalModeContext';

interface MobileProDropdownProps {
  onOpenSubscription: (plan?: 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND') => void;
  onOpenCommandPalette: () => void;
  onOpenSound: () => void;
  mode: TerminalMode;
  setMode: (m: TerminalMode) => void;
  isMuted: boolean;
  toggleMute: () => void;
  userTier?: string;
}

export const MobileProDropdown: React.FC<MobileProDropdownProps> = ({
  onOpenSubscription,
  onOpenCommandPalette,
  onOpenSound,
  mode,
  setMode,
  isMuted,
  toggleMute,
  userTier = 'PRO'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer border shadow-xs ${
          isOpen
            ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
            : 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 hover:from-amber-500/20 hover:to-yellow-500/20 border-amber-500/40 text-amber-500 hover:text-amber-400'
        }`}
        title="Pro Membership & Settings Menu"
      >
        <Crown className="w-3 h-3 text-amber-500 shrink-0" />
        <span>Pro</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-500' : ''}`} />
      </button>

      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-20 sm:top-full mt-1.5 w-[calc(100vw-16px)] sm:w-60 bg-terminal-card border border-terminal-border rounded-xl shadow-2xl z-[150] p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-1 border-b border-terminal-border/60 pb-1">
            <span className="text-[10px] font-mono font-bold text-amber-500 uppercase">Membership & Modes</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-0.5 rounded text-terminal-muted hover:text-terminal-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Become a Member */}
          <button
            type="button"
            onClick={() => handleSelect(() => onOpenSubscription('GOLD'))}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <div>
                <div className="text-xs font-bold text-amber-500">Upgrade / Plans</div>
                <div className="text-[9px] text-terminal-muted font-mono">Unlock Diamond Features</div>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-extrabold">Plans</span>
          </button>

          {/* Search */}
          <button
            type="button"
            onClick={() => handleSelect(onOpenCommandPalette)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-terminal-panel text-left text-xs font-semibold text-terminal-text transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-accent-sky" />
              <span>Quick Search (⌘K)</span>
            </div>
          </button>

          {/* Terminal Mode */}
          <div className="pt-1.5 border-t border-terminal-border/50">
            <div className="text-[10px] font-mono font-bold text-terminal-muted uppercase mb-1 px-1">
              Terminal Mode: <span className="text-accent-sky">{mode}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(['BEGINNER', 'INTERMEDIATE', 'EXPERT', 'PRO'] as TerminalMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`py-1 rounded text-[9px] font-mono font-bold text-center transition cursor-pointer border ${
                    mode === m
                      ? 'bg-accent-sky/20 border-accent-sky text-accent-sky'
                      : 'bg-terminal-panel border-terminal-border/60 text-terminal-muted'
                  }`}
                >
                  {m === 'INTERMEDIATE' ? 'INT' : m.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Audio */}
          <div className="pt-1.5 border-t border-terminal-border/50 flex items-center justify-between px-1">
            <span className="text-xs text-terminal-muted">Voice Alerts</span>
            <button
              type="button"
              onClick={toggleMute}
              className={`p-1 rounded-md border text-xs font-mono font-bold flex items-center gap-1 cursor-pointer ${
                isMuted
                  ? 'bg-bear/20 border-bear/40 text-bear'
                  : 'bg-bull/20 border-bull/40 text-bull'
              }`}
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              <span>{isMuted ? 'Muted' : 'Sound ON'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
