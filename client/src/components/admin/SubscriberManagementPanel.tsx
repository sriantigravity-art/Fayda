import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Search, Filter, CheckCircle2, XCircle,
  Edit3, Trash2, RefreshCw, Crown, Star, Zap, Shield,
  Mail, Phone, MessageSquare, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, KeyRound, AlertTriangle, TrendingUp, X, Save
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────
type SubscriptionPlan = 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM';
type SubscriberRole = 'USER' | 'ADMIN' | 'SUPERADMIN';

interface Subscriber {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: SubscriberRole;
  plan: SubscriptionPlan;
  planExpiry?: string;
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
  byPlan: Record<SubscriptionPlan, number>;
  optIns: { email: number; whatsapp: number; sms: number };
}

// ── Plan Config ──────────────────────────────────────────────────────────────
const PLAN_CONFIG: Record<SubscriptionPlan, { label: string; color: string; bg: string; icon: React.FC<any> }> = {
  FREE:    { label: 'Free',    color: 'text-terminal-muted', bg: 'bg-terminal-panel/60 border-terminal-border',     icon: Star },
  BASIC:   { label: 'Basic',   color: 'text-blue-400',       bg: 'bg-blue-500/10 border-blue-500/30',               icon: Shield },
  PRO:     { label: 'Pro',     color: 'text-purple-400',     bg: 'bg-purple-500/10 border-purple-500/30',           icon: Zap },
  PREMIUM: { label: 'Premium', color: 'text-amber-400',      bg: 'bg-amber-500/10 border-amber-500/30',             icon: Crown },
};

// ── Edit Modal ───────────────────────────────────────────────────────────────
interface EditModalProps {
  subscriber: Subscriber;
  onSave: (patch: Partial<Subscriber>) => Promise<void>;
  onClose: () => void;
}

