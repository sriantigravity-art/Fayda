import React, { useState, useRef, useEffect } from 'react';
import {
  TrendingUp,
  Landmark,
  Zap,
  Target,
  Layers,
  Sparkles,
  BarChart3,
  LineChart,
  Compass,
  FileSpreadsheet,
  Activity,
  Coins,
  Newspaper,
  BookOpen,
  Calculator,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Bell,
  Search,
  Crown,
  User,
  Settings,
  ArrowUpRight,
  Flame,
  Table2,
  Sliders,
  PieChart,
  Terminal,
  Clock,
  Radio,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Calendar,
  X
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useMarket } from '../../context/MarketContext';
import { useAuth } from '../../context/AuthContext';

export interface ExploreMegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenJournal: () => void;
  onOpenRiskCalc: () => void;
  onOpenPayoffSimulator: () => void;
  onOpenFyers: () => void;
  onOpenSound: () => void;
  onOpenSubscription: (plan?: 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND') => void;
  onOpenProfile: (tab?: 'PROFILE' | 'PASSWORD' | 'MEMBERSHIP') => void;
  onOpenCommandPalette: () => void;
  onOpenLegal: (doc?: any) => void;
  onOpenAdmin: () => void;
  onOpenChart: (symbol: string) => void;
  onOpenOptionsTable: (symbol: string) => void;
  onOpenMcx: (symbol?: string) => void;
  onOpenHolidays?: () => void;
  onNavigateToPanel: (panelId: string, panelVisibilityKey?: string, mobileTab?: string) => void;
}

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  iconBg: string;
  onClick: () => void;
}

interface MenuCategory {
  id: string;
  name: string;
  badge?: string;
  arrowAction?: () => void;
  items: MenuItem[];
}

