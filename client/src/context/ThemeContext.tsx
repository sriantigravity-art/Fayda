import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
export type DarkPreset = 'OBSIDIAN_PRO' | 'CLASSIC_DARK';
export type LightPreset = 'ALABASTER_PRO' | 'CLASSIC_LIGHT';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  darkPreset: DarkPreset;
  setDarkPreset: (preset: DarkPreset) => void;
  lightPreset: LightPreset;
  setLightPreset: (preset: LightPreset) => void;
}

const defaultThemeContext: ThemeContextType = {
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
  darkPreset: 'OBSIDIAN_PRO',
  setDarkPreset: () => {},
  lightPreset: 'ALABASTER_PRO',
  setLightPreset: () => {}
};

const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('oi_radar_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return 'dark';
    } catch {
      return 'dark';
    }
  });

  const [darkPreset, setDarkPresetState] = useState<DarkPreset>(() => {
    try {
      const saved = localStorage.getItem('fayda_dark_preset');
      if (saved === 'OBSIDIAN_PRO' || saved === 'CLASSIC_DARK') return saved;
      return 'OBSIDIAN_PRO';
    } catch {
      return 'OBSIDIAN_PRO';
    }
  });

  const [lightPreset, setLightPresetState] = useState<LightPreset>(() => {
    try {
      const saved = localStorage.getItem('fayda_light_preset');
      if (saved === 'ALABASTER_PRO' || saved === 'CLASSIC_LIGHT') return saved;
      return 'ALABASTER_PRO';
    } catch {
      return 'ALABASTER_PRO';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-dark-preset', darkPreset);
    root.setAttribute('data-light-preset', lightPreset);

    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }

    try {
      localStorage.setItem('oi_radar_theme', theme);
      localStorage.setItem('fayda_dark_preset', darkPreset);
      localStorage.setItem('fayda_light_preset', lightPreset);
    } catch (e) {
      console.warn('Could not save theme preferences:', e);
    }
  }, [theme, darkPreset, lightPreset]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  const setDarkPreset = (preset: DarkPreset) => {
    setDarkPresetState(preset);
  };

  const setLightPreset = (preset: LightPreset) => {
    setLightPresetState(preset);
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      setTheme,
      darkPreset,
      setDarkPreset,
      lightPreset,
      setLightPreset
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  return context || defaultThemeContext;
};
