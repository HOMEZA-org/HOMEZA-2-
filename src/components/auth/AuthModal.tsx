import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth, isAllowedRegistrationEmail } from '../../context/AuthContext';
import { PLATFORM_CONFIG } from '../../config/platform';
import { UserRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'LOGIN' | 'REGISTER_TENANT' | 'REGISTER_LANDLORD' | 'REGISTER_AGENT' | 'ADMIN_LOGIN' | 'EMAIL_VERIFICATION';
  initialEmail?: string;
  onSuccess?: () => void;
}

type ModalView暗 = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'ADMIN_LOGIN' | 'FORGOT_ADMIN_PASSWORD' | 'EMAIL_VERIFICATION';
type ModalView = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'ADMIN_LOGIN' | 'FORGOT_ADMIN_PASSWORD' | 'EMAIL_VERIFICATION';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'LOGIN',
  initialEmail = '',
  onSuccess,
}) => {
  const {
    loginWithEmailAndPassword,
    loginAsAdmin,
    registerTenant,
    registerLandlord,
    registerAgent,
    requestPasswordResetCode,
    completePasswordReset,
    verifyEmail,
    resendVerificationEmail,
    changeUnverifiedEmail,
  } = useAuth();

  // Mode: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'ADMIN_LOGIN' | 'FORGOT_ADMIN_PASSWORD' | 'EMAIL_VERIFICATION'
  const [view, setView] = useState<ModalView>(() => {
    if (initialMode === 'ADMIN_LOGIN') return 'ADMIN_LOGIN';
    if (initialMode === 'EMAIL_VERIFICATION') return 'EMAIL_VERIFICATION';
    if (
      initialMode === 'REGISTER_TENANT' ||
      initialMode === 'REGISTER_LANDLORD' ||
      initialMode === 'REGISTER_AGENT'
    ) {
      return 'REGISTER';
    }
    return 'LOGIN';
  });

  // Selected Role for Registration (Tenant, Landlord, Agent ONLY — strictly NO Admin)
  const [registerRole, setRegisterRole] = useState<'TENANT' | 'LANDLORD' | 'AGENT'>(() => {
    if (initialMode === 'REGISTER_LANDLORD') return 'LANDLORD';
    if (initialMode === 'REGISTER_AGENT') return 'AGENT';
    return 'TENANT';
  });

  // Selected Role for Login (Tenant, Landlord, Agent ONLY — strictly NO Admin)
  const [loginRole, setLoginRole] = useState<'TENANT' | 'LANDLORD' | 'AGENT'>('TENANT');

  // Password visibility
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [showResetNewPassword, setShowResetNewPassword] = useState<boolean>(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState<boolean>(false);

  // Normal Login state
  const [loginEmail, setLoginEmail] = useState(initialEmail);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin Login state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);

  // Registration Common Fields
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Role-Specific Optional Metadata
  const [tenantOccupation, setTenantOccupation] = useState('');
  const [landlordBusiness, setLandlordBusiness] = useState('');
  const [landlordIdType, setLandlordIdType] = useState('National Identification Number (NIN)');
  const [landlordIdNumber, setLandlordIdNumber] = useState('');
  const [agentAgencyName, setAgentAgencyName] = useState('');
  const [agentOperatingArea, setAgentOperatingArea] = useState('Uyo Urban / Shelter Afrique');
  const [agentCacNumber, setAgentCacNumber] = useState('');
  const [agentLicenseNumber, setAgentLicenseNumber] = useState('');
  const [agentBio, setAgentBio] = useState('');

  // Registration feedback state
  const [regError, setRegError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Normal User Password Reset State
  const [resetRole, setResetRole] = useState<'TENANT' | 'LANDLORD' | 'AGENT'>('TENANT');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetGeneratedCode, setResetGeneratedCode] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState<'REQUEST_CODE' | 'ENTER_NEW_PASSWORD' | 'SUCCESS'>('REQUEST_CODE');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Admin Password Reset State
  const [adminResetEmail, setAdminResetEmail] = useState('');
  const [adminResetCode, setAdminResetCode] = useState('');
  const [adminResetGeneratedCode, setAdminResetGeneratedCode] = useState<string | null>(null);
  const [adminResetNewPassword, setAdminResetNewPassword] = useState('');
  const [adminResetConfirmPassword, setAdminResetConfirmPassword] = useState('');
  const [adminResetStep, setAdminResetStep] = useState<'REQUEST_CODE' | 'ENTER_NEW_PASSWORD' | 'SUCCESS'>('REQUEST_CODE');
  const [adminResetError, setAdminResetError] = useState<string | null>(null);
  const [adminResetSuccessMsg, setAdminResetSuccessMsg] = useState<string | null>(null);

  // Email Verification State
  const [verifyEmailTarget, setVerifyEmailTarget] = useState(initialEmail);
  const [verifyUserIdTarget, setVerifyUserIdTarget] = useState('');
  const [verificationDigits, setVerificationDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationCooldown, setVerificationCooldown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [changeEmailError, setChangeEmailError] = useState<string | null>(null);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: any;
    if (verificationCooldown > 0) {
      timer = setInterval(() => {
        setVerificationCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [verificationCooldown]);

  if (!isOpen) return null;

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const email = loginEmail.trim().toLowerCase();
    if (!email) {
      setLoginError('Please enter your registered email address.');
      return;
    }

    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await loginWithEmailAndPassword(email, loginPassword, loginRole);
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else if (res.isUnverifiedEmail) {
        setVerifyEmailTarget(email);
        setVerifyUserIdTarget(res.userId || '');
        setVerificationDigits(['', '', '', '', '', '']);
        setVerificationError(null);
        setVerificationNotice('Your account requires email verification. We have dispatched a 6-digit code to ' + email + '.');
        setVerificationCooldown(60);
        setView('EMAIL_VERIFICATION');
      } else {
        setLoginError(res.message || 'Login failed. Please verify your credentials and selected role.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Admin Login submission
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    const email = adminEmail.trim().toLowerCase();
    if (!email || !adminPassword) {
      setAdminError('Please enter administrator credentials.');
      return;
    }

    setIsAdminLoggingIn(true);
    try {
      const res = await loginAsAdmin(email, adminPassword);
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setAdminError(res.message || 'Access denied. You are not authorized to access this area.');
      }
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  // Handle Registration submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    // Validation
    if (!regFullName.trim()) {
      setRegError('Please enter your full name.');
      return;
    }

    const email = regEmail.trim().toLowerCase();
    if (!email) {
      setRegError('Please enter your email address.');
      return;
    }

    if (!isAllowedRegistrationEmail(email)) {
      setRegError(
        'Registration is restricted to @gmail.com, @yahoo.com, @outlook.com, and @hotmail.com email addresses.'
      );
      return;
    }

    if (!regPhone.trim()) {
      setRegError('Please enter your phone number.');
      return;
    }

    if (regPassword.length < 8) {
      setRegError('Password must be at least 8 characters in length.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please verify.');
      return;
    }

    setIsRegistering(true);
    try {
      let res: { success: boolean; message?: string; needsEmailVerification?: boolean; userId?: string } = { success: false };

      if (registerRole === 'TENANT') {
        res = await registerTenant({
          fullName: regFullName.trim(),
          email,
          phoneNumber: regPhone.trim(),
          passwordPlain: regPassword,
          occupation: tenantOccupation.trim(),
        });
      } else if (registerRole === 'LANDLORD') {
        res = await registerLandlord({
          fullName: regFullName.trim(),
          email,
          phoneNumber: regPhone.trim(),
          passwordPlain: regPassword,
          businessName: landlordBusiness.trim(),
          idCardType: landlordIdType,
          idCardNumber: landlordIdNumber.trim(),
        });
      } else if (registerRole === 'AGENT') {
        res = await registerAgent({
          fullName: regFullName.trim(),
          email,
          phoneNumber: regPhone.trim(),
          passwordPlain: regPassword,
          agencyName: agentAgencyName.trim() || 'Independent Real Estate Intermediary',
          operatingArea: agentOperatingArea.trim(),
          cacNumber: agentCacNumber.trim(),
          licenseNumber: agentLicenseNumber.trim(),
          bio: agentBio.trim(),
        });
      }

      if (res.success) {
        if (res.needsEmailVerification) {
          setVerifyEmailTarget(email);
          setVerifyUserIdTarget(res.userId || '');
          setVerificationDigits(['', '', '', '', '', '']);
          setVerificationError(null);
          setVerificationNotice(`Account created! We've sent a 6-digit verification code to ${email}. Please enter it below to activate your account.`);
          setVerificationCooldown(60);
          setView('EMAIL_VERIFICATION');
        } else {
          if (onSuccess) onSuccess();
          onClose();
        }
      } else {
        setRegError(res.message || 'Registration failed.');
      }
    } catch (err: any) {
      setRegError(err?.message || "We couldn't verify your email availability right now. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  // Verification Input Handlers
  const handleDigitChange = (index: number, val: string) => {
    if (val.length > 1) {
      const sanitized = val.replace(/[^0-9]/g, '').slice(0, 6);
      if (sanitized) {
        const newDigits = [...verificationDigits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = sanitized[i] || '';
        }
        setVerificationDigits(newDigits);
        const nextFocus = Math.min(sanitized.length, 5);
        digitInputRefs.current[nextFocus]?.focus();
        return;
      }
    }

    const singleDigit = val.replace(/[^0-9]/g, '');
    const newDigits = [...verificationDigits];
    newDigits[index] = singleDigit;
    setVerificationDigits(newDigits);

    if (singleDigit && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = verificationDigits.join('');
    if (code.length !== 6) {
      setVerificationError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);
    try {
      const res = await verifyEmail(code, verifyEmailTarget);
      if (res.success) {
        setVerificationSuccess(true);
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1500);
      } else {
        setVerificationError(res.message || 'Invalid verification code. Please check and try again.');
      }
    } catch (err: any) {
      setVerificationError('Failed to verify code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerificationCode = async () => {
    if (verificationCooldown > 0 || isResending) return;
    setIsResending(true);
    setVerificationError(null);
    try {
      const res = await resendVerificationEmail(verifyEmailTarget, verifyUserIdTarget);
      if (res.success) {
        setVerificationCooldown(60);
        setVerificationNotice(`A fresh verification code was sent to ${verifyEmailTarget}.`);
      } else {
        setVerificationError(res.message || 'Could not resend code. Please try again.');
      }
    } catch (err) {
      setVerificationError('Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSaveChangedEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeEmailError(null);
    const clean = newEmailInput.trim().toLowerCase();
    if (!clean) {
      setChangeEmailError('Please enter a valid email address.');
      return;
    }
    if (!isAllowedRegistrationEmail(clean)) {
      setChangeEmailError('Registration is restricted to @gmail.com, @yahoo.com, @outlook.com, and @hotmail.com domains.');
      return;
    }
    if (clean === verifyEmailTarget.toLowerCase()) {
      setIsChangingEmail(false);
      return;
    }

    setIsSavingEmail(true);
    try {
      const res = await changeUnverifiedEmail(clean, verifyEmailTarget, verifyUserIdTarget);
      if (res.success) {
        setVerifyEmailTarget(clean);
        setIsChangingEmail(false);
        setVerificationCooldown(60);
        setVerificationNotice(`Email updated to ${clean}. A new verification code has been dispatched.`);
        setVerificationDigits(['', '', '', '', '', '']);
      } else {
        setChangeEmailError(res.message || 'Could not update email address.');
      }
    } catch (err) {
      setChangeEmailError('Failed to update email.');
    } finally {
      setIsSavingEmail(false);
    }
  };

  // Normal User Password Reset: Request Code
  const handleRequestUserResetCode = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    const email = resetEmail.trim().toLowerCase();
    if (!email) {
      setResetError('Please enter your registered email address.');
      return;
    }

    const res = requestPasswordResetCode(email, resetRole);
    if (res.success) {
      setResetCode('');
      setResetStep('ENTER_NEW_PASSWORD');
    } else {
      setResetError(res.message || 'No registered account was found with this email.');
    }
  };

  // Normal User Password Reset: Submit New Password
  const handleCompleteUserResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (!resetCode.trim()) {
      setResetError('Please enter the 6-digit recovery code.');
      return;
    }

    if (resetNewPassword.length < 8) {
      setResetError('New password must be at least 8 characters in length.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setIsResetting(true);
    try {
      const res = completePasswordReset(
        resetEmail.trim().toLowerCase(),
        resetCode.trim(),
        resetNewPassword,
        resetRole
      );

      if (res.success) {
        setResetSuccessMsg(res.message || 'Password successfully updated.');
        setResetStep('SUCCESS');
        setLoginEmail(resetEmail.trim());
        setLoginRole(resetRole);
      } else {
        setResetError(res.message || 'Failed to update password.');
      }
    } finally {
      setIsResetting(false);
    }
  };

  // Admin Password Reset: Request Code
  const handleRequestAdminResetCode = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminResetError(null);

    const email = adminResetEmail.trim().toLowerCase();
    if (!email) {
      setAdminResetError('Please enter the administrator email address.');
      return;
    }

    const res = requestPasswordResetCode(email, 'ADMIN');
    if (res.success) {
      setAdminResetCode('');
      setAdminResetStep('ENTER_NEW_PASSWORD');
    } else {
      setAdminResetError(res.message || 'Administrator account not found with this email.');
    }
  };

  // Admin Password Reset: Submit New Admin Password
  const handleCompleteAdminResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminResetError(null);

    if (!adminResetCode.trim()) {
      setAdminResetError('Please enter the 6-digit recovery code.');
      return;
    }

    if (adminResetNewPassword.length < 8) {
      setAdminResetError('Admin password must be at least 8 characters in length.');
      return;
    }

    if (adminResetNewPassword !== adminResetConfirmPassword) {
      setAdminResetError('Passwords do not match.');
      return;
    }

    const res = completePasswordReset(
      adminResetEmail.trim().toLowerCase(),
      adminResetCode.trim(),
      adminResetNewPassword,
      'ADMIN'
    );

    if (res.success) {
      setAdminResetSuccessMsg('Admin security password updated successfully.');
      setAdminResetStep('SUCCESS');
      setAdminEmail(adminResetEmail.trim());
    } else {
      setAdminResetError(res.message || 'Failed to update admin password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div
        id="auth-modal-dialog"
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
                view === 'ADMIN_LOGIN' || view === 'FORGOT_ADMIN_PASSWORD'
                  ? 'bg-red-700 text-white'
                  : 'bg-emerald-700 text-white'
              }`}
            >
              {view === 'ADMIN_LOGIN' || view === 'FORGOT_ADMIN_PASSWORD' ? (
                <KeyRound className="w-5 h-5" />
              ) : (
                <Building2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-1.5">
                {view === 'ADMIN_LOGIN'
                  ? 'Administrator Access Portal'
                  : view === 'FORGOT_ADMIN_PASSWORD'
                  ? 'Admin Password Recovery'
                  : view === 'FORGOT_PASSWORD'
                  ? 'Account Password Recovery'
                  : view === 'EMAIL_VERIFICATION'
                  ? 'Verify Your Email Address'
                  : view === 'LOGIN'
                  ? `Sign in to ${PLATFORM_CONFIG.appName}`
                  : 'Create Your HOMEZA Account'}
              </h2>
              <p className="text-xs text-stone-500 font-medium">{PLATFORM_CONFIG.tagline}</p>
            </div>
          </div>
          <button
            id="btn-close-auth-modal"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary View Switcher (Sign In vs Register) — Strictly Public Views */}
        {view !== 'ADMIN_LOGIN' && view !== 'FORGOT_ADMIN_PASSWORD' && view !== 'FORGOT_PASSWORD' && view !== 'EMAIL_VERIFICATION' && (
          <div className="flex border-b border-stone-200 bg-stone-50 text-xs font-semibold">
            <button
              id="tab-auth-login"
              type="button"
              onClick={() => {
                setView('LOGIN');
                setLoginError(null);
                setRegError(null);
              }}
              className={`flex-1 py-3 text-center transition border-b-2 font-bold cursor-pointer ${
                view === 'LOGIN'
                  ? 'border-emerald-700 text-emerald-800 bg-white'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-auth-register"
              type="button"
              onClick={() => {
                setView('REGISTER');
                setLoginError(null);
                setRegError(null);
              }}
              className={`flex-1 py-3 text-center transition border-b-2 font-bold cursor-pointer ${
                view === 'REGISTER'
                  ? 'border-emerald-700 text-emerald-800 bg-white'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-5">
          {/* VIEW: LOGIN */}
          {view === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Role Selection Tabs */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
                  Select Your Account Role
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold">
                  {(['TENANT', 'LANDLORD', 'AGENT'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      id={`modal-tab-${r.toLowerCase()}`}
                      onClick={() => {
                        setLoginRole(r);
                        setLoginError(null);
                      }}
                      className={`py-2 px-2 rounded-lg transition-all text-center cursor-pointer ${
                        loginRole === r
                          ? 'bg-emerald-700 text-white shadow-xs font-bold'
                          : 'text-stone-600 hover:bg-stone-200/80 hover:text-stone-900'
                      }`}
                    >
                      {r === 'TENANT' ? 'Tenant' : r === 'LANDLORD' ? 'Landlord' : 'Agent'}
                    </button>
                  ))}
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    id="modal-login-email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. yourname@gmail.com"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-700">Password</label>
                  <button
                    type="button"
                    id="modal-btn-forgot-password"
                    onClick={() => {
                      setResetRole(loginRole);
                      setResetEmail(loginEmail);
                      setResetStep('REQUEST_CODE');
                      setResetError(null);
                      setView('FORGOT_PASSWORD');
                    }}
                    className="text-xs text-emerald-700 hover:text-emerald-800 hover:underline font-semibold cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="modal-login-password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="modal-submit-login-btn"
                disabled={isLoggingIn}
                className="w-full py-3 px-5 rounded-xl font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? <span>Signing In...</span> : <span>Sign In as {loginRole}</span>}
              </button>
            </form>
          )}

          {/* VIEW: REGISTER */}
          {view === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Choose Role (NO ADMIN) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
                  Register as
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold">
                  {(['TENANT', 'LANDLORD', 'AGENT'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      id={`modal-reg-tab-${r.toLowerCase()}`}
                      onClick={() => {
                        setRegisterRole(r);
                        setRegError(null);
                      }}
                      className={`py-2 px-2 rounded-lg transition-all text-center cursor-pointer ${
                        registerRole === r
                          ? 'bg-emerald-700 text-white shadow-xs font-bold'
                          : 'text-stone-600 hover:bg-stone-200/80 hover:text-stone-900'
                      }`}
                    >
                      {r === 'TENANT' ? 'Tenant' : r === 'LANDLORD' ? 'Landlord' : 'Agent'}
                    </button>
                  ))}
                </div>
              </div>

              {regError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span>{regError}</span>
                  </div>
                  {regError.toLowerCase().includes('already exists') && (
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail(regEmail.trim().toLowerCase());
                        setLoginRole(registerRole);
                        setView('LOGIN');
                      }}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg whitespace-nowrap text-[11px] transition-colors"
                    >
                      Sign In Instead
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Full Legal Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    id="modal-reg-name"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Samuel Umoh"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Email Address (@gmail, @yahoo, @outlook, @hotmail) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    id="modal-reg-email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. samuel@gmail.com"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    id="modal-reg-phone"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Password (Min 8 chars) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="modal-reg-password"
                      required
                      minLength={8}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 8 chars"
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="modal-reg-confirm-password"
                      required
                      minLength={8}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {registerRole === 'TENANT' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Occupation (Optional)
                  </label>
                  <input
                    type="text"
                    id="modal-reg-occupation"
                    value={tenantOccupation}
                    onChange={(e) => setTenantOccupation(e.target.value)}
                    placeholder="e.g. Civil Servant, Engineer"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              {registerRole === 'LANDLORD' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Business / Property Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="modal-reg-business"
                    value={landlordBusiness}
                    onChange={(e) => setLandlordBusiness(e.target.value)}
                    placeholder="e.g. Akpan Heritage Estates"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              {registerRole === 'AGENT' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Agency Name</label>
                    <input
                      type="text"
                      id="modal-reg-agency"
                      value={agentAgencyName}
                      onChange={(e) => setAgentAgencyName(e.target.value)}
                      placeholder="e.g. Prime Uyo Realty"
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Operating Area</label>
                    <input
                      type="text"
                      id="modal-reg-area"
                      value={agentOperatingArea}
                      onChange={(e) => setAgentOperatingArea(e.target.value)}
                      placeholder="e.g. Shelter Afrique"
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                id="modal-submit-register-btn"
                disabled={isRegistering}
                className="w-full py-3 px-5 rounded-xl font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRegistering ? <span>Creating Account...</span> : <span>Complete Registration</span>}
              </button>
            </form>
          )}

          {/* VIEW: FORGOT PASSWORD (NORMAL USER) */}
          {view === 'FORGOT_PASSWORD' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-1">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-stone-900">Reset Your Password</h3>
                <p className="text-xs text-stone-500">
                  Recover access to your {resetRole.toLowerCase()} account.
                </p>
              </div>

              {/* Role Indicator */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold">
                {(['TENANT', 'LANDLORD', 'AGENT'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setResetRole(r);
                      setResetError(null);
                    }}
                    className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                      resetRole === r
                        ? 'bg-emerald-700 text-white font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {r === 'TENANT' ? 'Tenant' : r === 'LANDLORD' ? 'Landlord' : 'Agent'}
                  </button>
                ))}
              </div>

              {resetError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetStep === 'REQUEST_CODE' && (
                <form onSubmit={handleRequestUserResetCode} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Enter Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        id="modal-reset-email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="e.g. myemail@gmail.com"
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="modal-btn-request-reset-code"
                    className="w-full py-3 px-5 rounded-xl font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition-all cursor-pointer"
                  >
                    Request Recovery Code
                  </button>
                </form>
              )}

              {resetStep === 'ENTER_NEW_PASSWORD' && (
                <form onSubmit={handleCompleteUserResetPassword} className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Recovery Code Dispatched
                    </p>
                    <p className="text-[11px] text-stone-600">
                      We've sent a 6-digit verification code to <span className="font-semibold text-stone-900">{resetEmail}</span>. Please check your inbox and spam folder.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      6-Digit Recovery Verification Code
                    </label>
                    <input
                      type="text"
                      id="modal-reset-code"
                      required
                      maxLength={6}
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-sm text-stone-900 font-mono tracking-widest text-center placeholder-stone-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      New Password (Min 8 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                      <input
                        type={showResetNewPassword ? 'text' : 'password'}
                        id="modal-reset-new-password"
                        required
                        minLength={8}
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                        className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                      <input
                        type={showResetConfirmPassword ? 'text' : 'password'}
                        id="modal-reset-confirm-password"
                        required
                        minLength={8}
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                        className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="modal-btn-submit-reset-password"
                    disabled={isResetting}
                    className="w-full py-3 px-5 rounded-xl font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isResetting ? <span>Saving...</span> : <span>Update Password</span>}
                  </button>
                </form>
              )}

              {resetStep === 'SUCCESS' && (
                <div className="text-center space-y-3 py-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-stone-900">Password Reset Successful!</h4>
                    <p className="text-xs text-stone-600">
                      {resetSuccessMsg || 'You can now sign in with your new credentials.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setView('LOGIN');
                      setLoginEmail(resetEmail);
                      setLoginRole(resetRole);
                      setLoginError(null);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl font-bold bg-emerald-700 hover:bg-emerald-800 text-white text-xs transition cursor-pointer"
                  >
                    Proceed to Sign In
                  </button>
                </div>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setView('LOGIN');
                    setLoginError(null);
                  }}
                  className="text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          )}

          {/* VIEW: ADMIN LOGIN */}
          {view === 'ADMIN_LOGIN' && (
            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                <p className="font-bold flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-red-600" />
                  Platform Administrator Console
                </p>
                <p className="text-[11px] text-stone-600 mt-0.5">
                  This portal is strictly restricted to authenticated platform supervisors.
                </p>
              </div>

              {adminError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{adminError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    id="modal-admin-email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@homeza.ng"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-700">Security Password</label>
                  <button
                    type="button"
                    id="modal-btn-forgot-admin-password"
                    onClick={() => {
                      setAdminResetEmail(adminEmail);
                      setAdminResetStep('REQUEST_CODE');
                      setAdminResetError(null);
                      setView('FORGOT_ADMIN_PASSWORD');
                    }}
                    className="text-xs text-red-700 hover:text-red-800 hover:underline font-semibold cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="modal-admin-password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Admin password"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-red-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="modal-submit-admin-btn"
                disabled={isAdminLoggingIn}
                className="w-full py-3 px-5 rounded-xl font-bold bg-red-700 hover:bg-red-800 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAdminLoggingIn ? <span>Verifying...</span> : <span>Access Admin Console</span>}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setView('LOGIN');
                    setAdminError(null);
                  }}
                  className="text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Return to Public Sign In
                </button>
              </div>
            </form>
          )}

          {/* VIEW: FORGOT ADMIN PASSWORD */}
          {view === 'FORGOT_ADMIN_PASSWORD' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center mx-auto mb-1">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-stone-900">Administrator Password Recovery</h3>
                <p className="text-xs text-stone-500">
                  Recover supervisor console credentials.
                </p>
              </div>

              {adminResetError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{adminResetError}</span>
                </div>
              )}

              {adminResetStep === 'REQUEST_CODE' && (
                <form onSubmit={handleRequestAdminResetCode} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Administrator Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        id="modal-admin-reset-email"
                        required
                        value={adminResetEmail}
                        onChange={(e) => setAdminResetEmail(e.target.value)}
                        placeholder="admin@homeza.ng"
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-red-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-5 rounded-xl font-bold bg-red-700 hover:bg-red-800 text-white shadow-md transition-all cursor-pointer"
                  >
                    Request Admin Recovery Code
                  </button>
                </form>
              )}

              {adminResetStep === 'ENTER_NEW_PASSWORD' && (
                <form onSubmit={handleCompleteAdminResetPassword} className="space-y-3">
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-red-600" />
                      Admin Recovery Code Dispatched
                    </p>
                    <p className="text-[11px] text-stone-600">
                      We've sent a 6-digit security code to <span className="font-semibold text-stone-900">{adminResetEmail}</span>. Please check your inbox and spam folder.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      6-Digit Admin Verification Code
                    </label>
                    <input
                      type="text"
                      id="modal-admin-reset-code"
                      required
                      maxLength={6}
                      value={adminResetCode}
                      onChange={(e) => setAdminResetCode(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-sm text-stone-900 font-mono tracking-widest text-center placeholder-stone-400 focus:bg-white focus:outline-none focus:border-red-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      New Admin Password (Min 8 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                      <input
                        type={showResetNewPassword ? 'text' : 'password'}
                        id="modal-admin-reset-new-password"
                        required
                        minLength={8}
                        value={adminResetNewPassword}
                        onChange={(e) => setAdminResetNewPassword(e.target.value)}
                        placeholder="Enter new admin password"
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-red-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                        className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Confirm New Admin Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                      <input
                        type={showResetConfirmPassword ? 'text' : 'password'}
                        id="modal-admin-reset-confirm-password"
                        required
                        minLength={8}
                        value={adminResetConfirmPassword}
                        onChange={(e) => setAdminResetConfirmPassword(e.target.value)}
                        placeholder="Repeat new admin password"
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-red-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                        className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-5 rounded-xl font-bold bg-red-700 hover:bg-red-800 text-white shadow-md transition-all cursor-pointer"
                  >
                    Save New Admin Password
                  </button>
                </form>
              )}

              {adminResetStep === 'SUCCESS' && (
                <div className="text-center space-y-3 py-2">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-stone-900">Admin Password Updated</h4>
                    <p className="text-xs text-stone-600">
                      {adminResetSuccessMsg || 'You can now sign in with your updated administrator password.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setView('ADMIN_LOGIN');
                      setAdminEmail(adminResetEmail);
                      setAdminError(null);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl font-bold bg-red-700 hover:bg-red-800 text-white text-xs transition cursor-pointer"
                  >
                    Proceed to Admin Sign In
                  </button>
                </div>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setView('ADMIN_LOGIN');
                    setAdminError(null);
                  }}
                  className="text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Return to Admin Sign In
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW: EMAIL VERIFICATION                                     */}
          {/* ============================================================ */}
          {view === 'EMAIL_VERIFICATION' && (
            <div id="view-email-verification" className="space-y-5 animate-fadeIn">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs border border-emerald-200">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-stone-900">Enter Verification Code</h3>
                <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                  We sent a 6-digit security code to{' '}
                  <span className="font-bold text-stone-900">{verifyEmailTarget}</span>. Please enter it below to activate your account.
                </p>
              </div>

              {/* Status / Success / Error Alerts */}
              {verificationNotice && !verificationError && !verificationSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{verificationNotice}</span>
                </div>
              )}

              {verificationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{verificationError}</span>
                </div>
              )}

              {verificationSuccess ? (
                <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-xl text-center space-y-2 animate-fadeIn">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-950">Email Verified Successfully!</h4>
                  <p className="text-xs text-emerald-800">Signing you in and loading your HOMEZA experience...</p>
                </div>
              ) : (
                <>
                  {!isChangingEmail ? (
                    <form onSubmit={handleVerificationSubmit} className="space-y-5">
                      {/* 6 Digit Inputs */}
                      <div>
                        <label className="block text-center text-xs font-bold text-stone-700 mb-2">
                          6-Digit Verification Code
                        </label>
                        <div className="flex justify-center items-center gap-2 sm:gap-2.5">
                          {verificationDigits.map((digit, index) => (
                            <input
                              key={index}
                              ref={(el) => { digitInputRefs.current[index] = el; }}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={6}
                              value={digit}
                              onChange={(e) => handleDigitChange(index, e.target.value)}
                              onKeyDown={(e) => handleDigitKeyDown(index, e)}
                              className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold bg-stone-50 border-2 border-stone-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 text-stone-900 transition-all shadow-xs"
                              disabled={isVerifying}
                              autoFocus={index === 0}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Submit button */}
                      <button
                        type="submit"
                        disabled={isVerifying || verificationDigits.join('').length !== 6}
                        className="w-full py-3 px-5 rounded-xl font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isVerifying ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Verifying code...</span>
                          </>
                        ) : (
                          <>
                            <span>Verify Email & Continue</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      {/* Options: Resend code & Change Email */}
                      <div className="pt-2 flex flex-col items-center gap-2.5 text-xs">
                        <button
                          type="button"
                          disabled={verificationCooldown > 0 || isResending}
                          onClick={handleResendVerificationCode}
                          className="text-stone-600 hover:text-emerald-700 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                          <span>
                            {verificationCooldown > 0
                              ? `Resend code in ${verificationCooldown}s`
                              : isResending
                              ? 'Sending fresh code...'
                              : 'Didn’t receive a code? Resend'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingEmail(true);
                            setNewEmailInput(verifyEmailTarget);
                            setChangeEmailError(null);
                          }}
                          className="text-stone-500 hover:text-stone-800 cursor-pointer flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Incorrect email address? Change email</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Change Email Sub-Form */
                    <form onSubmit={handleSaveChangedEmail} className="space-y-4 p-4 bg-stone-50 rounded-xl border border-stone-200 animate-fadeIn">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Update Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                          <input
                            type="email"
                            required
                            value={newEmailInput}
                            onChange={(e) => setNewEmailInput(e.target.value)}
                            placeholder="e.g. name@gmail.com"
                            className="w-full bg-white border border-stone-300 rounded-xl pl-10 pr-4 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1">
                          Allowed: @gmail.com, @yahoo.com, @outlook.com, @hotmail.com
                        </p>
                      </div>

                      {changeEmailError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                          <span>{changeEmailError}</span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsChangingEmail(false)}
                          className="flex-1 py-2 px-3 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingEmail}
                          className="flex-1 py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isSavingEmail ? 'Updating...' : 'Save & Send Code'}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="pt-2 text-center border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => {
                        setView('LOGIN');
                        setLoginError(null);
                        setRegError(null);
                        setVerificationError(null);
                      }}
                      className="text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                    >
                      Return to Sign In
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Link for Admin Portal */}
        {view !== 'ADMIN_LOGIN' && view !== 'FORGOT_ADMIN_PASSWORD' && (
          <div className="p-3 bg-stone-100 border-t border-stone-200 text-center text-xs text-stone-500 flex items-center justify-center gap-1.5">
            <span>Platform Supervisor?</span>
            <button
              type="button"
              id="modal-admin-portal-link"
              onClick={() => {
                setView('ADMIN_LOGIN');
                setAdminError(null);
              }}
              className="text-stone-600 hover:text-red-700 font-semibold cursor-pointer underline flex items-center gap-1"
            >
              <KeyRound className="w-3 h-3" />
              <span>Admin Portal</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
