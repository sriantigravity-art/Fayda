import React, { useState, useEffect, useRef } from 'react';
import { 
  Layers, 
  Activity, 
  Zap, 
  Newspaper, 
  Settings, 
  Compass, 
  BarChart2, 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  Calculator, 
  KeyRound, 
  ShieldAlert, 
  User, 
  LogOut, 
  CheckCircle2, 
  Sparkles, 
  Sliders, 
  X, 
  ChevronUp, 
  Radio, 
  Music 
} from 'lucide-react';
import { useTerminalMode, type TerminalMode } from '../context/TerminalModeContext';
import { useTheme } from '../context/ThemeContext';
import { useMarket } from '../context/MarketContext';
import { useDensity } from '../context/DensityContext';
import { useAuth } from '../context/AuthContext';
import type { DataSourceMode } from '../types';

export type MobileTabType = 'CHAIN' | 'SIGNALS' | 'JOURNAL' | 'RADAR' | 'ANALYTICS' | 'NEWS';

interface MobileNavBarProps {
  activeTab: MobileTabType;
  onTabChange: (tab: MobileTabType) => void;
  onOpenRiskCalc: () => void;
  onOpenFyersModal?: () => void;
  onOpenLegalModal?: (doc: 'RISK_DISCLOSURE' | 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY') => void;
  onOpenAuthModal?: () => void;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  activeTab,
  onTabChange,
  onOpenRiskCalc,
  onOpenFyersModal,
  onOpenLegalModal,
  onOpenAuthModal
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const settingsDrawerRef = useRef<HTMLDivElement>(null);

  const { mode, setMode } = useTerminalMode();
  const { theme, toggleTheme } = useTheme();
  const { isMuted, toggleMute, testSound, dataSource, setDataSource, fyersConfig } = useMarket();
  const { density, setDensity } = useDensity();
  const { user, isAuthenticated, logout, panelVisibility } = useAuth();

  const isFyersActive = !!(fyersConfig && (fyersConfig.isConnected || fyersConfig.accessToken || fyersConfig.hasToken));

  // Close Settings drawer on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsDrawerRef.current && !settingsDrawerRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  const tabs: { key: MobileTabType; label: string; icon: any }[] = [
    { key: 'CHAIN', label: 'Chain', icon: Layers },
    { key: 'SIGNALS', label: 'Signals', icon: Zap },
    { key: 'JOURNAL', label: 'Journal', icon: BarChart2 },
    { key: 'RADAR', label: 'Radar', icon: Compass },
    { key: 'ANALYTICS', label: 'Analytics', icon: Activity },
    { key: 'NEWS', label: 'News', icon: Newspaper }
  ];

