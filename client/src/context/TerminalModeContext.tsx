import React, { createContext, useContext, useEffect, useState } from 'react';

export type TerminalMode = 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';

interface TerminalModeContextType {
  mode: TerminalMode;
  setMode: (mode: TerminalMode) => void;
  isBeginner: boolean;
  isIntermediate: boolean;
  isExpert: boolean;
}

const defaultTerminalModeContext: TerminalModeContextType = {
  mode: 'INTERMEDIATE',
  setMode: () => {},
  isBeginner: false,
  isIntermediate: true,
  isExpert: false
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

  return (
    <TerminalModeContext.Provider
      value={{
        mode,
        setMode,
        isBeginner: mode === 'BEGINNER',
        isIntermediate: mode === 'INTERMEDIATE',
        isExpert: mode === 'EXPERT'
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
