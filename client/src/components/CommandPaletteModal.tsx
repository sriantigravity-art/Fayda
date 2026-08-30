import React, { useState, useEffect, useRef } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode, type TerminalMode } from '../context/TerminalModeContext';
import { useDensity, type TerminalDensity } from '../context/DensityContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ALL_SYMBOLS_CONFIG } from '../types';
import {
  Search,
  Sliders,
  Calculator,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
  Zap,
  Globe,
  Radio,
  Layers,
  Activity,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Command,
  X
} from 'lucide-react';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRiskCalc?: () => void;
  onOpenAdminDrawer?: () => void;
  onOpenFyersModal?: () => void;
}

interface CommandItem {
  id: string;
  category: 'MARKETS' | 'TRADER MODE' | 'DENSITY' | 'TOOLS & SETTINGS';
  title: string;
  subtitle?: string;
  icon: any;
  action: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onOpenRiskCalc,
  onOpenAdminDrawer,
  onOpenFyersModal
}) => {
  const { selectedIndex, setSelectedIndex } = useMarket();
  const { mode, setMode } = useTerminalMode();
  const { density, setDensity } = useDensity();
  const { theme, toggleTheme } = useTheme();
  const { isSuperAdmin } = useAuth();

  const [query, setQuery] = useState('');
  const [selectedIndexItem, setSelectedIndexItem] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndexItem(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build command list
  const commands: CommandItem[] = [
    // Markets
    ...ALL_SYMBOLS_CONFIG.slice(0, 15).map((cfg) => ({
      id: `market-${cfg.symbol}`,
      category: 'MARKETS' as const,
      title: `${cfg.symbol} — ${cfg.name}`,
      subtitle: `${cfg.category} • Lot ${cfg.lot} • Step ${cfg.step}`,
      icon: Layers,
      action: () => {
        setSelectedIndex(cfg.symbol as any);
        onClose();
      }
    })),

    // Trader Modes
    {
      id: 'mode-beginner',
      category: 'TRADER MODE' as const,
      title: 'Beginner Mode (🟢 Capital Guardrails)',
      subtitle: 'Simplified plain-English bias, strict risk caps, and guidance',
      icon: Sliders,
      action: () => {
        setMode('BEGINNER');
        onClose();
      }
    },
    {
      id: 'mode-intermediate',
      category: 'TRADER MODE' as const,
      title: 'Intermediate Mode (🟡 7-Strategy Confluence)',
      subtitle: 'Master strategy score, setup grades, and R:R ratios',
      icon: Sliders,
      action: () => {
        setMode('INTERMEDIATE');
        onClose();
      }
    },
    {
      id: 'mode-expert',
      category: 'TRADER MODE' as const,
      title: 'Expert Mode (🟣 Live Greek Matrix & BOS)',
      subtitle: 'Delta, Gamma, Theta, Vega, 1-min OI squeeze, and structural breakout levels',
      icon: Sliders,
      action: () => {
        setMode('EXPERT');
        onClose();
      }
    },

    // Density Modes
    {
      id: 'density-compact',
      category: 'DENSITY' as const,
      title: 'Compact Density',
      subtitle: 'Maximum data rows and strikes on screen',
      icon: Activity,
      action: () => {
        setDensity('COMPACT');
        onClose();
      }
    },
    {
      id: 'density-standard',
      category: 'DENSITY' as const,
      title: 'Standard Density (Recommended)',
      subtitle: 'Balanced typography and comfortable readability',
      icon: Activity,
      action: () => {
        setDensity('STANDARD');
        onClose();
      }
    },
    {
      id: 'density-comfortable',
      category: 'DENSITY' as const,
      title: 'Comfortable Density',
      subtitle: 'Expanded spacing and larger touch targets',
      icon: Activity,
      action: () => {
        setDensity('COMFORTABLE');
        onClose();
      }
    },

    // Tools & Settings
    {
      id: 'tool-risk-calc',
      category: 'TOOLS & SETTINGS' as const,
      title: 'SEBI Position Sizing & Risk Calculator',
      subtitle: 'Calculate lot size based on 1-2% account risk guardrails',
      icon: Calculator,
      action: () => {
        onClose();
        onOpenRiskCalc?.();
      }
    },
    {
      id: 'tool-fyers-broker',
      category: 'TOOLS & SETTINGS' as const,
      title: 'Fyers Broker API Connect',
      subtitle: 'Link OAuth token for direct institutional order routing',
      icon: Zap,
      action: () => {
        onClose();
        onOpenFyersModal?.();
      }
    },
    {
      id: 'tool-theme-toggle',
      category: 'TOOLS & SETTINGS' as const,
      title: `Switch Theme to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      subtitle: theme === 'dark' ? 'Clean high-contrast daytime palette' : 'Institutional slate-dark palette',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => {
        toggleTheme();
        onClose();
      }
    }
  ];

  if (isSuperAdmin) {
    commands.push({
      id: 'tool-superadmin-matrix',
      category: 'TOOLS & SETTINGS' as const,
      title: '⚡ SuperAdmin Platform Control Matrix',
      subtitle: 'Toggle live panel visibility, legal documents, and compliance audit trail',
      icon: Zap,
      action: () => {
        onClose();
        onOpenAdminDrawer?.();
      }
    });
  }

  // Filter commands by query
  const filtered = commands.filter((c) => {
    const q = query.toLowerCase();
    return c.title.toLowerCase().includes(q) || (c.subtitle && c.subtitle.toLowerCase().includes(q));
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndexItem((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndexItem((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndexItem]) {
        filtered[selectedIndexItem].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[120000] flex items-start justify-center pt-16 sm:pt-24 px-3 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-terminal-card border border-terminal-border rounded-2xl shadow-elevated max-w-xl w-full overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-terminal-border bg-terminal-panel/50">
          <Search className="w-4 h-4 text-terminal-muted mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, index, or tool... (e.g. NIFTY, Risk, Dark)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndexItem(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-terminal-text text-sm font-medium focus:outline-none placeholder:text-terminal-muted"
          />
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono rounded bg-terminal-elevated text-terminal-muted border border-terminal-border">
            ESC
          </kbd>
        </div>

        {/* Command Items List */}
        <div className="overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-terminal-muted text-xs font-sans">
              No matching commands or markets found for "<span className="text-terminal-text font-bold">{query}</span>"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndexItem;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndexItem(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-terminal-hover text-terminal-text border border-terminal-border'
                      : 'text-terminal-text hover:bg-terminal-panel/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      isSelected ? 'bg-accent-sky/20 text-accent-sky' : 'bg-terminal-elevated text-terminal-muted'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold block truncate">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="text-[11px] text-terminal-muted block truncate">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-terminal-elevated text-terminal-muted shrink-0 ml-2">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 bg-terminal-panel/80 border-t border-terminal-border flex items-center justify-between text-[11px] text-terminal-muted font-mono">
          <div className="flex items-center space-x-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>Fayda Command Center</span>
        </div>
      </div>
    </div>
  );
};