  return (
    <>
      {/* Backdrop overlay for smooth dismissal when clicking outside */}
      {isSettingsOpen && (
        <div 
          className="md:hidden fixed inset-0 z-[55] bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsSettingsOpen(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* UPWARD-OPENING SETTINGS & FACILITIES DROP-UP DRAWER */}
      {/* ========================================================================= */}
      {isSettingsOpen && (
        <div
          ref={settingsDrawerRef}
          className="md:hidden fixed bottom-16 left-2 right-2 z-[70] max-h-[82vh] overflow-y-auto no-scrollbar bg-terminal-card/95 backdrop-blur-2xl border border-terminal-border rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.85)] p-4 flex flex-col space-y-4 animate-in slide-in-from-bottom-5 fade-in duration-200 select-none ring-1 ring-white/10"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-terminal-border/60 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-xl bg-accent-sky/15 text-accent-sky border border-accent-sky/30">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-mono font-bold text-sm text-terminal-text uppercase tracking-wider">
                  Terminal Settings & Tools
                </h3>
                <span className="text-[10px] text-terminal-muted block">
                  Experience mode, theme, audio, data sources & risk tools
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="p-1.5 rounded-xl bg-terminal-panel hover:bg-terminal-card border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. TRADER EXPERIENCE MODE SWITCHER */}
          {panelVisibility.traderModeToggle && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-terminal-muted uppercase">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>Trader Experience Mode</span>
                </span>
                <span className="text-[10px] text-terminal-text font-bold uppercase">
                  {mode}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 bg-terminal-panel border border-terminal-border rounded-2xl p-1.5 text-xs font-semibold">
                {/* Beginner */}
                <button
                  type="button"
                  onClick={() => setMode('BEGINNER')}
                  className={`py-2 px-2 rounded-xl transition flex flex-col items-center justify-center text-center cursor-pointer ${
                    mode === 'BEGINNER'
                      ? 'bg-bull/20 text-bull font-bold border border-bull/40 shadow-sm'
                      : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-card'
                  }`}
                >
                  <span className="text-xs font-bold">🟢 Beginner</span>
                  <span className="text-[9px] opacity-75 font-normal">Simplified</span>
                </button>

                {/* Intermediate */}
                <button
                  type="button"
                  onClick={() => setMode('INTERMEDIATE')}
                  className={`py-2 px-2 rounded-xl transition flex flex-col items-center justify-center text-center cursor-pointer ${
                    mode === 'INTERMEDIATE'
                      ? 'bg-amber/20 text-amber font-bold border border-amber/40 shadow-sm'
                      : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-card'
                  }`}
                >
                  <span className="text-xs font-bold">🟡 Interm.</span>
                  <span className="text-[9px] opacity-75 font-normal">OI Shifts</span>
                </button>

                {/* Expert */}
                <button
                  type="button"
                  onClick={() => setMode('EXPERT')}
                  className={`py-2 px-2 rounded-xl transition flex flex-col items-center justify-center text-center cursor-pointer ${
                    mode === 'EXPERT'
                      ? 'bg-accent-purple/20 text-accent-purple font-bold border border-accent-purple/40 shadow-sm'
                      : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-card'
                  }`}
                >
                  <span className="text-xs font-bold">🟣 Expert</span>
                  <span className="text-[9px] opacity-75 font-normal">Gamma Flow</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. THEME & AUDIO ALERTS ROW */}
          <div className="grid grid-cols-2 gap-2">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-terminal-panel hover:bg-terminal-card border border-terminal-border text-terminal-text transition cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-accent-sky" />
                ) : (
                  <Sun className="w-4 h-4 text-amber" />
                )}
                <div className="text-left">
                  <span className="text-xs font-bold block">Theme</span>
                  <span className="text-[10px] text-terminal-muted font-mono capitalize">{theme} Mode</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-terminal-card border border-terminal-border text-accent-sky">
                TOGGLE
              </span>
            </button>

            {/* Audio Alerts Mute/Unmute */}
            <button
              type="button"
              onClick={toggleMute}
              className={`flex items-center justify-between p-2.5 rounded-2xl border transition cursor-pointer ${
                isMuted
                  ? 'bg-terminal-panel border-terminal-border text-terminal-muted'
                  : 'bg-bull/10 border-bull/30 text-bull'
              }`}
            >
              <div className="flex items-center space-x-2">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-bull" />}
                <div className="text-left">
                  <span className="text-xs font-bold block">Audio Alerts</span>
                  <span className="text-[10px] font-mono">{isMuted ? 'Muted' : 'Active'}</span>
                </div>
              </div>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                isMuted ? 'bg-terminal-card border-terminal-border text-terminal-muted' : 'bg-bull/20 border-bull/40 text-bull'
              }`}>
                {isMuted ? 'OFF' : 'ON'}
              </span>
            </button>
          </div>

          {/* Test Sound Button */}
          <button
            type="button"
            onClick={testSound}
            className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-terminal-panel hover:bg-terminal-card border border-terminal-border text-terminal-muted hover:text-accent-cyan transition text-xs font-semibold cursor-pointer"
          >
            <Music className="w-3.5 h-3.5 text-accent-cyan" />
            <span>🎵 Test Alert Sound Chime</span>
          </button>

          <div className="h-[1px] bg-terminal-border/60" />

          {/* 3. CORE TOOLS: RISK CALCULATOR & DATA SOURCES */}
          <div className="space-y-2">
            <span className="text-[10px] text-terminal-muted font-bold font-mono uppercase tracking-wider block">
              Trading Tools & Gateways
            </span>

            {/* Risk Calculator Launcher */}
            <button
              type="button"
              onClick={() => {
                setIsSettingsOpen(false);
                onOpenRiskCalc();
              }}
              className="flex items-center justify-between w-full p-2.5 rounded-2xl bg-accent-sky/10 hover:bg-accent-sky/15 border border-accent-sky/30 text-accent-sky transition cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-xl bg-accent-sky/20 text-accent-sky">
                  <Calculator className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block text-terminal-text">SEBI Risk & Position Calculator</span>
                  <span className="text-[10px] text-terminal-muted">1-Click Capital Sizing & Stoploss Max Loss</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-accent-sky">OPEN →</span>
            </button>

            {/* Data Source & Fyers Gateway */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-terminal-panel border border-terminal-border">
              <div className="flex items-center space-x-2.5">
                <div className={`p-1.5 rounded-xl ${dataSource === 'FYERS_LIVE' ? 'bg-bull/20 text-bull' : 'bg-accent-sky/20 text-accent-sky'}`}>
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block text-terminal-text">
                    Data Source: {dataSource === 'FYERS_LIVE' ? 'Fyers API v3' : 'NSE Official Live'}
                  </span>
                  <span className="text-[10px] text-terminal-muted">
                    {dataSource === 'FYERS_LIVE' ? (isFyersActive ? '🟢 Connected' : '🟡 Needs Token') : '🟢 Direct Exchange Stream'}
                  </span>
                </div>
              </div>

              {onOpenFyersModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    onOpenFyersModal();
                  }}
                  className="px-2.5 py-1 rounded-xl bg-accent-sky/15 hover:bg-accent-sky/25 border border-accent-sky/40 text-accent-sky text-xs font-bold transition cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 inline mr-1" />
                  API
                </button>
              )}
            </div>
          </div>

          <div className="h-[1px] bg-terminal-border/60" />

          {/* 4. DENSITY & USER ACCOUNT / SEBI LEGAL */}
          <div className="space-y-2">
            {/* Terminal Density */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-terminal-text flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-terminal-muted" />
                <span>Layout Density</span>
              </span>
              <div className="flex items-center bg-terminal-panel border border-terminal-border rounded-xl p-0.5 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setDensity('comfortable')}
                  className={`px-2 py-1 rounded-lg transition ${
                    density === 'comfortable' ? 'bg-accent-sky/20 text-accent-sky font-bold' : 'text-terminal-muted'
                  }`}
                >
                  Comfort
                </button>
                <button
                  type="button"
                  onClick={() => setDensity('compact')}
                  className={`px-2 py-1 rounded-lg transition ${
                    density === 'compact' ? 'bg-accent-sky/20 text-accent-sky font-bold' : 'text-terminal-muted'
                  }`}
                >
                  Compact
                </button>
              </div>
            </div>

            {/* Legal / SEBI Risk Disclosures */}
            {onOpenLegalModal && (
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(false);
                  onOpenLegalModal('RISK_DISCLOSURE');
                }}
                className="flex items-center justify-between w-full p-2 rounded-xl bg-terminal-panel hover:bg-terminal-card border border-terminal-border text-terminal-muted hover:text-terminal-text text-xs transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber" />
                  <span>SEBI Disclaimers & Regulatory Center</span>
                </span>
                <span className="text-[10px] font-mono text-accent-sky">VIEW</span>
              </button>
            )}

            {/* User Account / Auth */}
            {isAuthenticated && user ? (
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-terminal-panel border border-terminal-border">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-accent-sky/20 text-accent-sky font-bold text-xs flex items-center justify-center">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-terminal-text block">{user.fullName}</span>
                    <span className="text-[9px] text-terminal-muted font-mono">{user.email}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsSettingsOpen(false);
                  }}
                  className="p-1.5 rounded-lg text-bear hover:bg-bear/10 border border-bear/20 transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              onOpenAuthModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    onOpenAuthModal();
                  }}
                  className="flex items-center justify-center space-x-1.5 w-full py-2 px-3 rounded-2xl bg-accent-sky/15 hover:bg-accent-sky/25 border border-accent-sky/40 text-accent-sky font-bold text-xs transition cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In / Create Account (SEBI Consent)</span>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FIXED BOTTOM MOBILE NAVIGATION BAR */}
      {/* ========================================================================= */}
      <nav 
        aria-label="Mobile Navigation Bar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-terminal-card/98 backdrop-blur-lg border-t border-terminal-border px-2 py-1 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.5)] select-none h-14"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key && !isSettingsOpen;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              id={`mobile-tab-${tab.key.toLowerCase()}`}
              type="button"
              onClick={() => {
                setIsSettingsOpen(false);
                onTabChange(tab.key);
              }}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 rounded-xl transition cursor-pointer ${
                isActive
                  ? 'text-accent-sky font-bold'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              <div className={`p-1 rounded-lg transition ${isActive ? 'bg-accent-sky/15 text-accent-sky' : ''}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-sans mt-0.5 tracking-tight font-medium">
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Dedicated Upward-Opening Settings Gear Button */}
        <button
          id="mobile-tab-settings"
          type="button"
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 rounded-xl transition cursor-pointer ${
            isSettingsOpen
              ? 'text-accent-sky font-bold'
              : 'text-terminal-muted hover:text-accent-sky'
          }`}
          title="Open Terminal Settings, Mode, Audio & Tools"
        >
          <div className={`p-1 rounded-lg transition ${isSettingsOpen ? 'bg-accent-sky/20 text-accent-sky shadow-[0_0_10px_rgba(0,229,255,0.3)] rotate-45' : ''}`}>
            <Settings className="w-4 h-4 transition-transform duration-200" />
          </div>
          <span className="text-[10px] font-sans mt-0.5 tracking-tight font-medium flex items-center gap-0.5">
            <span>Settings</span>
            <ChevronUp className={`w-2.5 h-2.5 transition-transform duration-200 ${isSettingsOpen ? 'rotate-180 text-accent-sky' : ''}`} />
          </span>
        </button>
      </nav>
    </>
  );
};
