import React, { createContext, useContext, useEffect, useState } from 'react';

export type TradingPersona = 
  | 'OPTIONS_BUYER_DERIVATIVES'
  | 'OPTIONS_SELLER_DERIVATIVES'
  | 'OPTIONS_BUYER_EQUITY'
  | 'OPTIONS_SELLER_EQUITY'
  | 'COMMODITIES'
  | 'ALL';

export interface PersonaMetadata {
  id: TradingPersona;
  title: string;
  shortTitle: string;
  subtitle: string;
  badge: string;
  icon: string; // emoji or identifier
  recommendedSymbol: string;
  assetClass: 'INDICES' | 'NIFTY50_STOCKS' | 'COMMODITIES' | 'MULTI_ASSET';
  cockpitTab: 'BUYERS' | 'SELLERS' | 'GAMMA';
  primaryFocus: string;
  allowedSections: {
    cockpit: boolean;
    optionChain: boolean;
    strikeLiveWorkbench: boolean;
    breakoutRadar: boolean;
    cprPremarket: boolean;
    rightAnalytics: boolean;
    commoditiesFeed: boolean;
    equityScan: boolean;
    heroZeroRadar: boolean;
  };
}

export const PERSONA_CONFIGS: Record<TradingPersona, PersonaMetadata> = {
  OPTIONS_BUYER_DERIVATIVES: {
    id: 'OPTIONS_BUYER_DERIVATIVES',
    title: 'Options Buyer (Derivatives)',
    shortTitle: 'Index Buyer',
    subtitle: 'Nifty & BankNifty Call/Put momentum, 0DTE gamma scalp & 5-min order flow',
    badge: 'Momentum Scalp',
    icon: '📈',
    recommendedSymbol: 'NIFTY',
    assetClass: 'INDICES',
    cockpitTab: 'BUYERS',
    primaryFocus: 'High-delta momentum breakouts, fast target scalps, and gamma expansion',
    allowedSections: {
      cockpit: true,
      optionChain: true,
      strikeLiveWorkbench: true,
      breakoutRadar: true,
      cprPremarket: true,
      rightAnalytics: true,
      commoditiesFeed: false,
      equityScan: false,
      heroZeroRadar: true,
    }
  },
  OPTIONS_SELLER_DERIVATIVES: {
    id: 'OPTIONS_SELLER_DERIVATIVES',
    title: 'Options Seller (Derivatives)',
    shortTitle: 'Index Seller',
    subtitle: 'Credit spreads, iron condors, max pain magnets & theta decay harvesting',
    badge: 'Theta / Decay',
    icon: '🛡️',
    recommendedSymbol: 'NIFTY',
    assetClass: 'INDICES',
    cockpitTab: 'SELLERS',
    primaryFocus: 'High probability of profit (POP), margin reduction, and OI wall defenses',
    allowedSections: {
      cockpit: true,
      optionChain: true,
      strikeLiveWorkbench: true,
      breakoutRadar: false,
      cprPremarket: true,
      rightAnalytics: true,
      commoditiesFeed: false,
      equityScan: false,
      heroZeroRadar: false,
    }
  },
  OPTIONS_BUYER_EQUITY: {
    id: 'OPTIONS_BUYER_EQUITY',
    title: 'Options Buyer (Equity)',
    shortTitle: 'Stock Options Buyer',
    subtitle: 'Single-stock F&O breakouts (Reliance, HDFC Bank, Infy) & volume spikes',
    badge: 'Equity Calls/Puts',
    icon: '🏢',
    recommendedSymbol: 'RELIANCE',
    assetClass: 'NIFTY50_STOCKS',
    cockpitTab: 'BUYERS',
    primaryFocus: 'High-volume stock option breakouts and institutional accumulation',
    allowedSections: {
      cockpit: true,
      optionChain: true,
      strikeLiveWorkbench: true,
      breakoutRadar: true,
      cprPremarket: true,
      rightAnalytics: true,
      commoditiesFeed: false,
      equityScan: true,
      heroZeroRadar: false,
    }
  },
  OPTIONS_SELLER_EQUITY: {
    id: 'OPTIONS_SELLER_EQUITY',
    title: 'Options Seller (Equity)',
    shortTitle: 'Stock Options Seller',
    subtitle: 'Covered calls, bull put spreads & rangebound theta extraction on blue chips',
    badge: 'Covered / Credit',
    icon: '🏦',
    recommendedSymbol: 'RELIANCE',
    assetClass: 'NIFTY50_STOCKS',
    cockpitTab: 'SELLERS',
    primaryFocus: 'Theta collection on established blue-chip stock ranges with safety buffers',
    allowedSections: {
      cockpit: true,
      optionChain: true,
      strikeLiveWorkbench: true,
      breakoutRadar: false,
      cprPremarket: true,
      rightAnalytics: true,
      commoditiesFeed: false,
      equityScan: true,
      heroZeroRadar: false,
    }
  },
  COMMODITIES: {
    id: 'COMMODITIES',
    title: 'Commodities (MCX)',
    shortTitle: 'MCX Commodities',
    subtitle: 'Crude Oil, Natural Gas, Gold, Silver & Base Metals futures & option chains',
    badge: 'MCX Energy & Metals',
    icon: '🛢️',
    recommendedSymbol: 'CRUDEOIL',
    assetClass: 'COMMODITIES',
    cockpitTab: 'BUYERS',
    primaryFocus: 'Global energy, bullion and industrial metal trends with evening session flow',
    allowedSections: {
      cockpit: true,
      optionChain: true,
      strikeLiveWorkbench: true,
      breakoutRadar: true,
      cprPremarket: true,
      rightAnalytics: true,
      commoditiesFeed: true,
      equityScan: false,
      heroZeroRadar: false,
    }
  },
  ALL: {
    id: 'ALL',
    title: 'All / Multi-Asset Pro',
    shortTitle: 'All Markets',
    subtitle: 'Comprehensive multi-asset workspace: Indices, Equities & MCX Commodities',
    badge: 'Unified Terminal',
    icon: '🌐',
    recommendedSymbol: 'NIFTY',
    assetClass: 'MULTI_ASSET',
    cockpitTab: 'BUYERS',
    primaryFocus: 'Full institutional suite across derivatives, equities, and commodities',
    allowedSections: {
      cockpit: true,
      optionChain: true,
      strikeLiveWorkbench: true,
      breakoutRadar: true,
      cprPremarket: true,
      rightAnalytics: true,
      commoditiesFeed: true,
      equityScan: true,
      heroZeroRadar: true,
    }
  }
};

