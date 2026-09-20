import React from 'react';
import { createPortal } from 'react-dom';
import { useTradingPersona, PERSONA_CONFIGS, type TradingPersona } from '../../context/TradingPersonaContext';
import { useMarket } from '../../context/MarketContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  X, 
  CheckCircle2, 
  Zap, 
  TrendingUp, 
  ShieldCheck, 
  Building2, 
  Coins, 
  Flame,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const PersonaSelectionModal: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { 
    persona, 
    setPersona, 
    isPersonaModalOpen, 
    setIsPersonaModalOpen 
  } = useTradingPersona();

  const { setSelectedIndex } = useMarket();

  if (!isPersonaModalOpen) return null;

  const handleSelectPersona = (p: TradingPersona) => {
    setPersona(p);
    const cfg = PERSONA_CONFIGS[p];
    if (cfg?.recommendedSymbol) {
      setSelectedIndex(cfg.recommendedSymbol as any);
    }
    setIsPersonaModalOpen(false);
  };

  const personaList = Object.values(PERSONA_CONFIGS);

  return createPortal(
    <div 
      onClick={() => setIsPersonaModalOpen(false)}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in font-mono"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-terminal-card border border-terminal-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-terminal-text"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-terminal-border flex items-center justify-between bg-terminal-panel/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-sky-500/20 text-amber-500 dark:text-accent-gold border border-amber-500/40 shadow-inner">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-terminal-text tracking-wide">
                  SELECT YOUR TRADING FOCUS & WORKSPACE MODE
                </h2>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                  SMART SECTION FILTERING
                </span>
              </div>
              <p className="text-xs text-terminal-muted mt-0.5">
                The terminal will dynamically optimize panels, setups, and default instruments to your style.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPersonaModalOpen(false)}
            className="p-1.5 rounded-xl text-terminal-muted hover:text-terminal-text hover:bg-terminal-elevated transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 6 Persona Selection Cards Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {personaList.map(item => {
            const isSelected = item.id === persona;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectPersona(item.id)}
                className={`group p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-500 shadow-xl ring-2 ring-sky-500/50'
                    : 'bg-terminal-panel/60 hover:bg-terminal-elevated border-terminal-border hover:border-sky-500/50'
                }`}
              >
                {/* Active check indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-sky-500 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>ACTIVE</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-terminal-elevated text-terminal-muted border border-terminal-border">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-terminal-text group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-[11px] text-terminal-muted mt-1.5 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>

                <div className="pt-3 border-t border-terminal-border space-y-1.5 text-[10px]">
                  <div className="flex justify-between text-terminal-muted">
                    <span>Default Instrument:</span>
                    <strong className="text-terminal-text">{item.recommendedSymbol}</strong>
                  </div>
                  <div className="flex justify-between text-terminal-muted">
                    <span>Cockpit Mode:</span>
                    <strong className="text-sky-500 dark:text-sky-400">{item.cockpitTab} MOMENTUM</strong>
                  </div>
                </div>

                <div className="w-full py-1.5 rounded-lg bg-terminal-elevated group-hover:bg-sky-500 group-hover:text-slate-950 text-terminal-text text-center text-[11px] font-extrabold transition-all flex items-center justify-center gap-1">
                  <span>{isSelected ? 'Currently Selected' : 'Choose This Mode'}</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-terminal-border bg-terminal-panel/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-terminal-muted text-[11px]">
            ⚡ You can switch between trading personas anytime from the top navigation bar.
          </span>
          <button
            type="button"
            onClick={() => setIsPersonaModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-terminal-elevated hover:bg-terminal-border text-terminal-text font-bold transition cursor-pointer border border-terminal-border"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
