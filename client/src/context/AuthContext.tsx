import React, { createContext, useContext, useEffect, useState } from 'react';

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
  register: (data: { fullName: string; email: string; mobile: string; password: string }) => Promise<{ success: boolean; error?: string }>;
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

  const login = async (emailOrMobile: string, password: string, forceRole?: UserRole) => {
    // Simulated institutional authentication
    await new Promise(resolve => setTimeout(resolve, 500));

    const isSuperAdminEmail = emailOrMobile.toLowerCase().includes('admin') || forceRole === 'SUPERADMIN';
    const assignedRole: UserRole = isSuperAdminEmail ? 'SUPERADMIN' : (forceRole || 'USER');

    const loggedUser: UserProfile = {
      id: isSuperAdminEmail ? 'ADM-001' : `USR-${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: isSuperAdminEmail ? 'SuperAdmin (Fayda Desk)' : (user?.fullName || 'Arun Kumar'),
      email: emailOrMobile.includes('@') ? emailOrMobile : `${emailOrMobile}@vertexinfo.co.in`,
      mobile: emailOrMobile.replace(/[^0-9]/g, '') || (user?.mobile || '+91 98765 43210'),
      role: assignedRole,
      avatarUrl: user?.avatarUrl,
      address: user?.address || {
        street: 'Dalal Street Fort, 4th Floor',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001'
      },
      traderExperience: user?.traderExperience || 'INTERMEDIATE',
      isVerified: true,
      createdAt: user?.createdAt || new Date().toISOString(),
      consentRecord: {
        userId: isSuperAdminEmail ? 'ADM-001' : 'USR-CURRENT',
        userEmail: emailOrMobile,
        riskDisclosureAccepted: true,
        noGuaranteedProfitAccepted: true,
        termsAccepted: true,
        privacyAccepted: true,
        jurisdictionAgeAccepted: true,
        marketingAccepted: false,
        legalVersion: CURRENT_LEGAL_VERSION,
        timestamp: new Date().toISOString(),
        ipAddress: '103.212.144.18 (India - Active Session)'
      }
    };

    setUser(loggedUser);
    setHasCompletedFirstLoginConsent(true);
    return { success: true };
  };

  const register = async (data: { fullName: string; email: string; mobile: string; password: string }) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create pre-verified user waiting for OTP
    const newUser: UserProfile = {
      id: `USR-${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: data.fullName,
      email: data.email,
      mobile: data.mobile,
      role: data.email.toLowerCase().includes('admin') ? 'SUPERADMIN' : 'USER',
      isVerified: false,
      createdAt: new Date().toISOString(),
      address: {
        street: '',
        city: '',
        state: '',
        pincode: ''
      },
      traderExperience: 'BEGINNER'
    };

    setUser(newUser);
    setHasCompletedFirstLoginConsent(true);
    return { success: true };
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
        consentAuditLogs
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
  consentAuditLogs: []
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
};