interface TradingPersonaContextType {
  persona: TradingPersona;
  metadata: PersonaMetadata;
  setPersona: (p: TradingPersona) => void;
  hasSelectedPersona: boolean;
  setHasSelectedPersona: (val: boolean) => void;
  isPersonaModalOpen: boolean;
  setIsPersonaModalOpen: (open: boolean) => void;
  isSectionAllowed: (sectionKey: keyof PersonaMetadata['allowedSections']) => boolean;
}

const TradingPersonaContext = createContext<TradingPersonaContextType | undefined>(undefined);

export const TradingPersonaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [persona, setPersonaState] = useState<TradingPersona>(() => {
    try {
      const saved = localStorage.getItem('fayda_trading_persona');
      if (saved && Object.keys(PERSONA_CONFIGS).includes(saved)) {
        return saved as TradingPersona;
      }
      return 'ALL';
    } catch {
      return 'ALL';
    }
  });

  const [hasSelectedPersona, setHasSelectedPersonaState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('fayda_has_selected_persona') === 'true';
    } catch {
      return false;
    }
  });

  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('fayda_trading_persona', persona);
    } catch (e) {
      console.warn('Failed to save trading persona:', e);
    }
  }, [persona]);

  const setPersona = (newPersona: TradingPersona) => {
    setPersonaState(newPersona);
    setHasSelectedPersonaState(true);
    try {
      localStorage.setItem('fayda_has_selected_persona', 'true');
    } catch (e) {
      console.warn('Failed to save has_selected_persona:', e);
    }
  };

  const setHasSelectedPersona = (val: boolean) => {
    setHasSelectedPersonaState(val);
    try {
      localStorage.setItem('fayda_has_selected_persona', val ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to save has_selected_persona:', e);
    }
  };

  const metadata = PERSONA_CONFIGS[persona] || PERSONA_CONFIGS.ALL;

  const isSectionAllowed = (sectionKey: keyof PersonaMetadata['allowedSections']): boolean => {
    if (persona === 'ALL') return true;
    return metadata.allowedSections[sectionKey] ?? true;
  };

  return (
    <TradingPersonaContext.Provider
      value={{
        persona,
        metadata,
        setPersona,
        hasSelectedPersona,
        setHasSelectedPersona,
        isPersonaModalOpen,
        setIsPersonaModalOpen,
        isSectionAllowed
      }}
    >
      {children}
    </TradingPersonaContext.Provider>
  );
};

export const useTradingPersona = (): TradingPersonaContextType => {
  const ctx = useContext(TradingPersonaContext);
  if (!ctx) {
    throw new Error('useTradingPersona must be used within a TradingPersonaProvider');
  }
  return ctx;
};
