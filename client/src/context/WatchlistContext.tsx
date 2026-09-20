import React, { createContext, useContext, useEffect, useState } from 'react';

export type WatchlistItemType = 'INDEX' | 'STOCK' | 'COMMODITY' | 'OPTION_STRIKE';

export interface WatchlistItem {
  id: string;
  symbol: string;               // e.g. "NIFTY", "RELIANCE", "CRUDEOIL", or "NIFTY 23500 CE"
  displayName: string;
  type: WatchlistItemType;
  exchange: 'NSE' | 'BSE' | 'MCX';
  strikePrice?: number;
  optionType?: 'CE' | 'PE';
  expiryDate?: string;
  lotSize?: number;
  addedAt: string;
}

export interface UserWatchlist {
  id: string;
  name: string;
  items: WatchlistItem[];
  isDefault?: boolean;
}

const DEFAULT_STARTER_WATCHLISTS: UserWatchlist[] = [
  {
    id: 'wl_index_momentum',
    name: '⭐ Core Index Momentum',
    isDefault: true,
    items: [
      {
        id: 'item_nifty',
        symbol: 'NIFTY',
        displayName: 'NIFTY 50 Index',
        type: 'INDEX',
        exchange: 'NSE',
        addedAt: new Date().toISOString()
      },
      {
        id: 'item_banknifty',
        symbol: 'BANKNIFTY',
        displayName: 'BANK NIFTY Index',
        type: 'INDEX',
        exchange: 'NSE',
        addedAt: new Date().toISOString()
      },
      {
        id: 'item_finnifty',
        symbol: 'FINNIFTY',
        displayName: 'FIN NIFTY Index',
        type: 'INDEX',
        exchange: 'NSE',
        addedAt: new Date().toISOString()
      },
      {
        id: 'item_sensex',
        symbol: 'SENSEX',
        displayName: 'BSE SENSEX',
        type: 'INDEX',
        exchange: 'BSE',
        addedAt: new Date().toISOString()
      }
    ]
  },
  {
    id: 'wl_option_strikes',
    name: '⚡ Active Option Strikes',
    isDefault: true,
    items: [
      {
        id: 'item_nifty_ce',
        symbol: 'NIFTY 23500 CE',
        displayName: 'NIFTY 23500 CALL',
        type: 'OPTION_STRIKE',
        exchange: 'NSE',
        strikePrice: 23500,
        optionType: 'CE',
        lotSize: 65,
        addedAt: new Date().toISOString()
      },
      {
        id: 'item_nifty_pe',
        symbol: 'NIFTY 23400 PE',
        displayName: 'NIFTY 23400 PUT',
        type: 'OPTION_STRIKE',
        exchange: 'NSE',
        strikePrice: 23400,
        optionType: 'PE',
        lotSize: 65,
        addedAt: new Date().toISOString()
      },
      {
        id: 'item_bn_ce',
        symbol: 'BANKNIFTY 51000 CE',
        displayName: 'BANKNIFTY 51000 CALL',
        type: 'OPTION_STRIKE',
        exchange: 'NSE',
        strikePrice: 51000,
        optionType: 'CE',
        lotSize: 30,
        addedAt: new Date().toISOString()
      },
      {
        id: 'item_bn_pe',
        symbol: 'BANKNIFTY 50800 PE',
        displayName: 'BANKNIFTY 50800 PUT',
        type: 'OPTION_STRIKE',
        exchange: 'NSE',
        strikePrice: 50800,
        optionType: 'PE',
        lotSize: 30,
        addedAt: new Date().toISOString()
      }
    ]
  },
  {
    id: 'wl_top_stocks',
    name: '🔥 Top F&O Stocks',
    isDefault: true,
    items: [
      {
        id: 'item_reliance',
        symbol: 'RELIANCE',
        displayName: 'Reliance Industries',
        type: 'STOCK',
        exchange: 'NSE',
        addedAt: new Date().toISOString()
      },
      {
        id: 'item_hdfc',
        symbol: 'HDFCBANK',
        displayName: 'HDFC Bank Ltd',
        type: 'STOCK',
        exchange: 'NSE',
        addedAt: new Date().toISOString()
      },
      {
        id: 'item_infy',
        symbol: 'INFY',
        displayName: 'Infosys Limited',
        type: 'STOCK',
        exchange: 'NSE',
        addedAt: new Date().toISOString()
      },
      {
        id: 'item_tcs',
        symbol: 'TCS',
        displayName: 'Tata Consultancy Services',
        type: 'STOCK',
        exchange: 'NSE',
        addedAt: new Date().toISOString()
      },
      {
        id: 'item_tatamotors',
        symbol: 'TATAMOTORS',
        displayName: 'Tata Motors Ltd',
        type: 'STOCK',
        exchange: 'NSE',
        addedAt: new Date().toISOString()
      }
    ]
  },
  {
    id: 'wl_mcx_commodities',
    name: '🪙 MCX Commodities',
    isDefault: true,
    items: [
      {
        id: 'item_crude',
        symbol: 'CRUDEOIL',
        displayName: 'Crude Oil (MCX)',
        type: 'COMMODITY',
        exchange: 'MCX',
        addedAt: new Date().toISOString()
      },
      {
        id: 'item_natgas',
        symbol: 'NATURALGAS',
        displayName: 'Natural Gas (MCX)',
        type: 'COMMODITY',
        exchange: 'MCX',
        addedAt: new Date().toISOString()
      },
      {
        id: 'item_gold',
        symbol: 'GOLD',
        displayName: 'Gold Mini (MCX)',
        type: 'COMMODITY',
        exchange: 'MCX',
        addedAt: new Date().toISOString()
      },
      {
        id: 'item_silver',
        symbol: 'SILVER',
        displayName: 'Silver Mini (MCX)',
        type: 'COMMODITY',
        exchange: 'MCX',
        addedAt: new Date().toISOString()
      }
    ]
  }
];

