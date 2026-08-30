import React, { createContext, useContext, useEffect, useState } from 'react';

export type TerminalMode = 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';

interface TerminalModeContextType {
  mode: TerminalMode;
  setMode: (mode: TerminalMode) => void;
  isBeginner: boolean;
  isIntermediate: boolean;
  isExpert: boolean;
}

const TerminalModeContext = createContext<TerminalModeContextType | undefined>(undefined);

export const TerminalModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<TerminalMode>(() => {
    const saved = localStorage.getItem('fayda_terminal_mode');
    if (saved === 'BEGINNER' || saved === 'INTERMEDIATE' || saved === 'EXPERT') {
      return saved as TerminalMode;
    }
    return 'INTERMEDIATE'; // default balanced mode
  });

  useEffect(() => {
    localStorage.setItem('fayda_terminal_mode', mode);
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

export const useTerminalMode = () => {
  const context = useContext(TerminalModeContext);
  if (!context) {
    throw new Error('useTerminalMode must be used within a TerminalModeProvider');
  }
  return context;
};
