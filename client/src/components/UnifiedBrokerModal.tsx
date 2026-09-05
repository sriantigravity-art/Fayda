import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMarket } from '../context/MarketContext';
import { 
  KeyRound, 
  X, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Sparkles, 
  Lock, 
  Eye, 
  EyeOff, 
  RefreshCw,
  HelpCircle,
  Radio,
  Sliders,
  ShieldCheck,
  Check
} from 'lucide-react';
import type { ActiveBroker } from '../types';

interface UnifiedBrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBroker?: 'DHAN' | 'FYERS';
}

export const UnifiedBrokerModal: React.FC<UnifiedBrokerModalProps> = ({ 
  isOpen, 
  onClose,
  defaultBroker = 'DHAN'
}) => {
  const { 
    dhanConfig, 
    connectDhan, 
    disconnectDhan, 
    fyersConfig, 
    connectFyers, 
    exchangeAuthCode, 
    activeBroker, 
    effectiveBroker,
    selectBroker 
  } = useMarket();

  const [selectedTab, setSelectedTab] = useState<'DHAN' | 'FYERS' | 'ANGEL' | 'ZERODHA' | 'SIMULATOR'>('DHAN');

  // Dhan Form States
  const [dhanClientId, setDhanClientId] = useState<string>(() => {
    return dhanConfig.clientId || localStorage.getItem('dhan_client_id') || '';
  });
  const [dhanAccessToken, setDhanAccessToken] = useState<string>(() => {
    return dhanConfig.accessToken || localStorage.getItem('dhan_access_token') || '';
  });
  const [showDhanToken, setShowDhanToken] = useState(false);
  const [dhanLoading, setDhanLoading] = useState(false);
  const [dhanStatusMsg, setDhanStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Fyers Form States
  const [fyersAppId, setFyersAppId] = useState<string>(() => {
    return fyersConfig.appId || localStorage.getItem('fyers_app_id') || 'KMSSMU5OGR-100';
  });
  const [fyersSecretKey, setFyersSecretKey] = useState<string>(() => {
    return fyersConfig.secretKey || localStorage.getItem('fyers_secret_key') || '';
  });
  const [fyersAuthCode, setFyersAuthCode] = useState<string>('');
  const [fyersAccessToken, setFyersAccessToken] = useState<string>(() => {
    return fyersConfig.accessToken || localStorage.getItem('fyers_access_token') || '';
  });
  const [showFyersSecret, setShowFyersSecret] = useState(false);
  const [fyersLoading, setFyersLoading] = useState(false);
  const [fyersStatusMsg, setFyersStatusMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [fyersSubTab, setFyersSubTab] = useState<'AUTH_CODE' | 'DIRECT_TOKEN'>('AUTH_CODE');

  useEffect(() => {
    if (defaultBroker) {
      setSelectedTab(defaultBroker);
    }
  }, [defaultBroker]);

  useEffect(() => {
    if (dhanConfig.clientId) setDhanClientId(dhanConfig.clientId);
    if (dhanConfig.accessToken) setDhanAccessToken(dhanConfig.accessToken);
  }, [dhanConfig]);

  useEffect(() => {
    if (fyersConfig.appId) setFyersAppId(fyersConfig.appId);
    if (fyersConfig.secretKey) setFyersSecretKey(fyersConfig.secretKey);
    if (fyersConfig.accessToken) setFyersAccessToken(fyersConfig.accessToken);
  }, [fyersConfig]);

  if (!isOpen) return null;

  // ── Dhan Handlers ──
  const handleConnectDhan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dhanClientId.trim() || !dhanAccessToken.trim()) {
      setDhanStatusMsg({ success: false, text: 'Please enter both Dhan Client ID and Access Token' });
      return;
    }

    setDhanLoading(true);
    setDhanStatusMsg(null);

    try {
      localStorage.setItem('dhan_client_id', dhanClientId.trim());
      localStorage.setItem('dhan_access_token', dhanAccessToken.trim());

      const res = await connectDhan(dhanClientId.trim(), dhanAccessToken.trim());
      setDhanLoading(false);

      if (res.success) {
        setDhanStatusMsg({ 
          success: true, 
          text: `✅ Connected to DhanHQ as ${res.userName || dhanClientId}! Real-time option chain active.` 
        });
      } else {
        setDhanStatusMsg({ success: false, text: `❌ ${res.message}` });
      }
    } catch (err: any) {
      setDhanLoading(false);
      setDhanStatusMsg({ success: false, text: `❌ ${err.message || 'Connection failed'}` });
    }
  };

  const handleDisconnectDhan = async () => {
    await disconnectDhan();
    setDhanStatusMsg({ success: true, text: 'Disconnected from Dhan. Switched to fallback.' });
  };

  // ── Fyers Handlers ──
  const handleConnectFyers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fyersAppId.trim() || !fyersAccessToken.trim()) {
      setFyersStatusMsg({ success: false, text: 'Please enter both Fyers App ID and Access Token' });
      return;
    }

    setFyersLoading(true);
    setFyersStatusMsg(null);

    const cleanAppId = fyersAppId.trim().includes('-') ? fyersAppId.trim() : `${fyersAppId.trim()}-100`;
    localStorage.setItem('fyers_app_id', cleanAppId);
    localStorage.setItem('fyers_secret_key', fyersSecretKey.trim());
    localStorage.setItem('fyers_access_token', fyersAccessToken.trim());

    const res = await connectFyers(cleanAppId, fyersAccessToken.trim(), fyersSecretKey.trim());
    setFyersLoading(false);

    if (res.success) {
      setFyersStatusMsg({ success: true, text: `✅ Connected to Fyers as ${res.userName || 'Trader'}!` });
      selectBroker('FYERS');
    } else {
      setFyersStatusMsg({ success: false, text: `❌ ${res.message}` });
    }
  };

  const handleFyersExchange = async () => {
    if (!fyersAppId.trim() || !fyersSecretKey.trim() || !fyersAuthCode.trim()) {
      setFyersStatusMsg({ success: false, text: 'Please enter App ID, Secret Key, and Auth Code' });
      return;
    }

    setFyersLoading(true);
    setFyersStatusMsg(null);

    const cleanAppId = fyersAppId.trim().includes('-') ? fyersAppId.trim() : `${fyersAppId.trim()}-100`;
    const res = await exchangeAuthCode(cleanAppId, fyersSecretKey.trim(), fyersAuthCode.trim());
    setFyersLoading(false);

    if (res.success) {
      setFyersStatusMsg({ success: true, text: `✅ Fyers Token generated successfully! Connected.` });
      selectBroker('FYERS');
    } else {
      setFyersStatusMsg({ success: false, text: `❌ ${res.message}` });
    }
  };

  const normalizedFyersAppId = fyersAppId.trim().includes('-') ? fyersAppId.trim() : (fyersAppId.trim() ? `${fyersAppId.trim()}-100` : 'KMSSMU5OGR-100');
  const fyersLoginUrl = `https://api-t1.fyers.in/api/v3/generate-authcode?client_id=${normalizedFyersAppId}&redirect_uri=https://trade.fyers.in/api-login/redirect-uri/index.html&response_type=code&state=sample_state`;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-terminal-card border border-terminal-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-terminal-border bg-terminal-panel/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-terminal-text flex items-center gap-2">
                <span>Unified Broker & Live Data Hub</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                  MULTI-BROKER READY
                </span>
              </h2>
              <p className="text-xs text-terminal-muted mt-0.5">
                Connect your Indian broker account for zero-latency tick data & 1-click execution
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Provider Selector Bar */}
        <div className="px-5 py-3 border-b border-terminal-border bg-terminal-bg/80 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-mono text-terminal-muted flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-accent-cyan" />
            <span>Active Real-Time Provider:</span>
          </span>
          <div className="flex items-center gap-1.5 bg-terminal-panel p-1 rounded-xl border border-terminal-border text-xs font-mono font-bold">
            <button
              type="button"
              onClick={() => selectBroker('DHAN')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeBroker === 'DHAN'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dhanConfig.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>Dhan {dhanConfig.isConnected && '(Live)'}</span>
            </button>

            <button
              type="button"
              onClick={() => selectBroker('FYERS')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeBroker === 'FYERS'
                  ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/40 shadow-sm'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${fyersConfig.isConnected ? 'bg-sky-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>Fyers {fyersConfig.isConnected && '(Live)'}</span>
            </button>

            <button
              type="button"
              onClick={() => selectBroker('SIMULATOR')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeBroker === 'SIMULATOR'
                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/40 shadow-sm'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              <span>Exchange Simulator</span>
            </button>
          </div>
        </div>

        {/* Broker Tabs */}
        <div className="flex border-b border-terminal-border bg-terminal-panel/40 px-5 pt-2 gap-2 text-xs font-mono overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedTab('DHAN')}
            className={`px-4 py-2 rounded-t-xl font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              selectedTab === 'DHAN'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-terminal-card'
                : 'border-transparent text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>🟢 Dhan (DhanHQ v2)</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              FREE
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('FYERS')}
            className={`px-4 py-2 rounded-t-xl font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              selectedTab === 'FYERS'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-terminal-card'
                : 'border-transparent text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>🔵 Fyers (API v3)</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
              FREE
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('ANGEL')}
            className={`px-4 py-2 rounded-t-xl font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              selectedTab === 'ANGEL'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-terminal-card'
                : 'border-transparent text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <span>🟠 Angel One</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              FREE
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('ZERODHA')}
            className={`px-4 py-2 rounded-t-xl font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              selectedTab === 'ZERODHA'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400 bg-terminal-card'
                : 'border-transparent text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <span>🔴 Zerodha (Kite)</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              PAID
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: DHAN (DHANHQ API v2)                                        */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {selectedTab === 'DHAN' && (
            <div className="space-y-4">
              {/* Dhan Active Status Banner */}
              {dhanConfig.isConnected ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-terminal-text">DhanHQ Connected & Streaming</span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40">
                          LIVE 25 REQ/S
                        </span>
                      </div>
                      <p className="text-xs text-terminal-muted mt-0.5">
                        Client ID: <strong className="text-terminal-text font-mono">{dhanConfig.clientId}</strong> • 
                        User: <strong className="text-terminal-text">{dhanConfig.userName || 'Active'}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeBroker !== 'DHAN' && (
                      <button
                        type="button"
                        onClick={() => selectBroker('DHAN')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition cursor-pointer"
                      >
                        Set as Active
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDisconnectDhan}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 font-mono text-xs font-bold transition cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-accent-cyan/5 to-transparent border border-emerald-500/20 flex items-start space-x-3">
                  <Sparkles className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div className="text-xs leading-relaxed space-y-1">
                    <p className="font-bold text-terminal-text">
                      Why Connect Dhan? (100% Free Lifetime Trading API)
                    </p>
                    <p className="text-terminal-muted">
                      Dhan provides dedicated native Option Chain endpoints with tick-by-tick Open Interest, Greeks, and instant order placement. Tokens last up to 30 days!
                    </p>
                  </div>
                </div>
              )}

              {/* Dhan Connection Form */}
              <form onSubmit={handleConnectDhan} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-mono font-bold text-terminal-text mb-1">
                    Dhan Client ID (10 Digits)
                  </label>
                  <input
                    type="text"
                    value={dhanClientId}
                    onChange={(e) => setDhanClientId(e.target.value)}
                    placeholder="e.g. 1000123456"
                    className="w-full px-3 py-2 text-xs font-mono bg-terminal-panel border border-terminal-border rounded-xl text-terminal-text focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-mono font-bold text-terminal-text">
                      Dhan Access Token (JWT Token)
                    </label>
                    <a
                      href="https://web.dhan.co/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>Open web.dhan.co</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showDhanToken ? "text" : "password"}
                      value={dhanAccessToken}
                      onChange={(e) => setDhanAccessToken(e.target.value)}
                      placeholder="Paste your token from DhanHQ Trading APIs"
                      className="w-full px-3 py-2 pr-10 text-xs font-mono bg-terminal-panel border border-terminal-border rounded-xl text-terminal-text focus:outline-none focus:border-emerald-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDhanToken(!showDhanToken)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-terminal-muted hover:text-terminal-text"
                    >
                      {showDhanToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Instructions Box */}
                <div className="p-3.5 rounded-xl bg-terminal-panel border border-terminal-border space-y-2 text-xs font-mono">
                  <span className="font-bold text-terminal-text flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>How to get your free DhanHQ token in 30 seconds:</span>
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-terminal-muted text-[11px]">
                    <li>Login to <a href="https://web.dhan.co" target="_blank" rel="noopener noreferrer" className="text-emerald-500 underline">web.dhan.co</a>.</li>
                    <li>Click your Profile icon on top right &gt; Select <strong>"DhanHQ Trading APIs"</strong>.</li>
                    <li>Click <strong>"Generate Access Token"</strong>, copy it, and paste it in the box above!</li>
                  </ol>
                </div>

                {dhanStatusMsg && (
                  <div className={`p-3 rounded-xl border text-xs font-mono ${
                    dhanStatusMsg.success 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                  }`}>
                    {dhanStatusMsg.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={dhanLoading}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {dhanLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating with DhanHQ Servers...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save & Connect DhanHQ Live Feed</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: FYERS (API v3)                                              */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {selectedTab === 'FYERS' && (
            <div className="space-y-4">
              {/* Fyers Status Banner */}
              {fyersConfig.isConnected ? (
                <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/40 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-terminal-text">Fyers API v3 Connected</span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/40">
                          ACTIVE
                        </span>
                      </div>
                      <p className="text-xs text-terminal-muted mt-0.5">
                        App ID: <strong className="text-terminal-text font-mono">{fyersConfig.appId}</strong> • User: <strong className="text-terminal-text">{fyersConfig.userName || 'Trader'}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeBroker !== 'FYERS' && (
                      <button
                        type="button"
                        onClick={() => selectBroker('FYERS')}
                        className="px-3 py-1.5 rounded-lg bg-sky-500 text-white font-bold text-xs hover:bg-sky-600 transition cursor-pointer"
                      >
                        Set as Active
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Fyers Sub-Tab Switcher */}
              <div className="flex bg-terminal-panel p-1 rounded-xl border border-terminal-border text-xs font-mono font-bold">
                <button
                  type="button"
                  onClick={() => setFyersSubTab('AUTH_CODE')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                    fyersSubTab === 'AUTH_CODE'
                      ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-sm'
                      : 'text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  Option 1: Generate Auth Code
                </button>
                <button
                  type="button"
                  onClick={() => setFyersSubTab('DIRECT_TOKEN')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                    fyersSubTab === 'DIRECT_TOKEN'
                      ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-sm'
                      : 'text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  Option 2: Direct Access Token
                </button>
              </div>

              {fyersSubTab === 'AUTH_CODE' ? (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono font-bold text-terminal-text mb-1">Fyers App ID</label>
                      <input
                        type="text"
                        value={fyersAppId}
                        onChange={(e) => setFyersAppId(e.target.value)}
                        placeholder="e.g. KMSSMU5OGR-100"
                        className="w-full px-3 py-2 text-xs font-mono bg-terminal-panel border border-terminal-border rounded-xl text-terminal-text focus:outline-none focus:border-sky-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-bold text-terminal-text mb-1">Secret Key</label>
                      <div className="relative">
                        <input
                          type={showFyersSecret ? "text" : "password"}
                          value={fyersSecretKey}
                          onChange={(e) => setFyersSecretKey(e.target.value)}
                          placeholder="Fyers Secret Key"
                          className="w-full px-3 py-2 pr-10 text-xs font-mono bg-terminal-panel border border-terminal-border rounded-xl text-terminal-text focus:outline-none focus:border-sky-500 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFyersSecret(!showFyersSecret)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-terminal-muted hover:text-terminal-text"
                        >
                          {showFyersSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <a
                    href={fyersLoginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-600 dark:text-sky-400 font-mono font-bold text-xs hover:bg-sky-500/25 transition flex items-center justify-center gap-2"
                  >
                    <span>Click to Login &amp; Get Auth Code</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <div>
                    <label className="block text-xs font-mono font-bold text-terminal-text mb-1">Auth Code (or full redirect URL)</label>
                    <input
                      type="text"
                      value={fyersAuthCode}
                      onChange={(e) => setFyersAuthCode(e.target.value)}
                      placeholder="Paste redirect URL or auth_code"
                      className="w-full px-3 py-2 text-xs font-mono bg-terminal-panel border border-terminal-border rounded-xl text-terminal-text focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleFyersExchange}
                    disabled={fyersLoading}
                    className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {fyersLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Generate Token &amp; Connect Fyers</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConnectFyers} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-mono font-bold text-terminal-text mb-1">Fyers App ID</label>
                    <input
                      type="text"
                      value={fyersAppId}
                      onChange={(e) => setFyersAppId(e.target.value)}
                      placeholder="e.g. KMSSMU5OGR-100"
                      className="w-full px-3 py-2 text-xs font-mono bg-terminal-panel border border-terminal-border rounded-xl text-terminal-text focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-terminal-text mb-1">Access Token</label>
                    <input
                      type="password"
                      value={fyersAccessToken}
                      onChange={(e) => setFyersAccessToken(e.target.value)}
                      placeholder="Paste daily Fyers Access Token"
                      className="w-full px-3 py-2 text-xs font-mono bg-terminal-panel border border-terminal-border rounded-xl text-terminal-text focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={fyersLoading}
                    className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {fyersLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Connect Fyers</span>
                  </button>
                </form>
              )}

              {fyersStatusMsg && (
                <div className={`p-3 rounded-xl border text-xs font-mono ${
                  fyersStatusMsg.success 
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                }`}>
                  {fyersStatusMsg.text}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: ANGEL ONE (SMARTAPI)                                        */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {selectedTab === 'ANGEL' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <span>🟠 Angel One SmartAPI (100% Free Integration)</span>
                </span>
                <p className="text-terminal-muted leading-relaxed text-[11px]">
                  Angel One offers free SmartAPI access with automated TOTP login. We are finalizing the direct connector for Phase 2.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-terminal-panel border border-terminal-border space-y-2 text-[11px]">
                <p className="font-bold text-terminal-text">Prerequisites for Angel One:</p>
                <ul className="list-disc list-inside text-terminal-muted space-y-1">
                  <li>Client Code (e.g. A12345) &amp; MPIN.</li>
                  <li>API Key from <a href="https://smartapi.angelbroking.com" target="_blank" rel="noopener noreferrer" className="text-amber-500 underline">smartapi.angelbroking.com</a>.</li>
                  <li>Enable TOTP on Google Authenticator / Authy.</li>
                </ul>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 4: ZERODHA (KITE CONNECT)                                      */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {selectedTab === 'ZERODHA' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <span>🔴 Zerodha Kite Connect API (Paid Subscription)</span>
                </span>
                <p className="text-terminal-muted leading-relaxed text-[11px]">
                  Zerodha charges ₹2,000/month for Kite Connect API access. If you already have an active Kite Developer App subscription, you will be able to plug in your API Key and Access Token here in Phase 2.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-terminal-panel border border-terminal-border space-y-2 text-[11px]">
                <p className="font-bold text-terminal-text">Why we recommend Dhan or Fyers over Zerodha:</p>
                <ul className="list-disc list-inside text-terminal-muted space-y-1">
                  <li>Dhan &amp; Fyers APIs are <strong>100% Free</strong> with zero monthly subscription fees.</li>
                  <li>Dhan natively provides an <strong>Option Chain API</strong>, whereas Zerodha requires manual multi-symbol polling loops.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-terminal-border bg-terminal-panel/60 flex items-center justify-between text-xs text-terminal-muted font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Effective Stream: <strong className="text-terminal-text">{effectiveBroker}</strong></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-terminal-card border border-terminal-border hover:bg-terminal-panel text-terminal-text transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
