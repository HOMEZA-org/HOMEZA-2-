import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Home,
  KeyRound,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth, isAllowedRegistrationEmail } from '../../context/AuthContext';
import { EmailVerificationModal } from './EmailVerificationModal';
import { UserRole } from '../../types';

interface AuthGateProps {
  onSuccess?: (role: UserRole) => void;
  initialView?: 'WELCOME' | 'CREATE_ACCOUNT' | 'SIGN_IN' | 'ADMIN_LOGIN';
  redirectReason?: string;
}

type GateView =
  | 'WELCOME'
  | 'CHOOSE_ROLE'
  | 'REGISTER_FORM'
  | 'SIGN_IN'
  | 'FORGOT_PASSWORD'
  | 'ADMIN_LOGIN'
  | 'FORGOT_ADMIN_PASSWORD';

export const AuthGate: React.FC<AuthGateProps> = ({
  onSuccess,
  initialView = 'WELCOME',
  redirectReason,
}) => {
  const {
    loginWithEmailAndPassword,
    loginAsAdmin,
    registerTenant,
    registerLandlord,
    registerAgent,
    requestPasswordResetCode,
    completePasswordReset,
  } = useAuth();

  // Screen View state
  const [view, setView] = useState<GateView>(() => {
    if (initialView === 'CREATE_ACCOUNT') return 'CHOOSE_ROLE';
    if (initialView === 'SIGN_IN') return 'SIGN_IN';
    if (initialView === 'ADMIN_LOGIN') return 'ADMIN_LOGIN';
    return 'WELCOME';
  });

  // Selected Role for Registration (Tenant, Landlord, Agent ONLY — strictly NO Admin)
  const [selectedRole, setSelectedRole] = useState<'TENANT' | 'LANDLORD' | 'AGENT'>('TENANT');

  // Selected Role for Sign In (Tenant, Landlord, Agent ONLY — strictly NO Admin)
  const [signInRole, setSignInRole] = useState<'TENANT' | 'LANDLORD' | 'AGENT'>('TENANT');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Admin Login State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);

  // Registration Form State
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

  // Registration Feedback
  const [regError, setRegError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyEmailTarget, setVerifyEmailTarget] = useState('');
  const [verifyUserIdTarget, setVerifyUserIdTarget] = useState('');

  // Password Reset / Recovery State (for User & Admin)
  const [resetRole, setResetRole] = useState<'TENANT' | 'LANDLORD' | 'AGENT'>('TENANT');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetGeneratedCode, setResetGeneratedCode] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState<'REQUEST_CODE' | 'ENTER_NEW_PASSWORD' | 'SUCCESS'>('REQUEST_CODE');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Admin Password Reset State
  const [adminResetEmail, setAdminResetEmail] = useState('');
  const [adminResetCode, setAdminResetCode] = useState('');
  const [adminResetGeneratedCode, setAdminResetGeneratedCode] = useState<string | null>(null);
  const [adminResetNewPassword, setAdminResetNewPassword] = useState('');
  const [adminResetConfirmPassword, setAdminResetConfirmPassword] = useState('');
  const [adminResetStep, setAdminResetStep] = useState<'REQUEST_CODE' | 'ENTER_NEW_PASSWORD' | 'SUCCESS'>('REQUEST_CODE');
  const [adminResetError, setAdminResetError] = useState<string | null>(null);
  const [adminResetSuccessMsg, setAdminResetSuccessMsg] = useState<string | null>(null);

  // Handle Returning User Login with Strict Role Checking
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);

    const email = signInEmail.trim().toLowerCase();
    const password = signInPassword;

    if (!email) {
      setSignInError('Please enter your registered email address.');
      return;
    }

    if (!password) {
      setSignInError('Please enter your account password.');
      return;
    }

    setIsSigningIn(true);
    try {
      const res = await loginWithEmailAndPassword(email, password, signInRole);
      if (res.success) {
        if (onSuccess) onSuccess(signInRole);
      } else {
        setSignInError(res.message || 'Authentication failed. Please verify your credentials and selected role.');
      }
    } catch (err: any) {
      setSignInError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle Dedicated Admin Portal Login
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    const email = adminEmail.trim().toLowerCase();
    const password = adminPassword;

    if (!email || !password) {
      setAdminError('Administrator email and security password are required.');
      return;
    }

    setIsAdminLoggingIn(true);
    try {
      const res = await loginAsAdmin(email, password);
      if (res.success) {
        if (onSuccess) onSuccess('ADMIN');
      } else {
        setAdminError(res.message || 'Access denied. You are not authorized to access this area.');
      }
    } catch (err: any) {
      setAdminError(err.message || 'Access denied. Administrator authentication failed.');
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  // Handle Registration Submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    // Validation
    if (!regFullName.trim()) {
      setRegError('Please enter your full legal name.');
      return;
    }

    const email = regEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setRegError('Please enter a valid email address.');
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
      setRegError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setIsRegistering(true);

    try {
      let result: { success: boolean; message?: string; needsEmailVerification?: boolean; userId?: string } = { success: false };

      if (selectedRole === 'TENANT') {
        result = await registerTenant({
          fullName: regFullName.trim(),
          email,
          phoneNumber: regPhone.trim(),
          passwordPlain: regPassword,
          occupation: tenantOccupation.trim() || undefined,
        });
      } else if (selectedRole === 'LANDLORD') {
        result = await registerLandlord({
          fullName: regFullName.trim(),
          email,
          phoneNumber: regPhone.trim(),
          passwordPlain: regPassword,
          businessName: landlordBusiness.trim() || undefined,
          idCardType: landlordIdType,
          idCardNumber: landlordIdNumber.trim() || undefined,
        });
      } else if (selectedRole === 'AGENT') {
        result = await registerAgent({
          fullName: regFullName.trim(),
          email,
          phoneNumber: regPhone.trim(),
          passwordPlain: regPassword,
          agencyName: agentAgencyName.trim() || undefined,
          operatingArea: agentOperatingArea.trim() || undefined,
          cacNumber: agentCacNumber.trim() || undefined,
          licenseNumber: agentLicenseNumber.trim() || undefined,
          bio: agentBio.trim() || undefined,
        });
      }

      if (result.success) {
        if (result.needsEmailVerification) {
          setVerifyEmailTarget(email);
          setVerifyUserIdTarget(result.userId || '');
          setVerifyModalOpen(true);
        } else {
          if (onSuccess) onSuccess(selectedRole);
        }
      } else {
        setRegError(result.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setRegError(err?.message || "We couldn't verify your email availability right now. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  // Normal User Password Reset: Step 1 -> Request Code
  const handleRequestUserResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    const email = resetEmail.trim().toLowerCase();
    if (!email) {
      setResetError('Please enter your registered email address.');
      return;
    }

    setIsRequestingReset(true);
    try {
      const res = requestPasswordResetCode(email, resetRole);
      if (res.success) {
        setResetCode('');
        setResetStep('ENTER_NEW_PASSWORD');
      } else {
        setResetError(res.message || 'No matching account was found for this role and email.');
      }
    } catch (err: any) {
      setResetError(err.message || 'Unable to generate password reset request.');
    } finally {
      setIsRequestingReset(false);
    }
  };

  // Normal User Password Reset: Step 2 -> Submit New Password
  const handleCompleteUserResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (!resetCode.trim()) {
      setResetError('Please enter the 6-digit recovery verification code.');
      return;
    }

    if (resetNewPassword.length < 8) {
      setResetError('New password must be at least 8 characters in length.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match. Please verify.');
      return;
    }

    setIsResettingPassword(true);
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
        // Preload the sign-in form with the reset email
        setSignInEmail(resetEmail.trim());
        setSignInRole(resetRole);
      } else {
        setResetError(res.message || 'Failed to reset password. Please verify the code.');
      }
    } catch (err: any) {
      setResetError(err.message || 'An error occurred while updating your password.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Admin Password Reset: Step 1 -> Request Code
  const handleRequestAdminResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminResetError(null);

    const email = adminResetEmail.trim().toLowerCase();
    if (!email) {
      setAdminResetError('Please enter the administrator email address.');
      return;
    }

    try {
      const res = requestPasswordResetCode(email, 'ADMIN');
      if (res.success) {
        setAdminResetCode('');
        setAdminResetStep('ENTER_NEW_PASSWORD');
      } else {
        setAdminResetError(res.message || 'Administrator account not found with this email.');
      }
    } catch (err: any) {
      setAdminResetError(err.message || 'Failed to initiate admin password recovery.');
    }
  };

  // Admin Password Reset: Step 2 -> Submit New Admin Password
  const handleCompleteAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminResetError(null);

    if (!adminResetCode.trim()) {
      setAdminResetError('Please enter the 6-digit recovery verification code.');
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

    try {
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
    } catch (err: any) {
      setAdminResetError(err.message || 'Error occurred while resetting admin password.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-between selection:bg-emerald-600 selection:text-white">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="relative z-10 w-full border-b border-stone-800 bg-stone-950/80 backdrop-blur-md px-4 py-3 sm:px-8 flex items-center justify-between">
        <div
          onClick={() => setView('WELCOME')}
          className="flex items-center space-x-3 cursor-pointer group"
          id="homeza-brand-logo"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40 group-hover:bg-emerald-500 transition-colors">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black tracking-tight text-white font-serif">HOMEZA</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Verified Homes
              </span>
            </div>
            <p className="text-xs text-stone-400 hidden sm:block">Uyo Metropolitan Real Estate Platform</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {view !== 'SIGN_IN' && (
            <button
              id="header-sign-in-btn"
              onClick={() => {
                setView('SIGN_IN');
                setSignInError(null);
              }}
              className="px-3.5 py-2 text-sm font-medium text-stone-300 hover:text-white hover:bg-stone-800/80 rounded-lg transition-colors cursor-pointer"
            >
              Sign In
            </button>
          )}

          {view !== 'CHOOSE_ROLE' && view !== 'REGISTER_FORM' && (
            <button
              id="header-create-account-btn"
              onClick={() => {
                setView('CHOOSE_ROLE');
                setRegError(null);
              }}
              className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md shadow-emerald-900/30 transition-colors cursor-pointer"
            >
              Create Account
            </button>
          )}
        </div>
      </header>

      {/* Main Authentication Card Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-xl">
          {/* Security Notice / Redirect Alert if applicable */}
          {redirectReason && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start space-x-3 text-sm">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-semibold text-amber-200">Authentication Required</p>
                <p className="text-xs text-amber-300/90 mt-0.5">{redirectReason}</p>
              </div>
            </div>
          )}

          {/* VIEW 1: WELCOME SCREEN */}
          {view === 'WELCOME' && (
            <div className="bg-stone-950 border border-stone-800/90 rounded-2xl p-6 sm:p-8 md:p-10 shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-serif">
                  HOMEZA
                </h1>
                <p className="text-base sm:text-lg text-stone-300 font-medium max-w-md mx-auto leading-relaxed">
                  Find verified homes. Connect with trusted property providers in Uyo.
                </p>
              </div>

              {/* Core Platform Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 text-center space-y-1">
                  <Shield className="w-5 h-5 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-white">100% Verified</p>
                  <p className="text-[11px] text-stone-400">Inspected properties</p>
                </div>
                <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 text-center space-y-1">
                  <Users className="w-5 h-5 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-white">Direct Connect</p>
                  <p className="text-[11px] text-stone-400">Landlords & Agents</p>
                </div>
                <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 text-center space-y-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-white">Zero Fake Fees</p>
                  <p className="text-[11px] text-stone-400">Transparent tenancy</p>
                </div>
              </div>

              {/* Primary Actions */}
              <div className="space-y-3 pt-2">
                <button
                  id="welcome-create-account-btn"
                  onClick={() => {
                    setView('CHOOSE_ROLE');
                    setRegError(null);
                  }}
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-base bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99] cursor-pointer"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Create Account</span>
                </button>

                <button
                  id="welcome-sign-in-btn"
                  onClick={() => {
                    setView('SIGN_IN');
                    setSignInError(null);
                  }}
                  className="w-full py-3.5 px-6 rounded-xl font-semibold text-base bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700/80 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Lock className="w-5 h-5 text-stone-400" />
                  <span>Sign In</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: CHOOSE ACCOUNT TYPE (STEP 1 OF REGISTRATION — NO ADMIN) */}
          {view === 'CHOOSE_ROLE' && (
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Step 1 of 2</span>
                <h2 className="text-2xl font-bold text-white">Choose your account type</h2>
                <p className="text-sm text-stone-400">
                  Select how you will be using HOMEZA to access the correct workspace.
                </p>
              </div>

              {/* 3 Strict Account Types (NO ADMIN) */}
              <div className="space-y-3">
                {/* TENANT OPTION */}
                <button
                  type="button"
                  id="role-select-tenant"
                  onClick={() => setSelectedRole('TENANT')}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-start space-x-4 cursor-pointer ${
                    selectedRole === 'TENANT'
                      ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                      : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      selectedRole === 'TENANT'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-base">Tenant</span>
                      {selectedRole === 'TENANT' && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                      I am looking to rent verified apartments, houses, or self-contain units in Uyo.
                    </p>
                  </div>
                </button>

                {/* LANDLORD OPTION */}
                <button
                  type="button"
                  id="role-select-landlord"
                  onClick={() => setSelectedRole('LANDLORD')}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-start space-x-4 cursor-pointer ${
                    selectedRole === 'LANDLORD'
                      ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                      : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      selectedRole === 'LANDLORD'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-base">Landlord</span>
                      {selectedRole === 'LANDLORD' && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                      I own rental property in Akwa Ibom and want to list directly for verified tenants.
                    </p>
                  </div>
                </button>

                {/* AGENT OPTION */}
                <button
                  type="button"
                  id="role-select-agent"
                  onClick={() => setSelectedRole('AGENT')}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-start space-x-4 cursor-pointer ${
                    selectedRole === 'AGENT'
                      ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                      : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      selectedRole === 'AGENT'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-base">Verified Real Estate Agent</span>
                      {selectedRole === 'AGENT' && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                      I manage property portfolios or represent landlords/clients across Uyo.
                    </p>
                  </div>
                </button>
              </div>

              {/* Navigation Actions */}
              <div className="pt-4 flex items-center justify-between border-t border-stone-800/80">
                <button
                  type="button"
                  onClick={() => setView('WELCOME')}
                  className="px-4 py-2.5 text-sm font-medium text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  Back
                </button>

                <button
                  type="button"
                  id="continue-to-registration-btn"
                  onClick={() => {
                    setView('REGISTER_FORM');
                    setRegError(null);
                  }}
                  className="px-6 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <span>Continue to Details</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* VIEW 3: REGISTRATION INFORMATION (STEP 2 OF REGISTRATION) */}
          {view === 'REGISTER_FORM' && (
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-stone-800/80 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Step 2 of 2</span>
                  <h2 className="text-2xl font-bold text-white">Create {selectedRole} Account</h2>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {selectedRole}
                </div>
              </div>

              {regError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400" />
                    <span>{regError}</span>
                  </div>
                  {regError.toLowerCase().includes('already exists') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSignInEmail(regEmail.trim().toLowerCase());
                        setSignInRole(selectedRole);
                        setView('SIGN_IN');
                        setSignInError(null);
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg whitespace-nowrap text-[11px] transition-colors"
                    >
                      Sign In Instead
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Full Legal Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      id="reg-full-name"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Samuel Umoh"
                      className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Email Address (@gmail, @yahoo, @outlook, @hotmail) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      id="reg-email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. samuel@gmail.com"
                      className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      id="reg-phone"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="e.g. 08012345678"
                      className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Password & Confirm Password (Min 8 chars) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Password (Min 8 chars) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="reg-password"
                        required
                        minLength={8}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 8 chars"
                        className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-stone-500 hover:text-stone-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Confirm Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="reg-confirm-password"
                        required
                        minLength={8}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-stone-500 hover:text-stone-300 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Role-Specific Optional Details */}
                {selectedRole === 'TENANT' && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Occupation / Employment (Optional)
                    </label>
                    <input
                      type="text"
                      id="reg-tenant-occupation"
                      value={tenantOccupation}
                      onChange={(e) => setTenantOccupation(e.target.value)}
                      placeholder="e.g. Civil Servant, Architect, Healthcare"
                      className="w-full bg-stone-900 border border-stone-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {selectedRole === 'LANDLORD' && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">
                        Business / Property Entity Name (Optional)
                      </label>
                      <input
                        type="text"
                        id="reg-landlord-business"
                        value={landlordBusiness}
                        onChange={(e) => setLandlordBusiness(e.target.value)}
                        placeholder="e.g. Akpan Heritage Properties"
                        className="w-full bg-stone-900 border border-stone-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {selectedRole === 'AGENT' && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 mb-1">
                          Agency / Trading Name
                        </label>
                        <input
                          type="text"
                          id="reg-agent-agency"
                          value={agentAgencyName}
                          onChange={(e) => setAgentAgencyName(e.target.value)}
                          placeholder="e.g. Prime Uyo Realty"
                          className="w-full bg-stone-900 border border-stone-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 mb-1">
                          Primary Operating Area
                        </label>
                        <input
                          type="text"
                          id="reg-agent-area"
                          value={agentOperatingArea}
                          onChange={(e) => setAgentOperatingArea(e.target.value)}
                          placeholder="e.g. Shelter Afrique, Ewet Housing"
                          className="w-full bg-stone-900 border border-stone-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Submit Actions */}
                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setView('CHOOSE_ROLE')}
                    className="px-4 py-2.5 text-sm font-medium text-stone-400 hover:text-white cursor-pointer"
                  >
                    Change Role
                  </button>

                  <button
                    type="submit"
                    id="submit-registration-btn"
                    disabled={isRegistering}
                    className="px-6 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 flex items-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isRegistering ? (
                      <span>Creating Account...</span>
                    ) : (
                      <>
                        <span>Complete Registration</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="pt-2 text-center text-xs text-stone-400 border-t border-stone-800/80">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setView('SIGN_IN');
                    setSignInRole(selectedRole);
                    setSignInError(null);
                  }}
                  className="text-emerald-400 hover:underline font-bold cursor-pointer"
                >
                  Sign In here
                </button>
              </div>
            </div>
          )}

          {/* VIEW 4: PUBLIC SIGN IN (TENANT, LANDLORD, AGENT — STRICT NO ADMIN) */}
          {view === 'SIGN_IN' && (
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <Lock className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white">Sign In to HOMEZA</h2>
                <p className="text-xs text-stone-400">
                  Select your role, then enter your registered email and password.
                </p>
              </div>

              {/* Role Selection Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-stone-900 border border-stone-800">
                {(['TENANT', 'LANDLORD', 'AGENT'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    id={`signin-tab-${r.toLowerCase()}`}
                    onClick={() => {
                      setSignInRole(r);
                      setSignInError(null);
                    }}
                    className={`py-2 px-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                      signInRole === r
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-400 hover:text-white hover:bg-stone-800/60'
                    }`}
                  >
                    {r === 'TENANT' ? 'Tenant' : r === 'LANDLORD' ? 'Landlord' : 'Agent'}
                  </button>
                ))}
              </div>

              {signInError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{signInError}</span>
                </div>
              )}

              <form onSubmit={handleSignInSubmit} className="space-y-4">
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      id="signin-email"
                      required
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder="e.g. user@gmail.com"
                      className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-300">
                      Password
                    </label>
                    <button
                      type="button"
                      id="btn-forgot-password"
                      onClick={() => {
                        setResetRole(signInRole);
                        setResetEmail(signInEmail);
                        setResetStep('REQUEST_CODE');
                        setResetError(null);
                        setResetSuccessMsg(null);
                        setView('FORGOT_PASSWORD');
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline font-medium cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="signin-password"
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-stone-500 hover:text-stone-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="submit-signin-btn"
                  disabled={isSigningIn}
                  className="w-full py-3.5 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSigningIn ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Sign In as {signInRole === 'TENANT' ? 'Tenant' : signInRole === 'LANDLORD' ? 'Landlord' : 'Agent'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 text-center text-xs text-stone-400 border-t border-stone-800/80">
                Don't have an account?{' '}
                <button
                  type="button"
                  id="signin-create-account-link"
                  onClick={() => {
                    setSelectedRole(signInRole);
                    setView('CHOOSE_ROLE');
                    setRegError(null);
                  }}
                  className="text-emerald-400 hover:underline font-bold cursor-pointer"
                >
                  Create an account
                </button>
              </div>

              {/* Explicit Admin Portal Access */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  id="btn-switch-to-admin-portal"
                  onClick={() => {
                    setAdminError(null);
                    setAdminEmail('admin@homeza.ng');
                    setView('ADMIN_LOGIN');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer py-1.5 px-3 rounded-xl bg-red-950/40 border border-red-800/40 transition hover:bg-red-900/50"
                >
                  <KeyRound className="w-3.5 h-3.5 text-red-400" />
                  <span>Platform Supervisor? Access Admin Portal →</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 5: FORGOT PASSWORD (NORMAL USER) */}
          {view === 'FORGOT_PASSWORD' && (
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white">Reset Account Password</h2>
                <p className="text-xs text-stone-400">
                  Recover access to your {resetRole.toLowerCase()} account.
                </p>
              </div>

              {/* Role Indicator */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-stone-900 border border-stone-800">
                {(['TENANT', 'LANDLORD', 'AGENT'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setResetRole(r);
                      setResetError(null);
                    }}
                    className={`py-2 px-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                      resetRole === r
                        ? 'bg-emerald-600 text-white'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    {r === 'TENANT' ? 'Tenant' : r === 'LANDLORD' ? 'Landlord' : 'Agent'}
                  </button>
                ))}
              </div>

              {resetError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetStep === 'REQUEST_CODE' && (
                <form onSubmit={handleRequestUserResetCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Enter Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        id="reset-user-email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="e.g. myaccount@gmail.com"
                        className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-send-reset-code"
                    disabled={isRequestingReset}
                    className="w-full py-3.5 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isRequestingReset ? <span>Generating Recovery Code...</span> : <span>Request Recovery Code</span>}
                  </button>
                </form>
              )}

              {resetStep === 'ENTER_NEW_PASSWORD' && (
                <form onSubmit={handleCompleteUserResetPassword} className="space-y-4">
                  {/* Verification code helper banner */}
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Recovery Code Dispatched
                    </p>
                    <p className="text-[11px] text-stone-300">
                      We've sent a 6-digit recovery code to <span className="font-semibold text-white">{resetEmail}</span>. Please check your inbox and spam folder.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      6-Digit Recovery Verification Code
                    </label>
                    <input
                      type="text"
                      id="reset-user-code"
                      required
                      maxLength={6}
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full bg-stone-900 border border-stone-700/80 rounded-xl px-4 py-2.5 text-sm text-white font-mono tracking-widest text-center placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      New Password (Min 8 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
                      <input
                        type={showResetNewPassword ? 'text' : 'password'}
                        id="reset-user-new-password"
                        required
                        minLength={8}
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                        className="absolute right-3 top-3 text-stone-500 hover:text-stone-300 cursor-pointer"
                      >
                        {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
                      <input
                        type={showResetConfirmPassword ? 'text' : 'password'}
                        id="reset-user-confirm-password"
                        required
                        minLength={8}
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                        className="absolute right-3 top-3 text-stone-500 hover:text-stone-300 cursor-pointer"
                      >
                        {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-reset-password"
                    disabled={isResettingPassword}
                    className="w-full py-3.5 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isResettingPassword ? <span>Saving New Password...</span> : <span>Update Account Password</span>}
                  </button>
                </form>
              )}

              {resetStep === 'SUCCESS' && (
                <div className="text-center space-y-4 py-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white">Password Updated!</h3>
                    <p className="text-xs text-stone-300">
                      {resetSuccessMsg || 'Your password has been changed successfully.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    id="btn-return-signin-after-reset"
                    onClick={() => {
                      setView('SIGN_IN');
                      setSignInRole(resetRole);
                      setSignInEmail(resetEmail);
                      setSignInError(null);
                    }}
                    className="w-full py-3 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer"
                  >
                    Proceed to Sign In
                  </button>
                </div>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setView('SIGN_IN');
                    setSignInError(null);
                  }}
                  className="text-xs text-stone-400 hover:text-white cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          )}

          {/* VIEW 6: DEDICATED ADMIN LOGIN PORTAL */}
          {view === 'ADMIN_LOGIN' && (
            <div className="bg-stone-950 border border-red-900/50 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white">Platform Administrator Portal</h2>
                <p className="text-xs text-stone-400">
                  Restricted access. Only authorized platform supervisors may proceed.
                </p>
              </div>

              {adminError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{adminError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Administrator Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      id="admin-login-email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@homeza.ng"
                      className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-300">
                      Security Password
                    </label>
                    <button
                      type="button"
                      id="btn-forgot-admin-password"
                      onClick={() => {
                        setAdminResetEmail(adminEmail);
                        setAdminResetStep('REQUEST_CODE');
                        setAdminResetError(null);
                        setAdminResetSuccessMsg(null);
                        setView('FORGOT_ADMIN_PASSWORD');
                      }}
                      className="text-xs text-red-400 hover:text-red-300 hover:underline font-medium cursor-pointer"
                    >
                      Forgot admin password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="admin-login-password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Admin security password"
                      className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-stone-500 hover:text-stone-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="submit-admin-login-btn"
                  disabled={isAdminLoggingIn}
                  className="w-full py-3.5 px-6 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isAdminLoggingIn ? <span>Verifying Authorization...</span> : <span>Access Admin Console</span>}
                </button>
              </form>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setView('WELCOME')}
                  className="text-xs text-stone-400 hover:text-white cursor-pointer"
                >
                  Return to HOMEZA Welcome Screen
                </button>
              </div>
            </div>
          )}

          {/* VIEW 7: FORGOT ADMIN PASSWORD */}
          {view === 'FORGOT_ADMIN_PASSWORD' && (
            <div className="bg-stone-950 border border-red-900/50 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white">Administrator Password Recovery</h2>
                <p className="text-xs text-stone-400">
                  Recover supervisor console credentials.
                </p>
              </div>

              {adminResetError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{adminResetError}</span>
                </div>
              )}

              {adminResetStep === 'REQUEST_CODE' && (
                <form onSubmit={handleRequestAdminResetCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Administrator Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        id="admin-reset-email"
                        required
                        value={adminResetEmail}
                        onChange={(e) => setAdminResetEmail(e.target.value)}
                        placeholder="admin@homeza.ng"
                        className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-send-admin-reset-code"
                    className="w-full py-3.5 px-6 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <span>Request Admin Recovery Code</span>
                  </button>
                </form>
              )}

              {adminResetStep === 'ENTER_NEW_PASSWORD' && (
                <form onSubmit={handleCompleteAdminResetPassword} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-red-200">
                      <CheckCircle2 className="w-4 h-4 text-red-400" />
                      Admin Recovery Code Dispatched
                    </p>
                    <p className="text-[11px] text-stone-300">
                      We've sent a 6-digit security code to <span className="font-semibold text-white">{adminResetEmail}</span>. Please check your inbox and spam folder.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      6-Digit Admin Verification Code
                    </label>
                    <input
                      type="text"
                      id="admin-reset-code"
                      required
                      maxLength={6}
                      value={adminResetCode}
                      onChange={(e) => setAdminResetCode(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full bg-stone-900 border border-stone-700/80 rounded-xl px-4 py-2.5 text-sm text-white font-mono tracking-widest text-center placeholder-stone-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      New Admin Password (Min 8 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
                      <input
                        type={showResetNewPassword ? 'text' : 'password'}
                        id="admin-reset-new-password"
                        required
                        minLength={8}
                        value={adminResetNewPassword}
                        onChange={(e) => setAdminResetNewPassword(e.target.value)}
                        placeholder="Enter new admin password"
                        className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                        className="absolute right-3 top-3 text-stone-500 hover:text-stone-300 cursor-pointer"
                      >
                        {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Confirm New Admin Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
                      <input
                        type={showResetConfirmPassword ? 'text' : 'password'}
                        id="admin-reset-confirm-password"
                        required
                        minLength={8}
                        value={adminResetConfirmPassword}
                        onChange={(e) => setAdminResetConfirmPassword(e.target.value)}
                        placeholder="Repeat new admin password"
                        className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                        className="absolute right-3 top-3 text-stone-500 hover:text-stone-300 cursor-pointer"
                      >
                        {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-admin-reset-password"
                    className="w-full py-3.5 px-6 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <span>Save New Admin Password</span>
                  </button>
                </form>
              )}

              {adminResetStep === 'SUCCESS' && (
                <div className="text-center space-y-4 py-2">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white">Admin Password Updated</h3>
                    <p className="text-xs text-stone-300">
                      {adminResetSuccessMsg || 'Your administrator security password was updated successfully.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    id="btn-return-admin-signin"
                    onClick={() => {
                      setView('ADMIN_LOGIN');
                      setAdminEmail(adminResetEmail);
                      setAdminError(null);
                    }}
                    className="w-full py-3 px-6 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer"
                  >
                    Proceed to Admin Sign In
                  </button>
                </div>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setView('ADMIN_LOGIN');
                    setAdminError(null);
                  }}
                  className="text-xs text-stone-400 hover:text-white cursor-pointer"
                >
                  Return to Admin Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer / Discreet Admin Access */}
      <footer className="relative z-10 w-full border-t border-stone-900 bg-stone-950 px-4 py-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 space-y-2 sm:space-y-0">
        <div>
          © {new Date().getFullYear()} HOMEZA Technologies Limited. All rights reserved.
        </div>
        <div className="flex items-center space-x-4">
          <button
            type="button"
            id="admin-portal-link"
            onClick={() => {
              setView('ADMIN_LOGIN');
              setAdminError(null);
            }}
            className="text-stone-500 hover:text-stone-300 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Platform Administrator Portal</span>
          </button>
        </div>
      </footer>

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        targetEmail={verifyEmailTarget}
        targetUserId={verifyUserIdTarget}
        onSuccess={() => {
          setVerifyModalOpen(false);
          if (onSuccess) onSuccess(selectedRole);
        }}
      />
    </div>
  );
};
