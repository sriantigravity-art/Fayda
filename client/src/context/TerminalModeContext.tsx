import React, { createContext, useContext, useEffect, useState } from 'react';

export type TerminalMode = 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';

interface TerminalModeContextType {
  mode: TerminalMode;
  setMode: (mode: TerminalMode) => void;
  isBeginner: boolean;
  isIntermediate: boolean;
  isExpert: boolean;
  modeTitle: string;
  modeDescription: string;
  modeBadgeClass: string;
}

const defaultTerminalModeContext: TerminalModeContextType = {
  mode: 'INTERMEDIATE',
  setMode: () => {},
  isBeginner: false,
  isIntermediate: true,
  isExpert: false,
  modeTitle: 'Intermediate Pro',
  modeDescription: 'Balanced technical momentum, multi-factor confluence, and dynamic targets',
  modeBadgeClass: 'bg-amber/15 text-amber border-amber/40'
};

const TerminalModeContext = createContext<TerminalModeContextType>(defaultTerminalModeContext);

export const TerminalModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<TerminalMode>(() => {
    try {
      const saved = localStorage.getItem('fayda_terminal_mode');
      if (saved === 'BEGINNER' || saved === 'INTERMEDIATE' || saved === 'EXPERT') {
        return saved as TerminalMode;
      }
      return 'INTERMEDIATE';
    } catch {
      return 'INTERMEDIATE';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('fayda_terminal_mode', mode);
    } catch (e) {
      console.warn('Could not save terminal mode:', e);
    }
  }, [mode]);

  const setMode = (m: TerminalMode) => {
    setModeState(m);
  };

  const isBeginner = mode === 'BEGINNER';
  const isIntermediate = mode === 'INTERMEDIATE';
  const isExpert = mode === 'EXPERT';

  const modeTitle = isBeginner 
    ? 'Beginner Guided' 
    : isIntermediate 
      ? 'Intermediate Pro' 
      : 'Expert Quant Matrix';

  const modeDescription = isBeginner
    ? 'Simplified plain-English signals, capital protection rules, and lot sizing guidance'
    : isIntermediate
      ? 'Multi-factor confluence, price-action patterns, and dynamic support/resistance targets'
      : 'Institutional Greeks sensitivity (Delta, Gamma, Theta, IV Skew), GEX dealer flow & order book delta';

  const modeBadgeClass = isBeginner
    ? 'bg-bull/15 text-bull border-bull/40'
    : isIntermediate
      ? 'bg-amber/15 text-amber border-amber/40'
      : 'bg-accent-purple/15 text-accent-purple border-accent-purple/40';

  return (
    <TerminalModeContext.Provider
      value={{
        mode,
        setMode,
        isBeginner,
        isIntermediate,
        isExpert,
        modeTitle,
        modeDescription,
        modeBadgeClass
      }}
    >
      {children}
    </TerminalModeContext.Provider>
  );
};

export const useTerminalMode = (): TerminalModeContextType => {
  const context = useContext(TerminalModeContext);
  return context || defaultTerminalModeContext;
};

