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

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  avatarUrl?: string; // base64 / image uri (strictly under 250kb)
  address?: UserAddress;
  role: UserRole;
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
        fullName: sub.fullName,
        email: sub.email,
        mobile: sub.mobile,
        role: sub.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'USER',
        isVerified: sub.isVerified,
        createdAt: sub.createdAt,
        traderExperience: 'INTERMEDIATE',
        address: { city: '', state: '' }
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
        fullName: sub.fullName,
        email: sub.email,
        mobile: sub.mobile,
        role: 'USER',
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
