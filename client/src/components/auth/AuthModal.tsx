import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  HelpCircle,
  ShieldQuestion,
  Fingerprint
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
  initialScreen
}) => {
  const { 
    login, 
    register, 
    verifyOtp, 
    resendOtp, 
    forgotPassword, 
    resetPassword, 
    recordConsent, 
    hasCompletedFirstLoginConsent,
    setHasCompletedFirstLoginConsent 
  } = useAuth();

  // Smart initial screen: if user already consented on first login, directly show SIGN_IN
  const determineInitialScreen = (): AuthScreenMode => {
    if (initialScreen) return initialScreen;
    if (hasCompletedFirstLoginConsent) return 'SIGN_IN';
    return 'CONSENT_DISCLOSURE';
  };

  const [screen, setScreen] = useState<AuthScreenMode>(determineInitialScreen());

  // Sign In method toggle: 'PASSWORD' | 'EMAIL_OTP'
  const [signInMethod, setSignInMethod] = useState<'PASSWORD' | 'EMAIL_OTP'>('PASSWORD');

  // Legal Doc Modal Viewer state
  const [isLegalDocOpen, setIsLegalDocOpen] = useState<boolean>(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType>('RISK_DISCLOSURE');

  // Granular Consent Checkboxes (First Login)
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

  // Sign-In form fields
  const [signInIdentifier, setSignInIdentifier] = useState<string>('');
  const [signInPassword, setSignInPassword] = useState<string>('');
  const [signInOtp, setSignInOtp] = useState<string>('');
  const [isSignInOtpSent, setIsSignInOtpSent] = useState<boolean>(false);

  // Forgot Password fields
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotOtp, setForgotOtp] = useState<string>('');
  const [forgotNewPass, setForgotNewPass] = useState<string>('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState<string>('');
  const [isForgotOtpSent, setIsForgotOtpSent] = useState<boolean>(false);

  // Password visibility
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Captcha Generator & State
  const [captchaNum1, setCaptchaNum1] = useState<number>(7);
  const [captchaNum2, setCaptchaNum2] = useState<number>(5);
  const [captchaInput, setCaptchaInput] = useState<string>('');

  // OTP Verification state (Registration)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState<number>(60);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Feedback & Loading
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshCaptcha = () => {
    const n1 = Math.floor(Math.random() * 9) + 2;
    const n2 = Math.floor(Math.random() * 8) + 1;
    setCaptchaNum1(n1);
    setCaptchaNum2(n2);
    setCaptchaInput('');
  };

  useEffect(() => {
    setScreen(determineInitialScreen());
    setErrorMsg('');
    setSuccessMsg('');
    refreshCaptcha();
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

  // Handler: Step 1 Mandatory Consent Acceptance (First Login Only)
  const handleAcceptFirstLoginConsent = () => {
    if (!consentRisk || !consentNoGuarantee || !consentTerms || !consentAge) {
      setErrorMsg('Please accept all mandatory SEBI regulatory disclaimers and terms to proceed.');
      return;
    }

    recordConsent({
      riskDisclosureAccepted: consentRisk,
      noGuaranteedProfitAccepted: consentNoGuarantee,
      termsAccepted: consentTerms,
      privacyAccepted: consentTerms,
      jurisdictionAgeAccepted: consentAge,
      marketingAccepted: consentMarketing
    });

    setHasCompletedFirstLoginConsent(true);
    setScreen('SIGN_IN');
    setErrorMsg('');
    setSuccessMsg('SEBI compliance accepted. Please sign in to your terminal.');
  };

  // Handler: Sign In
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!signInIdentifier.trim()) {
      setErrorMsg('Please enter your registered Username, Email ID, or Mobile Number.');
      return;
    }

    // Captcha Validation
    const expected = captchaNum1 + captchaNum2;
    if (parseInt(captchaInput.trim(), 10) !== expected) {
      setErrorMsg(`Incorrect Captcha answer. What is ${captchaNum1} + ${captchaNum2}?`);
      refreshCaptcha();
      return;
    }

    if (signInMethod === 'PASSWORD') {
      if (!signInPassword) {
        setErrorMsg('Please enter your account password.');
        return;
      }
    } else {
      if (!signInOtp.trim()) {
        setErrorMsg('Please enter the 6-digit Email OTP sent to your inbox.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const res = await login(signInIdentifier.trim(), signInPassword);
      if (res.success) {
        setSuccessMsg('Signed in successfully! Loading terminal workspace...');
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setErrorMsg(res.error || 'Invalid credentials or OTP. Please check and try again.');
        refreshCaptcha();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please try again.');
      refreshCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Send OTP for Email OTP login
  const handleSendSignInOtp = async () => {
    if (!signInIdentifier.trim()) {
      setErrorMsg('Please enter your registered Email ID to receive OTP.');
      return;
    }
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setIsLoading(false);
    setIsSignInOtpSent(true);
    setSuccessMsg(`6-digit OTP sent to ${signInIdentifier}. (For testing, enter 123456)`);
  };

  // Handler: Sign Up
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!signUpName.trim() || signUpName.length < 2) {
      setErrorMsg('Please enter a valid full name.');
      return;
    }
    if (!signUpEmail.trim() || !signUpEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (signUpMobile.replace(/[^0-9]/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (signUpPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await register({
        fullName: signUpName.trim(),
        email: signUpEmail.trim(),
        mobile: signUpMobile.trim(),
        password: signUpPassword
      });

      if (res.success) {
        setScreen('OTP_VERIFY');
        setIsTimerActive(true);
        setOtpTimer(60);
        setSuccessMsg(`Verification code sent to ${signUpEmail}`);
      } else {
        setErrorMsg(res.error || 'Registration failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Forgot Password OTP Send
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setErrorMsg('Please enter your registered Email or Mobile.');
      return;
    }
    setIsLoading(true);
    const res = await forgotPassword(forgotEmail.trim());
    setIsLoading(false);
    if (res.success) {
      setIsForgotOtpSent(true);
      setSuccessMsg(`Reset code sent to ${forgotEmail}. (For testing, use 123456)`);
      setErrorMsg('');
    } else {
      setErrorMsg(res.error || 'Failed to send reset code.');
    }
  };

  // Handler: Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim()) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }
    if (forgotNewPass.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const res = await resetPassword(forgotEmail, forgotOtp.trim(), forgotNewPass);
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg('Password reset successfully! You can now sign in.');
      setErrorMsg('');
      setTimeout(() => {
        setScreen('SIGN_IN');
        setSignInIdentifier(forgotEmail);
        setIsForgotOtpSent(false);
      }, 1000);
    } else {
      setErrorMsg(res.error || 'Failed to reset password.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-terminal-card border border-terminal-border rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto no-scrollbar shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col font-sans select-none ring-1 ring-white/10">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-terminal-border bg-terminal-panel/80 sticky top-0 z-10 backdrop-blur-lg">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-2xl bg-accent-sky/20 text-accent-sky border border-accent-sky/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-mono font-bold text-sm sm:text-base text-terminal-text uppercase tracking-wider flex items-center gap-2">
                <span>FAYDA PRO TERMINAL AUTH</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent-sky/20 text-accent-sky border border-accent-sky/30">
                  SEBI v{CURRENT_LEGAL_VERSION}
                </span>
              </h3>
              <span className="text-[11px] text-terminal-muted block">
                {screen === 'CONSENT_DISCLOSURE' && 'Mandatory SEBI Regulatory Consent (First Login)'}
                {screen === 'SIGN_IN' && 'Institutional Client & Trader Sign-In'}
                {screen === 'SIGN_UP' && 'Create New Trader Account'}
                {screen === 'FORGOT_PASSWORD' && 'Recover Account Access with OTP'}
                {screen === 'OTP_VERIFY' && 'Verify 6-Digit Security OTP'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-terminal-panel hover:bg-terminal-card border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="p-4 sm:p-6 space-y-4">
          
          {/* Feedback Banners */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-bear/10 border border-bear/40 text-bear text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-bull/10 border border-bull/40 text-bull text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 1: FIRST LOGIN MANDATORY REGULATORY CONSENT */}
          {/* ========================================================================= */}
          {screen === 'CONSENT_DISCLOSURE' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber/10 border border-amber/30 text-amber text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold font-mono uppercase text-[11px]">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber" />
                  <span>Mandatory SEBI First-Time Login Notice</span>
                </div>
                <p className="text-terminal-text leading-relaxed font-medium">
                  According to SEBI Circulars & Regulations, 9 out of 10 individual traders in equity F&O incur net losses. Please review and accept these regulatory terms once before signing in.
                </p>
              </div>

              {/* Granular Checkboxes */}
              <div className="space-y-2.5 text-xs text-terminal-text">
                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-terminal-panel border border-terminal-border cursor-pointer hover:border-accent-sky transition">
                  <input
                    type="checkbox"
                    checked={consentRisk}
                    onChange={(e) => setConsentRisk(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-accent-sky bg-terminal-card border-terminal-border focus:ring-accent-sky"
                  />
                  <span className="leading-snug">
                    I understand that options & futures trading involves substantial financial risk and high capital volatility.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-terminal-panel border border-terminal-border cursor-pointer hover:border-accent-sky transition">
                  <input
                    type="checkbox"
                    checked={consentNoGuarantee}
                    onChange={(e) => setConsentNoGuarantee(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-accent-sky bg-terminal-card border-terminal-border focus:ring-accent-sky"
                  />
                  <span className="leading-snug">
                    I acknowledge that Fayda provides algorithmic and analytics tools for educational and informational purposes, with no guaranteed profits or investment advice.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-terminal-panel border border-terminal-border cursor-pointer hover:border-accent-sky transition">
                  <input
                    type="checkbox"
                    checked={consentTerms}
                    onChange={(e) => setConsentTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-accent-sky bg-terminal-card border-terminal-border focus:ring-accent-sky"
                  />
                  <span className="leading-snug">
                    I agree to the Fayda Terminal <strong>Terms of Service</strong> and <strong>Privacy Policy</strong>.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-terminal-panel border border-terminal-border cursor-pointer hover:border-accent-sky transition">
                  <input
                    type="checkbox"
                    checked={consentAge}
                    onChange={(e) => setConsentAge(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-accent-sky bg-terminal-card border-terminal-border focus:ring-accent-sky"
                  />
                  <span className="leading-snug">
                    I confirm that I am at least 18 years of age and authorized to trade in Indian financial markets.
                  </span>
                </label>
              </div>

              {/* Accept & Continue Button */}
              <button
                type="button"
                onClick={handleAcceptFirstLoginConsent}
                className="w-full py-2.5 px-4 rounded-2xl bg-accent-sky hover:bg-accent-sky-glow text-white text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Accept SEBI Disclaimers & Continue to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 2: STREAMLINED SIGN-IN (SUBSEQUENT LOGINS) */}
          {/* ========================================================================= */}
          {screen === 'SIGN_IN' && (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              
              {/* Sign In Method Selector: Password vs Email OTP */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-terminal-panel border border-terminal-border text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setSignInMethod('PASSWORD'); setErrorMsg(''); }}
                  className={`py-1.5 rounded-xl transition text-center cursor-pointer ${
                    signInMethod === 'PASSWORD'
                      ? 'bg-accent-sky/20 text-accent-sky font-bold shadow-sm'
                      : 'text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 inline mr-1" />
                  Password
                </button>

                <button
                  type="button"
                  onClick={() => { setSignInMethod('EMAIL_OTP'); setErrorMsg(''); }}
                  className={`py-1.5 rounded-xl transition text-center cursor-pointer ${
                    signInMethod === 'EMAIL_OTP'
                      ? 'bg-accent-sky/20 text-accent-sky font-bold shadow-sm'
                      : 'text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 inline mr-1" />
                  Email OTP
                </button>
              </div>

              {/* Username / Email / Mobile Input */}
              <div>
                <label className="text-[11px] font-bold text-terminal-text block mb-1">
                  Username / Email ID / Mobile Number <span className="text-bear">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-terminal-muted" />
                  <input
                    type="text"
                    required
                    placeholder="Enter email (e.g. trader@example.com or admin)"
                    value={signInIdentifier}
                    onChange={(e) => setSignInIdentifier(e.target.value)}
                    className="w-full bg-terminal-panel border border-terminal-border rounded-xl pl-9 pr-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky font-sans"
                  />
                </div>
              </div>

              {/* Conditional Auth Method: Password or OTP */}
              {signInMethod === 'PASSWORD' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-terminal-text">
                      Password <span className="text-bear">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => { setScreen('FORGOT_PASSWORD'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="text-[11px] font-bold text-accent-sky hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-terminal-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      className="w-full bg-terminal-panel border border-terminal-border rounded-xl pl-9 pr-9 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-terminal-muted hover:text-terminal-text"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-terminal-text">
                      6-Digit Email OTP <span className="text-bear">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSendSignInOtp}
                      className="text-[11px] font-bold text-accent-sky hover:underline cursor-pointer"
                    >
                      {isSignInOtpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP (e.g. 123456)"
                    value={signInOtp}
                    onChange={(e) => setSignInOtp(e.target.value)}
                    className="w-full bg-terminal-panel border border-terminal-border rounded-xl px-3 py-2 text-xs font-mono text-center tracking-widest text-terminal-text focus:outline-none focus:border-accent-sky"
                  />
                </div>
              )}

              {/* Interactive Captcha Challenge */}
              <div className="p-3 rounded-2xl bg-terminal-panel border border-terminal-border space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-terminal-text flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>Security Captcha: What is {captchaNum1} + {captchaNum2}?</span>
                  </label>
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="p-1 text-terminal-muted hover:text-accent-cyan transition cursor-pointer"
                    title="Refresh Captcha Challenge"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-2 rounded-xl bg-terminal-card border border-terminal-border font-mono font-black text-sm text-accent-cyan tracking-wider select-none shrink-0">
                    {captchaNum1} + {captchaNum2} = ?
                  </div>
                  <input
                    type="number"
                    required
                    placeholder="Answer"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    className="flex-1 bg-terminal-card border border-terminal-border rounded-xl px-3 py-2 text-xs font-mono font-bold text-terminal-text focus:outline-none focus:border-accent-sky"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-2xl bg-accent-sky hover:bg-accent-sky-glow text-white text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Sign In to Terminal</span>
                  </>
                )}
              </button>

              {/* Switch to Register */}
              <div className="pt-2 text-center text-xs text-terminal-muted">
                <span>Don't have an institutional account? </span>
                <button
                  type="button"
                  onClick={() => { setScreen('SIGN_UP'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="font-bold text-accent-sky hover:underline cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 3: FORGOT PASSWORD RECOVERY WITH OTP */}
          {/* ========================================================================= */}
          {screen === 'FORGOT_PASSWORD' && (
            <div className="space-y-4">
              {!isForgotOtpSent ? (
                <form onSubmit={handleSendForgotOtp} className="space-y-3">
                  <p className="text-xs text-terminal-muted leading-relaxed">
                    Enter your registered Email ID or Mobile Number. We will send a 6-digit security OTP to verify your identity.
                  </p>

                  <div>
                    <label className="text-[11px] font-bold text-terminal-text block mb-1">
                      Email Address or Mobile <span className="text-bear">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-terminal-muted" />
                      <input
                        type="text"
                        required
                        placeholder="name@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full bg-terminal-panel border border-terminal-border rounded-xl pl-9 pr-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky font-sans"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-2xl bg-accent-sky hover:bg-accent-sky-glow text-white text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>Send Verification OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-terminal-text block mb-1">
                      Enter 6-Digit OTP <span className="text-bear">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="123456"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      className="w-full bg-terminal-panel border border-terminal-border rounded-xl px-3 py-2 text-xs font-mono text-center tracking-widest text-terminal-text focus:outline-none focus:border-accent-sky"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-terminal-text block mb-1">
                      New Password (min 6 characters) <span className="text-bear">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="New password"
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      className="w-full bg-terminal-panel border border-terminal-border rounded-xl px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-terminal-text block mb-1">
                      Confirm New Password <span className="text-bear">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Confirm new password"
                      value={forgotConfirmPass}
                      onChange={(e) => setForgotConfirmPass(e.target.value)}
                      className="w-full bg-terminal-panel border border-terminal-border rounded-xl px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-2xl bg-accent-sky hover:bg-accent-sky-glow text-white text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Reset Password & Sign In</span>
                  </button>
                </form>
              )}

              <div className="pt-2 text-center text-xs text-terminal-muted">
                <button
                  type="button"
                  onClick={() => { setScreen('SIGN_IN'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="font-bold text-accent-sky hover:underline cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 4: SIGN UP (NEW ACCOUNT) */}
          {/* ========================================================================= */}
          {screen === 'SIGN_UP' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-terminal-text block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arun Kumar"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  className="w-full bg-terminal-panel border border-terminal-border rounded-xl px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-terminal-text block mb-1">Email ID</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    className="w-full bg-terminal-panel border border-terminal-border rounded-xl px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-terminal-text block mb-1">Mobile (+91)</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={signUpMobile}
                    onChange={(e) => setSignUpMobile(e.target.value)}
                    className="w-full bg-terminal-panel border border-terminal-border rounded-xl px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-terminal-text block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className="w-full bg-terminal-panel border border-terminal-border rounded-xl px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-terminal-text block mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    className="w-full bg-terminal-panel border border-terminal-border rounded-xl px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-2xl bg-accent-sky hover:bg-accent-sky-glow text-white text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>Create Institutional Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center text-xs text-terminal-muted">
                <span>Already registered? </span>
                <button
                  type="button"
                  onClick={() => { setScreen('SIGN_IN'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="font-bold text-accent-sky hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 5: REGISTRATION OTP VERIFICATION */}
          {/* ========================================================================= */}
          {screen === 'OTP_VERIFY' && (
            <div className="space-y-4 text-center">
              <p className="text-xs text-terminal-muted">
                Please enter the 6-digit OTP code sent to your registered email/mobile.
              </p>

              <div className="flex justify-center gap-2 font-mono">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => otpInputRefs.current[idx] = el}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      const next = [...otpDigits];
                      next[idx] = val;
                      setOtpDigits(next);
                      if (val && idx < 5) {
                        otpInputRefs.current[idx + 1]?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
                        otpInputRefs.current[idx - 1]?.focus();
                      }
                    }}
                    className="w-10 h-12 bg-terminal-panel border border-terminal-border rounded-xl text-center text-lg font-bold text-terminal-text focus:outline-none focus:border-accent-sky"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={async () => {
                  const otp = otpDigits.join('');
                  const res = await verifyOtp(otp);
                  if (res.success) {
                    setSuccessMsg('Account verified! Welcome to Fayda Terminal.');
                    setTimeout(() => onClose(), 800);
                  } else {
                    setErrorMsg(res.error || 'Invalid OTP code.');
                  }
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-accent-sky hover:bg-accent-sky-glow text-white text-xs font-bold transition shadow-lg cursor-pointer"
              >
                Verify & Enter Terminal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
