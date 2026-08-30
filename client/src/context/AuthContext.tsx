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

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: UserRole;
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
  verifyOtp: (otp: string) => Promise<{ success: boolean; error?: string }>;
  resendOtp: () => Promise<{ success: boolean }>;
  logout: () => void;
  recordConsent: (consent: Omit<ConsentRecord, 'userId' | 'userEmail' | 'timestamp' | 'legalVersion'>) => void;
  hasValidConsent: boolean;
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

    if (user) {
      setUser(prev => prev ? { ...prev, consentRecord: newRecord } : null);
    }
  };

  const login = async (emailOrMobile: string, password: string, forceRole?: UserRole) => {
    // Simulated institutional authentication
    await new Promise(resolve => setTimeout(resolve, 600));

    const isSuperAdminEmail = emailOrMobile.toLowerCase().includes('admin') || forceRole === 'SUPERADMIN';
    const assignedRole: UserRole = isSuperAdminEmail ? 'SUPERADMIN' : (forceRole || 'USER');

    const loggedUser: UserProfile = {
      id: isSuperAdminEmail ? 'ADM-001' : `USR-${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: isSuperAdminEmail ? 'SuperAdmin (Fayda Desk)' : 'Arun Kumar',
      email: emailOrMobile.includes('@') ? emailOrMobile : `${emailOrMobile}@vertexinfo.co.in`,
      mobile: emailOrMobile.replace(/[^0-9]/g, '') || '+91 98765 43210',
      role: assignedRole,
      isVerified: true,
      createdAt: new Date().toISOString(),
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
      createdAt: new Date().toISOString()
    };

    setUser(newUser);
    return { success: true };
  };

  const verifyOtp = async (otp: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (otp === '123456' || otp.length === 6) {
      if (user) {
        setUser({ ...user, isVerified: true });
      }
      return { success: true };
    }
    return { success: false, error: 'Invalid 6-digit OTP code. (For demo testing, enter 123456 or any 6 digits)' };
  };

  const resendOtp = async () => {
    await new Promise(resolve => setTimeout(resolve, 400));
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
        verifyOtp,
        resendOtp,
        logout,
        recordConsent,
        hasValidConsent,
        pendingConsent,
        setPendingConsent,
        consentAuditLogs
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