const EditSubscriberModal: React.FC<EditModalProps> = ({ subscriber, onSave, onClose }) => {
  const [fullName, setFullName] = useState(subscriber.fullName);
  const [plan, setPlan] = useState<SubscriptionPlan>(subscriber.plan);
  const [isActive, setIsActive] = useState(subscriber.isActive);
  const [emailOptIn, setEmailOptIn] = useState(subscriber.emailOptIn);
  const [whatsappOptIn, setWhatsappOptIn] = useState(subscriber.whatsappOptIn);
  const [smsOptIn, setSmsOptIn] = useState(subscriber.smsOptIn);
  const [notes, setNotes] = useState(subscriber.notes || '');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const { apiFetch } = useAuth();

  const handleSave = async () => {
    setSaving(true);
    await onSave({ fullName, plan, isActive, emailOptIn, whatsappOptIn, smsOptIn, notes });
    if (newPassword.length >= 8) {
      await apiFetch(`/api/admin/subscribers/${subscriber.id}/reset-password`, {
        method: 'POST', body: JSON.stringify({ newPassword })
      });
    }
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200000] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-terminal-card border border-terminal-border rounded-2xl w-full max-w-md shadow-elevated" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-terminal-border">
          <h3 className="text-sm font-bold text-terminal-text font-sans flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-purple-400" />
            Edit Subscriber — {subscriber.id}
          </h3>
          <button onClick={onClose} className="text-terminal-muted hover:text-terminal-text p-1 rounded transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-terminal-muted mb-1 font-mono">Full Name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 text-sm text-terminal-text font-sans outline-none focus:border-purple-500/60 transition" />
          </div>

          <div>
            <label className="block text-xs text-terminal-muted mb-1 font-mono">Subscription Plan</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(PLAN_CONFIG) as SubscriptionPlan[]).map(p => {
                const cfg = PLAN_CONFIG[p];
                const Icon = cfg.icon;
                return (
                  <button key={p} onClick={() => setPlan(p)}
                    className={`p-2 rounded-lg border text-xs font-bold font-mono transition flex flex-col items-center gap-1 ${plan === p ? cfg.bg + ' ' + cfg.color : 'border-terminal-border text-terminal-muted hover:border-terminal-text/30'}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-terminal-muted font-mono">Account Status</span>
            <button onClick={() => setIsActive(v => !v)} className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition ${isActive ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {isActive ? <><ToggleRight className="w-4 h-4" /> Active</> : <><ToggleLeft className="w-4 h-4" /> Deactivated</>}
            </button>
          </div>

          <div>
            <label className="block text-xs text-terminal-muted mb-2 font-mono">Notification Opt-ins</label>
            <div className="flex gap-2">
              {[
                { key: 'email', label: 'Email', icon: Mail, val: emailOptIn, set: setEmailOptIn },
                { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, val: whatsappOptIn, set: setWhatsappOptIn },
                { key: 'sms', label: 'SMS', icon: Phone, val: smsOptIn, set: setSmsOptIn },
              ].map(opt => {
                const Icon = opt.icon;
                return (
                  <button key={opt.key} onClick={() => opt.set((v: boolean) => !v)}
                    className={`flex-1 p-2 rounded-lg border text-xs font-bold font-mono transition flex flex-col items-center gap-1 ${opt.val ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'border-terminal-border text-terminal-muted'}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs text-terminal-muted mb-1 font-mono">Reset Password (leave blank to keep)</label>
            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="Min 8 characters"
              className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 text-sm text-terminal-text font-sans outline-none focus:border-purple-500/60 transition" />
          </div>

          <div>
            <label className="block text-xs text-terminal-muted mb-1 font-mono">Admin Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 text-sm text-terminal-text font-sans outline-none focus:border-purple-500/60 transition resize-none" />
          </div>
        </div>
        <div className="flex gap-2 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-terminal-border text-xs text-terminal-muted hover:text-terminal-text font-mono transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-mono transition flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export const SubscriberManagementPanel: React.FC = () => {
  const { apiFetch } = useAuth();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState<SubscriptionPlan | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'createdAt' | 'plan' | 'fullName'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(async () => {
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

  useEffect(() => { load(); }, [load]);

  const handleSave = async (id: string, patch: Partial<Subscriber>) => {
    await apiFetch(`/api/admin/subscribers/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    await load();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await apiFetch(`/api/admin/subscribers/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    await load();
  };

  // Filter + sort
  const filtered = subscribers
    .filter(s => {
      const q = search.toLowerCase();
      if (q && !s.fullName.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q) && !s.mobile.includes(q)) return false;
      if (filterPlan !== 'ALL' && s.plan !== filterPlan) return false;
      if (filterStatus === 'ACTIVE' && !s.isActive) return false;
      if (filterStatus === 'INACTIVE' && s.isActive) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortField === 'fullName') cmp = a.fullName.localeCompare(b.fullName);
      if (sortField === 'plan') {
        const order = { FREE: 0, BASIC: 1, PRO: 2, PREMIUM: 3 };
        cmp = order[a.plan] - order[b.plan];
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />)
      : null;

  return (
    <div className="flex flex-col gap-4 p-1">
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: Users, color: 'text-terminal-text', bg: 'bg-terminal-panel' },
            { label: 'Active', value: stats.active, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'PRO+', value: stats.byPlan.PRO + stats.byPlan.PREMIUM, icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'WhatsApp', value: stats.optIns.whatsapp, icon: MessageSquare, color: 'text-green-400', bg: 'bg-green-500/10' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`${s.bg} border border-terminal-border rounded-xl p-3 flex items-center gap-3`}>
                <div className={`${s.color} p-1.5 rounded-lg bg-black/20`}><Icon className="w-4 h-4" /></div>
                <div>
                  <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-terminal-muted font-mono uppercase tracking-wide">{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan breakdown */}
      {stats && (
        <div className="flex gap-2 flex-wrap">
          {(Object.entries(stats.byPlan) as [SubscriptionPlan, number][]).map(([plan, count]) => {
            const cfg = PLAN_CONFIG[plan];
            const Icon = cfg.icon;
            return (
              <div key={plan} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold font-mono ${cfg.bg} ${cfg.color}`}>
                <Icon className="w-3 h-3" />
                {cfg.label}: {count}
              </div>
            );
          })}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] font-bold font-mono">
            <Mail className="w-3 h-3" />Email: {stats.optIns.email}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] font-bold font-mono">
            <Phone className="w-3 h-3" />SMS: {stats.optIns.sms}
          </div>
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[180px] relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-terminal-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, mobile..."
            className="w-full pl-8 pr-3 py-2 bg-terminal-bg border border-terminal-border rounded-lg text-xs text-terminal-text font-sans outline-none focus:border-purple-500/60 transition" />
        </div>
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value as any)}
          className="bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-2 text-xs text-terminal-text font-mono outline-none cursor-pointer">
          <option value="ALL">All Plans</option>
          {Object.keys(PLAN_CONFIG).map(p => <option key={p} value={p}>{PLAN_CONFIG[p as SubscriptionPlan].label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-2 text-xs text-terminal-text font-mono outline-none cursor-pointer">
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button onClick={load} className="p-2 rounded-lg border border-terminal-border text-terminal-muted hover:text-terminal-text hover:border-terminal-text/30 transition">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-sans">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Subscriber Table */}
      <div className="overflow-x-auto rounded-xl border border-terminal-border">
        <table className="w-full text-xs font-sans min-w-[700px]">
          <thead className="bg-terminal-panel/80 border-b border-terminal-border">
            <tr>
              <th className="text-left px-3 py-2.5 text-terminal-muted font-mono font-bold">
                <button onClick={() => toggleSort('fullName')} className="hover:text-terminal-text transition">
                  Subscriber <SortIcon field="fullName" />
                </button>
              </th>
              <th className="text-left px-3 py-2.5 text-terminal-muted font-mono font-bold">Contact</th>
              <th className="text-left px-3 py-2.5 text-terminal-muted font-mono font-bold">
                <button onClick={() => toggleSort('plan')} className="hover:text-terminal-text transition">
                  Plan <SortIcon field="plan" />
                </button>
              </th>
              <th className="text-left px-3 py-2.5 text-terminal-muted font-mono font-bold">Opt-ins</th>
              <th className="text-left px-3 py-2.5 text-terminal-muted font-mono font-bold">Status</th>
              <th className="text-left px-3 py-2.5 text-terminal-muted font-mono font-bold">
                <button onClick={() => toggleSort('createdAt')} className="hover:text-terminal-text transition">
                  Joined <SortIcon field="createdAt" />
                </button>
              </th>
              <th className="text-right px-3 py-2.5 text-terminal-muted font-mono font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-terminal-muted">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading subscribers...
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-terminal-muted">
                <Users className="w-6 h-6 mx-auto mb-2 opacity-40" />
                No subscribers found.
              </td></tr>
            ) : filtered.map(sub => {
              const planCfg = PLAN_CONFIG[sub.plan];
              const PlanIcon = planCfg.icon;
              return (
                <tr key={sub.id} className="border-b border-terminal-border/50 hover:bg-terminal-panel/30 transition-colors group">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400 shrink-0">
                        {sub.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-terminal-text font-semibold leading-tight">{sub.fullName}</div>
                        <div className="text-terminal-muted text-[10px] font-mono">{sub.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-terminal-muted">{sub.email}</div>
                    <div className="text-terminal-muted/70 text-[10px] font-mono">{sub.mobile}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono ${planCfg.bg} ${planCfg.color}`}>
                      <PlanIcon className="w-3 h-3" />
                      {planCfg.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <span title="Email" className={`p-1 rounded ${sub.emailOptIn ? 'text-blue-400 bg-blue-500/10' : 'text-terminal-muted/30'}`}><Mail className="w-3 h-3" /></span>
                      <span title="WhatsApp" className={`p-1 rounded ${sub.whatsappOptIn ? 'text-green-400 bg-green-500/10' : 'text-terminal-muted/30'}`}><MessageSquare className="w-3 h-3" /></span>
                      <span title="SMS" className={`p-1 rounded ${sub.smsOptIn ? 'text-orange-400 bg-orange-500/10' : 'text-terminal-muted/30'}`}><Phone className="w-3 h-3" /></span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {sub.isActive
                      ? <span className="flex items-center gap-1 text-emerald-400 font-bold"><CheckCircle2 className="w-3 h-3" />Active</span>
                      : <span className="flex items-center gap-1 text-red-400 font-bold"><XCircle className="w-3 h-3" />Inactive</span>
                    }
                  </td>
                  <td className="px-3 py-2.5 text-terminal-muted text-[10px] font-mono">
                    {new Date(sub.createdAt).toLocaleDateString('en-IN')}
                    {sub.lastLoginAt && (
                      <div className="text-terminal-muted/60">Last: {new Date(sub.lastLoginAt).toLocaleDateString('en-IN')}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingSubscriber(sub)}
                        className="p-1.5 rounded-lg text-terminal-muted hover:text-purple-400 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20 transition"
                        title="Edit subscriber">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {sub.id !== 'ADM-SRIKANT-007' && (
                        <button onClick={() => handleDelete(sub.id)} disabled={deletingId === sub.id}
                          className="p-1.5 rounded-lg text-terminal-muted hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition"
                          title="Delete subscriber">
                          {deletingId === sub.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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

      <div className="text-[10px] text-terminal-muted font-mono text-right">
        {filtered.length} of {subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''}
      </div>

      {editingSubscriber && (
        <EditSubscriberModal
          subscriber={editingSubscriber}
          onSave={async patch => handleSave(editingSubscriber.id, patch)}
          onClose={() => setEditingSubscriber(null)}
        />
      )}
    </div>
  );
};
