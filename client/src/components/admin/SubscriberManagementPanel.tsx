import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, UserPlus, Search, Filter, CheckCircle2, XCircle,
  Edit3, Trash2, RefreshCw, Crown, Star, Zap, Shield,
  Mail, Phone, MessageSquare, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, KeyRound, AlertTriangle, TrendingUp, X, Save,
  Calendar, CreditCard, Clock, Award, History, Settings, ExternalLink,
  Sliders, Plus, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// ── Types ─────────────────────────────────────────────────────────────────────
export type SubscriptionPlan = 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'BASIC' | 'PRO' | 'PREMIUM';
export type SubscriberRole = 'USER' | 'ADMIN' | 'SUPERADMIN';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'SUSPENDED';

export interface Subscriber {
  id: string;
  subscriberId?: string; // Permanent ID e.g. SUB000101, SUB000007
  fullName: string;
  email: string;
  mobile: string;
  role: SubscriberRole;
  plan: SubscriptionPlan;
  billingCycle?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUAL';
  planExpiry?: string;
  subscriptionStatus?: SubscriptionStatus;
  profileCompletionPct?: number;
  extendedProfile?: {
    city?: string;
    state?: string;
    preferredLanguage?: string;
    traderExperience?: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
    marketPreferences?: string[];
  };
  isActive: boolean;
  isVerified: boolean;
  emailOptIn: boolean;
  whatsappOptIn: boolean;
  smsOptIn: boolean;
  createdAt: string;
  lastLoginAt?: string;
  notes?: string;
}

interface Stats {
  total: number;
  active: number;
  byPlan: Record<string, number>;
  optIns: { email: number; whatsapp: number; sms: number };
}

interface PlanConfigItem {
  id: 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  name: string;
  tagline: string;
  badge?: string;
  isPopular?: boolean;
  isActive: boolean;
  features: string[];
  pricing: {
    MONTHLY: { price: number; discountPct: number; taxPct: number; effectiveTotal: number };
    QUARTERLY: { price: number; discountPct: number; taxPct: number; effectiveTotal: number };
    ANNUAL: { price: number; discountPct: number; taxPct: number; effectiveTotal: number };
  };
}

interface AuditHistoryItem {
  id: string;
  subscriberId: string;
  userId: string;
  action: string;
  oldPlan?: string;
  newPlan: string;
  billingCycle: string;
  amount: number;
  taxAmount: number;
  paymentReference: string;
  performedBy: string;
  timestamp: string;
  notes?: string;
}

