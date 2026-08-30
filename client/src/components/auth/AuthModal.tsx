import React, { useState, useEffect, useRef } from 'react';
import { useAuth, CURRENT_LEGAL_VERSION } from '../../context/AuthContext';
import { LegalDocumentModal, type LegalDocType } from './LegalDocumentModal';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Mail, 
  Phone, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  X, 
  RefreshCw, 
  Sparkles, 
  Zap,
  KeyRound,
  ExternalLink,
  HelpCircle
} from 'lucide-react';

export type AuthScreenMode = 'CONSENT_DISCLOSURE' | 'SIGN_UP' | 'OTP_VERIFY' | 'SIGN_IN' | 'FORGOT_PASSWORD';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialScreen?: AuthScreenMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialScreen = 'CONSENT_DISCLOSURE'
}) => {
  const { login, register, verifyOtp, resendOtp, recordConsent } = useAuth();

  const [screen, setScreen] = useState<AuthScreenMode>(initialScreen);
  const [targetPostConsentScreen, setTargetPostConsentScreen] = useState<'SIGN_UP' | 'SIGN_IN'>('SIGN_UP');

  // Legal Doc Modal Viewer state
  const [isLegalDocOpen, setIsLegalDocOpen] = useState<boolean>(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType>('RISK_DISCLOSURE');

  // Granular Consent Checkboxes
  const [consentRisk, setConsentRisk] = useState<boolean>(false);
  const [consentNoGuarantee, setConsentNoGuarantee] = useState<boolean>(false);
  const [consentTerms, setConsentTerms] = useState<boolean>(false);
  const [consentPrivacy, setConsentPrivacy] = useState<boolean>(false);
  const [consentAge, setConsentAge] = useState<boolean>(false);
  const [consentMarketing, setConsentMarketing] = useState<boolean>(false);

  // Sign-Up form fields
  const [signUpName, setSignUpName] = useState<string>('');
  const [signUpEmail, setSignUpEmail] = useState<string>('');
  const [signUpMobile, setSignUpMobile] = useState<string>('');
  const [signUpPassword, setSignUpPassword] = useState<string>('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState<string>('');
  const [signUpReferral, setSignUpReferral] = useState<string>('');

  // Sign-In form fields
  const [signInIdentifier, setSignInIdentifier] = useState<string>('');
  const [signInPassword, setSignInPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Password visibility
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // OTP Verification state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState<number>(60);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Feedback & Loading
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setScreen(initialScreen);
    setErrorMsg('');
    setSuccessMsg('');
  }, [initialScreen, isOpen]);

  // OTP Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, otpTimer]);

  if (!isOpen) return null;

  const isAllMandatoryConsentChecked = 
    consentRisk && 
    consentNoGuarantee && 
    consentTerms && 
    consentPrivacy && 
    consentAge;

  const openLegalDocument = (doc: LegalDocType) => {
    setActiveLegalDoc(doc);
    setIsLegalDocOpen(true);
  };

  const handleConsentSubmit = () => {
    if (!isAllMandatoryConsentChecked) return;

    recordConsent({
      riskDisclosureAccepted: consentRisk,
      noGuaranteedProfitAccepted: consentNoGuarantee,
      termsAccepted: consentTerms,
      privacyAccepted: consentPrivacy,
      jurisdictionAgeAccepted: consentAge,
      marketingAccepted: consentMarketing
    });

    setScreen(targetPostConsentScreen);
    setErrorMsg('');
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!signUpName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!signUpEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (signUpMobile.replace(/[^0-9]/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (signUpPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const res = await register({
      fullName: signUpName,
      email: signUpEmail,
      mobile: signUpMobile,
      password: signUpPassword
    });
    setIsLoading(false);

    if (res.success) {
      setScreen('OTP_VERIFY');
      setOtpTimer(60);
      setIsTimerActive(true);
      setSuccessMsg(`OTP sent to ${signUpEmail} and ${signUpMobile}.`);
    } else {
      setErrorMsg(res.error || 'Failed to create account.');
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Paste handling
      const clean = value.replace(/[^0-9]/g, '').slice(0, 6);
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = clean[i] || '';
      }
      setOtpDigits(newDigits);
      if (clean.length === 6) {
        otpInputRefs.current[5]?.focus();
      }
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = value.replace(/[^0-9]/g, '');
    setOtpDigits(newDigits);

    // Auto advance
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpVerifySubmit = async () => {
    const fullOtp = otpDigits.join('');
    if (fullOtp.length < 6) {
      setErrorMsg('Please enter all 6 digits of the verification OTP.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    const res = await verifyOtp(fullOtp);
    setIsLoading(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Verification failed.');
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    setIsLoading(true);
    await resendOtp();
    setIsLoading(false);
    setOtpTimer(60);
    setIsTimerActive(true);
    setSuccessMsg('A fresh 6-digit OTP has been dispatched.');
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!signInIdentifier.trim()) {
      setErrorMsg('Please enter your registered email or mobile.');
      return;
    }
    if (!signInPassword) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    const res = await login(signInIdentifier, signInPassword);
    setIsLoading(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Invalid credentials.');
    }
  };

  const handleQuickDemoLogin = async (role: 'SUPERADMIN' | 'USER') => {
    setIsLoading(true);
    if (role === 'SUPERADMIN') {
      await login('admin@vertexinfo.co.in', 'superadmin2026', 'SUPERADMIN');
    } else {
      await login('arun.trader@vertexinfo.co.in', 'password123', 'USER');
    }
    setIsLoading(false);
    onClose();
  };

  return (
    <>
      {/* Legal Document Viewer Overlay */}
      <LegalDocumentModal
        isOpen={isLegalDocOpen}
        onClose={() => setIsLegalDocOpen(false)}
        initialDoc={activeLegalDoc}
      />

      <div className="fixed inset-0 z-[105000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
        <div className="bg-terminal-card border border-accent-cyan/40 rounded-2xl shadow-[0_0_60px_rgba(0,229,255,0.25)] max-w-xl w-full p-5 sm:p-6 overflow-hidden flex flex-col space-y-4 max-h-[95vh] overflow-y-auto">
          {/* Top Bar with Brand & Close */}
          <div className="flex items-center justify-between border-b border-terminal-border/60 pb-3">
            <div className="flex items-center space-x-2.5">
              <img src="/favicon-32x32.png" className="w-6 h-6 object-contain" alt="" />
              <div>
                <span className="font-mono font-black text-sm sm:text-base text-terminal-text tracking-wider flex items-center gap-1.5">
                  <span>FAYDA AUTHENTICATION</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-accent-cyan/15 text-accent-cyan font-bold">PRO</span>
                </span>
                <span className="text-[10px] text-terminal-muted block font-mono">
                  SEBI-Aligned Indian Market Decision Terminal
                </span>
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

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-bear/10 border border-bear/30 text-bear text-xs font-mono flex items-start gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-bull/10 border border-bull/30 text-bull text-xs font-mono flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 1: MANDATORY RISK DISCLOSURE & GRANULAR CONSENT SCREEN */}
          {/* ========================================================================= */}
          {screen === 'CONSENT_DISCLOSURE' && (
            <div className="space-y-4 font-sans text-xs">
              <div className="text-center space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-terminal-text">
                  Welcome to Fayda
                </h3>
                <p className="text-terminal-muted text-xs">
                  Before you continue, please read and acknowledge the following regulatory risk disclosures.
                </p>
              </div>

              {/* Regulatory Notice Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-[11px]">
                <div className="p-2.5 rounded-xl bg-bear/10 border border-bear/30 space-y-1">
                  <div className="font-bold text-bear flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Derivatives Risk</span>
                  </div>
                  <p className="text-terminal-muted leading-tight">
                    Trading in F&O involves substantial risk of capital loss. Theta decay and IV crush can deplete option premiums.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-amber/10 border border-amber/30 space-y-1">
                  <div className="font-bold text-amber flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>No Guaranteed Returns</span>
                  </div>
                  <p className="text-terminal-muted leading-tight">
                    Fayda provides mathematical analytics and decision support. We do NOT guarantee profits or sure-shot predictions.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 space-y-1">
                  <div className="font-bold text-accent-cyan flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Non-Advisory Service</span>
                  </div>
                  <p className="text-terminal-muted leading-tight">
                    Fayda does not provide personalized investment advice under SEBI (IA) Regulations. All trades are at your own discretion.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-bull/10 border border-bull/30 space-y-1">
                  <div className="font-bold text-bull flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Privacy Guarantee</span>
                  </div>
                  <p className="text-terminal-muted leading-tight">
                    Zero storage of Demat passwords or Aadhaar. Direct OAuth broker authorization.
                  </p>
                </div>
              </div>

              {/* Legal Document Links Pill Bar */}
              <div className="flex flex-wrap items-center justify-center gap-2 py-1 text-[11px] font-mono text-accent-cyan">
                <button
                  type="button"
                  onClick={() => openLegalDocument('RISK_DISCLOSURE')}
                  className="hover:underline flex items-center gap-1"
                >
                  <span>Risk Disclosure</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => openLegalDocument('TERMS')}
                  className="hover:underline flex items-center gap-1"
                >
                  <span>Terms of Use</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => openLegalDocument('PRIVACY')}
                  className="hover:underline flex items-center gap-1"
                >
                  <span>Privacy Policy</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => openLegalDocument('DISCLAIMER')}
                  className="hover:underline flex items-center gap-1"
                >
                  <span>Disclaimer</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* 5 Mandatory Checkboxes + 1 Optional */}
              <div className="p-3.5 rounded-xl bg-terminal-panel/80 border border-terminal-border space-y-2.5 font-mono text-[11px]">
                <span className="text-[10px] text-terminal-muted font-bold uppercase tracking-wider block border-b border-terminal-border/60 pb-1">
                  Mandatory Acknowledgements (v{CURRENT_LEGAL_VERSION})
                </span>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consentRisk}
                    onChange={(e) => setConsentRisk(e.target.checked)}
                    className="mt-0.5 accent-accent-cyan w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-terminal-text leading-tight">
                    I have read and understood the <strong>Risk Disclosure</strong> and understand that trading in securities, futures and options involves substantial risk of loss.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consentNoGuarantee}
                    onChange={(e) => setConsentNoGuarantee(e.target.checked)}
                    className="mt-0.5 accent-accent-cyan w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-terminal-text leading-tight">
                    I acknowledge that Fayda's market information, analytics and scenarios do <strong>not guarantee profits</strong> or future performance.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consentTerms}
                    onChange={(e) => setConsentTerms(e.target.checked)}
                    className="mt-0.5 accent-accent-cyan w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-terminal-text leading-tight">
                    I agree to the Fayda <strong>Terms of Use</strong> and platform intellectual property rules.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consentPrivacy}
                    onChange={(e) => setConsentPrivacy(e.target.checked)}
                    className="mt-0.5 accent-accent-cyan w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-terminal-text leading-tight">
                    I have read the <strong>Privacy Policy</strong> and understand how personal authentication data is managed.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consentAge}
                    onChange={(e) => setConsentAge(e.target.checked)}
                    className="mt-0.5 accent-accent-cyan w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-terminal-text leading-tight">
                    I confirm that I am at least <strong>18 years old</strong> and legally competent to access this service.
                  </span>
                </label>

                <div className="border-t border-terminal-border/60 pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none text-terminal-muted">
                    <input
                      type="checkbox"
                      checked={consentMarketing}
                      onChange={(e) => setConsentMarketing(e.target.checked)}
                      className="mt-0.5 accent-accent-cyan w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="leading-tight">
                      (Optional) I would like to receive market education and product feature updates from Fayda.
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetPostConsentScreen('SIGN_IN');
                      if (isAllMandatoryConsentChecked) handleConsentSubmit();
                    }}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-mono font-bold transition border cursor-pointer ${
                      isAllMandatoryConsentChecked
                        ? 'bg-terminal-panel border-terminal-border text-terminal-text hover:border-accent-cyan'
                        : 'bg-terminal-panel/50 border-terminal-border/50 text-terminal-muted cursor-not-allowed opacity-60'
                    }`}
                    disabled={!isAllMandatoryConsentChecked}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetPostConsentScreen('SIGN_UP');
                      if (isAllMandatoryConsentChecked) handleConsentSubmit();
                    }}
                    className={`flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                      isAllMandatoryConsentChecked
                        ? 'bg-accent-cyan/20 border border-accent-cyan/60 text-accent-cyan hover:bg-accent-cyan/30 shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                        : 'bg-terminal-panel/50 border border-terminal-border text-terminal-muted cursor-not-allowed opacity-60'
                    }`}
                    disabled={!isAllMandatoryConsentChecked}
                  >
                    <span>I Understand & Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="text-[10px] text-terminal-muted font-mono text-center">
                  Acknowledgement audit record is securely logged.
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 2: SIGN-UP FORM */}
          {/* ========================================================================= */}
          {screen === 'SIGN_UP' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5 font-mono text-xs">
              <div className="text-center space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-terminal-text">
                  Create Your Fayda Account
                </h3>
                <p className="text-terminal-muted text-xs">
                  Institutional trading analytics & algorithmic market intelligence
                </p>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-terminal-muted font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Arun Kumar"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-cyan"
                  required
                />
              </div>

              {/* Email Address & Mobile Number in 2 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-terminal-muted font-bold flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-cyan"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-terminal-muted font-bold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>Mobile Number</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={signUpMobile}
                    onChange={(e) => setSignUpMobile(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-cyan"
                    required
                  />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1 relative">
                  <label className="text-terminal-muted font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>Password</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-cyan"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-terminal-muted font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>Confirm Password</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-cyan"
                    required
                  />
                </div>
              </div>

              {/* Referral Code & Password Visibility */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-terminal-muted hover:text-terminal-text flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
                </button>

                <input
                  type="text"
                  placeholder="Referral Code (Optional)"
                  value={signUpReferral}
                  onChange={(e) => setSignUpReferral(e.target.value)}
                  className="bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1 text-[11px] text-terminal-text uppercase font-bold focus:outline-none focus:border-accent-cyan max-w-[180px]"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-accent-cyan/20 border border-accent-cyan/60 text-accent-cyan hover:bg-accent-cyan/30 font-mono font-bold text-xs transition shadow-[0_0_15px_rgba(0,229,255,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Create Account & Send OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Social Login / Google */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-terminal-border" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-terminal-card px-2 text-terminal-muted font-bold">Or Continue With</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('USER')}
                className="w-full py-2 rounded-xl bg-terminal-panel hover:bg-terminal-bg border border-terminal-border text-terminal-text font-mono text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="text-center pt-1 text-[11px] text-terminal-muted">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setScreen('SIGN_IN')}
                  className="text-accent-cyan font-bold hover:underline"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 3: 6-DIGIT OTP VERIFICATION */}
          {/* ========================================================================= */}
          {screen === 'OTP_VERIFY' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-2xl bg-accent-cyan/15 border border-accent-cyan/40 text-accent-cyan flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-terminal-text">
                  Verify Your Account
                </h3>
                <p className="text-terminal-muted text-xs">
                  Enter the 6-digit verification code sent to your registered mobile and email.
                </p>
              </div>

              {/* 6 OTP Boxes */}
              <div className="flex justify-center gap-2 sm:gap-2.5 py-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { otpInputRefs.current[idx] = el; }}
                    type="text"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold bg-terminal-bg border-2 border-terminal-border rounded-xl text-terminal-text focus:border-accent-cyan focus:outline-none focus:shadow-[0_0_10px_rgba(0,229,255,0.3)] transition"
                  />
                ))}
              </div>

              <div className="p-2.5 rounded-xl bg-terminal-panel border border-terminal-border flex items-center justify-between text-[11px]">
                <span className="text-terminal-muted">
                  Code expires in: <strong className="text-terminal-text font-bold">{otpTimer}s</strong>
                </span>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpTimer > 0}
                  className={`font-bold transition ${
                    otpTimer === 0 ? 'text-accent-cyan hover:underline cursor-pointer' : 'text-terminal-muted cursor-not-allowed opacity-60'
                  }`}
                >
                  Resend OTP
                </button>
              </div>

              {/* Verify Button */}
              <button
                type="button"
                onClick={handleOtpVerifySubmit}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-accent-cyan/20 border border-accent-cyan/60 text-accent-cyan hover:bg-accent-cyan/30 font-mono font-bold text-xs transition shadow-[0_0_15px_rgba(0,229,255,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Verify & Launch Terminal</span>}
              </button>

              <div className="text-center text-[10px] text-terminal-muted">
                Tip: For demo testing, enter <strong className="text-accent-cyan">123456</strong> or any 6 digits.
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 4: SIGN-IN (WELCOME BACK) */}
          {/* ========================================================================= */}
          {screen === 'SIGN_IN' && (
            <form onSubmit={handleSignInSubmit} className="space-y-3.5 font-mono text-xs">
              <div className="text-center space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-terminal-text">
                  Welcome Back to Fayda
                </h3>
                <p className="text-terminal-muted text-xs">
                  Sign in to access live option chains, Greeks and strategy radar
                </p>
              </div>

              {/* Email / Mobile */}
              <div className="space-y-1">
                <label className="text-terminal-muted font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>Email or Mobile Number</span>
                </label>
                <input
                  type="text"
                  placeholder="admin@vertexinfo.co.in / 9876543210"
                  value={signInIdentifier}
                  onChange={(e) => setSignInIdentifier(e.target.value)}
                  className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-cyan"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-terminal-muted font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setScreen('FORGOT_PASSWORD')}
                    className="text-[11px] text-accent-cyan hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-cyan"
                  required
                />
              </div>

              {/* Remember Me & Visibility */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-terminal-muted">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-accent-cyan w-3.5 h-3.5 rounded"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-terminal-muted hover:text-terminal-text flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-accent-cyan/20 border border-accent-cyan/60 text-accent-cyan hover:bg-accent-cyan/30 font-mono font-bold text-xs transition shadow-[0_0_15px_rgba(0,229,255,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Sign In to Terminal</span>}
              </button>

              {/* Instant 1-Click Demo Login Box (SuperAdmin & Pro User) */}
              <div className="p-3 rounded-xl bg-terminal-panel/80 border border-terminal-border space-y-2">
                <span className="text-[10px] text-terminal-muted uppercase font-bold tracking-wider block">
                  Quick Access Profiles (One-Click)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('SUPERADMIN')}
                    className="py-1.5 px-2 rounded-lg bg-purple-500/20 border border-purple-500/50 hover:bg-purple-500/30 text-purple-400 font-bold text-[11px] transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                    title="Sign in with SuperAdmin rights (hide/show any panel, manage compliance, view audit logs)"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>⚡ SuperAdmin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('USER')}
                    className="py-1.5 px-2 rounded-lg bg-accent-cyan/20 border border-accent-cyan/50 hover:bg-accent-cyan/30 text-accent-cyan font-bold text-[11px] transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                    title="Sign in as standard active F&O trader"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>👤 Pro Trader</span>
                  </button>
                </div>
              </div>

              <div className="text-center text-[11px] text-terminal-muted pt-1">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setScreen('CONSENT_DISCLOSURE')}
                  className="text-accent-cyan font-bold hover:underline"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 5: FORGOT PASSWORD */}
          {/* ========================================================================= */}
          {screen === 'FORGOT_PASSWORD' && (
            <div className="space-y-3.5 font-mono text-xs">
              <div className="text-center space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-terminal-text">
                  Reset Your Password
                </h3>
                <p className="text-terminal-muted text-xs">
                  Enter your registered email or mobile to receive password recovery instructions.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-terminal-muted font-bold">Email or Mobile Number</label>
                <input
                  type="text"
                  placeholder="name@example.com"
                  className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-cyan"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSuccessMsg('Password reset instructions dispatched.');
                  setScreen('SIGN_IN');
                }}
                className="w-full py-2.5 rounded-xl bg-accent-cyan/20 border border-accent-cyan/60 text-accent-cyan hover:bg-accent-cyan/30 font-mono font-bold text-xs transition shadow-[0_0_15px_rgba(0,229,255,0.3)] cursor-pointer"
              >
                Send Recovery Link / OTP
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setScreen('SIGN_IN')}
                  className="text-accent-cyan font-bold hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
