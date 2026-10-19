import React, { createContext, useContext, useEffect, useState } from 'react';
import { AgentUser, LandlordUser, TenantUser, User, UserRole } from '../types';
import { Store, subscribeToStore } from '../services/store';
import { AuthSecurityService, UserSession } from '../services/authSecurity';
import { evaluateUserVerification, reconcileUserVerification } from '../utils/verification';

interface AuthContextType {
  currentUser: User | null;
  currentRole: UserRole | null;
  role: UserRole | null;
  session: UserSession | null;
  refreshSession: () => void;
  login: (
    email: string,
    passwordPlain: string
  ) => Promise<{ success: boolean; message?: string; role?: UserRole; session?: UserSession; isUnverifiedEmail?: boolean; email?: string; userId?: string }>;
  loginWithEmailAndPassword: (
    email: string,
    passwordPlain: string,
    selectedRole: 'TENANT' | 'LANDLORD' | 'AGENT'
  ) => Promise<{ success: boolean; message?: string; session?: UserSession; isUnverifiedEmail?: boolean; email?: string; userId?: string }>;
  loginAsAdmin: (
    email: string,
    passwordPlain: string
  ) => Promise<{ success: boolean; message?: string; session?: UserSession }>;
  requestPasswordResetCode: (
    email: string,
    expectedRole?: UserRole
  ) => { success: boolean; code?: string; role?: UserRole; message?: string };
  verifyPasswordResetCode: (
    email: string,
    code: string
  ) => { success: boolean; message?: string };
  completePasswordReset: (
    email: string,
    code: string,
    newPasswordPlain: string,
    expectedRole?: UserRole
  ) => { success: boolean; message?: string };
  changePassword: (
    currentPasswordPlain: string,
    newPasswordPlain: string
  ) => { success: boolean; message?: string };
  registerTenant: (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    passwordPlain: string;
    occupation?: string;
  }) => Promise<{ success: boolean; message?: string; needsEmailVerification?: boolean; email?: string; userId?: string }>;
  registerLandlord: (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    passwordPlain: string;
    businessName?: string;
    idCardType?: string;
    idCardNumber?: string;
  }) => Promise<{ success: boolean; message?: string; needsEmailVerification?: boolean; email?: string; userId?: string }>;
  registerAgent: (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    passwordPlain: string;
    agencyName?: string;
    operatingArea?: string;
    cacNumber?: string;
    licenseNumber?: string;
    bio?: string;
  }) => Promise<{ success: boolean; message?: string; agentId?: string; needsEmailVerification?: boolean; email?: string; userId?: string }>;
  logout: () => void;
  toggleSavedProperty: (propertyId: string) => boolean;
  isPropertySaved: (propertyId: string) => boolean;
  updateCurrentUserProfile: (updates: Partial<User>) => void;
  verifyEmail: (codeOrToken: string, email?: string) => Promise<{ success: boolean; message?: string }>;
  resendVerificationEmail: (email?: string, userId?: string) => Promise<{ success: boolean; message?: string }>;
  changeUnverifiedEmail: (newEmail: string, oldEmail?: string, userId?: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const isAllowedRegistrationEmail = (email: string): boolean => {
  const clean = email.trim().toLowerCase();
  const parts = clean.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  return (
    domain === 'gmail.com' ||
    domain === 'yahoo.com' ||
    domain === 'outlook.com' ||
    domain === 'hotmail.com'
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(() => AuthSecurityService.getActiveSession());
  const [currentUserId, setCurrentUserIdState] = useState<string | null>(() => {
    const active = AuthSecurityService.getActiveSession();
    if (active) return active.userId;
    return Store.getCurrentUserId();
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (!currentUserId) return null;
    return Store.getUserById(currentUserId) || null;
  });

  useEffect(() => {
    // 1. Initial session restoration from server or URL query token
    const restoreSession = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const queryToken = urlParams.get('auth_token');

        if (queryToken) {
          const res = await fetch(`/api/auth/me?auth_token=${encodeURIComponent(queryToken)}`);
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data.authenticated && data.user) {
              const u: User = data.user;
              Store.addUser(u);
              Store.setCurrentUserId(u.id);
              setCurrentUser(u);
              setCurrentUserIdState(u.id);
              if (data.session) {
                setSession(data.session);
                AuthSecurityService.setActiveSession(data.session);
              }
              return;
            }
          }
        }

        const active = AuthSecurityService.getActiveSession();
        if (active && active.token) {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${active.token}` },
          });
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data.authenticated && data.user) {
              const u: User = data.user;
              Store.addUser(u);
              Store.setCurrentUserId(u.id);
              setCurrentUser(u);
              setCurrentUserIdState(u.id);
              if (data.session) {
                setSession(data.session);
                AuthSecurityService.setActiveSession(data.session);
              }
            }
          }
        }
      } catch (e) {
        console.warn('[AUTH RESTORE] Error checking server session:', e);
      }
    };

    restoreSession();

    const syncUser = () => {
      const active = AuthSecurityService.getActiveSession();
      if (active) {
        setSession(active);
        const u = Store.getUserById(active.userId);
        setCurrentUser(u || null);
        setCurrentUserIdState(active.userId);
      } else {
        const id = Store.getCurrentUserId();
        if (id) {
          const u = Store.getUserById(id);
          setCurrentUser(u || null);
          setCurrentUserIdState(id);
        } else {
          setSession(null);
          setCurrentUser(null);
          setCurrentUserIdState(null);
        }
      }
    };

    const unsubscribe = subscribeToStore(syncUser);
    return () => unsubscribe();
  }, []);

  /**
   * Direct login by Email and Password:
   * Authenticates against secure hash vault or central server, retrieves genuine stored role,
   * establishes session, and redirects user to their authorized dashboard.
   */
  const login = async (
    email: string,
    passwordPlain: string
  ): Promise<{ success: boolean; message?: string; role?: UserRole; session?: UserSession; isUnverifiedEmail?: boolean; email?: string; userId?: string }> => {
    const cleanEmail = email.toLowerCase().trim();

    // 1. Try local authentication vault
    const authResult = AuthSecurityService.authenticateDirect(cleanEmail, passwordPlain);

    if (authResult.success && authResult.session) {
      let user = Store.getUserByEmail(cleanEmail) || Store.getUserById(authResult.session.userId);
      if (user) {
        if (user.accountStatus === 'SUSPENDED' || user.accountStatus === 'INACTIVE') {
          AuthSecurityService.clearSession();
          return { success: false, message: 'This account has been deactivated. Please contact platform support.' };
        }
        if (user.role !== 'ADMIN' && user.emailVerified === false) {
          AuthSecurityService.clearSession();
          return {
            success: false,
            isUnverifiedEmail: true,
            email: user.email,
            userId: user.id,
            message: 'Please verify your email address before continuing to HOMEZA.',
          };
        }
        user = reconcileUserVerification(user);
        Store.setCurrentUserId(user.id);
        setCurrentUser(user);
        setCurrentUserIdState(user.id);
        setSession(authResult.session);
        Store.getVerificationStatus(user.id);
        return { success: true, role: user.role, session: authResult.session };
      }
    }

    // 2. Fallback to Central Server API
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: passwordPlain }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success && data.user) {
        const serverUser: User = data.user;
        const serverSession: UserSession = data.session || {
          token: 'homeza_srv_' + Date.now() + '_' + serverUser.id,
          userId: serverUser.id,
          email: serverUser.email,
          role: serverUser.role,
          fullName: serverUser.fullName,
          issuedAt: Date.now(),
          expiresAt: Date.now() + 7 * 86400000,
        };

        AuthSecurityService.registerCredential(serverUser.id, serverUser.email, passwordPlain, serverUser.role);
        AuthSecurityService.setActiveSession(serverSession);
        Store.addUser(serverUser);
        Store.setCurrentUserId(serverUser.id);
        setCurrentUser(serverUser);
        setCurrentUserIdState(serverUser.id);
        setSession(serverSession);

        return { success: true, role: serverUser.role, session: serverSession };
      }

      if (data.isUnverifiedEmail) {
        return {
          success: false,
          isUnverifiedEmail: true,
          email: data.email || cleanEmail,
          userId: data.userId,
          message: data.message || 'Please verify your email address before continuing to HOMEZA.',
        };
      }

      return {
        success: false,
        message: data.message || authResult.message || 'Authentication failed. Please verify email and password.',
      };
    } catch {
      return {
        success: false,
        message: authResult.message || 'Authentication failed. Please verify email and password.',
      };
    }
  };

  /**
   * Secure normal login:
   * Validates Email, Salted Hashed Password, and Selected Role.
   * Seamlessly checks both local vault and central server to ensure accounts created across redirects/sessions are recognized.
   */
  const loginWithEmailAndPassword = async (
    email: string,
    passwordPlain: string,
    selectedRole: 'TENANT' | 'LANDLORD' | 'AGENT'
  ): Promise<{ success: boolean; message?: string; session?: UserSession; isUnverifiedEmail?: boolean; email?: string; userId?: string }> => {
    const cleanEmail = email.toLowerCase().trim();

    // 1. First attempt local vault authentication
    const authResult = AuthSecurityService.authenticateUser(cleanEmail, passwordPlain, selectedRole);

    if (authResult.success && authResult.session) {
      let user = Store.getUserByEmail(cleanEmail) || Store.getUserById(authResult.session.userId);
      if (user) {
        if (user.accountStatus === 'SUSPENDED' || user.accountStatus === 'INACTIVE') {
          return { success: false, message: 'This account has been deactivated. Please contact platform support.' };
        }
        if (user.role !== 'ADMIN' && user.emailVerified === false) {
          AuthSecurityService.clearSession();
          return {
            success: false,
            isUnverifiedEmail: true,
            email: user.email,
            userId: user.id,
            message: 'Please verify your email address before continuing to HOMEZA.',
          };
        }

        user = reconcileUserVerification(user);
        Store.setCurrentUserId(user.id);
        setCurrentUser(user);
        setCurrentUserIdState(user.id);
        setSession(authResult.session);
        Store.getVerificationStatus(user.id);
        return { success: true, session: authResult.session };
      }
    }

    // 2. Query Central Server API (/api/auth/login)
    // Ensures real registered users returning from external redirects are seamlessly logged in
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: passwordPlain,
          selectedRole,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success && data.user) {
        const serverUser: User = data.user;
        const serverSession: UserSession = data.session || {
          token: 'homeza_srv_' + Date.now() + '_' + serverUser.id,
          userId: serverUser.id,
          email: serverUser.email,
          role: serverUser.role,
          fullName: serverUser.fullName,
          issuedAt: Date.now(),
          expiresAt: Date.now() + 7 * 86400000,
        };

        // Auto-heal local credentials and user store
        AuthSecurityService.registerCredential(serverUser.id, serverUser.email, passwordPlain, serverUser.role);
        AuthSecurityService.setActiveSession(serverSession);
        Store.addUser(serverUser);
        Store.setCurrentUserId(serverUser.id);
        setCurrentUser(serverUser);
        setCurrentUserIdState(serverUser.id);
        setSession(serverSession);

        return { success: true, session: serverSession };
      }

      if (data.isUnverifiedEmail) {
        return {
          success: false,
          isUnverifiedEmail: true,
          email: data.email || cleanEmail,
          userId: data.userId,
          message: data.message || 'Please verify your email address before continuing to HOMEZA.',
        };
      }

      return {
        success: false,
        message: data.message || authResult.message || 'Authentication failed. Please verify credentials.',
      };
    } catch {
      return {
        success: false,
        message: authResult.message || 'Authentication failed. Please verify credentials.',
      };
    }
  };

  /**
   * Dedicated Admin Login:
   * Authenticates against dedicated Admin credentials vault only.
   */
  const loginAsAdmin = async (
    email: string,
    passwordPlain: string
  ): Promise<{ success: boolean; message?: string; session?: UserSession }> => {
    const cleanEmail = email.toLowerCase().trim();

    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: passwordPlain }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success && data.user) {
        const adminUser: User = data.user;
        const adminSession: UserSession = data.session || {
          token: 'homeza_adm_' + Date.now() + '_' + adminUser.id,
          userId: adminUser.id,
          email: adminUser.email,
          role: 'ADMIN',
          fullName: adminUser.fullName,
          issuedAt: Date.now(),
          expiresAt: Date.now() + 7 * 86400000,
        };

        AuthSecurityService.setActiveSession(adminSession);
        Store.addUser(adminUser);
        Store.setCurrentUserId(adminUser.id);
        setCurrentUser(adminUser);
        setCurrentUserIdState(adminUser.id);
        setSession(adminSession);

        return { success: true, session: adminSession };
      }

      return {
        success: false,
        message: data.message || 'Invalid administrator credentials. Access denied.',
      };
    } catch {
      return {
        success: false,
        message: 'Could not connect to authentication service. Please try again.',
      };
    }
  };

  const requestPasswordResetCode = (email: string, expectedRole?: UserRole) => {
    return AuthSecurityService.generatePasswordResetCode(email, expectedRole);
  };

  const verifyPasswordResetCode = (email: string, code: string) => {
    return AuthSecurityService.verifyPasswordResetCode(email, code);
  };

  const completePasswordReset = (
    email: string,
    code: string,
    newPasswordPlain: string,
    expectedRole?: UserRole
  ) => {
    return AuthSecurityService.completePasswordReset(email, code, newPasswordPlain, expectedRole);
  };

  const changePassword = (
    currentPasswordPlain: string,
    newPasswordPlain: string
  ): { success: boolean; message?: string } => {
    if (!currentUser) {
      return { success: false, message: 'You must be logged in to change your password.' };
    }
    return AuthSecurityService.changePasswordDirect(currentUser.id, currentPasswordPlain, newPasswordPlain);
  };

  /**
   * Register a new Tenant account:
   * Hashes password, registers in credentials vault, and creates unverified user record on server & locally.
   * Does NOT establish session or log in until email is verified.
   */
  const registerTenant = async (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    passwordPlain: string;
    occupation?: string;
  }): Promise<{ success: boolean; message?: string; needsEmailVerification?: boolean; email?: string; userId?: string }> => {
    const cleanEmail = data.email?.toLowerCase().trim();
    if (!isAllowedRegistrationEmail(cleanEmail)) {
      return {
        success: false,
        message: 'Registration is restricted to @gmail.com, @yahoo.com, @outlook.com, and @hotmail.com email addresses.',
      };
    }

    if (data.passwordPlain.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters in length.',
      };
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: data.fullName.trim(),
          email: cleanEmail,
          phoneNumber: data.phoneNumber.trim(),
          password: data.passwordPlain,
          role: 'TENANT',
          occupation: data.occupation?.trim(),
        }),
      });

      const resData = await response.json().catch(() => ({}));

      if (response.status === 409) {
        return {
          success: false,
          message: 'An account with this email address already exists. Please sign in instead.',
        };
      }

      if (!response.ok || !resData.success) {
        return {
          success: false,
          message: resData.message || "We couldn't verify your email availability right now. Please try again.",
        };
      }

      const targetUserId = resData.userId || 'tenant-' + Date.now();
      AuthSecurityService.registerCredential(
        targetUserId,
        cleanEmail,
        data.passwordPlain,
        'TENANT'
      );

      const tenantUser: TenantUser = {
        id: targetUserId,
        role: 'TENANT',
        fullName: data.fullName.trim(),
        email: cleanEmail,
        phoneNumber: data.phoneNumber.trim(),
        occupation: data.occupation?.trim(),
        accountStatus: 'ACTIVE',
        emailVerified: false,
        savedPropertyIds: [],
        createdAt: new Date().toISOString(),
      };

      Store.addUser(tenantUser);

      return {
        success: true,
        needsEmailVerification: true,
        email: cleanEmail,
        userId: targetUserId,
        message: resData.message || 'We have sent a 6-digit verification code to your email address. Please verify your email to continue.',
      };
    } catch (err: any) {
      console.error('[REGISTRATION ERROR] Tenant registration failed:', err);
      return {
        success: false,
        message: "We couldn't verify your email availability right now. Please try again.",
      };
    }
  };

  /**
   * Register a new Landlord account:
   * Hashes password, registers in credentials vault, and creates unverified user record on server & locally.
   * Does NOT establish session or log in until email is verified.
   */
  const registerLandlord = async (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    passwordPlain: string;
    businessName?: string;
    idCardType?: string;
    idCardNumber?: string;
  }): Promise<{ success: boolean; message?: string; needsEmailVerification?: boolean; email?: string; userId?: string }> => {
    const cleanEmail = data.email?.toLowerCase().trim();
    if (!isAllowedRegistrationEmail(cleanEmail)) {
      return {
        success: false,
        message: 'Registration is restricted to @gmail.com, @yahoo.com, @outlook.com, and @hotmail.com email addresses.',
      };
    }

    if (data.passwordPlain.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters in length.',
      };
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: data.fullName.trim(),
          email: cleanEmail,
          phoneNumber: data.phoneNumber.trim(),
          password: data.passwordPlain,
          role: 'LANDLORD',
          businessName: data.businessName?.trim(),
          idCardType: data.idCardType,
          idCardNumber: data.idCardNumber?.trim(),
        }),
      });

      const resData = await response.json().catch(() => ({}));

      if (response.status === 409) {
        return {
          success: false,
          message: 'An account with this email address already exists. Please sign in instead.',
        };
      }

      if (!response.ok || !resData.success) {
        return {
          success: false,
          message: resData.message || "We couldn't verify your email availability right now. Please try again.",
        };
      }

      const targetUserId = resData.userId || 'landlord-' + Date.now();
      AuthSecurityService.registerCredential(
        targetUserId,
        cleanEmail,
        data.passwordPlain,
        'LANDLORD'
      );

      const landlordUser: LandlordUser = {
        id: targetUserId,
        role: 'LANDLORD',
        fullName: data.fullName.trim(),
        email: cleanEmail,
        phoneNumber: data.phoneNumber.trim(),
        businessName: data.businessName?.trim(),
        verificationStatus: 'NOT_SUBMITTED',
        accountStatus: 'ACTIVE',
        emailVerified: false,
        idCardType: data.idCardType || 'National Identification Number (NIN)',
        idCardNumber: data.idCardNumber?.trim() || '',
        createdAt: new Date().toISOString(),
      };

      Store.addUser(landlordUser);

      // Notify Admin of new Landlord registration
      const nowIso = new Date().toISOString();
      Store.addNotification({
        id: 'notif-' + Date.now() + '-admin-landlord-reg',
        userId: 'user-admin-1',
        title: 'New Landlord Registration',
        message: `New Landlord registered: ${landlordUser.fullName}${landlordUser.businessName ? ` (${landlordUser.businessName})` : ''}.`,
        type: 'KYC_LANDLORD',
        targetType: 'KYC_LANDLORD',
        targetId: landlordUser.id,
        isRead: false,
        createdAt: nowIso,
      });

      return {
        success: true,
        needsEmailVerification: true,
        email: cleanEmail,
        userId: targetUserId,
        message: resData.message || 'We have sent a 6-digit verification code to your email address. Please verify your email to continue.',
      };
    } catch (err: any) {
      console.error('[REGISTRATION ERROR] Landlord registration failed:', err);
      return {
        success: false,
        message: "We couldn't verify your email availability right now. Please try again.",
      };
    }
  };

  /**
   * Register a new Agent account:
   * Hashes password, registers in credentials vault, and creates unverified user record on server & locally.
   * Does NOT establish session or log in until email is verified.
   */
  const registerAgent = async (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    passwordPlain: string;
    agencyName?: string;
    operatingArea?: string;
    cacNumber?: string;
    licenseNumber?: string;
    bio?: string;
  }): Promise<{ success: boolean; message?: string; agentId?: string; needsEmailVerification?: boolean; email?: string; userId?: string }> => {
    const cleanEmail = data.email?.toLowerCase().trim();
    if (!isAllowedRegistrationEmail(cleanEmail)) {
      return {
        success: false,
        message: 'Registration is restricted to @gmail.com, @yahoo.com, @outlook.com, and @hotmail.com email addresses.',
      };
    }

    if (data.passwordPlain.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters in length.',
      };
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: data.fullName.trim(),
          email: cleanEmail,
          phoneNumber: data.phoneNumber.trim(),
          password: data.passwordPlain,
          role: 'AGENT',
          agencyName: data.agencyName?.trim(),
          operatingArea: data.operatingArea?.trim(),
          cacNumber: data.cacNumber?.trim(),
          licenseNumber: data.licenseNumber?.trim(),
          bio: data.bio?.trim(),
        }),
      });

      const resData = await response.json().catch(() => ({}));

      if (response.status === 409) {
        return {
          success: false,
          message: 'An account with this email address already exists. Please sign in instead.',
        };
      }

      if (!response.ok || !resData.success) {
        return {
          success: false,
          message: resData.message || "We couldn't verify your email availability right now. Please try again.",
        };
      }

      const nowIso = new Date().toISOString();
      const targetUserId = resData.userId || 'agent-' + Date.now();
      AuthSecurityService.registerCredential(
        targetUserId,
        cleanEmail,
        data.passwordPlain,
        'AGENT'
      );

      const newAgent: AgentUser = {
        id: targetUserId,
        role: 'AGENT',
        fullName: data.fullName.trim(),
        email: cleanEmail,
        phoneNumber: data.phoneNumber.trim(),
        agencyName: data.agencyName?.trim() || 'Independent Real Estate Intermediary',
        operatingArea: data.operatingArea?.trim() || 'All Uyo Metropolitan',
        cacNumber: data.cacNumber?.trim() || '',
        licenseNumber: data.licenseNumber?.trim() || '',
        bio: data.bio?.trim() || 'Professional real estate intermediary assisting with rental searches and tenancy advisory in Uyo.',
        verificationStatus: 'NOT_SUBMITTED',
        accountStatus: 'ACTIVE',
        emailVerified: false,
        savedPropertyIds: [],
        assistedPropertyIds: [],
        appliedDate: nowIso,
        createdAt: nowIso,
      };

      Store.addUser(newAgent);

      // Notify Admin of new Agent application
      Store.addNotification({
        id: 'notif-' + Date.now() + '-admin-agent-reg',
        userId: 'user-admin-1',
        title: 'New Agent Registration',
        message: `New Agent registered: ${newAgent.fullName} (${newAgent.agencyName}).`,
        type: 'KYC_AGENT',
        targetType: 'KYC_AGENT',
        targetId: newAgent.id,
        isRead: false,
        createdAt: nowIso,
      });

      return {
        success: true,
        needsEmailVerification: true,
        email: cleanEmail,
        userId: targetUserId,
        agentId: targetUserId,
        message: resData.message || 'We have sent a 6-digit verification code to your email address. Please verify your email to continue.',
      };
    } catch (err: any) {
      console.error('[REGISTRATION ERROR] Agent registration failed:', err);
      return {
        success: false,
        message: "We couldn't verify your email availability right now. Please try again.",
      };
    }
  };

  /**
   * Secure Email Verification Methods
   */
  const verifyEmail = async (codeOrToken: string, email?: string): Promise<{ success: boolean; message?: string }> => {
    const targetEmail = (email || currentUser?.email || '').trim().toLowerCase();
    const targetUserId = currentUser?.id || '';

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          userId: targetUserId,
          code: codeOrToken.length === 6 ? codeOrToken : undefined,
          token: codeOrToken.length > 6 ? codeOrToken : undefined,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const foundUser = Store.getUserByEmail(targetEmail) || (targetUserId ? Store.getUserById(targetUserId) : null) || currentUser;
        if (foundUser) {
          const updated = {
            ...foundUser,
            emailVerified: true,
            emailVerifiedAt: new Date().toISOString(),
          };
          Store.updateUser(updated);
          Store.setCurrentUserId(updated.id);
          setCurrentUser(updated);
          setCurrentUserIdState(updated.id);
        }

        if (data.session) {
          setSession(data.session);
          AuthSecurityService.saveActiveSession(data.session);
        } else if (foundUser) {
          const newSession = AuthSecurityService.createSession(foundUser.id, foundUser.email, foundUser.role);
          setSession(newSession);
        }

        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Verification failed. Please check your verification code.' };
    } catch {
      return { success: false, message: 'Network error verifying email. Please check your connection and try again.' };
    }
  };

  const resendVerificationEmail = async (email?: string, userId?: string): Promise<{ success: boolean; message?: string }> => {
    const targetEmail = email || currentUser?.email || '';
    const targetUserId = userId || currentUser?.id || '';

    try {
      const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          userId: targetUserId,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true, message: data.message || 'Verification email sent successfully.' };
      }
      return { success: false, message: data.message || "We couldn't send the verification email right now. Please try again." };
    } catch {
      return { success: false, message: "We couldn't send the verification email right now. Please try again." };
    }
  };

  const changeUnverifiedEmail = async (newEmail: string, oldEmail?: string, userId?: string): Promise<{ success: boolean; message?: string }> => {
    const targetOld = oldEmail || currentUser?.email || '';
    const targetUserId = userId || currentUser?.id || '';

    try {
      const response = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldEmail: targetOld,
          newEmail,
          userId: targetUserId,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (currentUser) {
          const updated = {
            ...currentUser,
            email: newEmail,
            emailVerified: false,
            emailVerifiedAt: undefined,
          };
          Store.updateUser(updated);
          setCurrentUser(updated);
        }
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Could not update email address.' };
    } catch {
      return { success: false, message: 'Failed to update email address.' };
    }
  };

  /**
   * Secure Logout:
   * Destroys active session token and clears user state
   */
  const logout = () => {
    AuthSecurityService.clearSession();
    setSession(null);
    setCurrentUser(null);
    setCurrentUserIdState(null);
    Store.setCurrentUserId(null);
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      // ignore
    }
  };

  const toggleSavedProperty = (propertyId: string): boolean => {
    if (!currentUser || (currentUser.role !== 'TENANT' && currentUser.role !== 'AGENT')) return false;
    const isSaved = Store.toggleSaveProperty(currentUser.id, propertyId);
    const updated = Store.getUserById(currentUser.id);
    if (updated) {
      setCurrentUser({ ...updated });
    }
    return isSaved;
  };

  const isPropertySaved = (propertyId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'TENANT') {
      const tenant = currentUser as TenantUser;
      return (tenant.savedPropertyIds || []).includes(propertyId);
    }
    if (currentUser.role === 'AGENT') {
      const agent = currentUser as AgentUser;
      return (agent.savedPropertyIds || []).includes(propertyId);
    }
    return false;
  };

  /**
   * Safe Profile Update:
   * Explicitly strips and protects critical fields (role, id, verificationStatus, accountStatus)
   * to strictly prevent client-side privilege escalation.
   */
  const updateCurrentUserProfile = (updates: Partial<User>) => {
    if (!currentUser) return;
    
    // Strip forbidden fields
    const safeUpdates = { ...updates };
    delete safeUpdates.role;
    delete safeUpdates.id;
    delete (safeUpdates as any).verificationStatus;
    delete (safeUpdates as any).accountStatus;

    const updated = { ...currentUser, ...safeUpdates } as User;
    Store.updateUser(updated);
    setCurrentUser(updated);
  };

  const refreshSession = () => {
    const active = AuthSecurityService.getActiveSession();
    if (active) {
      setSession(active);
      const u = Store.getUserById(active.userId);
      if (u) {
        reconcileUserVerification(u);
        setCurrentUser(u);
      } else {
        setCurrentUser(null);
      }
      setCurrentUserIdState(active.userId);
      Store.getVerificationStatus(active.userId);
    } else {
      const id = Store.getCurrentUserId();
      if (id) {
        const u = Store.getUserById(id);
        if (u) {
          reconcileUserVerification(u);
          setCurrentUser(u);
        } else {
          setCurrentUser(null);
        }
        setCurrentUserIdState(id);
        Store.getVerificationStatus(id);
      } else {
        setSession(null);
        setCurrentUser(null);
        setCurrentUserIdState(null);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: currentUser?.role || null,
        role: currentUser?.role || null,
        session,
        refreshSession,
        login,
        loginWithEmailAndPassword,
        loginAsAdmin,
        requestPasswordResetCode,
        verifyPasswordResetCode,
        completePasswordReset,
        changePassword,
        registerTenant,
        registerLandlord,
        registerAgent,
        logout,
        toggleSavedProperty,
        isPropertySaved,
        updateCurrentUserProfile,
        verifyEmail,
        resendVerificationEmail,
        changeUnverifiedEmail,
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
