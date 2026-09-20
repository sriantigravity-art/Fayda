import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Volume2, 
  VolumeX, 
  Volume1, 
  X, 
  Play, 
  CheckCircle2, 
  Sliders, 
  Zap, 
  Target, 
  Bell, 
  Radio, 
  Sparkles,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { useTheme } from '../context/ThemeContext';

interface SoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SoundSettingsModal: React.FC<SoundSettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isMuted, toggleMute, soundVolume, setSoundVolume, testSound } = useMarket();

  // Alert preferences stored in localStorage
  const [alertPreferences, setAlertPreferences] = useState<{
    targetHits: boolean;
    extremeSurge: boolean;
    breakouts: boolean;
    stoploss: boolean;
    marketBell: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('fayda_audio_preferences');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      targetHits: true,
      extremeSurge: true,
      breakouts: true,
      stoploss: true,
      marketBell: true
    };
  });

  const [activeTesting, setActiveTesting] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('fayda_audio_preferences', JSON.stringify(alertPreferences));
    } catch {}
  }, [alertPreferences]);

  if (!isOpen) return null;

  const handleTest = (soundType: 'targetHit' | 'extreme' | 'strong' | 'chime') => {
    setActiveTesting(soundType);
    testSound(soundType);
    setTimeout(() => setActiveTesting(null), 600);
  };

  const volumePct = Math.round(soundVolume * 100);

  const togglePref = (key: keyof typeof alertPreferences) => {
    setAlertPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 animate-modal-backdrop-enter">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      {/* Dialog Container */}
      <div 
        className={`relative w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden z-10 animate-modal-enter flex flex-col max-h-[90vh] ${
          isDark 
            ? 'bg-[#0b101b] border-slate-800 text-slate-100 shadow-black/90' 
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-400/40'
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-terminal-border flex items-center justify-between shrink-0 bg-gradient-to-r from-purple-500/10 via-accent-sky/5 to-transparent">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${
              isMuted 
                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            }`}>
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base font-sans text-terminal-text">
                  Audio & Sound Alert Studio
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  isMuted 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}>
                  {isMuted ? 'MUTED' : `${volumePct}% VOL`}
                </span>
              </div>
              <p className="text-xs text-terminal-muted leading-tight mt-0.5">
                Real-time synthesizer alerts for targets, surges, breakouts & life-cycle triggers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Section 1: Master Audio State */}
          <div className="p-4 rounded-xl border border-terminal-border bg-terminal-panel/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-terminal-text block">Master Sound Synthesizer</span>
                <span className="text-xs text-terminal-muted block mt-0.5">
                  Play real-time acoustic notifications without external browser audio dependencies
                </span>
              </div>
              <button
                type="button"
                onClick={toggleMute}
                className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm ${
                  isMuted 
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{isMuted ? 'Unmute Audio' : 'Mute Audio'}</span>
              </button>
            </div>

            {/* Volume Slider */}
            {!isMuted && (
              <div className="pt-2 border-t border-terminal-border/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-terminal-muted flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-accent-sky" />
                    <span>Output Volume</span>
                  </span>
                  <span className="font-bold text-accent-sky">{volumePct}%</span>
                </div>

                <div className="flex items-center gap-3">
                  <Volume1 className="w-4 h-4 text-terminal-muted shrink-0" />
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={soundVolume}
                    onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                    className="flex-1 accent-emerald-500 h-2 bg-terminal-card rounded-lg cursor-pointer"
                  />
                  <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>

                {/* Volume Quick Presets */}
                <div className="flex items-center justify-between gap-1.5 pt-1">
                  {[
                    { label: 'Soft (25%)', val: 0.25 },
                    { label: 'Medium (50%)', val: 0.50 },
                    { label: 'Standard (75%)', val: 0.75 },
                    { label: 'Max (100%)', val: 1.00 }
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setSoundVolume(p.val)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                        Math.abs(soundVolume - p.val) < 0.05
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-terminal-card border-terminal-border text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Interactive Sound Test Center */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-terminal-muted flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent-purple" />
                <span>Test Live Sound Chimes</span>
              </span>
              <span className="text-[10px] font-mono text-terminal-muted">
                Click any chime to audition
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Chime 1: Target Hit */}
              <button
                type="button"
                onClick={() => handleTest('targetHit')}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                  activeTesting === 'targetHit'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40'
                    : 'bg-terminal-panel/60 border-terminal-border hover:border-emerald-500/40 hover:bg-terminal-panel'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold font-sans block text-terminal-text">Target Hit Arpeggio</span>
                    <span className="text-[10px] text-terminal-muted font-mono block">Ascending C5-E5-G5-C6</span>
                  </div>
                </div>
                <Play className={`w-4 h-4 text-emerald-400 shrink-0 ${activeTesting === 'targetHit' ? 'animate-bounce' : ''}`} />
              </button>

              {/* Chime 2: Extreme Surge Alert */}
              <button
                type="button"
                onClick={() => handleTest('extreme')}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                  activeTesting === 'extreme'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-2 ring-rose-500/40'
                    : 'bg-terminal-panel/60 border-terminal-border hover:border-rose-500/40 hover:bg-terminal-panel'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold font-sans block text-terminal-text">Extreme OI Surge Alert</span>
                    <span className="text-[10px] text-terminal-muted font-mono block">Urgent dual-tone pulse</span>
                  </div>
                </div>
                <Play className={`w-4 h-4 text-rose-400 shrink-0 ${activeTesting === 'extreme' ? 'animate-bounce' : ''}`} />
              </button>

              {/* Chime 3: Strong Breakout */}
              <button
                type="button"
                onClick={() => handleTest('strong')}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                  activeTesting === 'strong'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/40'
                    : 'bg-terminal-panel/60 border-terminal-border hover:border-amber-500/40 hover:bg-terminal-panel'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold font-sans block text-terminal-text">Breakout Signal Chime</span>
                    <span className="text-[10px] text-terminal-muted font-mono block">Resonant sine sweep</span>
                  </div>
                </div>
                <Play className={`w-4 h-4 text-amber-400 shrink-0 ${activeTesting === 'strong' ? 'animate-bounce' : ''}`} />
              </button>

              {/* Chime 4: Confirmation Bell */}
              <button
                type="button"
                onClick={() => handleTest('chime')}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                  activeTesting === 'chime'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300 ring-2 ring-sky-500/40'
                    : 'bg-terminal-panel/60 border-terminal-border hover:border-sky-500/40 hover:bg-terminal-panel'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold font-sans block text-terminal-text">Standard Market Bell</span>
                    <span className="text-[10px] text-terminal-muted font-mono block">Soft dual-bell chime</span>
                  </div>
                </div>
                <Play className={`w-4 h-4 text-sky-400 shrink-0 ${activeTesting === 'chime' ? 'animate-bounce' : ''}`} />
              </button>
            </div>
          </div>

          {/* Section 3: Event Chime Triggers */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-terminal-muted flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-accent-sky" />
                <span>Active Notification Triggers</span>
              </span>
              <button
                type="button"
                onClick={() => setAlertPreferences({
                  targetHits: true,
                  extremeSurge: true,
                  breakouts: true,
                  stoploss: true,
                  marketBell: true
                })}
                className="text-[10px] font-mono text-accent-sky hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset All On</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {[
                { 
                  key: 'targetHits' as const, 
                  label: 'Target 1 & Target 2 Hits', 
                  desc: 'Play victorious 4-note chime when any recommendation achieves T1/T2' 
                },
                { 
                  key: 'extremeSurge' as const, 
                  label: 'Extreme OI Surge Spikes (>150% OI change)', 
                  desc: 'Play urgent alert on institutional gamma/volume explosion' 
                },
                { 
                  key: 'breakouts' as const, 
                  label: 'Breakout Pattern Detections', 
                  desc: 'Play resonant alert when classical chart pattern confirms breakout' 
                },
                { 
                  key: 'stoploss' as const, 
                  label: 'Emergency Square-Off & Reversal', 
                  desc: 'Audible warning when stop loss or market regime shifts against position' 
                },
                { 
                  key: 'marketBell' as const, 
                  label: 'Market Open & Session Close (09:15 AM / 03:40 PM)', 
                  desc: 'Audible session bell at NSE/BSE and MCX market boundaries' 
                }
              ].map(item => (
                <label
                  key={item.key}
                  onClick={() => togglePref(item.key)}
                  className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                    alertPreferences[item.key]
                      ? 'bg-terminal-panel/80 border-terminal-border/80'
                      : 'bg-terminal-card/40 border-terminal-border/40 opacity-60'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold font-sans block text-terminal-text">{item.label}</span>
                    <span className="text-[10px] text-terminal-muted block leading-tight mt-0.5">{item.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={alertPreferences[item.key]}
                    onChange={() => {}}
                    className="w-4 h-4 text-emerald-600 rounded bg-terminal-bg border-terminal-border focus:ring-emerald-500 cursor-pointer shrink-0"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-terminal-border bg-terminal-panel/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-terminal-muted font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Web Audio Synthesizer Active</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-accent-sky hover:bg-accent-sky/90 text-white font-bold text-xs transition cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
