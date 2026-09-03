import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth, type PanelVisibilityConfig } from '../../context/AuthContext';
import { 
  ShieldCheck, 
  Sliders, 
  Eye, 
  EyeOff, 
  Layers, 
  Activity, 
  Zap, 
  FileText, 
  Users, 
  CheckCircle2, 
  X, 
  RotateCcw, 
  Lock, 
  AlertTriangle,
  Globe,
  Radio,
  Palette,
  Sun,
  Moon,
  Sparkles,
  Check
} from 'lucide-react';
import { useTheme, type DarkPreset, type LightPreset } from '../../context/ThemeContext';

interface SuperAdminControlDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuperAdminControlDrawer: React.FC<SuperAdminControlDrawerProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    isSuperAdmin, 
    panelVisibility, 
    togglePanelVisibility, 
    setAllPanelsVisibility, 
    resetPanelVisibility, 
    currentLegalVersion,
    consentAuditLogs 
  } = useAuth();

  const { theme, toggleTheme, darkPreset, setDarkPreset, lightPreset, setLightPreset } = useTheme();

  const [activeTab, setActiveTab] = useState<'PANELS' | 'THEMES' | 'AUDIT_LOGS' | 'LEGAL_DOCS'>('PANELS');

  if (!isOpen) return null;

  const panelItems: { key: keyof PanelVisibilityConfig; label: string; description: string; icon: any }[] = [
    {
      key: 'optionChain',
      label: 'Option Chain Heatmap',
      description: 'Real-time multi-strike call/put OI, volume, Greeks, and ATM positioning matrix.',
      icon: Layers
    },
    {
      key: 'tradeGuidance',
      label: 'AI Trade Guidance & Decision Engine',
      description: 'Gated BUY CALL / BUY PUT / NO TRADE / WAIT / HEDGE cards with R:R targets.',
      icon: Zap
    },
    {
      key: 'patternRadar',
      label: 'Multi-Timeframe Breakout Pattern Radar',
      description: 'Classical chart patterns (Double Bottom, Ascending Triangle, Head & Shoulders).',
      icon: Activity
    },
    {
      key: 'heroZeroRadar',
      label: '0DTE Hero-or-Zero Multiplier Radar',
      description: 'Sub-₹60 gamma explosion options with target price accelerators.',
      icon: Zap
    },
    {
      key: 'rightAnalytics',
      label: 'PCR Momentum & Greeks Column',
      description: 'Real-time ATM PCR shift, Max Pain, Resistance/Support Walls, and News Wire.',
      icon: Activity
    },
    {
      key: 'highlightSignalTicker',
      label: 'Live Highlight Trade Signal Ticker',
      description: 'Top horizontal strip showing the highest-conviction active contract strike and entry.',
      icon: Radio
    },
    {
      key: 'globalSidebar',
      label: 'Global Indices & Macro Drawer',
      description: 'GIFT Nifty, US S&P 500, Nasdaq, Asian markets, Crude Oil & Gold tracker.',
      icon: Globe
    },
    {
      key: 'traderModeToggle',
      label: '3-Mode Trader Toggle (🟢 / 🟡 / 🟣)',
      description: 'Beginner / Intermediate / Expert mode switcher pill in header.',
      icon: Sliders
    },
    {
      key: 'riskCalc',
      label: 'Position Sizing & Risk Calculator',
      description: 'SEBI-compliant account capital risk and lot calculation tool.',
      icon: ShieldCheck
    },
    {
      key: 'surgeBanner',
      label: 'Surge Alert & Flash News Banners',
      description: 'High-speed institutional order flow surge alerts and breaking macroeconomic flash banner.',
      icon: AlertTriangle
    },
    {
      key: 'squareOffBanner',
      label: 'Emergency Square-Off Reversal Banner',
      description: 'Alerts traders when market structure abruptly reverses against active setups.',
      icon: AlertTriangle
    },
    {
      key: 'sebiTicker',
      label: 'SEBI Compliance Footer Ticker',
      description: 'Permanently pinned bottom regulatory risk disclosure ticker.',
      icon: ShieldAlertIcon
    }
  ];

  function ShieldAlertIcon(props: any) {
    return <AlertTriangle {...props} />;
  }

  return createPortal(
    <div className="fixed inset-0 z-[115000] overflow-y-auto bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 flex min-h-full items-center justify-center select-none animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[88vh] bg-terminal-card border border-accent-purple/50 rounded-2xl shadow-elevated flex flex-col overflow-hidden my-auto animate-scale-up">
        {/* Pinned Drawer Top Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-terminal-border bg-terminal-panel/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-accent-purple/20 border border-accent-purple/40 text-accent-purple shadow-subtle">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-sans font-bold text-terminal-text flex items-center gap-2">
                <span>SuperAdmin Platform Control Matrix</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple font-mono font-bold border border-accent-purple/40">
                  ⚡ SUPERADMIN RIGHTS ACTIVE
                </span>
              </h2>
              <p className="text-xs text-terminal-muted font-sans">
                Live control over UI panels, design element visibility, and compliance audit logs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-terminal-border bg-terminal-bg/80 px-4 py-2 gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('PANELS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'PANELS'
                ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400 shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Element Visibility</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('THEMES')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'THEMES'
                ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400 shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-accent-purple" />
            <span>Theme Studio & Presets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AUDIT_LOGS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'AUDIT_LOGS'
                ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400 shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Consent Audit Trail ({consentAuditLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LEGAL_DOCS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'LEGAL_DOCS'
                ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400 shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Legal Version Manager (v{currentLegalVersion})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[65vh]">
          {/* TAB 1: ELEMENT VISIBILITY MATRIX */}
          {activeTab === 'PANELS' && (
            <div className="space-y-3">
              {/* Quick Batch Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-terminal-panel border border-terminal-border font-mono text-xs">
                <span className="text-terminal-muted">
                  Toggle elements in real-time to customize what traders see on the screen:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAllPanelsVisibility(true)}
                    className="px-2.5 py-1 rounded-lg bg-bull/20 border border-bull/40 text-bull font-bold text-[10px] hover:bg-bull/30 transition cursor-pointer"
                  >
                    Show All
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllPanelsVisibility(false)}
                    className="px-2.5 py-1 rounded-lg bg-bear/20 border border-bear/40 text-bear font-bold text-[10px] hover:bg-bear/30 transition cursor-pointer"
                  >
                    Hide All
                  </button>
                  <button
                    type="button"
                    onClick={resetPanelVisibility}
                    className="px-2.5 py-1 rounded-lg bg-terminal-card border border-terminal-border text-terminal-text font-bold text-[10px] hover:bg-terminal-bg transition flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Defaults</span>
                  </button>
                </div>
              </div>

              {/* Grid of Toggle Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {panelItems.map((item) => {
                  const isVisible = panelVisibility[item.key];
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.key}
                      className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        isVisible
                          ? 'bg-terminal-panel/90 border-purple-500/30'
                          : 'bg-terminal-panel/30 border-terminal-border opacity-60'
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <div className={`p-2 rounded-lg border mt-0.5 shrink-0 ${
                          isVisible ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' : 'bg-terminal-bg border-terminal-border text-terminal-muted'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-terminal-text">{item.label}</span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                              isVisible ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
                            }`}>
                              {isVisible ? 'VISIBLE' : 'HIDDEN'}
                            </span>
                          </div>
                          <p className="text-[11px] text-terminal-muted mt-0.5 leading-snug">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => togglePanelVisibility(item.key)}
                        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                          isVisible ? 'bg-purple-600' : 'bg-terminal-border'
                        }`}
                        title={isVisible ? 'Click to Hide this Panel' : 'Click to Show this Panel'}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          isVisible ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: THEME STUDIO & PRESET CONTROLS (SUPERADMIN ONLY) */}
          {activeTab === 'THEMES' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/15 via-accent-sky/10 to-transparent border border-purple-500/30">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-lg bg-accent-purple/20 text-accent-purple border border-accent-purple/40">
                      <Palette className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-terminal-text flex items-center gap-1.5">
                        <span>Institutional Design System & Palette Control</span>
                        <Sparkles className="w-4 h-4 text-accent-gold" />
                      </h3>
                      <p className="text-xs text-terminal-muted leading-relaxed mt-0.5">
                        Only SuperUsers can configure the platform's color presets. Regular users will experience these curated colors automatically when toggling between light and dark themes.
                      </p>
                    </div>
                  </div>

                  {/* Live Theme Preview Switch */}
                  <div className="flex items-center gap-2 bg-terminal-panel/80 p-1.5 rounded-xl border border-terminal-border">
                    <span className="text-xs font-mono font-bold text-terminal-text flex items-center gap-1.5 pl-2">
                      {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-accent-purple" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                      <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="px-3 py-1 text-xs font-mono font-bold rounded-lg bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple border border-accent-purple/40 transition cursor-pointer"
                    >
                      Toggle Mode
                    </button>
                  </div>
                </div>
              </div>

              {/* ── 1. DARK THEME PRESETS ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-terminal-border pb-2">
                  <div className="flex items-center space-x-2">
                    <Moon className="w-4 h-4 text-accent-purple" />
                    <h4 className="font-bold text-xs uppercase tracking-wider font-mono text-terminal-text">
                      Dark Theme Preset (For All Dark Mode Users)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-terminal-muted">
                    Active: <strong className="text-accent-purple">{darkPreset === 'OBSIDIAN_PRO' ? 'Obsidian Onyx Pro' : 'Classic Terminal'}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Preset 1: Obsidian Onyx (Recommended) */}
                  <div
                    onClick={() => setDarkPreset('OBSIDIAN_PRO')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                      darkPreset === 'OBSIDIAN_PRO'
                        ? 'bg-purple-500/10 border-purple-500 shadow-md ring-1 ring-purple-500/50'
                        : 'bg-terminal-panel/50 border-terminal-border hover:border-terminal-border/80 hover:bg-terminal-panel'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs font-mono text-terminal-text">
                            Obsidian Onyx
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            INSTITUTIONAL PRO
                          </span>
                        </div>
                        {darkPreset === 'OBSIDIAN_PRO' && (
                          <div className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-terminal-muted leading-relaxed">
                        Pitch-black luxury obsidian canvas (#090A0F) with frosted glassmorphism, jewel-tone mint emerald (#10B981) calls, coral crimson (#F43F5E) puts, and radiant violet accents. Designed for zero glare.
                      </p>
                    </div>

                    {/* Color Swatch Bar */}
                    <div className="flex items-center space-x-1.5 pt-2 border-t border-terminal-border/60">
                      <span className="text-[9px] font-mono text-terminal-muted mr-1">Palette:</span>
                      <span className="w-5 h-5 rounded-md border border-white/20 bg-[#090A0F]" title="Canvas: #090A0F" />
                      <span className="w-5 h-5 rounded-md border border-white/20 bg-[#11131A]" title="Card: #11131A" />
                      <span className="w-5 h-5 rounded-md border border-white/20 bg-[#10B981]" title="Bull: #10B981 (Mint Emerald)" />
                      <span className="w-5 h-5 rounded-md border border-white/20 bg-[#F43F5E]" title="Bear: #F43F5E (Coral Crimson)" />
                      <span className="w-5 h-5 rounded-md border border-white/20 bg-[#F59E0B]" title="Accent: #F59E0B (Champagne Gold)" />
                      <span className="w-5 h-5 rounded-md border border-white/20 bg-[#6366F1]" title="Accent: #6366F1 (Electric Indigo)" />
                    </div>
                  </div>

                  {/* Preset 2: Classic Terminal */}
                  <div
                    onClick={() => setDarkPreset('CLASSIC_DARK')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                      darkPreset === 'CLASSIC_DARK'
                        ? 'bg-purple-500/10 border-purple-500 shadow-md ring-1 ring-purple-500/50'
                        : 'bg-terminal-panel/50 border-terminal-border hover:border-terminal-border/80 hover:bg-terminal-panel'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs font-mono text-terminal-text">
                            Classic Terminal
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-terminal-panel border border-terminal-border text-terminal-muted">
                            LEGACY
                          </span>
                        </div>
                        {darkPreset === 'CLASSIC_DARK' && (
                          <div className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-terminal-muted leading-relaxed">
                        Traditional deep navy-slate terminal canvas (#080B10) with standard emerald green (#22C55E), rose red (#F43F5E), and bright cyan (#00E5FF) highlights.
                      </p>
                    </div>

                    {/* Color Swatch Bar */}
                    <div className="flex items-center space-x-1.5 pt-2 border-t border-terminal-border/60">
                      <span className="text-[9px] font-mono text-terminal-muted mr-1">Palette:</span>
                      <span className="w-5 h-5 rounded-md border border-white/20 bg-[#080B10]" title="Canvas: #080B10" />
                      <span className="w-5 h-5 rounded-md border border-white/20 bg-[#0D131C]" title="Card: #0D131C" />
                      <span className="w-5 h-5 rounded-md border border-white/20 bg-[#22C55E]" title="Bull: #22C55E" />
                      <span className="w-5 h-5 rounded-md border border-white/20 bg-[#F43F5E]" title="Bear: #F43F5E" />
                      <span className="w-5 h-5 rounded-md border border-white/20 bg-[#00E5FF]" title="Accent: #00E5FF (Cyan)" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 2. LIGHT THEME PRESETS ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-terminal-border pb-2">
                  <div className="flex items-center space-x-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <h4 className="font-bold text-xs uppercase tracking-wider font-mono text-terminal-text">
                      Light Theme Preset (For All Light Mode Users)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-terminal-muted">
                    Active: <strong className="text-amber-500">{lightPreset === 'ALABASTER_PRO' ? 'Alabaster Pro' : 'Classic Light'}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Preset 1: Alabaster Pro (Recommended) */}
                  <div
                    onClick={() => setLightPreset('ALABASTER_PRO')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                      lightPreset === 'ALABASTER_PRO'
                        ? 'bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                        : 'bg-terminal-panel/50 border-terminal-border hover:border-terminal-border/80 hover:bg-terminal-panel'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs font-mono text-terminal-text">
                            Alabaster Pro
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                            NORDIC SLATE
                          </span>
                        </div>
                        {lightPreset === 'ALABASTER_PRO' && (
                          <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-terminal-muted leading-relaxed">
                        Nordic Alabaster canvas (#F4F6F9) with floating pure white cards (#FFFFFF), deep ink charcoal typography (#111827), forest emerald (#15803D), ruby red (#DC2626), and royal sapphire blue (#2563EB).
                      </p>
                    </div>

                    {/* Color Swatch Bar */}
                    <div className="flex items-center space-x-1.5 pt-2 border-t border-terminal-border/60">
                      <span className="text-[9px] font-mono text-terminal-muted mr-1">Palette:</span>
                      <span className="w-5 h-5 rounded-md border border-slate-300 bg-[#F4F6F9]" title="Canvas: #F4F6F9" />
                      <span className="w-5 h-5 rounded-md border border-slate-300 bg-[#FFFFFF]" title="Card: #FFFFFF" />
                      <span className="w-5 h-5 rounded-md border border-slate-300 bg-[#111827]" title="Text: #111827" />
                      <span className="w-5 h-5 rounded-md border border-slate-300 bg-[#15803D]" title="Bull: #15803D" />
                      <span className="w-5 h-5 rounded-md border border-slate-300 bg-[#DC2626]" title="Bear: #DC2626" />
                      <span className="w-5 h-5 rounded-md border border-slate-300 bg-[#2563EB]" title="Accent: #2563EB" />
                    </div>
                  </div>

                  {/* Preset 2: Classic Light */}
                  <div
                    onClick={() => setLightPreset('CLASSIC_LIGHT')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                      lightPreset === 'CLASSIC_LIGHT'
                        ? 'bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                        : 'bg-terminal-panel/50 border-terminal-border hover:border-terminal-border/80 hover:bg-terminal-panel'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs font-mono text-terminal-text">
                            Classic Light
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-terminal-panel border border-terminal-border text-terminal-muted">
                            LEGACY
                          </span>
                        </div>
                        {lightPreset === 'CLASSIC_LIGHT' && (
                          <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-terminal-muted leading-relaxed">
                        Clinical off-white background (#F8FAFC) with pure white surfaces, deep slate typography (#0F172A), and standard green/rose markers.
                      </p>
                    </div>

                    {/* Color Swatch Bar */}
                    <div className="flex items-center space-x-1.5 pt-2 border-t border-terminal-border/60">
                      <span className="text-[9px] font-mono text-terminal-muted mr-1">Palette:</span>
                      <span className="w-5 h-5 rounded-md border border-slate-300 bg-[#F8FAFC]" title="Canvas: #F8FAFC" />
                      <span className="w-5 h-5 rounded-md border border-slate-300 bg-[#FFFFFF]" title="Card: #FFFFFF" />
                      <span className="w-5 h-5 rounded-md border border-slate-300 bg-[#0F172A]" title="Text: #0F172A" />
                      <span className="w-5 h-5 rounded-md border border-slate-300 bg-[#16A34A]" title="Bull: #16A34A" />
                      <span className="w-5 h-5 rounded-md border border-slate-300 bg-[#E11D48]" title="Bear: #E11D48" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER CONSENT AUDIT TRAIL LOGS */}
          {activeTab === 'AUDIT_LOGS' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-terminal-panel border border-terminal-border">
                <span className="font-bold text-terminal-text block text-xs">
                  SEBI Regulatory Compliance Audit Trail
                </span>
                <span className="text-[11px] text-terminal-muted">
                  Immutable local records of user risk disclosures and legal document acknowledgements.
                </span>
              </div>

              <div className="overflow-x-auto border border-terminal-border rounded-xl">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-terminal-panel text-terminal-muted uppercase text-[10px] border-b border-terminal-border font-bold">
                    <tr>
                      <th className="p-2.5">User ID</th>
                      <th className="p-2.5">User / Email</th>
                      <th className="p-2.5">Legal Version</th>
                      <th className="p-2.5">Risk & No-Profit Consent</th>
                      <th className="p-2.5">Terms & Privacy</th>
                      <th className="p-2.5">Age & Jurisdiction</th>
                      <th className="p-2.5">Date / Timestamp</th>
                      <th className="p-2.5">IP / Origin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terminal-border bg-terminal-bg">
                    {consentAuditLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-terminal-panel/50 transition">
                        <td className="p-2.5 font-bold text-accent-cyan">{log.userId}</td>
                        <td className="p-2.5 text-terminal-text">{log.userEmail}</td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan font-bold">
                            v{log.legalVersion}
                          </span>
                        </td>
                        <td className="p-2.5 text-bull">
                          {log.riskDisclosureAccepted && log.noGuaranteedProfitAccepted ? '✓ ACKNOWLEDGED' : '✕ INCOMPLETE'}
                        </td>
                        <td className="p-2.5 text-bull">
                          {log.termsAccepted && log.privacyAccepted ? '✓ AGREED' : '✕ INCOMPLETE'}
                        </td>
                        <td className="p-2.5 text-bull">
                          {log.jurisdictionAgeAccepted ? '✓ 18+ VERIFIED' : '✕ UNVERIFIED'}
                        </td>
                        <td className="p-2.5 text-terminal-muted">
                          {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="p-2.5 text-terminal-muted">{log.ipAddress || 'Verified'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: LEGAL VERSION MANAGER */}
          {activeTab === 'LEGAL_DOCS' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-terminal-panel border border-terminal-border space-y-2">
                <div className="flex items-center justify-between border-b border-terminal-border/60 pb-2">
                  <div>
                    <span className="font-bold text-terminal-text block text-sm">Active Legal Documentation</span>
                    <span className="text-[11px] text-terminal-muted">Published Version: v{currentLegalVersion} (Effective Aug 2026)</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-bull/20 text-bull font-bold text-xs border border-bull/40">
                    STATUS: ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded-lg bg-terminal-bg border border-terminal-border">
                    <strong className="text-terminal-text block">Risk Disclosure Statement</strong>
                    <span className="text-terminal-muted">Covers Derivatives leverage, theta decay, and SEBI FY26 loss statistics.</span>
                  </div>
                  <div className="p-2 rounded-lg bg-terminal-bg border border-terminal-border">
                    <strong className="text-terminal-text block">Terms of Use</strong>
                    <span className="text-terminal-muted">Defines intellectual property, user responsibilities, and system uptime.</span>
                  </div>
                  <div className="p-2 rounded-lg bg-terminal-bg border border-terminal-border">
                    <strong className="text-terminal-text block">Non-Advisory Disclaimer</strong>
                    <span className="text-terminal-muted">Explicit separation from SEBI Registered Investment Advisory services.</span>
                  </div>
                  <div className="p-2 rounded-lg bg-terminal-bg border border-terminal-border">
                    <strong className="text-terminal-text block">Privacy Policy</strong>
                    <span className="text-terminal-muted">Zero broker password storage guarantee and encrypted OAuth handshake.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-terminal-border bg-terminal-panel/90 flex items-center justify-between">
          <span className="text-[11px] font-mono text-terminal-muted">
            All visibility changes are instantly applied to the live terminal in real-time.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-accent-purple/20 border border-accent-purple/50 text-accent-purple hover:bg-accent-purple/30 font-sans font-bold text-xs transition cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
