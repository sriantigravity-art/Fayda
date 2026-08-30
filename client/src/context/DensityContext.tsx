import React, { createContext, useContext, useState } from 'react';

export type TerminalDensity = 'COMPACT' | 'STANDARD' | 'COMFORTABLE';

interface DensityContextType {
  density: TerminalDensity;
  setDensity: (mode: TerminalDensity) => void;
  rowPaddingClass: string;
  tableTextClass: string;
  cardPaddingClass: string;
}

const defaultDensityContext: DensityContextType = {
  density: 'STANDARD',
  setDensity: () => {},
  rowPaddingClass: 'py-1.5 px-2',
  tableTextClass: 'text-[11.5px]',
  cardPaddingClass: 'p-3 sm:p-3.5'
};

const DensityContext = createContext<DensityContextType>(defaultDensityContext);

export const DensityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [density, setDensityState] = useState<TerminalDensity>(() => {
    try {
      const saved = localStorage.getItem('fayda_terminal_density');
      return (saved as TerminalDensity) || 'STANDARD';
    } catch {
      return 'STANDARD';
    }
  });

  const setDensity = (mode: TerminalDensity) => {
    setDensityState(mode);
    try {
      localStorage.setItem('fayda_terminal_density', mode);
    } catch (e) {
      console.warn('Could not save density to localStorage:', e);
    }
  };

  const rowPaddingClass = 
    density === 'COMPACT' 
      ? 'py-1 px-1.5' 
      : density === 'COMFORTABLE' 
        ? 'py-2.5 px-3' 
        : 'py-1.5 px-2';

  const tableTextClass = 
    density === 'COMPACT' 
      ? 'text-[11px]' 
      : density === 'COMFORTABLE' 
        ? 'text-xs' 
        : 'text-[11.5px]';

  const cardPaddingClass = 
    density === 'COMPACT' 
      ? 'p-2.5 sm:p-3' 
      : density === 'COMFORTABLE' 
        ? 'p-4 sm:p-5' 
        : 'p-3 sm:p-3.5';

  return (
    <DensityContext.Provider
      value={{
        density,
        setDensity,
        rowPaddingClass,
        tableTextClass,
        cardPaddingClass
      }}
    >
      {children}
    </DensityContext.Provider>
  );
};

export const useDensity = (): DensityContextType => {
  const context = useContext(DensityContext);
  return context || defaultDensityContext;
};
