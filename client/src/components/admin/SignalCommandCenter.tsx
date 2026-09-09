import React, { useState, useEffect, useCallback } from 'react';
import {
  Target, TrendingUp, TrendingDown, Trash2, RefreshCw, CheckCircle2,
  AlertTriangle, Clock, Zap, ChevronDown, Send, Mail, MessageSquare,
  Phone, X, Settings, Eye, EyeOff, Filter, Crown,
  Star, Shield, BookOpen, ArrowUpRight, ArrowDownRight,
  Sunrise, Moon, Layers, Save, TestTube
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Instagram SVG Icon
const Instagram: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

// ── Types ────────────────────────────────────────────────────────────────────
type TradeCallStatus = 'ACTIVE' | 'NEAR_TARGET' | 'TARGET_HIT' | 'STOPLOSS_HIT' | 'EXPIRED'
  | 'PROFIT_BOOKED' | 'PARTIAL_PROFIT' | 'LOSS_BOOKED' | 'BTST' | 'CARRY_FORWARD';
type AdminTradeAction = 'BOOK_PROFIT' | 'BOOK_PARTIAL_PROFIT' | 'BOOK_LOSS' | 'BTST' | 'CARRY_FORWARD';
type Channel = 'EMAIL' | 'WHATSAPP' | 'SMS' | 'INSTAGRAM';
type SubscriptionPlan = 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM';

interface Signal {
  id: string;
  date: string;
  timeFormatted: string;
  contractName: string;
  symbol: string;
  strikePrice: number;
  optionType: string;
  action: string;
  entryPrice: number;
  target1Price: number;
  target2Price?: number;
  stoplossPrice: number;
  currentLtp: number;
  status: TradeCallStatus;
  pointsPnl: number;
  pnlPct: number;
  riskReward: string;
  adminAction?: AdminTradeAction;
  adminActionTime?: string;
  adminExitPrice?: number;
  adminNotes?: string;
  nearTargetPct?: number;
  notes?: string;
}

interface NotifConfig {
  smtp: { host: string; port: number; user: string; pass: string; fromName: string; fromEmail: string } | null;
  twilio: { accountSid: string; authToken: string; fromNumber: string } | null;
  whatsapp: { phoneNumberId: string; accessToken: string } | null;
  emailRecipients: string[];
}

// ── Action Config ────────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<AdminTradeAction, {
  label: string; emoji: string; color: string; bg: string; border: string;
  icon: React.FC<any>; statusMap: TradeCallStatus; description: string;
}> = {
  BOOK_PROFIT:         { label: 'Book Full Profit',    emoji: '✅', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', icon: TrendingUp,    statusMap: 'PROFIT_BOOKED',  description: 'Target achieved — exit full position now.' },
  BOOK_PARTIAL_PROFIT: { label: 'Book 50% Profit',     emoji: '💰', color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/40',  icon: ArrowUpRight,  statusMap: 'PARTIAL_PROFIT', description: 'Exit half the position, trail SL to cost for remaining.' },
  BOOK_LOSS:           { label: 'Book Loss / Exit',    emoji: '🛑', color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/40',     icon: TrendingDown,  statusMap: 'LOSS_BOOKED',    description: 'Stoploss triggered — exit full position, preserve capital.' },
  BTST:                { label: 'BTST — Hold Tonight', emoji: '🌙', color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/40',  icon: Moon,          statusMap: 'BTST',           description: 'Buy Today Sell Tomorrow. Hold overnight, exit at market open.' },
  CARRY_FORWARD:       { label: 'Carry Forward',       emoji: '📅', color: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/40',     icon: Sunrise,       statusMap: 'CARRY_FORWARD',  description: 'Positional hold — multi-day setup. Review pre-market each session.' },
};

const STATUS_BADGE: Record<TradeCallStatus, { label: string; color: string; dot: string }> = {
  ACTIVE:         { label: 'Active',          color: 'text-blue-400',    dot: 'bg-blue-400' },
  NEAR_TARGET:    { label: 'Near Target ⚡',  color: 'text-amber-400',   dot: 'bg-amber-400' },
  TARGET_HIT:     { label: 'Target Hit 🎯',   color: 'text-emerald-400', dot: 'bg-emerald-400' },
  STOPLOSS_HIT:   { label: 'SL Hit 🛑',       color: 'text-red-400',     dot: 'bg-red-400' },
  EXPIRED:        { label: 'Expired',          color: 'text-terminal-muted', dot: 'bg-terminal-muted' },
  PROFIT_BOOKED:  { label: 'Profit Booked ✅', color: 'text-emerald-400', dot: 'bg-emerald-500' },
  PARTIAL_PROFIT: { label: 'Partial Exit 💰',  color: 'text-yellow-400',  dot: 'bg-yellow-400' },
  LOSS_BOOKED:    { label: 'Loss Booked',      color: 'text-red-400',     dot: 'bg-red-400' },
  BTST:           { label: 'BTST 🌙',          color: 'text-violet-400',  dot: 'bg-violet-500' },
  CARRY_FORWARD:  { label: 'Carry Forward 📅', color: 'text-sky-400',     dot: 'bg-sky-400' },
};

const CHANNEL_CONFIG: Record<Channel, { label: string; color: string; bg: string; border: string; icon: React.FC<any> }> = {
  EMAIL:     { label: 'Email',     color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/40',   icon: Mail },
  WHATSAPP:  { label: 'WhatsApp',  color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/40',  icon: MessageSquare },
  SMS:       { label: 'SMS',       color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/40', icon: Phone },
  INSTAGRAM: { label: 'Instagram', color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/40',   icon: Instagram },
};

// ── Action Form Modal ────────────────────────────────────────────────────────
interface ActionFormProps {
  signal: Signal;
  onClose: () => void;
  onSuccess: () => void;
}

const ActionFormModal: React.FC<ActionFormProps> = ({ signal, onClose, onSuccess }) => {
  const { apiFetch } = useAuth();
  const [selectedAction, setSelectedAction] = useState<AdminTradeAction>('BOOK_PROFIT');
  const [exitPrice, setExitPrice] = useState(signal.currentLtp?.toString() || signal.entryPrice.toString());
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(['WHATSAPP']);
  const [planFilter, setPlanFilter] = useState<SubscriptionPlan[]>([]);
  const [composedMessage, setComposedMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Record<string, { success: boolean; message: string }> | null>(null);
  const [step, setStep] = useState<'ACTION' | 'COMPOSE' | 'RESULT'>('ACTION');

  const cfg = ACTION_CONFIG[selectedAction];
  const Icon = cfg.icon;

  // Auto-compose message when action or fields change
  useEffect(() => {
    const exit = parseFloat(exitPrice) || signal.currentLtp || signal.entryPrice;
    const pnl = (exit - signal.entryPrice).toFixed(2);
    const pnlPct = (((exit - signal.entryPrice) / signal.entryPrice) * 100).toFixed(1);
    const isProfit = exit > signal.entryPrice;

    const templates: Record<AdminTradeAction, string> = {
      BOOK_PROFIT: `✅ *FAYDA PRO — BOOK FULL PROFIT*\n\nContract: *${signal.contractName}*\nEntry: ₹${signal.entryPrice.toFixed(2)} → Exit: ₹${exit.toFixed(2)}\nP&L: *${isProfit ? '+' : ''}₹${pnl} (${isProfit ? '+' : ''}${pnlPct}%)*\n\n📌 EXIT FULL POSITION NOW — Target achieved! Congratulations!\n\nTarget was: ₹${signal.target1Price.toFixed(2)} ✅${adminNotes ? `\n\n📝 ${adminNotes}` : ''}\n\n⚠️ Educational advisory only. Not investment advice. Trade at your own risk.`,
      BOOK_PARTIAL_PROFIT: `💰 *FAYDA PRO — BOOK 50% PROFIT*\n\nContract: *${signal.contractName}*\nEntry: ₹${signal.entryPrice.toFixed(2)} | Current: ₹${exit.toFixed(2)}\nPartial P&L: *${isProfit ? '+' : ''}₹${pnl} per lot*\n\n📌 EXIT 50% NOW. Move SL to cost price ₹${signal.entryPrice.toFixed(2)} for remaining 50%.\n\nRemaining Target: ₹${(signal.target2Price ?? signal.target1Price).toFixed(2)}${adminNotes ? `\n\n📝 ${adminNotes}` : ''}\n\n⚠️ Educational advisory only. Not investment advice.`,
      BOOK_LOSS: `🛑 *FAYDA PRO — STOP LOSS EXIT*\n\nContract: *${signal.contractName}*\nEntry: ₹${signal.entryPrice.toFixed(2)} → Exit: ₹${exit.toFixed(2)}\nLoss: *₹${pnl} (${pnlPct}%)*\n\n📌 EXIT ALL — SL triggered. Do NOT average down. Preserve capital.\n\nSL Level: ₹${signal.stoplossPrice.toFixed(2)}${adminNotes ? `\n\n📝 ${adminNotes}` : ''}\n\n⚠️ Educational advisory only. Not investment advice.`,
      BTST: `🌙 *FAYDA PRO — BTST ADVISORY*\n\nContract: *${signal.contractName}*\nEntry: ₹${signal.entryPrice.toFixed(2)} | Current: ₹${exit.toFixed(2)}\n\n📌 HOLD OVERNIGHT — Do NOT exit today. Strong momentum continues.\n\nTarget: ₹${signal.target1Price.toFixed(2)} | SL: ₹${signal.stoplossPrice.toFixed(2)}\nExit at market open tomorrow or as advised.${adminNotes ? `\n\n📝 ${adminNotes}` : ''}\n\n⚠️ Educational advisory only. Not investment advice.`,
      CARRY_FORWARD: `📅 *FAYDA PRO — CARRY FORWARD*\n\nContract: *${signal.contractName}*\nEntry: ₹${signal.entryPrice.toFixed(2)} | Current: ₹${exit.toFixed(2)}\n\n📌 POSITIONAL HOLD — Do not exit on intraday noise. Multi-day setup.\n\nFinal Target: ₹${(signal.target2Price ?? signal.target1Price).toFixed(2)}\nHard SL: ₹${signal.stoplossPrice.toFixed(2)}${adminNotes ? `\n\n📝 Advisory: ${adminNotes}` : ''}\n\n⚠️ Educational advisory only. Not investment advice.`,
    };
    setComposedMessage(templates[selectedAction]);
  }, [selectedAction, exitPrice, adminNotes, signal]);

  const toggleChannel = (ch: Channel) => {
    setSelectedChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  const togglePlan = (plan: SubscriptionPlan) => {
    setPlanFilter(prev => prev.includes(plan) ? prev.filter(p => p !== plan) : [...prev, plan]);
  };

  const handleApplyAction = async () => {
    setSending(true);
    try {
      // 1. Apply action to signal
      await apiFetch(`/api/admin/signal/${signal.id}/action`, {
        method: 'PATCH',
        body: JSON.stringify({ action: selectedAction, exitPrice: parseFloat(exitPrice) || undefined, adminNotes })
      });
      setStep('COMPOSE');
    } catch { /* continue */ }
    setSending(false);
  };

  const handleBroadcast = async () => {
    if (selectedChannels.length === 0) return;
    setSending(true);
    try {
      const resp = await apiFetch('/api/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          subject: `${cfg.emoji} ${cfg.label} — ${signal.contractName}`,
          message: composedMessage,
          channels: selectedChannels,
          signalId: signal.id,
          actionType: selectedAction,
          planFilter: planFilter.length > 0 ? planFilter : undefined
        })
      });
      const data = await resp.json();
      setResult(data.results || { ERROR: { success: false, message: data.error || 'Broadcast failed.' } });
      setStep('RESULT');
    } catch (err: any) {
      setResult({ ERROR: { success: false, message: err.message } });
      setStep('RESULT');
    }
    setSending(false);
  };

  const handleInstagramCopy = () => {
    navigator.clipboard.writeText(composedMessage);
    window.open('https://www.instagram.com/', '_blank');
  };

  return (
    <div className="fixed inset-0 z-[200000] bg-black/85 flex items-start justify-center p-3 pt-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-terminal-card border border-terminal-border rounded-2xl w-full max-w-lg shadow-elevated mb-6" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-terminal-border">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${cfg.bg} ${cfg.border} border`}>
              <Icon className={`w-4 h-4 ${cfg.color}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-terminal-text font-sans">{signal.contractName}</h3>
              <p className="text-[10px] text-terminal-muted font-mono">Trade Action + Broadcast</p>
            </div>
          </div>
          <button onClick={onClose} className="text-terminal-muted hover:text-terminal-text p-1.5 rounded-lg transition"><X className="w-4 h-4" /></button>
        </div>

        {/* Step Indicator */}
        <div className="flex border-b border-terminal-border">
          {(['ACTION', 'COMPOSE', 'RESULT'] as const).map((s, i) => (
            <div key={s} className={`flex-1 py-2 text-center text-[10px] font-bold font-mono transition ${step === s ? 'text-purple-400 border-b-2 border-purple-500' : 'text-terminal-muted'}`}>
              {i + 1}. {s}
            </div>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {step === 'ACTION' && (
            <>
              {/* Signal Summary */}
              <div className="bg-terminal-bg rounded-xl border border-terminal-border p-3 grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Entry', value: `₹${signal.entryPrice.toFixed(2)}`, color: 'text-terminal-text' },
                  { label: 'LTP', value: `₹${(signal.currentLtp || signal.entryPrice).toFixed(2)}`, color: signal.currentLtp > signal.entryPrice ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'P&L', value: signal.pointsPnl !== 0 ? `${signal.pointsPnl > 0 ? '+' : ''}₹${signal.pointsPnl.toFixed(2)}` : '—', color: signal.pointsPnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
                ].map(m => (
                  <div key={m.label}>
                    <div className="text-[10px] text-terminal-muted font-mono">{m.label}</div>
                    <div className={`text-sm font-bold font-mono ${m.color}`}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Action Selector */}
              <div>
                <label className="block text-xs text-terminal-muted mb-2 font-mono font-bold">Select Action</label>
                <div className="space-y-2">
                  {(Object.entries(ACTION_CONFIG) as [AdminTradeAction, typeof ACTION_CONFIG[AdminTradeAction]][]).map(([action, acfg]) => {
                    const AIcon = acfg.icon;
                    return (
                      <button key={action} onClick={() => setSelectedAction(action)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition ${selectedAction === action ? `${acfg.bg} ${acfg.border}` : 'border-terminal-border hover:border-terminal-text/20'}`}>
                        <div className={`p-1.5 rounded-lg ${selectedAction === action ? acfg.bg : 'bg-terminal-panel'}`}>
                          <AIcon className={`w-3.5 h-3.5 ${selectedAction === action ? acfg.color : 'text-terminal-muted'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-bold font-mono ${selectedAction === action ? acfg.color : 'text-terminal-text'}`}>
                            {acfg.emoji} {acfg.label}
                          </div>
                          <div className="text-[10px] text-terminal-muted font-sans truncate">{acfg.description}</div>
                        </div>
                        {selectedAction === action && <CheckCircle2 className={`w-4 h-4 shrink-0 ${acfg.color}`} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exit Price */}
              <div>
                <label className="block text-xs text-terminal-muted mb-1 font-mono">Exit / Current Price (₹)</label>
                <input value={exitPrice} onChange={e => setExitPrice(e.target.value)} type="number" step="0.05"
                  className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 text-sm text-terminal-text font-mono outline-none focus:border-purple-500/60 transition" />
              </div>

              <div>
                <label className="block text-xs text-terminal-muted mb-1 font-mono">Admin Notes (optional)</label>
                <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2} placeholder="Additional advisory note for subscribers..."
                  className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 text-xs text-terminal-text font-sans outline-none focus:border-purple-500/60 transition resize-none" />
              </div>

              <button onClick={handleApplyAction} disabled={sending}
                className={`w-full py-2.5 rounded-xl font-bold text-sm font-mono transition flex items-center justify-center gap-2 ${cfg.bg} ${cfg.border} border ${cfg.color} hover:opacity-80 disabled:opacity-50`}>
                {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                {sending ? 'Applying...' : `Apply ${cfg.emoji} ${cfg.label}`}
              </button>
            </>
          )}

          {step === 'COMPOSE' && (
            <>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                <CheckCircle2 className="w-4 h-4" />
                Action applied to signal ledger successfully.
              </div>

              {/* Channel Selector */}
              <div>
                <label className="block text-xs text-terminal-muted mb-2 font-mono font-bold">Broadcast Channels</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(CHANNEL_CONFIG) as [Channel, typeof CHANNEL_CONFIG[Channel]][]).map(([ch, ccfg]) => {
                    const CIcon = ccfg.icon;
                    const active = selectedChannels.includes(ch);
                    return (
                      <button key={ch} onClick={() => toggleChannel(ch)}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${active ? `${ccfg.bg} ${ccfg.border}` : 'border-terminal-border hover:border-terminal-text/20'}`}>
                        <CIcon className={`w-4 h-4 ${active ? ccfg.color : 'text-terminal-muted'}`} />
                        <span className={`text-[9px] font-bold font-mono ${active ? ccfg.color : 'text-terminal-muted'}`}>{ccfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plan Filter */}
              <div>
                <label className="block text-xs text-terminal-muted mb-2 font-mono font-bold">Target Subscribers (blank = all opted-in)</label>
                <div className="flex gap-2 flex-wrap">
                  {(['FREE', 'BASIC', 'PRO', 'PREMIUM'] as SubscriptionPlan[]).map(p => {
                    const planIcons = { FREE: Star, BASIC: Shield, PRO: Zap, PREMIUM: Crown };
                    const PIcon = planIcons[p];
                    const active = planFilter.includes(p);
                    return (
                      <button key={p} onClick={() => togglePlan(p)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold font-mono transition ${active ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' : 'border-terminal-border text-terminal-muted hover:border-terminal-text/20'}`}>
                        <PIcon className="w-2.5 h-2.5" />{p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Composer */}
              <div>
                <label className="block text-xs text-terminal-muted mb-1 font-mono font-bold">Message Preview (editable)</label>
                <textarea value={composedMessage} onChange={e => setComposedMessage(e.target.value)} rows={10}
                  className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2.5 text-xs text-terminal-text font-mono outline-none focus:border-purple-500/60 transition resize-none leading-relaxed" />
              </div>

              <div className="flex gap-2">
                {selectedChannels.includes('INSTAGRAM') && (
                  <button onClick={handleInstagramCopy}
                    className="flex-1 py-2.5 rounded-xl border border-pink-500/40 bg-pink-500/10 text-pink-400 font-bold text-xs font-mono transition hover:opacity-80 flex items-center justify-center gap-2">
                    <Instagram className="w-3.5 h-3.5" /> Copy + Open IG
                  </button>
                )}
                <button onClick={handleBroadcast} disabled={sending || selectedChannels.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm font-mono transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Sending...' : 'Broadcast Now'}
                </button>
              </div>
            </>
          )}

          {step === 'RESULT' && result && (
            <>
              <div className="text-sm font-bold text-terminal-text font-sans mb-3">Broadcast Results</div>
              {Object.entries(result).map(([ch, res]) => (
                <div key={ch} className={`flex items-start gap-3 p-3 rounded-xl border ${res.success ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  {res.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                  <div>
                    <div className={`text-xs font-bold font-mono ${res.success ? 'text-emerald-400' : 'text-red-400'}`}>{ch}</div>
                    <div className="text-[11px] text-terminal-muted font-sans mt-0.5">{res.message}</div>
                  </div>
                </div>
              ))}
              <button onClick={() => { onSuccess(); onClose(); }}
                className="w-full py-2.5 rounded-xl bg-terminal-panel border border-terminal-border text-terminal-text font-bold text-xs font-mono hover:bg-terminal-card transition">
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Notification Config Panel ────────────────────────────────────────────────
const NotifConfigPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { apiFetch } = useAuth();
  const [cfg, setCfg] = useState<NotifConfig>({ smtp: null, twilio: null, whatsapp: null, emailRecipients: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testNum, setTestNum] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/admin/notification-config').then(r => r.json()).then(d => {
      if (d.success) setCfg(d.config);
      setLoading(false);
    });
  }, [apiFetch]);

  const save = async () => {
    setSaving(true);
    await apiFetch('/api/admin/notification-config', { method: 'POST', body: JSON.stringify(cfg) });
    setSaving(false);
    setTestResult('✅ Config saved!');
  };

  const testSms = async () => {
    setTestResult(null);
    const r = await apiFetch('/api/admin/notification-config/test-sms', { method: 'POST', body: JSON.stringify({ toNumber: testNum }) });
    const d = await r.json();
    setTestResult(d.success ? `✅ ${d.message}` : `❌ ${d.message}`);
  };

  const F = ({ label, value, onChange, type = 'text', placeholder = '' }: any) => (
    <div>
      <label className="block text-[10px] text-terminal-muted mb-1 font-mono">{label}</label>
      <input value={value || ''} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
        className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-1.5 text-xs text-terminal-text font-mono outline-none focus:border-purple-500/60 transition" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200000] bg-black/85 flex items-start justify-center p-3 pt-8 overflow-y-auto" onClick={onClose}>
      <div className="bg-terminal-card border border-terminal-border rounded-2xl w-full max-w-lg shadow-elevated mb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-terminal-border">
          <h3 className="text-sm font-bold text-terminal-text font-sans flex items-center gap-2">
            <Settings className="w-4 h-4 text-purple-400" /> Notification Integration Config
          </h3>
          <button onClick={onClose} className="text-terminal-muted hover:text-terminal-text p-1 rounded transition"><X className="w-4 h-4" /></button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-terminal-muted"><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : (
          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Twilio SMS */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-400 font-mono border-b border-terminal-border pb-2">
                <Phone className="w-3.5 h-3.5" /> Twilio SMS
              </div>
              <div className="text-[10px] text-terminal-muted font-sans bg-orange-500/5 border border-orange-500/20 rounded-lg px-3 py-2">
                Enter your Twilio Account SID, Auth Token, and From Number below. Find these in your{' '}
                <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-orange-400 underline">Twilio Console</a>.
              </div>
              <div className="grid grid-cols-2 gap-2">
                <F label="Account SID" value={cfg.twilio?.accountSid} onChange={(v: string) => setCfg(p => ({ ...p, twilio: { ...p.twilio!, accountSid: v } }))} placeholder="ACxxxxxxxx" />
                <F label="Auth Token" value={cfg.twilio?.authToken} onChange={(v: string) => setCfg(p => ({ ...p, twilio: { ...p.twilio!, authToken: v } }))} type="password" placeholder="••••••••" />
                <F label="From Number" value={cfg.twilio?.fromNumber} onChange={(v: string) => setCfg(p => ({ ...p, twilio: { ...p.twilio!, fromNumber: v } }))} placeholder="+14155552671" />
              </div>
              <div className="flex gap-2">
                <input value={testNum} onChange={e => setTestNum(e.target.value)} placeholder="+919876543210 (test number)"
                  className="flex-1 bg-terminal-bg border border-terminal-border rounded-lg px-3 py-1.5 text-xs text-terminal-text font-mono outline-none focus:border-orange-500/40 transition" />
                <button onClick={testSms} className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold font-mono hover:bg-orange-500/20 transition flex items-center gap-1">
                  <TestTube className="w-3 h-3" /> Test
                </button>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-green-400 font-mono border-b border-terminal-border pb-2">
                <MessageSquare className="w-3.5 h-3.5" /> Meta WhatsApp Cloud API
              </div>
              <div className="grid grid-cols-1 gap-2">
                <F label="Phone Number ID" value={cfg.whatsapp?.phoneNumberId} onChange={(v: string) => setCfg(p => ({ ...p, whatsapp: { ...p.whatsapp!, phoneNumberId: v } }))} placeholder="Phone Number ID from Meta Business" />
                <F label="Access Token" value={cfg.whatsapp?.accessToken} onChange={(v: string) => setCfg(p => ({ ...p, whatsapp: { ...p.whatsapp!, accessToken: v } }))} type="password" placeholder="••••••••" />
              </div>
            </div>

            {/* SMTP Email */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 font-mono border-b border-terminal-border pb-2">
                <Mail className="w-3.5 h-3.5" /> Email (Custom SMTP)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <F label="SMTP Host" value={cfg.smtp?.host} onChange={(v: string) => setCfg(p => ({ ...p, smtp: { ...p.smtp!, host: v } }))} placeholder="smtp.zoho.com" />
                <F label="Port" value={cfg.smtp?.port} onChange={(v: string) => setCfg(p => ({ ...p, smtp: { ...p.smtp!, port: parseInt(v) } }))} placeholder="587" />
                <F label="Username / Email" value={cfg.smtp?.user} onChange={(v: string) => setCfg(p => ({ ...p, smtp: { ...p.smtp!, user: v } }))} placeholder="alerts@yourdomain.com" />
                <F label="Password" value={cfg.smtp?.pass} onChange={(v: string) => setCfg(p => ({ ...p, smtp: { ...p.smtp!, pass: v } }))} type="password" placeholder="••••••••" />
                <F label="From Name" value={cfg.smtp?.fromName} onChange={(v: string) => setCfg(p => ({ ...p, smtp: { ...p.smtp!, fromName: v } }))} placeholder="Fayda Pro Alerts" />
                <F label="From Email" value={cfg.smtp?.fromEmail} onChange={(v: string) => setCfg(p => ({ ...p, smtp: { ...p.smtp!, fromEmail: v } }))} placeholder="alerts@yourdomain.com" />
              </div>
            </div>

            {testResult && (
              <div className={`text-xs font-mono px-3 py-2 rounded-lg border ${testResult.startsWith('✅') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {testResult}
              </div>
            )}

            <button onClick={save} disabled={saving}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm font-mono transition flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Integration Config'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Signal Command Center ───────────────────────────────────────────────
export const SignalCommandCenter: React.FC = () => {
  const { apiFetch } = useAuth();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<TradeCallStatus | 'ALL'>('ALL');
  const [actionSignal, setActionSignal] = useState<Signal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/signals${dateFilter ? `?date=${dateFilter}` : ''}`;
      const resp = await apiFetch(url);
      const data = await resp.json();
      if (data.success) setSignals(data.signals);
      else setError(data.error || 'Failed to load signals.');
    } catch {
      setError('Server unreachable. Make sure the dev server is running.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, dateFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    await apiFetch(`/api/admin/signal/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    await load();
  };

  // Unique dates from signals
  const dates = Array.from(new Set(signals.map(s => s.date))).sort((a, b) => b.localeCompare(a));

  const filtered = signals.filter(s => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    return true;
  });

  const statusColor = (s: Signal) => {
    const cfg = STATUS_BADGE[s.status];
    return cfg?.color ?? 'text-terminal-muted';
  };

  return (
    <div className="flex flex-col gap-4 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-terminal-text font-sans">Signal Command Center</h3>
          <p className="text-[10px] text-terminal-muted font-mono">{filtered.length} signal{filtered.length !== 1 ? 's' : ''} · Delete, apply actions, broadcast to subscribers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowConfig(true)}
            className="p-2 rounded-lg border border-terminal-border text-terminal-muted hover:text-purple-400 hover:border-purple-500/30 transition" title="Integration Config">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={load} className="p-2 rounded-lg border border-terminal-border text-terminal-muted hover:text-terminal-text transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-2 text-xs text-terminal-text font-mono outline-none focus:border-purple-500/60 transition" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          className="bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-2 text-xs text-terminal-text font-mono outline-none cursor-pointer">
          <option value="ALL">All Status</option>
          {(Object.entries(STATUS_BADGE) as [TradeCallStatus, any][]).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        {dateFilter && (
          <button onClick={() => setDateFilter('')} className="text-xs text-terminal-muted hover:text-terminal-text font-mono px-2 transition">
            Clear date
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}

      {/* Signal Cards */}
      {loading ? (
        <div className="text-center py-10 text-terminal-muted">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading signals...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-terminal-muted">
          <Layers className="w-6 h-6 mx-auto mb-2 opacity-40" />No signals found for selected filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(sig => {
            const sbadge = STATUS_BADGE[sig.status];
            const isProfit = sig.pointsPnl > 0;
            const isConfirmDelete = confirmDeleteId === sig.id;

            return (
              <div key={sig.id} className="bg-terminal-bg border border-terminal-border rounded-xl p-3 hover:border-terminal-text/20 transition group">
                <div className="flex items-start gap-3">
                  {/* Left: Status dot + time */}
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <div className={`w-2 h-2 rounded-full ${sbadge?.dot || 'bg-terminal-muted'} animate-pulse`} />
                    <div className="text-[9px] text-terminal-muted font-mono w-14 text-center leading-tight">{sig.timeFormatted}</div>
                  </div>

                  {/* Center: Contract info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-terminal-text font-sans">{sig.contractName}</span>
                      <span className={`text-[10px] font-bold font-mono ${sbadge?.color || 'text-terminal-muted'}`}>{sbadge?.label}</span>
                      {sig.adminAction && (
                        <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full">
                          Admin: {sig.adminAction.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] font-mono text-terminal-muted">
                      <span>Entry: <span className="text-terminal-text">₹{sig.entryPrice.toFixed(2)}</span></span>
                      <span>T1: <span className="text-emerald-400">₹{sig.target1Price.toFixed(2)}</span></span>
                      <span>SL: <span className="text-red-400">₹{sig.stoplossPrice.toFixed(2)}</span></span>
                      {sig.currentLtp > 0 && <span>LTP: <span className={sig.currentLtp >= sig.entryPrice ? 'text-emerald-400' : 'text-red-400'}>₹{sig.currentLtp.toFixed(2)}</span></span>}
                      {sig.pointsPnl !== 0 && <span>P&L: <span className={isProfit ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{isProfit ? '+' : ''}₹{sig.pointsPnl.toFixed(2)}</span></span>}
                    </div>
                    {sig.adminNotes && (
                      <div className="mt-1 text-[10px] text-amber-400/80 font-sans italic">📝 {sig.adminNotes}</div>
                    )}
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {/* Quick action buttons */}
                    <div className="flex gap-1">
                      {(Object.entries(ACTION_CONFIG) as [AdminTradeAction, any][]).map(([action, acfg]) => {
                        const AIcon = acfg.icon;
                        return (
                          <button key={action} onClick={() => setActionSignal(sig)}
                            title={acfg.label}
                            className={`p-1.5 rounded-lg border text-[10px] font-mono transition hover:scale-105 ${acfg.bg} ${acfg.border} ${acfg.color} opacity-70 hover:opacity-100`}>
                            <AIcon className="w-3 h-3" />
                          </button>
                        );
                      })}
                    </div>

                    {/* Delete */}
                    {isConfirmDelete ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(sig.id)} disabled={deletingId === sig.id}
                          className="flex-1 px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-[9px] font-bold font-mono hover:bg-red-500/30 transition">
                          {deletingId === sig.id ? <RefreshCw className="w-3 h-3 animate-spin mx-auto" /> : 'CONFIRM'}
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 rounded-lg border border-terminal-border text-terminal-muted text-[9px] font-mono hover:text-terminal-text transition">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(sig.id)}
                        className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 text-[9px] font-mono transition">
                        <Trash2 className="w-2.5 h-2.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {actionSignal && (
        <ActionFormModal
          signal={actionSignal}
          onClose={() => setActionSignal(null)}
          onSuccess={load}
        />
      )}
      {showConfig && <NotifConfigPanel onClose={() => setShowConfig(false)} />}
    </div>
  );
};