interface WatchlistContextType {
  watchlists: UserWatchlist[];
  activeWatchlistId: string;
  activeWatchlist: UserWatchlist;
  setActiveWatchlistId: (id: string) => void;
  createWatchlist: (name: string) => string;
  deleteWatchlist: (id: string) => void;
  renameWatchlist: (id: string, newName: string) => void;
  addItemToWatchlist: (watchlistId: string, item: Omit<WatchlistItem, 'id' | 'addedAt'>) => void;
  removeItemFromWatchlist: (watchlistId: string, itemId: string) => void;
  isWatchlistDrawerOpen: boolean;
  setIsWatchlistDrawerOpen: (open: boolean) => void;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [watchlists, setWatchlists] = useState<UserWatchlist[]>(() => {
    try {
      const saved = localStorage.getItem('fayda_custom_watchlists');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return DEFAULT_STARTER_WATCHLISTS;
    } catch {
      return DEFAULT_STARTER_WATCHLISTS;
    }
  });

  const [activeWatchlistId, setActiveWatchlistIdState] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem('fayda_active_watchlist_id');
      if (savedId && watchlists.some(w => w.id === savedId)) {
        return savedId;
      }
      return watchlists[0]?.id || 'wl_index_momentum';
    } catch {
      return 'wl_index_momentum';
    }
  });

  const [isWatchlistDrawerOpen, setIsWatchlistDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('fayda_custom_watchlists', JSON.stringify(watchlists));
    } catch (e) {
      console.warn('Failed to save watchlists:', e);
    }
  }, [watchlists]);

  useEffect(() => {
    try {
      localStorage.setItem('fayda_active_watchlist_id', activeWatchlistId);
    } catch (e) {
      console.warn('Failed to save active watchlist ID:', e);
    }
  }, [activeWatchlistId]);

  const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId) || watchlists[0] || DEFAULT_STARTER_WATCHLISTS[0];

  const setActiveWatchlistId = (id: string) => {
    if (watchlists.some(w => w.id === id)) {
      setActiveWatchlistIdState(id);
    }
  };

  const createWatchlist = (name: string): string => {
    const trimmed = name.trim() || `Watchlist ${watchlists.length + 1}`;
    const newId = `wl_user_${Date.now()}`;
    const newWl: UserWatchlist = {
      id: newId,
      name: trimmed,
      items: []
    };
    setWatchlists(prev => [...prev, newWl]);
    setActiveWatchlistIdState(newId);
    return newId;
  };

  const deleteWatchlist = (id: string) => {
    setWatchlists(prev => {
      const filtered = prev.filter(w => w.id !== id);
      if (filtered.length === 0) {
        return DEFAULT_STARTER_WATCHLISTS;
      }
      return filtered;
    });
    if (activeWatchlistId === id) {
      setActiveWatchlistIdState(prev => {
        const remaining = watchlists.filter(w => w.id !== id);
        return remaining[0]?.id || DEFAULT_STARTER_WATCHLISTS[0].id;
      });
    }
  };

  const renameWatchlist = (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setWatchlists(prev => prev.map(w => w.id === id ? { ...w, name: trimmed } : w));
  };

  const addItemToWatchlist = (watchlistId: string, item: Omit<WatchlistItem, 'id' | 'addedAt'>) => {
    const newItem: WatchlistItem = {
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      addedAt: new Date().toISOString()
    };
    setWatchlists(prev => prev.map(w => {
      if (w.id !== watchlistId) return w;
      // Prevent exact duplicate symbol in same watchlist
      const exists = w.items.some(i => i.symbol === item.symbol);
      if (exists) return w;
      return {
        ...w,
        items: [newItem, ...w.items]
      };
    }));
  };

  const removeItemFromWatchlist = (watchlistId: string, itemId: string) => {
    setWatchlists(prev => prev.map(w => {
      if (w.id !== watchlistId) return w;
      return {
        ...w,
        items: w.items.filter(i => i.id !== itemId)
      };
    }));
  };

  return (
    <WatchlistContext.Provider
      value={{
        watchlists,
        activeWatchlistId,
        activeWatchlist,
        setActiveWatchlistId,
        createWatchlist,
        deleteWatchlist,
        renameWatchlist,
        addItemToWatchlist,
        removeItemFromWatchlist,
        isWatchlistDrawerOpen,
        setIsWatchlistDrawerOpen
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = (): WatchlistContextType => {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return ctx;
};