// ── Plan Display Config ──────────────────────────────────────────────────────
const PLAN_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.FC<any> }> = {
  FREE:    { label: 'Free Starter', color: 'text-slate-300', bg: 'bg-slate-800/60 border-slate-700',       icon: Star },
  SILVER:  { label: 'Silver Active', color: 'text-slate-200', bg: 'bg-slate-700/30 border-slate-500/40',    icon: Shield },
  GOLD:    { label: 'Gold Pro',     color: 'text-amber-300', bg: 'bg-amber-500/15 border-amber-500/40',    icon: Zap },
  DIAMOND: { label: 'Diamond Elite', color: 'text-purple-300', bg: 'bg-purple-500/15 border-purple-500/40', icon: Crown },
  BASIC:   { label: 'Silver (Old)', color: 'text-slate-300', bg: 'bg-slate-800/40 border-slate-700',      icon: Shield },
  PRO:     { label: 'Gold (Old)',   color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30',    icon: Zap },
  PREMIUM: { label: 'Diamond (Old)', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30', icon: Crown }
};

// ── Subscriber 360° Drawer / Modal ───────────────────────────────────────────
interface Subscriber360ModalProps {
  subscriber: Subscriber;
  onSave: (patch: Partial<Subscriber>) => Promise<void>;
  onClose: () => void;
}

const Subscriber360Modal: React.FC<Subscriber360ModalProps> = ({ subscriber, onSave, onClose }) => {
  const { apiFetch } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PLAN_EDIT' | 'HISTORY'>('OVERVIEW');
  const [fullName, setFullName] = useState(subscriber.fullName);
  const [plan, setPlan] = useState<SubscriptionPlan>(subscriber.plan);
  const [billingCycle, setBillingCycle] = useState(subscriber.billingCycle || 'MONTHLY');
  const [status, setStatus] = useState<SubscriptionStatus>(subscriber.subscriptionStatus || 'ACTIVE');
  const [isActive, setIsActive] = useState(subscriber.isActive);
  const [notes, setNotes] = useState(subscriber.notes || '');
  const [newPassword, setNewPassword] = useState('');
  const [historyItems, setHistoryItems] = useState<AuditHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Fetch subscriber-specific history
  useEffect(() => {
    if (activeTab === 'HISTORY') {
      setLoadingHistory(true);
      apiFetch(`/api/admin/subscription-history?subscriberId=${subscriber.id}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) setHistoryItems(d.history || []);
        })
        .finally(() => setLoadingHistory(false));
    }
  }, [activeTab, subscriber.id, apiFetch]);

  const handleQuickExtend = async (days: number) => {
    setSaving(true);
    try {
      const curExp = subscriber.planExpiry ? new Date(subscriber.planExpiry) : new Date();
      curExp.setDate(curExp.getDate() + days);
      const newExpIso = curExp.toISOString();

      await apiFetch(`/api/admin/subscribers/${subscriber.id}/manual-subscription`, {
        method: 'POST',
        body: JSON.stringify({
          plan,
          billingCycle,
          expiryDate: newExpIso,
          subscriptionStatus: 'ACTIVE',
          notes: `SuperAdmin extended validity by +${days} days.`
        })
      });
      setStatusMsg(`Extended validity by ${days} days!`);
      await onSave({ planExpiry: newExpIso, subscriptionStatus: 'ACTIVE' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await onSave({
        fullName,
        plan,
        billingCycle: billingCycle as any,
        subscriptionStatus: status,
        isActive,
        notes
      });
      if (newPassword.length >= 8) {
        await apiFetch(`/api/admin/subscribers/${subscriber.id}/reset-password`, {
          method: 'POST',
          body: JSON.stringify({ newPassword })
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className={`fixed inset-0 z-[120000] flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm overflow-y-auto ${
      isDark ? 'bg-black/80' : 'bg-slate-900/40'
    }`}>
      <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 border ${
        isDark ? 'bg-[#0e1422] border-cyan-500/30 text-slate-100 shadow-cyan-950/60' : 'bg-white border-slate-200 text-slate-800 shadow-slate-400/50'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'bg-gradient-to-r from-slate-900 via-[#101b33] to-slate-900 border-slate-800 text-white' : 'bg-gradient-to-r from-slate-50 via-blue-50/50 to-slate-50 border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-base ${
              isDark ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              360°
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{subscriber.fullName}</h3>
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                  isDark ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {subscriber.subscriberId || subscriber.id}
                </span>
              </div>
              <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {subscriber.email} • +91 {subscriber.mobile}
              </div>
            </div>
          </div>

          <button onClick={onClose} className={`p-1.5 rounded-lg transition ${
            isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className={`flex border-b px-4 text-xs font-semibold ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
        }`}>
          {(['OVERVIEW', 'PLAN_EDIT', 'HISTORY'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 border-b-2 transition-colors ${
                activeTab === tab
                  ? isDark
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5 font-bold'
                    : 'border-blue-600 text-blue-700 bg-blue-50/80 font-bold'
                  : isDark
                  ? 'border-transparent text-slate-400 hover:text-slate-200'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab === 'OVERVIEW' && 'Subscriber Overview'}
              {tab === 'PLAN_EDIT' && 'Modify Plan & Validity'}
              {tab === 'HISTORY' && 'Subscription Audit Trail'}
            </button>
          ))}
        </div>

        {statusMsg && (
          <div className={`mx-4 mt-3 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
            isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
          }`}>
            <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
            {/* Quick Profile Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`text-[10px] uppercase font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Current Plan</div>
                <div className={`text-sm font-bold mt-1 flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span className={isDark ? 'text-cyan-400' : 'text-blue-600'}>{subscriber.plan}</span>
                  <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>({subscriber.billingCycle || 'MONTHLY'})</span>
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`text-[10px] uppercase font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Plan Expiry</div>
                <div className={`text-sm font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {subscriber.planExpiry ? new Date(subscriber.planExpiry).toLocaleDateString('en-IN') : 'Lifetime (Free)'}
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`text-[10px] uppercase font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Profile Completion</div>
                <div className={`text-sm font-bold mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {subscriber.profileCompletionPct || 35}% Complete
                </div>
              </div>
            </div>

            {/* Extended Profile Details */}
            <div className={`p-4 rounded-xl border space-y-2 text-xs ${
              isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Trader Profile Information</div>
              <div className={`grid grid-cols-2 gap-3 pt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <div>City: <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{subscriber.extendedProfile?.city || 'Not provided'}</span></div>
                <div>Experience: <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{subscriber.extendedProfile?.traderExperience || 'Intermediate'}</span></div>
                <div>Created At: <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{new Date(subscriber.createdAt).toLocaleDateString('en-IN')}</span></div>
                <div>Account Role: <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>{subscriber.role}</span></div>
              </div>
            </div>

            {/* Quick Extension Actions */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>SuperAdmin 1-Click Validity Extension</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleQuickExtend(30)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                  }`}
                >
                  +30 Days
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleQuickExtend(90)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    isDark
                      ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/30'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300'
                  }`}
                >
                  +90 Days
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleQuickExtend(365)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    isDark
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  +1 Year
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PLAN & STATUS EDIT */}
        {activeTab === 'PLAN_EDIT' && (
          <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Assigned Plan</label>
                <select
                  value={plan}
                  onChange={e => setPlan(e.target.value as any)}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="FREE">FREE Starter</option>
                  <option value="SILVER">SILVER Active</option>
                  <option value="GOLD">GOLD Pro Trader</option>
                  <option value="DIAMOND">DIAMOND Elite / VIP</option>
                </select>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Billing Cycle</label>
                <select
                  value={billingCycle}
                  onChange={e => setBillingCycle(e.target.value as any)}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="MONTHLY">MONTHLY</option>
                  <option value="QUARTERLY">QUARTERLY</option>
                  <option value="ANNUAL">ANNUAL</option>
                </select>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Subscription Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="EXPIRING_SOON">EXPIRING_SOON</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
            </div>

            <div>
              <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Reset Password (min 8 chars)</label>
              <input
                type="text"
                placeholder="Leave blank to keep current password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            <div>
              <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Admin Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Notes on subscriber privileges, manual approval, or custom concessions..."
                className={`w-full px-3 py-2 border rounded-lg resize-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT TRAIL */}
        {activeTab === 'HISTORY' && (
          <div className="p-5 max-h-[65vh] overflow-y-auto space-y-3">
            {loadingHistory ? (
              <div className={`py-8 text-center text-xs flex items-center justify-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading audit history...
              </div>
            ) : historyItems.length === 0 ? (
              <div className={`py-8 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                No subscription transactions or plan changes recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {historyItems.map(item => (
                  <div key={item.id} className={`p-3 rounded-xl border text-xs space-y-1 ${
                    isDark ? 'bg-slate-950/70 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold font-mono ${isDark ? 'text-cyan-300' : 'text-blue-700'}`}>{item.action}</span>
                      <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(item.timestamp).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Plan: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{item.oldPlan ? `${item.oldPlan} → ` : ''}{item.newPlan}</strong> ({item.billingCycle})</span>
                      <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>₹{item.amount?.toLocaleString('en-IN') || 0}</span>
                    </div>
                    <div className={`text-[10px] flex justify-between ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      <span>Ref: {item.paymentReference}</span>
                      <span>By: {item.performedBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className={`p-4 border-t flex justify-end gap-3 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
          }`}>
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={handleSaveAll}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg flex items-center gap-1.5 transition ${
              isDark
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/20'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
            }`}
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export const SubscriberManagementPanel: React.FC = () => {
  const { apiFetch } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeAdminTab, setActiveAdminTab] = useState<'DIRECTORY' | 'PLANS_CONFIG' | 'AUDIT_LOGS'>('DIRECTORY');

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selected360Subscriber, setSelected360Subscriber] = useState<Subscriber | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dynamic Plans state
  const [planConfigs, setPlanConfigs] = useState<PlanConfigItem[]>([]);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const [planSaveSuccess, setPlanSaveSuccess] = useState('');

  // Global Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditHistoryItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const loadSubscribers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiFetch('/api/admin/subscribers');
      const data = await resp.json();
      if (data.success) {
        setSubscribers(data.subscribers);
        setStats(data.stats);
      } else {
        setError(data.error || 'Failed to load subscribers.');
      }
    } catch {
      setError('Server unreachable. Make sure the dev server is running.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  const loadPlanConfigs = useCallback(async () => {
    try {
      const resp = await apiFetch('/api/admin/subscription-plans');
      const data = await resp.json();
      if (data.success && Array.isArray(data.plans)) {
        setPlanConfigs(data.plans);
      }
    } catch {
      // ignore
    }
  }, [apiFetch]);

  const loadAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const resp = await apiFetch('/api/admin/subscription-history?limit=100');
      const data = await resp.json();
      if (data.success && Array.isArray(data.history)) {
        setAuditLogs(data.history);
      }
    } catch {
      // ignore
    } finally {
      setLoadingAudit(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadSubscribers();
    loadPlanConfigs();
  }, [loadSubscribers, loadPlanConfigs]);

  useEffect(() => {
    if (activeAdminTab === 'AUDIT_LOGS') {
      loadAuditLogs();
    }
  }, [activeAdminTab, loadAuditLogs]);

  const handleSaveSubscriber = async (id: string, patch: Partial<Subscriber>) => {
    await apiFetch(`/api/admin/subscribers/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    await loadSubscribers();
  };

  const handleDeleteSubscriber = async (id: string) => {
    if (!confirm('Are you sure you want to remove this subscriber account?')) return;
    setDeletingId(id);
    await apiFetch(`/api/admin/subscribers/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    await loadSubscribers();
  };

  const handleSavePlanConfig = async (plan: PlanConfigItem) => {
    setSavingPlanId(plan.id);
    setPlanSaveSuccess('');
    try {
      const res = await apiFetch(`/api/admin/subscription-plans/${plan.id}`, {
        method: 'PUT',
        body: JSON.stringify(plan)
      });
      const data = await res.json();
      if (data.success) {
        setPlanSaveSuccess(`Plan "${plan.name}" updated successfully.`);
        await loadPlanConfigs();
      }
    } finally {
      setSavingPlanId(null);
    }
  };

  // Filtered subscribers
  const filtered = subscribers.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      s.fullName?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.mobile?.includes(q) ||
      s.subscriberId?.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterPlan !== 'ALL') {
      const p = s.plan.toUpperCase();
      if (filterPlan === 'SILVER' && p !== 'SILVER' && p !== 'BASIC') return false;
      if (filterPlan === 'GOLD' && p !== 'GOLD' && p !== 'PRO') return false;
      if (filterPlan === 'DIAMOND' && p !== 'DIAMOND' && p !== 'PREMIUM') return false;
      if (filterPlan === 'FREE' && p !== 'FREE') return false;
    }

    if (filterStatus !== 'ALL') {
      const curStatus = s.subscriptionStatus || (s.isActive ? 'ACTIVE' : 'SUSPENDED');
      if (curStatus !== filterStatus) return false;
    }

    return true;
  });

  return (
    <div className={`flex flex-col gap-4 p-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
      {/* Top Main Navigation Tabs */}
      <div className={`flex items-center justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveAdminTab('DIRECTORY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeAdminTab === 'DIRECTORY'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-blue-50 text-blue-700 border border-blue-300 shadow-sm font-bold'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Subscribers Directory & 360°</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('PLANS_CONFIG')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeAdminTab === 'PLANS_CONFIG'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-blue-50 text-blue-700 border border-blue-300 shadow-sm font-bold'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Plan Pricing & Features</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('AUDIT_LOGS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeAdminTab === 'AUDIT_LOGS'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-blue-50 text-blue-700 border border-blue-300 shadow-sm font-bold'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Subscription Audit Trail</span>
          </button>
        </div>

        <button
          onClick={loadSubscribers}
          className={`p-1.5 rounded-lg border transition ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
          }`}
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: SUBSCRIBERS DIRECTORY & 360°                                  */}
      {/* ===================================================================== */}
      {activeAdminTab === 'DIRECTORY' && (
        <div className="space-y-4">
          {/* Stats KPI Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className={`flex items-center justify-between text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>TOTAL SUBSCRIBERS</span>
                  <Users className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                </div>
                <div className={`text-2xl font-black mt-1 font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.total}</div>
                <div className={`text-[10px] mt-0.5 font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{stats.active} Active Now</div>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className={`flex items-center justify-between text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>GOLD & DIAMOND</span>
                  <Crown className="w-4 h-4 text-amber-500" />
                </div>
                <div className={`text-2xl font-black mt-1 font-mono ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                  {(stats.byPlan.GOLD || 0) + (stats.byPlan.PRO || 0) + (stats.byPlan.DIAMOND || 0) + (stats.byPlan.PREMIUM || 0)}
                </div>
                <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>High-Alpha Elite Tier</div>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className={`flex items-center justify-between text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>SILVER ACTIVE</span>
                  <Shield className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
                </div>
                <div className={`text-2xl font-black mt-1 font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {(stats.byPlan.SILVER || 0) + (stats.byPlan.BASIC || 0)}
                </div>
                <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Momentum OI Feed</div>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className={`flex items-center justify-between text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>OPT-IN CHANNELS</span>
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                </div>
                <div className={`text-sm font-bold mt-1.5 flex gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span className={isDark ? 'text-green-400' : 'text-green-600'}>WA: {stats.optIns.whatsapp}</span>
                  <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>EM: {stats.optIns.email}</span>
                </div>
                <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SMS: {stats.optIns.sms}</div>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by Subscriber ID (e.g. SUB000101), Name, Email..."
                className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs outline-none transition ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm'
                }`}
              />
            </div>

            <select
              value={filterPlan}
              onChange={e => setFilterPlan(e.target.value)}
              className={`border rounded-xl px-3 py-2 text-xs outline-none cursor-pointer ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-white'
                  : 'bg-white border-slate-300 text-slate-900 shadow-sm'
              }`}
            >
              <option value="ALL">All Plans</option>
              <option value="FREE">Free Starter</option>
              <option value="SILVER">Silver Active</option>
              <option value="GOLD">Gold Pro</option>
              <option value="DIAMOND">Diamond Elite</option>
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className={`border rounded-xl px-3 py-2 text-xs outline-none cursor-pointer ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-white'
                  : 'bg-white border-slate-300 text-slate-900 shadow-sm'
              }`}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="EXPIRING_SOON">EXPIRING_SOON</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>

          {/* Subscribers Table */}
          <div className={`rounded-xl border overflow-hidden ${
            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white shadow-sm'
          }`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono text-[11px] ${
                  isDark ? 'border-slate-800 bg-slate-900/80 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}>
                  <th className="py-2.5 px-3">SUBSCRIBER</th>
                  <th className="py-2.5 px-3">CONTACT</th>
                  <th className="py-2.5 px-3">PLAN & CYCLE</th>
                  <th className="py-2.5 px-3">STATUS & EXPIRY</th>
                  <th className="py-2.5 px-3">PROFILE %</th>
                  <th className="py-2.5 px-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-850' : 'divide-slate-200'}`}>
                {filtered.map(sub => {
                  const pCfg = PLAN_CONFIG[sub.plan] || PLAN_CONFIG.FREE;
                  const Icon = pCfg.icon;
                  const isExpiring = sub.subscriptionStatus === 'EXPIRING_SOON';
                  const isExpired = sub.subscriptionStatus === 'EXPIRED';

                  return (
                    <tr key={sub.id} className={`${isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50/80'} transition-colors`}>
                      {/* Name & Permanent Subscriber ID */}
                      <td className="py-2.5 px-3">
                        <div className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          <span>{sub.fullName}</span>
                          {sub.role === 'SUPERADMIN' && (
                            <span className={`text-[9px] px-1 py-0.2 rounded font-mono border ${
                              isDark ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-purple-100 text-purple-800 border-purple-300'
                            }`}>
                              SUPERADMIN
                            </span>
                          )}
                        </div>
                        <div className={`font-mono text-[10px] font-bold mt-0.5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                          {sub.subscriberId || sub.id}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className={`py-2.5 px-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <div>{sub.email}</div>
                        <div className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>+91 {sub.mobile}</div>
                      </td>

                      {/* Plan & Cycle */}
                      <td className="py-2.5 px-3">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono ${
                          isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-300'
                        }`}>
                          <Icon className={`w-3 h-3 ${pCfg.color}`} />
                          <span className={pCfg.color}>{sub.plan}</span>
                        </div>
                        <div className={`text-[10px] mt-0.5 uppercase ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                          {sub.billingCycle || 'MONTHLY'}
                        </div>
                      </td>

                      {/* Status & Expiry */}
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          sub.subscriptionStatus === 'ACTIVE' || (!sub.subscriptionStatus && sub.isActive)
                            ? isDark ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : isExpiring
                            ? isDark ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse' : 'bg-amber-50 border-amber-300 text-amber-700 animate-pulse'
                            : isExpired
                            ? isDark ? 'bg-rose-500/15 border-rose-500/40 text-rose-400' : 'bg-rose-50 border-rose-300 text-rose-700'
                            : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}>
                          {sub.subscriptionStatus || (sub.isActive ? 'ACTIVE' : 'SUSPENDED')}
                        </span>
                        <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {sub.planExpiry ? `Exp: ${new Date(sub.planExpiry).toLocaleDateString('en-IN')}` : 'Perpetual'}
                        </div>
                      </td>

                      {/* Profile Completion */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-12 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                            <div
                              className={`h-full ${isDark ? 'bg-cyan-500' : 'bg-blue-600'}`}
                              style={{ width: `${sub.profileCompletionPct || 35}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {sub.profileCompletionPct || 35}%
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelected360Subscriber(sub)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1 ${
                              isDark
                                ? 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/30 text-cyan-300'
                                : 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700'
                            }`}
                            title="Open 360° Profile & Plan Editor"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>360°</span>
                          </button>

                          {sub.role !== 'SUPERADMIN' && (
                            <button
                              onClick={() => handleDeleteSubscriber(sub.id)}
                              disabled={deletingId === sub.id}
                              className={`p-1.5 rounded-lg border transition ${
                                isDark
                                  ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/40'
                                  : 'bg-white border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 shadow-sm'
                              }`}
                              title="Delete Subscriber"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: PLAN PRICING & FEATURES CONFIG (DYNAMIC SERVER-SIDE)           */}
      {/* ===================================================================== */}
      {activeAdminTab === 'PLANS_CONFIG' && (
        <div className="space-y-4">
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div>
              <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Dynamic Subscription Plan Configurations</h4>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Changes persist directly to server storage without application redeployment.
              </p>
            </div>
            {planSaveSuccess && (
              <div className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                <CheckCircle2 className="w-4 h-4" />
                <span>{planSaveSuccess}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {planConfigs.map(plan => (
              <div key={plan.id} className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{plan.name}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      isDark ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                    }`}>
                      {plan.id}
                    </span>
                  </div>
                  <label className={`flex items-center gap-1.5 text-xs cursor-pointer ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <input
                      type="checkbox"
                      checked={plan.isActive}
                      onChange={e => {
                        const updated = { ...plan, isActive: e.target.checked };
                        setPlanConfigs(prev => prev.map(p => p.id === plan.id ? updated : p));
                      }}
                      className={`rounded ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                    />
                    <span>Active Plan</span>
                  </label>
                </div>

                <input
                  type="text"
                  value={plan.tagline}
                  onChange={e => {
                    const updated = { ...plan, tagline: e.target.value };
                    setPlanConfigs(prev => prev.map(p => p.id === plan.id ? updated : p));
                  }}
                  className={`w-full px-2.5 py-1.5 border rounded-lg text-xs ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                  placeholder="Plan tagline"
                />

                {/* Pricing Grid */}
                <div className="space-y-1.5 text-xs">
                  <div className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Pricing & Discounts</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['MONTHLY', 'QUARTERLY', 'ANNUAL'] as const).map(cycle => (
                      <div key={cycle} className={`p-2 rounded-lg border ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{cycle} (₹)</div>
                        <input
                          type="number"
                          value={plan.pricing?.[cycle]?.price ?? 0}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10) || 0;
                            const updated = {
                              ...plan,
                              pricing: {
                                ...plan.pricing,
                                [cycle]: { ...plan.pricing[cycle], price: val }
                              }
                            };
                            setPlanConfigs(prev => prev.map(p => p.id === plan.id ? updated : p));
                          }}
                          className={`w-full mt-1 px-1.5 py-1 border rounded text-xs font-mono ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                        <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                          Disc: {plan.pricing?.[cycle]?.discountPct || 0}% • 18% GST
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save CTA */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleSavePlanConfig(plan)}
                    disabled={savingPlanId === plan.id}
                    className={`px-4 py-1.5 rounded-lg font-bold text-xs shadow-md flex items-center gap-1.5 transition ${
                      isDark
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25'
                    }`}
                  >
                    {savingPlanId === plan.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save {plan.id} Pricing</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: GLOBAL SUBSCRIPTION AUDIT TRAIL                                */}
      {/* ===================================================================== */}
      {activeAdminTab === 'AUDIT_LOGS' && (
        <div className="space-y-4">
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div>
              <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Immutable Subscription Lifecycle Audit Trail</h4>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Chronological record of all signups, renewals, upgrades, and administrative plan overrides.
              </p>
            </div>
            <button
              onClick={loadAuditLogs}
              className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
              <span>Refresh Ledger</span>
            </button>
          </div>

          <div className={`rounded-xl border overflow-hidden ${
            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white shadow-sm'
          }`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono text-[11px] ${
                  isDark ? 'border-slate-800 bg-slate-900/80 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}>
                  <th className="py-2.5 px-3">TIMESTAMP</th>
                  <th className="py-2.5 px-3">SUBSCRIBER ID</th>
                  <th className="py-2.5 px-3">ACTION</th>
                  <th className="py-2.5 px-3">PLAN TRANSITION</th>
                  <th className="py-2.5 px-3">AMOUNT PAID</th>
                  <th className="py-2.5 px-3">PERFORMED BY</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-850' : 'divide-slate-200'}`}>
                {auditLogs.map(item => (
                  <tr key={item.id} className={isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50/80'}>
                    <td className={`py-2.5 px-3 font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {new Date(item.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className={`py-2.5 px-3 font-mono font-bold ${isDark ? 'text-cyan-300' : 'text-blue-600'}`}>
                      {item.subscriberId}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`font-bold text-xs px-2 py-0.5 rounded border ${
                        isDark ? 'text-white bg-slate-900 border-slate-800' : 'text-slate-800 bg-slate-100 border-slate-200'
                      }`}>
                        {item.action}
                      </span>
                    </td>
                    <td className={`py-2.5 px-3 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {item.oldPlan ? `${item.oldPlan} → ` : ''}{item.newPlan} ({item.billingCycle})
                    </td>
                    <td className={`py-2.5 px-3 font-bold font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      ₹{item.amount?.toLocaleString('en-IN') || 0}
                    </td>
                    <td className={`py-2.5 px-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.performedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 360° Drawer / Modal */}
      {selected360Subscriber && (
        <Subscriber360Modal
          subscriber={selected360Subscriber}
          onSave={async patch => {
            await handleSaveSubscriber(selected360Subscriber.id, patch);
          }}
          onClose={() => setSelected360Subscriber(null)}
        />
      )}
    </div>
  );
};
