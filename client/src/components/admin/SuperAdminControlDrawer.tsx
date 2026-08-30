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
  Radio
} from 'lucide-react';

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

  const [activeTab, setActiveTab] = useState<'PANELS' | 'AUDIT_LOGS' | 'LEGAL_DOCS'>('PANELS');

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
            <span>Element & Panel Visibility Matrix</span>
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
