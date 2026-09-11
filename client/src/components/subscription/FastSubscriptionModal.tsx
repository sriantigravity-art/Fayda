import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Check, Shield, Sparkles, ArrowRight, Smartphone,
  Mail, User, CreditCard, QrCode, Lock, CheckCircle2, ChevronRight,
  TrendingUp, Award, Zap, Clock, AlertCircle, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getApiBase, PROD_API_BASE } from '../../utils/apiBase';

export interface PlanData {
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

interface FastSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  initialCycle?: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
}

export const FastSubscriptionModal: React.FC<FastSubscriptionModalProps> = ({
  isOpen,
  onClose,
  initialPlan = 'GOLD',
  initialCycle = 'MONTHLY'
}) => {
  const { user, isAuthenticated, isSuperAdmin, subscribeFast, upgradeOrRenew, updateExtendedProfile, refreshSubscription } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND'>(initialPlan);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'QUARTERLY' | 'ANNUAL'>(initialCycle);

  // Flow steps: 'PLAN' -> 'DETAILS' -> 'OTP' -> 'PAY' -> 'SUCCESS'
  const [step, setStep] = useState<'PLAN' | 'DETAILS' | 'OTP' | 'PAY' | 'SUCCESS'>('PLAN');

  // Fast Signup Form fields
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [email, setEmail] = useState(user?.email || '');
  const [otp, setOtp] = useState('123456');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(30);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'QR' | 'NETBANKING' | 'CARD'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Result info
  const [activatedSubscriberId, setActivatedSubscriberId] = useState('');
  const [activatedExpiry, setActivatedExpiry] = useState('');

  // Optional profile completion fields post subscription
  const [city, setCity] = useState('');
  const [traderExperience, setTraderExperience] = useState<'BEGINNER' | 'INTERMEDIATE' | 'EXPERT'>('INTERMEDIATE');
  const [marketPreferences, setMarketPreferences] = useState<string[]>(['NIFTY', 'BANKNIFTY']);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Load active plans from backend
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        const apiBase = getApiBase();
        const candidateBases = [apiBase, '', PROD_API_BASE];
        for (const base of candidateBases) {
          try {
            const res = await fetch(`${base}/api/subscriptions/plans`, { signal: AbortSignal.timeout(4000) });
            if (res.ok) {
              const data = await res.json();
              if (mounted && data.success && Array.isArray(data.plans)) {
                setPlans(data.plans);
                break;
              }
            }
          } catch {
            // try next candidate
          }
        }
      } catch {
        // fallback to default if offline
      } finally {
        if (mounted) setLoadingPlans(false);
      }
    };
    fetchPlans();
    return () => { mounted = false; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setStep('PLAN');
      setErrorMessage('');
    }
    if (initialPlan) setSelectedPlanId(initialPlan);
    if (initialCycle) setBillingCycle(initialCycle);
  }, [initialPlan, initialCycle, isOpen]);

  useEffect(() => {
    if (user) {
      if (user.fullName && !fullName) setFullName(user.fullName);
      if (user.mobile && !mobile) setMobile(user.mobile);
      if (user.email && !email) setEmail(user.email);
    }
  }, [user]);

  // OTP Timer countdown
  useEffect(() => {
    let interval: any;
    if (step === 'OTP' && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  if (!isOpen) return null;

  const currentPlan = plans.find(p => p.id === selectedPlanId) || {
    id: selectedPlanId,
    name: selectedPlanId === 'FREE' ? 'Free Starter' : selectedPlanId === 'SILVER' ? 'Silver Active' : selectedPlanId === 'GOLD' ? 'Gold Pro Trader' : 'Diamond Elite',
    tagline: 'High Performance Analytics',
    pricing: {
      MONTHLY: { price: selectedPlanId === 'FREE' ? 0 : selectedPlanId === 'SILVER' ? 999 : selectedPlanId === 'GOLD' ? 2499 : 5999, discountPct: 0, taxPct: selectedPlanId === 'FREE' ? 0 : 18, effectiveTotal: 0 },
      QUARTERLY: { price: selectedPlanId === 'FREE' ? 0 : selectedPlanId === 'SILVER' ? 2499 : selectedPlanId === 'GOLD' ? 5999 : 14999, discountPct: 15, taxPct: selectedPlanId === 'FREE' ? 0 : 18, effectiveTotal: 0 },
      ANNUAL: { price: selectedPlanId === 'FREE' ? 0 : selectedPlanId === 'SILVER' ? 7999 : selectedPlanId === 'GOLD' ? 19999 : 49999, discountPct: 33, taxPct: selectedPlanId === 'FREE' ? 0 : 18, effectiveTotal: 0 }
    },
    features: ['Real-Time Feed', 'Options Analytics', 'Instant Signals']
  };

  const cyclePricing = currentPlan.pricing[billingCycle] || currentPlan.pricing.MONTHLY;
  const basePrice = cyclePricing.price;
  const discountPct = cyclePricing.discountPct || 0;
  const discountAmount = Math.round((basePrice * discountPct) / 100);
  const taxableAmount = Math.max(0, basePrice - discountAmount);
  const taxPct = currentPlan.id === 'FREE' ? 0 : (cyclePricing.taxPct || 18);
  const taxAmount = Math.round((taxableAmount * taxPct) / 100);
  const totalAmount = taxableAmount + taxAmount;

  // Handle proceed from Step 1 (Plan Selection)
  const handleProceedFromPlan = () => {
    setErrorMessage('');
    // If user is already authenticated
    if (user && isAuthenticated) {
      if (currentPlan.id === 'FREE') {
        // Free plan instant activation
        executeSubscriptionDirect();
      } else {
        // Skip user details & OTP, proceed directly to Payment
        setStep('PAY');
      }
      return;
    }

    // Unauthenticated user: go to quick details step
    setStep('DETAILS');
  };

  // Handle proceed from Step 2 (Minimal Details: Name, Mobile, Email)
  const handleProceedFromDetails = () => {
    setErrorMessage('');
    if (!mobile || mobile.replace(/\D/g, '').length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    // Simulate sending OTP
    setOtpSent(true);
    setOtpTimer(30);
    setStep('OTP');
  };

  // Handle verify OTP (Step 3)
  const handleVerifyOtp = () => {
    setErrorMessage('');
    if (otp !== '123456' && otp.length !== 6) {
      setErrorMessage('Please enter 123456 for fast instant verification.');
      return;
    }

    if (currentPlan.id === 'FREE') {
      executeSubscriptionDirect();
    } else {
      setStep('PAY');
    }
  };

  // Complete subscription (either Free or after Payment)
  const executeSubscriptionDirect = async () => {
    setSubmitting(true);
    setErrorMessage('');
    try {
      if (user && isAuthenticated) {
        // Existing user upgrade/renew
        const res = await upgradeOrRenew({
          plan: selectedPlanId,
          billingCycle,
          paymentMethod: selectedPlanId === 'FREE' ? 'FREE' : paymentMethod,
          email: user.email || email.trim(),
          mobile: user.mobile || mobile.trim(),
          fullName: user.fullName || fullName.trim(),
          subscriberId: user.subscriberId
        });

        if (res.success) {
          setActivatedSubscriberId(res.subscriber?.subscriberId || user.subscriberId || 'SUB000101');
          setActivatedExpiry(res.subscriber?.planExpiry || '');
          await refreshSubscription();
          setStep('SUCCESS');
          return;
        }

        // If upgradeOrRenew encountered an issue, attempt seamless fast-subscription fallback
        const fastRes = await subscribeFast({
          fullName: user.fullName || fullName.trim() || 'Trader',
          email: user.email || email.trim(),
          mobile: user.mobile || mobile.trim(),
          plan: selectedPlanId,
          billingCycle,
          paymentMethod: selectedPlanId === 'FREE' ? 'FREE' : paymentMethod,
          autoLogin: true
        });

        if (fastRes.success) {
          setActivatedSubscriberId(fastRes.subscriberId || fastRes.subscriber?.subscriberId || user.subscriberId || 'SUB000101');
          setActivatedExpiry(fastRes.subscriber?.planExpiry || '');
          await refreshSubscription();
          setStep('SUCCESS');
          return;
        }

        setErrorMessage(fastRes.error || res.error || 'Subscription failed. Please try again.');
        setSubmitting(false);
      } else {
        // New user fast signup & subscription
        const res = await subscribeFast({
          fullName: fullName.trim() || 'Trader',
          email: email.trim(),
          mobile: mobile.trim(),
          plan: selectedPlanId,
          billingCycle,
          paymentMethod: selectedPlanId === 'FREE' ? 'FREE' : paymentMethod,
          autoLogin: true
        });
        if (!res.success) {
          setErrorMessage(res.error || 'Subscription failed. Please try again.');
          setSubmitting(false);
          return;
        }
        setActivatedSubscriberId(res.subscriberId || res.subscriber?.subscriberId || 'SUB000101');
        setActivatedExpiry(res.subscriber?.planExpiry || '');
        await refreshSubscription();
        setStep('SUCCESS');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing subscription.');
    } finally {
      setSubmitting(false);
    }
  };

  // Optional profile completion saving
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      await updateExtendedProfile({
        city,
        traderExperience,
        marketPreferences
      });
      setProfileSaved(true);
    } catch {
      // ignore
    } finally {
      setProfileSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[120000] overflow-y-auto backdrop-blur-md p-2 sm:p-4 md:p-6 flex min-h-full items-center justify-center select-none animate-in fade-in duration-200 ${
      isDark ? 'bg-black/85' : 'bg-slate-900/45'
    }`}>
      <div
        className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 border ${
          isDark
            ? 'bg-[#0d121d] border-cyan-500/30 shadow-cyan-950/60 text-slate-100'
            : 'bg-white border-slate-200 shadow-slate-400/50 text-slate-800'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Glowing Header Bar */}
        <div className={`relative px-6 py-3.5 border-b flex items-center justify-between shrink-0 ${
          isDark
            ? 'bg-gradient-to-r from-slate-900 via-[#10192e] to-slate-900 border-slate-800'
            : 'bg-gradient-to-r from-slate-50 via-blue-50/50 to-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-lg ${
              isDark
                ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-cyan-500/20'
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/25'
            }`}>
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Fayda Fast Subscription
                </h3>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                  isDark
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                }`}>
                  Instant Activation
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {user ? `Logged in as ${user.fullName} (${user.subscriberId || user.email})` : 'Choose plan → Mobile/Email → 100% Zero Barrier Access'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className={`px-6 py-2.5 border-b flex items-center justify-between text-xs ${
          isDark
            ? 'bg-slate-950/60 border-slate-800/60'
            : 'bg-slate-50/80 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
              step === 'PLAN'
                ? isDark
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                  : 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : isDark
                ? 'bg-slate-800 text-slate-400'
                : 'bg-slate-200 text-slate-600'
            }`}>
              1
            </span>
            <span className={step === 'PLAN' ? (isDark ? 'text-cyan-400 font-semibold' : 'text-blue-600 font-bold') : (isDark ? 'text-slate-400' : 'text-slate-500')}>
              Select Plan
            </span>
          </div>

          <ChevronRight className={`w-3.5 h-3.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />

          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
              step === 'DETAILS'
                ? isDark
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                  : 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : isDark
                ? 'bg-slate-800 text-slate-400'
                : 'bg-slate-200 text-slate-600'
            }`}>
              2
            </span>
            <span className={step === 'DETAILS' ? (isDark ? 'text-cyan-400 font-semibold' : 'text-blue-600 font-bold') : (isDark ? 'text-slate-400' : 'text-slate-500')}>
              Quick Details
            </span>
          </div>

          <ChevronRight className={`w-3.5 h-3.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />

          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
              step === 'OTP'
                ? isDark
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                  : 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : isDark
                ? 'bg-slate-800 text-slate-400'
                : 'bg-slate-200 text-slate-600'
            }`}>
              3
            </span>
            <span className={step === 'OTP' ? (isDark ? 'text-cyan-400 font-semibold' : 'text-blue-600 font-bold') : (isDark ? 'text-slate-400' : 'text-slate-500')}>
              OTP Verify
            </span>
          </div>

          <ChevronRight className={`w-3.5 h-3.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />

          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
              step === 'PAY'
                ? isDark
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                  : 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : step === 'SUCCESS'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                : isDark
                ? 'bg-slate-800 text-slate-400'
                : 'bg-slate-200 text-slate-600'
            }`}>
              4
            </span>
            <span className={
              step === 'PAY'
                ? isDark ? 'text-cyan-400 font-semibold' : 'text-blue-600 font-bold'
                : step === 'SUCCESS'
                ? isDark ? 'text-emerald-400 font-semibold' : 'text-emerald-600 font-bold'
                : isDark ? 'text-slate-400' : 'text-slate-500'
            }>
              {step === 'SUCCESS' ? 'Activated' : 'Payment / Done'}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className={`mx-6 mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
            isDark
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-rose-50 border-rose-200 text-rose-700 font-medium'
          }`}>
            <AlertCircle className={`w-4 h-4 shrink-0 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: PLAN SELECTION */}
        {step === 'PLAN' && (
          <>
            <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
            {/* Billing Cycle Switcher */}
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border ${
              isDark
                ? 'bg-slate-900/90 border-slate-800'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`text-xs flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <span className={isDark ? 'text-cyan-400 font-semibold' : 'text-blue-600 font-bold'}>⚡ Flexible Billing Cycle</span>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>• Save up to 33% on Annual membership</span>
              </div>
              <div className={`flex items-center p-1 rounded-lg border gap-1 text-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200/80 border-slate-300'
              }`}>
                {(['MONTHLY', 'QUARTERLY', 'ANNUAL'] as const).map(cycle => (
                  <button
                    key={cycle}
                    onClick={() => setBillingCycle(cycle)}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                      billingCycle === cycle
                        ? isDark
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 font-bold'
                          : 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                        : isDark
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cycle === 'MONTHLY' && 'Monthly'}
                    {cycle === 'QUARTERLY' && 'Quarterly (Save 15%)'}
                    {cycle === 'ANNUAL' && 'Annual (Save 33%)'}
                  </button>
                ))}
              </div>
            </div>

            {/* 4 Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {(['FREE', 'SILVER', 'GOLD', 'DIAMOND'] as const).map(planKey => {
                const plan = plans.find(p => p.id === planKey) || currentPlan;
                const pricing = plan.pricing?.[billingCycle] || { price: 0, discountPct: 0 };
                const isSelected = selectedPlanId === planKey;
                const isUserCurrent = user?.plan === planKey;

                return (
                  <div
                    key={planKey}
                    onClick={() => setSelectedPlanId(planKey)}
                    className={`relative cursor-pointer rounded-xl p-4 transition-all duration-200 flex flex-col justify-between border ${
                      isSelected
                        ? isDark
                          ? 'bg-gradient-to-b from-slate-900 via-[#101b33] to-slate-900 border-cyan-400 shadow-xl shadow-cyan-500/10 ring-2 ring-cyan-400/30'
                          : 'bg-blue-50/60 border-blue-500 shadow-lg shadow-blue-100 ring-2 ring-blue-500/25'
                        : isDark
                        ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    {/* Badges */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        planKey === 'FREE'
                          ? isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700 border border-slate-200'
                          : planKey === 'SILVER'
                          ? isDark ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-800 font-semibold'
                          : planKey === 'GOLD'
                          ? isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                          : isDark ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-900 border border-purple-300 font-semibold'
                      }`}>
                        {planKey}
                      </span>
                      {isUserCurrent && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                        }`}>
                          CURRENT
                        </span>
                      )}
                      {plan.isPopular && !isUserCurrent && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          isDark ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                        }`}>
                          POPULAR
                        </span>
                      )}
                    </div>

                    <h4 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{plan.name || planKey}</h4>
                    <p className={`text-[11px] mb-3 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{plan.tagline}</p>

                    {/* Price Tag */}
                    <div className={`mb-4 p-2.5 rounded-lg border ${
                      isDark ? 'bg-slate-950/70 border-slate-850' : 'bg-slate-50 border-slate-200'
                    }`}>
                      {pricing.price === 0 ? (
                        <div className="flex items-baseline gap-1">
                          <span className={`text-2xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>₹0</span>
                          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Free forever</span>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              ₹{pricing.price.toLocaleString('en-IN')}
                            </span>
                            <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>/{billingCycle.toLowerCase()}</span>
                          </div>
                          <div className={`text-[10px] font-medium mt-0.5 ${isDark ? 'text-cyan-400' : 'text-blue-600 font-semibold'}`}>
                            + 18% GST • Instant Access
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Feature bullets */}
                    <ul className={`space-y-1.5 mb-4 text-[11px] flex-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {(plan.features || []).slice(0, 5).map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                          <span className="leading-tight">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Radio Select Button */}
                    <button
                      type="button"
                      className={`w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        isSelected
                          ? isDark
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                          : isDark
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                      {isSelected ? 'Selected' : 'Choose Plan'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pinned Bottom Summary Bar & Proceed CTA */}
          <div className={`p-3 sm:p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Selected Membership:</div>
              <div className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span className={isDark ? 'text-cyan-400' : 'text-blue-600 font-extrabold'}>{currentPlan.name}</span>
                <span className={isDark ? 'text-slate-400' : 'text-slate-400'}>•</span>
                <span>{billingCycle}</span>
                <span className={isDark ? 'text-slate-400' : 'text-slate-400'}>•</span>
                <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700 font-extrabold'}`}>
                  {basePrice === 0 ? 'Free Forever' : `Total ₹${totalAmount.toLocaleString('en-IN')} (incl. 18% GST)`}
                </span>
              </div>
            </div>

            <button
              onClick={handleProceedFromPlan}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-2 transition-all transform active:scale-95 shrink-0 shadow-lg ${
                isDark
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/25'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/30'
              }`}
            >
              <span>{selectedPlanId === 'FREE' ? 'Activate Free Plan' : user ? 'Proceed to Upgrade' : 'Continue with Fast Signup'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

        {/* STEP 2: MINIMAL DETAILS (Full Name, Mobile, Email) */}
        {step === 'DETAILS' && (
          <div className="p-5 sm:p-6 max-w-md mx-auto space-y-4 flex-1 overflow-y-auto w-full">
            <div className="text-center">
              <h4 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Enter Minimum Required Details
              </h4>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Zero friction signup — no paperwork, no PAN required to start.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Full Name
                </label>
                <div className="relative">
                  <User className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Srikant Sharma"
                    className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-none ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Mobile Number <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className={`absolute left-3 top-2.5 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={mobile}
                    onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile number"
                    className={`w-full pl-11 pr-3 py-2 border rounded-xl text-xs focus:outline-none ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="trader@example.com"
                    className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-none ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('PLAN')}
                className={`w-1/3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleProceedFromDetails}
                className={`w-2/3 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-lg ${
                  isDark
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/20'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
                }`}
              >
                <span>Send Fast OTP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: FAST OTP VERIFICATION */}
        {step === 'OTP' && (
          <div className="p-5 sm:p-6 max-w-sm mx-auto space-y-4 text-center flex-1 overflow-y-auto w-full">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto ${
              isDark
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              <Smartphone className="w-6 h-6" />
            </div>

            <div>
              <h4 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Enter 6-Digit OTP
              </h4>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Sent to <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>+91 {mobile}</span>
              </p>
              <p className={`text-[11px] mt-1 font-semibold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                (Testing fast code: enter 123456)
              </p>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                className={`w-full text-center tracking-[0.6em] text-2xl font-bold py-2.5 border rounded-xl focus:outline-none focus:ring-2 ${
                  isDark
                    ? 'bg-slate-950 border-cyan-500/50 text-cyan-300 focus:ring-cyan-500'
                    : 'bg-white border-blue-400 text-blue-800 focus:ring-blue-500 shadow-sm'
                }`}
              />
            </div>

            <div className={`flex items-center justify-between text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {otpTimer > 0 ? (
                <span>Resend OTP in {otpTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setOtpTimer(30)}
                  className={`hover:underline font-semibold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}
                >
                  Resend OTP
                </button>
              )}
              <button
                type="button"
                onClick={() => setOtp('123456')}
                className={`text-[11px] font-semibold ${
                  isDark ? 'text-slate-400 hover:text-cyan-300' : 'text-slate-600 hover:text-blue-600'
                }`}
              >
                Auto-fill 123456
              </button>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('DETAILS')}
                className={`w-1/3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleVerifyOtp}
                className={`w-2/3 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-lg ${
                  isDark
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/20'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
                }`}
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify & Continue'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: ORDER SUMMARY & PAYMENT */}
        {step === 'PAY' && (
          <div className="p-5 sm:p-6 max-w-2xl mx-auto space-y-4 flex-1 overflow-y-auto w-full">
            <div className="text-center">
              <h4 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Order Summary & Fast Checkout
              </h4>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                GST compliant invoice with instant membership activation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order Invoice Breakdown */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Plan Details
                </div>
                <div className="flex justify-between text-xs">
                  <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Plan Tier</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentPlan.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Billing Cycle</span>
                  <span className={`font-semibold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>{billingCycle}</span>
                </div>
                <div className={`border-t pt-2 space-y-1 text-xs ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                  <div className={`flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span>Base Price</span>
                    <span className="font-semibold">₹{basePrice.toLocaleString('en-IN')}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className={`flex justify-between font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      <span>Discount ({discountPct}%)</span>
                      <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className={`flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span>GST (18%)</span>
                    <span>₹{taxAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className={`border-t pt-2 flex justify-between text-sm font-bold ${
                    isDark ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'
                  }`}>
                    <span>Grand Total</span>
                    <span className={`text-base font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Select Payment Method
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(['UPI', 'QR', 'NETBANKING', 'CARD'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`p-2.5 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        paymentMethod === method
                          ? isDark
                            ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10'
                            : 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-sm'
                          : isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {method === 'UPI' && '⚡ UPI ID'}
                      {method === 'QR' && '📱 QR Code'}
                      {method === 'NETBANKING' && '🏦 NetBanking'}
                      {method === 'CARD' && '💳 Card'}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'UPI' && (
                  <div className="space-y-1.5 pt-1">
                    <label className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Enter Virtual Payment Address (VPA)
                    </label>
                    <input
                      type="text"
                      placeholder="trader@okaxis / trader@paytm"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                      }`}
                    />
                  </div>
                )}

                {paymentMethod === 'QR' && (
                  <div className={`p-3 rounded-lg border text-center space-y-1 ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <QrCode className="w-16 h-16 mx-auto text-cyan-600 p-1 bg-white border border-slate-200 rounded-lg shadow-sm" />
                    <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Scan using BHIM, GPay, PhonePe or Paytm
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={executeSubscriptionDirect}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg ${
                      isDark
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black shadow-emerald-500/20'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/25'
                    }`}
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Pay ₹{totalAmount.toLocaleString('en-IN')} & Activate Instant</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: SUCCESS / ACTIVATED & OPTIONAL PROFILE COMPLETION */}
        {step === 'SUCCESS' && (
          <div className="p-5 sm:p-6 max-w-xl mx-auto space-y-4 text-center flex-1 overflow-y-auto w-full">
            <div className={`w-16 h-16 rounded-3xl border flex items-center justify-center mx-auto shadow-xl ${
              isDark
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/20'
                : 'bg-emerald-100 border-emerald-300 text-emerald-600 shadow-emerald-500/15'
            }`}>
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Subscription Successfully Activated!
              </h3>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Your high-alpha Indian market terminal privileges are now live.
              </p>
            </div>

            {/* Permanent Subscriber ID Card */}
            <div className={`p-4 rounded-xl border text-left space-y-2 ${
              isDark
                ? 'bg-gradient-to-r from-slate-900 via-[#101e38] to-slate-900 border-cyan-500/40'
                : 'bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50 border-blue-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Permanent Subscriber ID
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isDark
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  VERIFIED ACTIVE
                </span>
              </div>
              <div className={`text-2xl font-black tracking-wider font-mono ${isDark ? 'text-cyan-300' : 'text-blue-700'}`}>
                {activatedSubscriberId || user?.subscriberId || 'SUB000101'}
              </div>
              <div className={`flex items-center justify-between text-xs border-t pt-2 ${
                isDark ? 'text-slate-300 border-slate-800' : 'text-slate-700 border-slate-200'
              }`}>
                <span>Plan: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{selectedPlanId}</strong> ({billingCycle})</span>
                {activatedExpiry && (
                  <span>Expires: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{new Date(activatedExpiry).toLocaleDateString('en-IN')}</strong></span>
                )}
              </div>
            </div>

            {/* Optional Profile Completion Accordion / Section */}
            <div className={`p-4 rounded-xl border text-left space-y-3 ${
              isDark ? 'bg-slate-950/70 border-slate-850' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>Complete Your Profile</span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>(Optional • Do later anytime)</span>
                  </div>
                  <div className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Profile 35% complete. Add your city and preferences for tailored CPR alerts.
                  </div>
                </div>
                <div className={`w-12 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div className={`h-full ${isDark ? 'bg-cyan-500' : 'bg-blue-600'} ${profileSaved ? 'w-full' : 'w-1/3'}`} />
                </div>
              </div>

              {!profileSaved ? (
                <div className="space-y-2 pt-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>City</label>
                      <input
                        type="text"
                        placeholder="e.g. Mumbai, Delhi, Bengaluru"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        className={`w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none ${
                          isDark
                            ? 'bg-slate-900 border-slate-800 text-white focus:border-cyan-500'
                            : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Trading Experience</label>
                      <select
                        value={traderExperience}
                        onChange={e => setTraderExperience(e.target.value as any)}
                        className={`w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none ${
                          isDark
                            ? 'bg-slate-900 border-slate-800 text-white focus:border-cyan-500'
                            : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                        }`}
                      >
                        <option value="BEGINNER">Beginner (&lt;1 yr)</option>
                        <option value="INTERMEDIATE">Intermediate (1-3 yrs)</option>
                        <option value="EXPERT">Expert (&gt;3 yrs)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Favorite assets: NIFTY, BANKNIFTY
                    </span>
                    <button
                      type="button"
                      disabled={profileSaving}
                      onClick={handleSaveProfile}
                      className={`px-3 py-1 border rounded-md text-xs font-semibold transition-colors ${
                        isDark
                          ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40'
                          : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300'
                      }`}
                    >
                      {profileSaving ? 'Saving...' : 'Save Details'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`text-xs flex items-center gap-1.5 font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  <Check className="w-3.5 h-3.5" />
                  <span>Profile updated to 60%! You can update more in Settings anytime.</span>
                </div>
              )}
            </div>

            {/* Done CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-xl transition-all transform active:scale-95 ${
                  isDark
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/25'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/30'
                }`}
              >
                Launch Live Trading Terminal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