export const ExploreMegaMenu: React.FC<ExploreMegaMenuProps> = ({
  isOpen,
  onClose,
  onOpenJournal,
  onOpenRiskCalc,
  onOpenPayoffSimulator,
  onOpenFyers,
  onOpenSound,
  onOpenSubscription,
  onOpenProfile,
  onOpenCommandPalette,
  onOpenLegal,
  onOpenAdmin,
  onOpenChart,
  onOpenOptionsTable,
  onOpenMcx,
  onOpenHolidays,
  onNavigateToPanel
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { selectedIndex, isMuted, soundVolume } = useMarket();
  const { isSuperAdmin } = useAuth();
  const [filterQuery, setFilterQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape or Outside Click
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const categories: MenuCategory[] = [
    {
      id: 'market',
      name: 'Market',
      badge: 'LIVE NSE / BSE',
      arrowAction: () => {
        onClose();
        onNavigateToPanel('panel-option-chain', 'optionChain', 'CHAIN');
      },
      items: [
        {
          id: 'signals',
          title: 'Quantum Trade Signals',
          subtitle: '10-Factor Confluence & Entry/SL',
          badge: 'AI LIVE',
          badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
          icon: <Zap className="w-5 h-5 text-amber-500 fill-amber-500/20" />,
          iconBg: 'bg-gradient-to-br from-amber-400/20 to-orange-500/20 border-amber-500/30 shadow-amber-500/10',
          onClick: () => {
            onClose();
            onNavigateToPanel('panel-trade-signals', 'tradeGuidance', 'SIGNALS');
          }
        },
        {
          id: 'option-chain',
          title: 'Option Chain & Greeks',
          subtitle: 'Live IV, Delta, Gamma & PCR Matrix',
          badge: 'GREEKS',
          badgeColor: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
          icon: <Table2 className="w-5 h-5 text-cyan-500" />,
          iconBg: 'bg-gradient-to-br from-cyan-400/20 to-blue-500/20 border-cyan-500/30 shadow-cyan-500/10',
          onClick: () => {
            onClose();
            onNavigateToPanel('panel-option-chain', 'optionChain', 'CHAIN');
          }
        },
        {
          id: 'ntm-cluster',
          title: 'ATM ±3 Cluster Radar',
          subtitle: '09:15 Baseline OI & Shifts',
          badge: 'ATM PIN',
          badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
          icon: <Compass className="w-5 h-5 text-indigo-500" />,
          iconBg: 'bg-gradient-to-br from-indigo-400/20 to-purple-500/20 border-indigo-500/30 shadow-indigo-500/10',
          onClick: () => {
            onClose();
            onNavigateToPanel('panel-cluster-radar', undefined, 'CHAIN');
          }
        },
        {
          id: 'breakout-radar',
          title: 'Breakout Pattern Radar',
          subtitle: 'Live Price & Volume Explosions',
          badge: 'SURGE',
          badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
          iconBg: 'bg-gradient-to-br from-emerald-400/20 to-teal-500/20 border-emerald-500/30 shadow-emerald-500/10',
          onClick: () => {
            onClose();
            onNavigateToPanel('panel-breakout-radar', 'patternRadar', 'RADAR');
          }
        },
        {
          id: 'premarket-cpr',
          title: 'Pre-Market & CPR Pivots',
          subtitle: 'Floor Pivots, Virgin CPR & Regime',
          icon: <Activity className="w-5 h-5 text-sky-500" />,
          iconBg: 'bg-gradient-to-br from-sky-400/20 to-blue-600/20 border-sky-500/30 shadow-sky-500/10',
          onClick: () => {
            onClose();
            onNavigateToPanel('panel-premarket-cpr', undefined, 'CHAIN');
          }
        },
        {
          id: 'hero-zero',
          title: 'Hero-Zero 0DTE Radar',
          subtitle: 'Low-cost explosive expiry contracts',
          badge: '0DTE',
          badgeColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
          icon: <Flame className="w-5 h-5 text-rose-500 fill-rose-500/20" />,
          iconBg: 'bg-gradient-to-br from-rose-400/20 to-red-600/20 border-rose-500/30 shadow-rose-500/10',
          onClick: () => {
            onClose();
            onNavigateToPanel('panel-hero-zero', 'heroZeroRadar', 'RADAR');
          }
        },
        {
          id: 'fii-dii',
          title: 'FII / DII Institutional Flow',
          subtitle: 'Cash market & derivatives positioning',
          icon: <Landmark className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
          iconBg: 'bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border-blue-500/30 shadow-blue-500/10',
          onClick: () => {
            onClose();
            onNavigateToPanel('panel-right-analytics', 'rightAnalytics', 'ANALYTICS');
          }
        },
        {
          id: 'global-cues',
          title: 'Global Macro & Geopolitics',
          subtitle: 'Dow, Nasdaq, Crude, DXY & SGX',
          icon: <Radio className="w-5 h-5 text-violet-500" />,
          iconBg: 'bg-gradient-to-br from-violet-400/20 to-purple-600/20 border-violet-500/30 shadow-violet-500/10',
          onClick: () => {
            onClose();
            onNavigateToPanel('panel-global-context', 'globalSidebar', 'ANALYTICS');
          }
        }
      ]
    },
    {
      id: 'analytics',
      name: 'Analytics Tools',
      badge: 'PRO ALPHA',
      arrowAction: () => {
        onClose();
        onNavigateToPanel('panel-inline-chart', undefined, 'CHAIN');
      },
      items: [
        {
          id: 'inline-chart',
          title: 'Live Candlestick Order Flow',
          subtitle: '1m / 5m candles with delta volume',
          badge: 'NEW',
          badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          icon: <BarChart3 className="w-5 h-5 text-emerald-500" />,
          iconBg: 'bg-gradient-to-br from-emerald-400/20 to-teal-500/20 border-emerald-500/30 shadow-emerald-500/10',
          onClick: () => {
            onClose();
            onNavigateToPanel('panel-inline-chart', undefined, 'CHAIN');
          }
        },
        {
          id: 'tactical-slider',
          title: 'Tactical Strike Slider Radar',
          subtitle: 'ATM ±3 ladder with 10 technical indicators',
          badge: '10 INDICATORS',
          badgeColor: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
          icon: <Sliders className="w-5 h-5 text-sky-500" />,
          iconBg: 'bg-gradient-to-br from-sky-400/20 to-indigo-500/20 border-sky-500/30 shadow-sky-500/10',
          onClick: () => {
            onClose();
            onNavigateToPanel('panel-strike-slider', undefined, 'CHAIN');
          }
        },
        {
          id: 'tradingview-chart',
          title: 'Interactive TradingView Chart',
          subtitle: `Multi-timeframe charting for ${selectedIndex}`,
          icon: <LineChart className="w-5 h-5 text-blue-500" />,
          iconBg: 'bg-gradient-to-br from-blue-400/20 to-indigo-500/20 border-blue-500/30 shadow-blue-500/10',
          onClick: () => {
            onClose();
            onOpenChart(selectedIndex);
          }
        },
        {
          id: 'options-table',
          title: 'Granular Options Data Table',
          subtitle: 'Deep tabular matrix & historical strikes',
          icon: <FileSpreadsheet className="w-5 h-5 text-teal-500" />,
          iconBg: 'bg-gradient-to-br from-teal-400/20 to-emerald-500/20 border-teal-500/30 shadow-teal-500/10',
          onClick: () => {
            onClose();
            onOpenOptionsTable(selectedIndex);
          }
        },
        {
          id: 'vix-volatility',
          title: 'India VIX Volatility Barometer',
          subtitle: 'Day / Week / Month volatility bands',
          icon: <Activity className="w-5 h-5 text-rose-500" />,
          iconBg: 'bg-gradient-to-br from-rose-400/20 to-orange-500/20 border-rose-500/30 shadow-rose-500/10',
          onClick: () => {
            onClose();
            onNavigateToPanel('panel-right-analytics', 'rightAnalytics', 'ANALYTICS');
          }
        },
        {
          id: 'mcx-commodities',
          title: 'MCX Commodities Terminal',
          subtitle: 'Crude Oil, Gold, Silver & Natural Gas',
          badge: 'MCX LIVE',
          badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
          icon: <Coins className="w-5 h-5 text-amber-500" />,
          iconBg: 'bg-gradient-to-br from-amber-400/20 to-yellow-500/20 border-amber-500/30 shadow-amber-500/10',
          onClick: () => {
            onClose();
            onOpenMcx('CRUDEOIL');
          }
        },
        {
          id: 'news-wire',
          title: 'Live NewsWire & Sentiment Feed',
          subtitle: 'Real-time breaking market news alerts',
          icon: <Newspaper className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
          iconBg: 'bg-gradient-to-br from-blue-400/20 to-cyan-500/20 border-blue-500/30 shadow-blue-500/10',
          onClick: () => {
            onClose();
            onNavigateToPanel('panel-news-wire', 'newsBanner', 'NEWS');
          }
        },
        {
          id: 'trade-registry',
          title: 'Full Session Trade Registry',
          subtitle: 'Historical intraday signals table',
          icon: <Layers className="w-5 h-5 text-amber-500" />,
          iconBg: 'bg-gradient-to-br from-amber-400/20 to-orange-500/20 border-amber-500/30 shadow-amber-500/10',
          onClick: () => {
            onClose();
            onNavigateToPanel('panel-trade-registry', 'tradeGuidance', 'SIGNALS');
          }
        }
      ]
    },
    {
      id: 'personal',
      name: 'Trading & Risk Tools',
      badge: 'TOOLS OS',
      arrowAction: () => {
        onClose();
        onOpenJournal();
      },
      items: [
        {
          id: 'trade-journal',
          title: 'Post-Market Trade Journal',
          subtitle: 'P&L analytics, performance audit & discipline score',
          badge: 'AUDIT',
          badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
          icon: <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
          iconBg: 'bg-gradient-to-br from-blue-400/20 to-indigo-500/20 border-blue-500/30 shadow-blue-500/10',
          onClick: () => {
            onClose();
            onOpenJournal();
          }
        },
        {
          id: 'payoff-simulator',
          title: 'Trade Payoff Simulator',
          subtitle: 'Strategy payoff graphs & risk-to-reward zones',
          badge: 'SIMULATOR',
          badgeColor: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
          icon: <PieChart className="w-5 h-5 text-violet-500" />,
          iconBg: 'bg-gradient-to-br from-violet-400/20 to-fuchsia-500/20 border-violet-500/30 shadow-violet-500/10',
          onClick: () => {
            onClose();
            onOpenPayoffSimulator();
          }
        },
        {
          id: 'risk-calculator',
          title: 'SEBI Risk & Position Sizing',
          subtitle: 'Optimal lot sizing, stop loss & capital protection',
          badge: 'LOT SIZE',
          badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
          icon: <Calculator className="w-5 h-5 text-orange-500" />,
          iconBg: 'bg-gradient-to-br from-orange-400/20 to-amber-500/20 border-orange-500/30 shadow-orange-500/10',
          onClick: () => {
            onClose();
            onOpenRiskCalc();
          }
        },
        {
          id: 'sound-alerts',
          title: 'Sound & Audio Alerts Studio',
          subtitle: 'Real-time target hit chimes & surge bells',
          badge: isMuted ? 'MUTED' : `${Math.round(soundVolume * 100)}% VOL`,
          badgeColor: isMuted
            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          icon: <Bell className="w-5 h-5 text-fuchsia-500" />,
          iconBg: 'bg-gradient-to-br from-fuchsia-400/20 to-pink-500/20 border-fuchsia-500/30 shadow-fuchsia-500/10',
          onClick: () => {
            onClose();
            onOpenSound();
          }
        },
        {
          id: 'command-palette',
          title: 'Command Palette (Ctrl+K)',
          subtitle: 'Instant search, symbol switch & quick terminal jumps',
          badge: '⌘K',
          badgeColor: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30 font-mono',
          icon: <Search className="w-5 h-5 text-slate-600 dark:text-slate-300" />,
          iconBg: 'bg-gradient-to-br from-slate-400/20 to-zinc-500/20 border-slate-500/30 shadow-slate-500/10',
          onClick: () => {
            onClose();
            onOpenCommandPalette();
          }
        },
        {
          id: 'tools-sebi-compliance',
          title: 'SEBI Compliance & Disclaimers',
          subtitle: 'Mandatory statutory risk disclosures & policies',
          badge: 'SEBI',
          badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
          iconBg: 'bg-gradient-to-br from-emerald-400/20 to-teal-500/20 border-emerald-500/30 shadow-emerald-500/10',
          onClick: () => {
            onClose();
            onOpenLegal('RISK_DISCLOSURE');
          }
        },
        {
          id: 'broker-connect',
          title: 'Unified Broker Connect',
          subtitle: 'Connect DhanHQ, Fyers v3 or Paper Trading',
          badge: 'EXECUTE',
          badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          icon: <KeyRound className="w-5 h-5 text-emerald-500" />,
          iconBg: 'bg-gradient-to-br from-emerald-400/20 to-green-500/20 border-emerald-500/30 shadow-emerald-500/10',
          onClick: () => {
            onClose();
            onOpenFyers();
          }
        }
      ]
    },
    {
      id: 'membership',
      name: 'Pro Membership & Control',
      badge: 'ACCOUNT',
      arrowAction: () => {
        onClose();
        onOpenSubscription('GOLD');
      },
      items: [
        {
          id: 'pricing-plans',
          title: 'Fayda Pro Subscription & Pricing',
          subtitle: 'Unlock Diamond, Gold & Silver Terminal access',
          badge: 'UPGRADE',
          badgeColor: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold',
          icon: <Crown className="w-5 h-5 text-amber-500 fill-amber-500/20" />,
          iconBg: 'bg-gradient-to-br from-amber-400/25 to-yellow-500/25 border-amber-500/40 shadow-amber-500/15',
          onClick: () => {
            onClose();
            onOpenSubscription('GOLD');
          }
        },
        {
          id: 'trader-profile',
          title: 'My Trader Profile & Settings',
          subtitle: 'Profile credentials, risk style & broker tokens',
          icon: <User className="w-5 h-5 text-sky-500" />,
          iconBg: 'bg-gradient-to-br from-sky-400/20 to-blue-500/20 border-sky-500/30 shadow-sky-500/10',
          onClick: () => {
            onClose();
            onOpenProfile('PROFILE');
          }
        },
        {
          id: 'sebi-compliance',
          title: 'SEBI Legal & Risk Compliance',
          subtitle: 'Mandatory risk disclosures, terms & privacy policy',
          badge: 'SEBI',
          badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
          iconBg: 'bg-gradient-to-br from-emerald-400/20 to-teal-500/20 border-emerald-500/30 shadow-emerald-500/10',
          onClick: () => {
            onClose();
            onOpenLegal('RISK_DISCLOSURE');
          }
        },
        {
          id: 'expiry-holidays-calendar',
          title: 'F&O Expiry & Market Holidays Calendar',
          subtitle: 'Official 2026/2027 NSE, BSE & MCX settlement rules & holiday schedule',
          badge: 'CALENDAR',
          badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
          icon: <Calendar className="w-5 h-5 text-amber-500" />,
          iconBg: 'bg-gradient-to-br from-amber-400/20 to-orange-500/20 border-amber-500/30 shadow-amber-500/10',
          onClick: () => {
            onClose();
            if (onOpenHolidays) onOpenHolidays();
          }
        },
        ...(isSuperAdmin
          ? [
              {
                id: 'admin-drawer',
                title: 'Terminal OS SuperAdmin Center',
                subtitle: 'Server simulator, live broker switches & users',
                badge: 'ROOT',
                badgeColor: 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/40',
                icon: <Terminal className="w-5 h-5 text-purple-500" />,
                iconBg: 'bg-gradient-to-br from-purple-400/25 to-indigo-600/25 border-purple-500/40 shadow-purple-500/15',
                onClick: () => {
                  onClose();
                  onOpenAdmin();
                }
              }
            ]
          : [])
      ]
    }
  ];

  // Filtering logic
  const filteredCategories = categories.map((cat) => {
    if (!filterQuery.trim()) return cat;
    const q = filterQuery.toLowerCase();
    const items = cat.items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        cat.name.toLowerCase().includes(q)
    );
    return { ...cat, items };
  }).filter((cat) => cat.items.length > 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay for center-aligned modal */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] z-[129] animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={menuRef}
        className="fixed top-[46px] sm:top-[50px] left-1/2 -translate-x-1/2 w-[96vw] max-w-[1400px] max-h-[86vh] bg-white dark:bg-[#111624] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] z-[130] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none"
        style={{ transformOrigin: 'top center' }}
        role="dialog"
        aria-label="Fayda Pro Facilities & Tools Mega Menu"
      >
        {/* Top Search & Filter Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-[#141b2d]/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5 flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search all facilities, tools, signals & charts..."
              className="w-full bg-transparent text-xs sm:text-sm font-sans text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
              autoFocus
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSubscription('GOLD');
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-amber-700 dark:text-accent-gold text-xs font-bold hover:brightness-110 transition cursor-pointer shadow-sm"
            >
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>Fayda Pro Plans</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close Explore Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Categorized Content Grid */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6 custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No facilities found matching "{filterQuery}"</p>
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="mt-2 text-xs text-accent-sky hover:underline"
              >
                Clear search query
              </button>
            </div>
          ) : (
            filteredCategories.map((category, catIdx) => (
              <div key={category.id} className={catIdx > 0 ? 'pt-5' : ''}>
                {/* Category Header */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                      {category.name}
                    </h4>
                    {category.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
                        {category.badge}
                      </span>
                    )}
                  </div>

                  {category.arrowAction && (
                    <button
                      type="button"
                      onClick={category.arrowAction}
                      className="p-1 text-slate-400 hover:text-accent-sky hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer group"
                      title={`Explore all ${category.name}`}
                    >
                      <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  )}
                </div>

                {/* Items Grid: 2 for mobile, 4 for tab, 6 for desktop */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={item.onClick}
                      className="group relative flex flex-col items-center text-center p-2.5 sm:p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#141b2c]/40 hover:bg-white dark:hover:bg-[#172033] hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-150 cursor-pointer select-none"
                    >
                      {/* Badge */}
                      {item.badge && (
                        <span
                          className={`absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.2 rounded-full border ${
                            item.badgeColor || 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Icon Container with vibrant gradient and soft shadow */}
                      <div
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border mb-2 transition-transform duration-200 group-hover:scale-110 shadow-sm ${item.iconBg}`}
                      >
                        {item.icon}
                      </div>

                      {/* Item Title */}
                      <span className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-100 leading-tight mb-1 group-hover:text-accent-sky transition-colors line-clamp-2">
                        {item.title}
                      </span>

                      {/* Subtitle / Description */}
                      <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                        {item.subtitle}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Quick-Action Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-[#141b2d]/90 backdrop-blur-md text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">All 24 facilities active</span>
            <span className="hidden md:inline">• Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">Esc</kbd> to close</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCommandPalette();
              }}
              className="hover:text-accent-sky transition flex items-center gap-1 cursor-pointer font-medium"
            >
              <Search className="w-3 h-3" />
              <span>Open Spotlight Palette</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
