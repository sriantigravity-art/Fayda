import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
export type DesignStyle = 'INTERNATIONAL_PRO' | 'BLOOMBERG_PITCH' | 'SWISS_LIGHT' | 'CLASSIC_TERMINAL';
export type DarkPreset = 'OBSIDIAN_PRO' | 'CLASSIC_DARK';
export type LightPreset = 'ALABASTER_PRO' | 'CLASSIC_LIGHT';
export type StyleDensity = 'STANDARD' | 'COMPACT';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  darkPreset: DarkPreset;
  setDarkPreset: (preset: DarkPreset) => void;
  lightPreset: LightPreset;
  setLightPreset: (preset: LightPreset) => void;
  designStyle: DesignStyle;
  setDesignStyle: (style: DesignStyle) => void;
  styleDensity: StyleDensity;
  setStyleDensity: (density: StyleDensity) => void;
}

const defaultThemeContext: ThemeContextType = {
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
  darkPreset: 'OBSIDIAN_PRO',
  setDarkPreset: () => {},
  lightPreset: 'ALABASTER_PRO',
  setLightPreset: () => {},
  designStyle: 'INTERNATIONAL_PRO',
  setDesignStyle: () => {},
  styleDensity: 'STANDARD',
  setStyleDensity: () => {}
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

  const [designStyle, setDesignStyleState] = useState<DesignStyle>(() => {
    try {
      const saved = localStorage.getItem('fayda_design_style') as DesignStyle;
      if (saved === 'INTERNATIONAL_PRO' || saved === 'BLOOMBERG_PITCH' || saved === 'SWISS_LIGHT' || saved === 'CLASSIC_TERMINAL') {
        return saved;
      }
      return 'INTERNATIONAL_PRO';
    } catch {
      return 'INTERNATIONAL_PRO';
    }
  });

  const [styleDensity, setStyleDensityState] = useState<StyleDensity>(() => {
    try {
      const saved = localStorage.getItem('fayda_style_density') as StyleDensity;
      if (saved === 'STANDARD' || saved === 'COMPACT') return saved;
      return 'STANDARD';
    } catch {
      return 'STANDARD';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-dark-preset', darkPreset);
    root.setAttribute('data-light-preset', lightPreset);
    root.setAttribute('data-style-engine', designStyle);
    root.setAttribute('data-density-mode', styleDensity);

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
      localStorage.setItem('fayda_design_style', designStyle);
      localStorage.setItem('fayda_style_density', styleDensity);
    } catch (e) {
      console.warn('Could not save theme preferences:', e);
    }
  }, [theme, darkPreset, lightPreset, designStyle, styleDensity]);

  const toggleTheme = () => {
    setThemeState(prev => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      if (nextTheme === 'light' && designStyle === 'INTERNATIONAL_PRO') {
        setDesignStyleState('SWISS_LIGHT');
      } else if (nextTheme === 'dark' && designStyle === 'SWISS_LIGHT') {
        setDesignStyleState('INTERNATIONAL_PRO');
      }
      return nextTheme;
    });
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

  const setDesignStyle = (style: DesignStyle) => {
    setDesignStyleState(style);
    if (style === 'INTERNATIONAL_PRO') {
      setThemeState('dark');
      setDarkPresetState('OBSIDIAN_PRO');
    } else if (style === 'BLOOMBERG_PITCH') {
      setThemeState('dark');
      setDarkPresetState('CLASSIC_DARK');
    } else if (style === 'SWISS_LIGHT') {
      setThemeState('light');
      setLightPresetState('ALABASTER_PRO');
    }
    // If 'CLASSIC_TERMINAL', keep user's current theme
  };

  const setStyleDensity = (density: StyleDensity) => {
    setStyleDensityState(density);
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      setTheme,
      darkPreset,
      setDarkPreset,
      lightPreset,
      setLightPreset,
      designStyle,
      setDesignStyle,
      styleDensity,
      setStyleDensity
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  return context || defaultThemeContext;
};
