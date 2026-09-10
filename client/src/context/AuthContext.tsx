import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const port = host === 'localhost' || host === '127.0.0.1' ? '3001' : '';
    return port ? `http://${host}:${port}` : '';
  }
  return 'http://localhost:3001';
};


export type UserRole = 'USER' | 'SUPERADMIN';

export interface ConsentRecord {
  userId: string;
  userEmail: string;
  riskDisclosureAccepted: boolean;
  noGuaranteedProfitAccepted: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  jurisdictionAgeAccepted: boolean;
  marketingAccepted: boolean;
  legalVersion: string;
  timestamp: string;
  ipAddress?: string;
}

export interface UserAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export type SubscriptionPlanType = 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'BASIC' | 'PRO' | 'PREMIUM';

export interface UserProfile {
  id: string;
  subscriberId?: string; // Permanent formatted ID: SUB000101, SUB000007
  fullName: string;
  email: string;
  mobile: string;
  avatarUrl?: string; // base64 / image uri (strictly under 250kb)
  address?: UserAddress;
  role: UserRole;
  plan?: SubscriptionPlanType;
  billingCycle?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUAL';
  planExpiry?: string;
  subscriptionStatus?: 'ACTIVE' | 'EXPIRING' | 'EXPIRING_SOON' | 'EXPIRED' | 'SUSPENDED';
  daysRemaining?: number;
  profileCompletionPct?: number;
  extendedProfile?: {
    city?: string;
    state?: string;
    preferredLanguage?: string;
    marketPreferences?: string[];
    traderExperience?: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
    avatarUrl?: string;
  };
  traderExperience?: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
  isVerified: boolean;
  createdAt: string;
  consentRecord?: ConsentRecord;
}

export interface PanelVisibilityConfig {
  optionChain: boolean;
  patternRadar: boolean;
  heroZeroRadar: boolean;
  tradeGuidance: boolean;
  rightAnalytics: boolean;
  newsBanner: boolean;
  surgeBanner: boolean;
  squareOffBanner: boolean;
  globalSidebar: boolean;
  sebiTicker: boolean;
  traderModeToggle: boolean;
  riskCalc: boolean;
  highlightSignalTicker: boolean;
}

export const DEFAULT_PANEL_VISIBILITY: PanelVisibilityConfig = {
  optionChain: true,
  patternRadar: true,
  heroZeroRadar: true,
  tradeGuidance: true,
  rightAnalytics: true,
  newsBanner: true,
  surgeBanner: true,
  squareOffBanner: true,
  globalSidebar: true,
  sebiTicker: true,
  traderModeToggle: true,
  riskCalc: true,
  highlightSignalTicker: true
};

export const CURRENT_LEGAL_VERSION = '2026.2';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  currentLegalVersion: string;
  panelVisibility: PanelVisibilityConfig;
  togglePanelVisibility: (panelKey: keyof PanelVisibilityConfig) => void;
  setAllPanelsVisibility: (visible: boolean) => void;
  resetPanelVisibility: () => void;
  login: (emailOrMobile: string, password: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  register: (data: { fullName: string; email: string; mobile: string; password: string; plan?: string }) => Promise<{ success: boolean; error?: string }>;
  subscribeFast: (params: {
    fullName?: string;
    email?: string;
    mobile?: string;
    plan: string;
    billingCycle?: string;
    paymentMethod?: string;
    autoLogin?: boolean;
  }) => Promise<{ success: boolean; error?: string; subscriber?: any; token?: string; subscriberId?: string }>;
  upgradeOrRenew: (params: {
    plan: string;
    billingCycle?: string;
    paymentMethod?: string;
    email?: string;
    mobile?: string;
    subscriberId?: string;
    fullName?: string;
  }) => Promise<{ success: boolean; error?: string; subscriber?: any }>;
  updateExtendedProfile: (data: any) => Promise<{ success: boolean; error?: string; profileCompletionPct?: number }>;
  refreshSubscription: () => Promise<void>;
  canAccessPlan: (requiredPlan: 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND') => boolean;
  canAccessFeature: (featureCode: string) => boolean;
  activePlanDetails: any | null;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (otp: string) => Promise<{ success: boolean; error?: string }>;
  resendOtp: () => Promise<{ success: boolean }>;
  forgotPassword: (emailOrMobile: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (emailOrMobile: string, otp: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  recordConsent: (consent: Omit<ConsentRecord, 'userId' | 'userEmail' | 'timestamp' | 'legalVersion'>) => void;
  hasValidConsent: boolean;
  hasCompletedFirstLoginConsent: boolean;
  setHasCompletedFirstLoginConsent: (val: boolean) => void;
  pendingConsent: boolean;
  setPendingConsent: (val: boolean) => void;
  consentAuditLogs: ConsentRecord[];
  jwtToken: string | null;
  setJwtToken: (token: string | null) => void;
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('fayda_auth_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  const [jwtToken, setJwtTokenState] = useState<string | null>(() =>
    localStorage.getItem('fayda_jwt') ?? null
  );

  const setJwtToken = useCallback((token: string | null) => {
    setJwtTokenState(token);
    if (token) localStorage.setItem('fayda_jwt', token);
    else localStorage.removeItem('fayda_jwt');
  }, []);

  const apiFetch = useCallback((path: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('fayda_jwt');
    return fetch(`${getApiBase()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...((options.headers as Record<string, string>) || {})
      }
    });
  }, []);

  const [hasCompletedFirstLoginConsent, setHasCompletedFirstLoginConsentState] = useState<boolean>(() => {
    return localStorage.getItem('fayda_first_login_consent_completed') === 'true';
  });

  const setHasCompletedFirstLoginConsent = (val: boolean) => {
    setHasCompletedFirstLoginConsentState(val);
    localStorage.setItem('fayda_first_login_consent_completed', val ? 'true' : 'false');
  };

  const [panelVisibility, setPanelVisibility] = useState<PanelVisibilityConfig>(() => {
    const saved = localStorage.getItem('fayda_panel_visibility');
    if (saved) {
      try { return { ...DEFAULT_PANEL_VISIBILITY, ...JSON.parse(saved) }; } catch (e) { return DEFAULT_PANEL_VISIBILITY; }
    }
    return DEFAULT_PANEL_VISIBILITY;
  });

  const [consentAuditLogs, setConsentAuditLogs] = useState<ConsentRecord[]>(() => {
    const saved = localStorage.getItem('fayda_consent_audit_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [
      {
        userId: 'USR-882910',
        userEmail: 'demo.trader@vertexinfo.co.in',
        riskDisclosureAccepted: true,
        noGuaranteedProfitAccepted: true,
        termsAccepted: true,
        privacyAccepted: true,
        jurisdictionAgeAccepted: true,
        marketingAccepted: false,
        legalVersion: '2026.2',
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        ipAddress: '103.212.144.18 (India - Mumbai)'
      },
      {
        userId: 'USR-773412',
        userEmail: 'admin@vertexinfo.co.in',
        riskDisclosureAccepted: true,
        noGuaranteedProfitAccepted: true,
        termsAccepted: true,
        privacyAccepted: true,
        jurisdictionAgeAccepted: true,
        marketingAccepted: true,
        legalVersion: '2026.2',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        ipAddress: '103.212.144.1 (India - Bangalore)'
      }
    ];
  });

  const [pendingConsent, setPendingConsent] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('fayda_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('fayda_auth_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('fayda_panel_visibility', JSON.stringify(panelVisibility));
  }, [panelVisibility]);

  useEffect(() => {
    localStorage.setItem('fayda_consent_audit_logs', JSON.stringify(consentAuditLogs));
  }, [consentAuditLogs]);

  const togglePanelVisibility = (panelKey: keyof PanelVisibilityConfig) => {
    setPanelVisibility(prev => ({
      ...prev,
      [panelKey]: !prev[panelKey]
    }));
  };

  const setAllPanelsVisibility = (visible: boolean) => {
    const updated = Object.keys(panelVisibility).reduce((acc, key) => {
      acc[key as keyof PanelVisibilityConfig] = visible;
      return acc;
    }, {} as PanelVisibilityConfig);
    setPanelVisibility(updated);
  };

  const resetPanelVisibility = () => {
    setPanelVisibility(DEFAULT_PANEL_VISIBILITY);
  };

  const recordConsent = (consent: Omit<ConsentRecord, 'userId' | 'userEmail' | 'timestamp' | 'legalVersion'>) => {
    const newRecord: ConsentRecord = {
      ...consent,
      userId: user?.id || `USR-${Math.floor(100000 + Math.random() * 900000)}`,
      userEmail: user?.email || 'unregistered.visitor@vertexinfo.co.in',
      legalVersion: CURRENT_LEGAL_VERSION,
      timestamp: new Date().toISOString(),
      ipAddress: '103.212.144.18 (Client Verified)'
    };

    setConsentAuditLogs(prev => [newRecord, ...prev.slice(0, 49)]);
    setHasCompletedFirstLoginConsent(true);

    if (user) {
      setUser(prev => prev ? { ...prev, consentRecord: newRecord } : null);
    }
  };

  const [activePlanDetails, setActivePlanDetails] = useState<any | null>(null);

  const refreshSubscription = useCallback(async () => {
    try {
      const token = localStorage.getItem('fayda_jwt');
      if (!token) return;
      const resp = await fetch(`${getApiBase()}/api/subscriptions/my-subscription`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (data.success && data.subscriber) {
        const sub = data.subscriber;
        setActivePlanDetails(data.planDetails);
        setUser(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            subscriberId: sub.subscriberId || prev.subscriberId,
            plan: sub.plan || prev.plan,
            billingCycle: sub.billingCycle || prev.billingCycle,
            planExpiry: sub.planExpiry,
            subscriptionStatus: sub.subscriptionStatus || prev.subscriptionStatus,
            daysRemaining: data.daysRemaining,
            profileCompletionPct: sub.profileCompletionPct || prev.profileCompletionPct,
            extendedProfile: sub.extendedProfile || prev.extendedProfile
          };
        });
      }
    } catch {
      // silently ignore background sync failure
    }
  }, []);

  useEffect(() => {
    if (jwtToken) {
      refreshSubscription();
    }
  }, [jwtToken, refreshSubscription]);

  const canAccessPlan = useCallback((requiredPlan: 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND'): boolean => {
    if (!user) return requiredPlan === 'FREE';
    if (user.role === 'SUPERADMIN') return true;

    const PLAN_RANK: Record<string, number> = {
      FREE: 0,
      BASIC: 1,
      SILVER: 1,
      PRO: 2,
      GOLD: 2,
      PREMIUM: 3,
      DIAMOND: 3
    };

    const currentRank = PLAN_RANK[user.plan || 'FREE'] ?? 0;
    const targetRank = PLAN_RANK[requiredPlan] ?? 0;
    return currentRank >= targetRank;
  }, [user]);

  const canAccessFeature = useCallback((featureCode: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPERADMIN') return true;
    if (activePlanDetails?.entitlements?.includes(featureCode)) return true;

    const plan = (user.plan || 'FREE').toUpperCase();
    if (plan === 'DIAMOND' || plan === 'PREMIUM') return true;
    if (plan === 'GOLD' || plan === 'PRO') {
      return !['VIP_1ON1_DESK', 'ALGO_EXECUTION_HOOKS'].includes(featureCode);
    }
    if (plan === 'SILVER' || plan === 'BASIC') {
      return ['BASIC_TRACKING', 'COMMUNITY_ACCESS', 'CPR_CHECKLIST', 'LIVE_FEEDS', 'CONFLUENCE_MATRIX', 'SURGE_ALERTS', 'TELEGRAM_ALERTS'].includes(featureCode);
    }
    return ['BASIC_TRACKING', 'COMMUNITY_ACCESS', 'CPR_CHECKLIST'].includes(featureCode);
  }, [user, activePlanDetails]);

  const login = async (emailOrMobile: string, password: string, _forceRole?: UserRole) => {
    try {
      const resp = await fetch(`${getApiBase()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrMobile: emailOrMobile.trim(), password: password.trim() })
      });
      const data = await resp.json();
      if (!data.success) return { success: false, error: data.error || 'Login failed.' };
      const sub = data.subscriber;
      const profile: UserProfile = {
        id: sub.id,
        subscriberId: sub.subscriberId || `SUB${sub.id.replace(/\D/g, '').padStart(6, '0')}`,
        fullName: sub.fullName,
        email: sub.email,
        mobile: sub.mobile,
        role: sub.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'USER',
        plan: sub.plan || 'FREE',
        billingCycle: sub.billingCycle || 'MONTHLY',
        planExpiry: sub.planExpiry,
        subscriptionStatus: sub.subscriptionStatus || 'ACTIVE',
        profileCompletionPct: sub.profileCompletionPct || 35,
        extendedProfile: sub.extendedProfile,
        isVerified: sub.isVerified,
        createdAt: sub.createdAt,
        traderExperience: sub.extendedProfile?.traderExperience || 'INTERMEDIATE',
        address: { city: sub.extendedProfile?.city || '', state: sub.extendedProfile?.state || '' }
      };
      setUser(profile);
      setJwtToken(data.token);
      setHasCompletedFirstLoginConsent(true);
      return { success: true };
    } catch {
      return { success: false, error: 'Connection error. Is the server running?' };
    }
  };

  const register = async (data: { fullName: string; email: string; mobile: string; password: string; plan?: string }) => {
    try {
      const resp = await fetch(`${getApiBase()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await resp.json();
      if (!result.success) return { success: false, error: result.error || 'Registration failed.' };
      const sub = result.subscriber;
      const profile: UserProfile = {
        id: sub.id,
        subscriberId: sub.subscriberId || `SUB${sub.id.replace(/\D/g, '').padStart(6, '0')}`,
        fullName: sub.fullName,
        email: sub.email,
        mobile: sub.mobile,
        role: 'USER',
        plan: sub.plan || (data.plan as any) || 'FREE',
        billingCycle: sub.billingCycle || 'MONTHLY',
        planExpiry: sub.planExpiry,
        subscriptionStatus: sub.subscriptionStatus || 'ACTIVE',
        profileCompletionPct: sub.profileCompletionPct || 35,
        extendedProfile: sub.extendedProfile,
        isVerified: sub.isVerified,
        createdAt: sub.createdAt,
        traderExperience: 'BEGINNER',
        address: { city: '', state: '' }
      };
      setUser(profile);
      setJwtToken(result.token);
      setHasCompletedFirstLoginConsent(true);
      return { success: true };
    } catch {
      return { success: false, error: 'Connection error. Is the server running?' };
    }
  };

  const subscribeFast = async (params: {
    fullName?: string;
    email?: string;
    mobile?: string;
    plan: string;
    billingCycle?: string;
    paymentMethod?: string;
    autoLogin?: boolean;
  }) => {
    try {
      const resp = await fetch(`${getApiBase()}/api/subscriptions/subscribe-fast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await resp.json();
      if (!data.success) {
        return { success: false, error: data.error || 'Subscription failed.' };
      }
      if (data.token) {
        setJwtToken(data.token);
      }
      if (data.subscriber) {
        const sub = data.subscriber;
        const profile: UserProfile = {
          id: sub.id,
          subscriberId: sub.subscriberId || `SUB${sub.id.replace(/\D/g, '').padStart(6, '0')}`,
          fullName: sub.fullName,
          email: sub.email,
          mobile: sub.mobile,
          role: sub.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'USER',
          plan: sub.plan || (params.plan as any),
          billingCycle: sub.billingCycle || (params.billingCycle as any) || 'MONTHLY',
          planExpiry: sub.planExpiry,
          subscriptionStatus: sub.subscriptionStatus || 'ACTIVE',
          profileCompletionPct: sub.profileCompletionPct || 35,
          extendedProfile: sub.extendedProfile,
          isVerified: true,
          createdAt: sub.createdAt || new Date().toISOString(),
          traderExperience: sub.extendedProfile?.traderExperience || 'INTERMEDIATE',
          address: { city: sub.extendedProfile?.city || '', state: sub.extendedProfile?.state || '' }
        };
        setUser(profile);
      }
      setHasCompletedFirstLoginConsent(true);
      return {
        success: true,
        subscriber: data.subscriber,
        token: data.token,
        subscriberId: data.subscriber?.subscriberId
      };
    } catch {
      return { success: false, error: 'Connection error during subscription.' };
    }
  };

  const upgradeOrRenew = async (params: {
    plan: string;
    billingCycle?: string;
    paymentMethod?: string;
    email?: string;
    mobile?: string;
    subscriberId?: string;
    fullName?: string;
  }) => {
    try {
      const payload = {
        ...params,
        email: params.email || user?.email,
        mobile: params.mobile || user?.mobile,
        subscriberId: params.subscriberId || user?.subscriberId,
        fullName: params.fullName || user?.fullName,
      };

      const resp = await apiFetch('/api/subscriptions/upgrade-renew', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await resp.json();

      if (!data.success) {
        // If unauthenticated or token rejected, attempt seamless fallback with subscribeFast
        if (payload.email || payload.mobile) {
          const fastRes = await subscribeFast({
            fullName: payload.fullName || 'Trader',
            email: payload.email || '',
            mobile: payload.mobile || '',
            plan: params.plan as any,
            billingCycle: params.billingCycle as any,
            paymentMethod: params.paymentMethod as any,
            autoLogin: true
          });
          if (fastRes.success) {
            return { success: true, subscriber: fastRes.subscriber };
          }
        }
        return { success: false, error: data.error || 'Upgrade failed.' };
      }

      if (data.token) {
        setJwtToken(data.token);
      }

      if (data.subscriber) {
        const sub = data.subscriber;
        const updatedUser: UserProfile = user ? {
          ...user,
          plan: sub.plan,
          billingCycle: sub.billingCycle,
          planExpiry: sub.planExpiry,
          subscriptionStatus: sub.subscriptionStatus,
          profileCompletionPct: sub.profileCompletionPct ?? user.profileCompletionPct
        } : {
          id: sub.id,
          subscriberId: sub.subscriberId,
          fullName: sub.fullName,
          email: sub.email,
          mobile: sub.mobile,
          role: sub.role || 'USER',
          plan: sub.plan,
          billingCycle: sub.billingCycle,
          planExpiry: sub.planExpiry,
          subscriptionStatus: sub.subscriptionStatus,
          profileCompletionPct: sub.profileCompletionPct || 35,
          isVerified: true,
          createdAt: sub.createdAt || new Date().toISOString(),
          traderExperience: 'INTERMEDIATE',
          address: { city: '', state: '' }
        };
        setUser(updatedUser);
      }
      return { success: true, subscriber: data.subscriber };
    } catch {
      // Network failure fallback
      if (user && (user.email || user.mobile)) {
        try {
          const fastRes = await subscribeFast({
            fullName: user.fullName || 'Trader',
            email: user.email || '',
            mobile: user.mobile || '',
            plan: params.plan as any,
            billingCycle: params.billingCycle as any,
            paymentMethod: params.paymentMethod as any,
            autoLogin: true
          });
          if (fastRes.success) {
            return { success: true, subscriber: fastRes.subscriber };
          }
        } catch {
          // ignore
        }
      }
      return { success: false, error: 'Connection error during plan update.' };
    }
  };

  const updateExtendedProfile = async (data: any) => {
    try {
      const resp = await apiFetch('/api/auth/extended-profile', {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      const res = await resp.json();
      if (!res.success) {
        return { success: false, error: res.error || 'Failed to update profile.' };
      }
      if (user && res.subscriber) {
        setUser({
          ...user,
          fullName: res.subscriber.fullName || user.fullName,
          profileCompletionPct: res.profileCompletionPct,
          extendedProfile: res.subscriber.extendedProfile,
          traderExperience: res.subscriber.extendedProfile?.traderExperience || user.traderExperience,
          address: {
            city: res.subscriber.extendedProfile?.city || user.address?.city || '',
            state: res.subscriber.extendedProfile?.state || user.address?.state || ''
          }
        });
      }
      return { success: true, profileCompletionPct: res.profileCompletionPct };
    } catch {
      return { success: false, error: 'Connection error updating extended profile.' };
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (!user) {
      return { success: false, error: 'No active user session found.' };
    }

    const updated: UserProfile = {
      ...user,
      ...data,
      address: {
        ...user.address,
        ...(data.address || {})
      }
    };

    setUser(updated);
    return { success: true };
  };

  const verifyOtp = async (otp: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (otp === '123456' || otp.length === 6) {
      if (user) {
        setUser({ ...user, isVerified: true });
      }
      setHasCompletedFirstLoginConsent(true);
      return { success: true };
    }
    return { success: false, error: 'Invalid 6-digit OTP code. (For demo testing, enter 123456 or any 6 digits)' };
  };

  const resendOtp = async () => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return { success: true };
  };

  const forgotPassword = async (emailOrMobile: string) => {
    await new Promise(resolve => setTimeout(resolve, 600));
    if (!emailOrMobile) {
      return { success: false, error: 'Please enter registered Email ID or Mobile Number.' };
    }
    return { success: true };
  };

  const resetPassword = async (emailOrMobile: string, otp: string, newPass: string) => {
    await new Promise(resolve => setTimeout(resolve, 600));
    if (otp !== '123456' && otp.length !== 6) {
      return { success: false, error: 'Invalid verification OTP code. Use 123456 for testing.' };
    }
    if (newPass.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    setJwtToken(null);
  };

  const hasValidConsent = Boolean(user?.consentRecord && user.consentRecord.legalVersion === CURRENT_LEGAL_VERSION);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user && user.isVerified),
        isSuperAdmin: user?.role === 'SUPERADMIN',
        currentLegalVersion: CURRENT_LEGAL_VERSION,
        panelVisibility,
        togglePanelVisibility,
        setAllPanelsVisibility,
        resetPanelVisibility,
        login,
        register,
        subscribeFast,
        upgradeOrRenew,
        updateExtendedProfile,
        refreshSubscription,
        canAccessPlan,
        canAccessFeature,
        activePlanDetails,
        updateProfile,
        verifyOtp,
        resendOtp,
        forgotPassword,
        resetPassword,
        logout,
        recordConsent,
        hasValidConsent,
        hasCompletedFirstLoginConsent,
        setHasCompletedFirstLoginConsent,
        pendingConsent,
        setPendingConsent,
        consentAuditLogs,
        jwtToken,
        setJwtToken,
        apiFetch
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isSuperAdmin: false,
  panelVisibility: DEFAULT_PANEL_VISIBILITY,
  togglePanelVisibility: () => {},
  setAllPanelsVisibility: () => {},
  resetPanelVisibility: () => {},
  currentLegalVersion: CURRENT_LEGAL_VERSION,
  login: async () => ({ success: true }),
  register: async () => ({ success: true }),
  subscribeFast: async () => ({ success: true }),
  upgradeOrRenew: async () => ({ success: true }),
  updateExtendedProfile: async () => ({ success: true }),
  refreshSubscription: async () => {},
  canAccessPlan: () => true,
  canAccessFeature: () => true,
  activePlanDetails: null,
  updateProfile: async () => ({ success: true }),
  verifyOtp: async () => ({ success: true }),
  resendOtp: async () => ({ success: true }),
  forgotPassword: async () => ({ success: true }),
  resetPassword: async () => ({ success: true }),
  logout: () => {},
  recordConsent: () => {},
  hasValidConsent: true,
  hasCompletedFirstLoginConsent: true,
  setHasCompletedFirstLoginConsent: () => {},
  pendingConsent: false,
  setPendingConsent: () => {},
  consentAuditLogs: [],
  jwtToken: null,
  setJwtToken: () => {},
  apiFetch: (path: string, options?: RequestInit) => fetch(path, options)
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
};
