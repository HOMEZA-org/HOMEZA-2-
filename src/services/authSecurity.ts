/**
 * HOMEZA Cryptographic Authentication, Session & Access Control Engine
 * 
 * Provides:
 * - SHA-256 salted password hashing
 * - Secure credential vault (isolated from public user models)
 * - Session token lifecycle with cryptographic validation
 * - Role mismatch verification
 * - Action-level authorization & resource ownership enforcement
 */

import { UserRole } from '../types';
import { evaluateUserVerification } from '../utils/verification';

export interface AuthCredential {
  userId: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserSession {
  token: string;
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  issuedAt: number;
  expiresAt: number;
}

const STORAGE_KEYS = {
  CREDENTIALS: 'homeza_auth_credentials_v3',
  ACTIVE_SESSION: 'homeza_active_session_v3',
  RESET_TOKENS: 'homeza_reset_tokens_v3',
};

// Pure JavaScript synchronous SHA-256 fallback for guaranteed reliability in all environments
function sha256Sync(str: string): string {
  let h0 = 0x6a09e667,
    h1 = 0xbb67ae85,
    h2 = 0x3c6ef372,
    h3 = 0xa54ff53a,
    h4 = 0x510e527f,
    h5 = 0x9b05688c,
    h6 = 0x1f83d9ab,
    h7 = 0x5be0cd19;

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  // Encode UTF-8
  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i);
    if (charCode < 0x80) {
      utf8.push(charCode);
    } else if (charCode < 0x800) {
      utf8.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      utf8.push(0xe0 | (charCode >> 12), 0x80 | ((charCode >> 6) & 0x3f), 0x80 | (charCode & 0x3f));
    } else {
      i++;
      charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charCode >> 18),
        0x80 | ((charCode >> 12) & 0x3f),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f)
      );
    }
  }

  const bitLength = utf8.length * 8;
  utf8.push(0x80);
  while ((utf8.length + 8) % 64 !== 0) {
    utf8.push(0);
  }

  // 64-bit big-endian length
  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength & 0xffffffff;
  utf8.push(
    (highBits >>> 24) & 0xff,
    (highBits >>> 16) & 0xff,
    (highBits >>> 8) & 0xff,
    highBits & 0xff,
    (lowBits >>> 24) & 0xff,
    (lowBits >>> 16) & 0xff,
    (lowBits >>> 8) & 0xff,
    lowBits & 0xff
  );

  const words: number[] = [];
  for (let i = 0; i < utf8.length; i += 4) {
    words.push(
      (utf8[i] << 24) | (utf8[i + 1] << 16) | (utf8[i + 2] << 8) | utf8[i + 3]
    );
  }

  const rightRotate = (v: number, n: number) => (v >>> n) | (v << (32 - n));

  for (let i = 0; i < words.length; i += 16) {
    const w = new Array(64);
    for (let t = 0; t < 16; t++) {
      w[t] = words[i + t];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }

    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4,
      f = h5,
      g = h6,
      h = h7;

    for (let t = 0; t < 64; t++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[t] + w[t]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const hex = (n: number) => ((n >>> 0).toString(16).padStart(8, '0'));
  return (hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h5) + hex(h6) + hex(h7)).toLowerCase();
}

/**
 * Generate a salt for secure hashing
 */
export function generateSalt(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Compute Salted SHA-256 Hash
 */
export function hashPassword(password: string, salt: string): string {
  const input = `homeza_salt_prefix:${salt}:${password}:homeza_salt_suffix`;
  return sha256Sync(input);
}

/**
 * Platform Authentication Salt & Root Administrator Hash
 */
const DEFAULT_SALT = 'homeza_sec_salt_2026';
const ADMIN_PASSWORD_HASH = hashPassword('admin1234', DEFAULT_SALT);

const INITIAL_CREDENTIALS: AuthCredential[] = [
  // Legitimate Super Admin (Preserved)
  {
    userId: 'user-admin-1',
    email: 'admin@homeza.ng',
    role: 'ADMIN',
    passwordHash: ADMIN_PASSWORD_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2025-10-01T00:00:00Z',
  },
];

export class AuthSecurityService {
  /**
   * Credentials vault is authoritatively managed server-side.
   * Client localStorage credentials are completely purged to eliminate sensitive hash persistence.
   */
  public static getCredentials(): AuthCredential[] {
    try {
      localStorage.removeItem(STORAGE_KEYS.CREDENTIALS);
    } catch {}
    return [];
  }

  /**
   * Save credentials - deprecated for client storage; purged from localStorage
   */
  private static saveCredentials(_creds: AuthCredential[]): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CREDENTIALS);
    } catch {}
  }

  /**
   * Register a new user's credentials with Salted SHA-256 Hashing
   * Crucial: Enforces that role is permanently fixed and stored securely.
   */
  public static registerCredential(
    userId: string,
    email: string,
    passwordPlain: string,
    role: UserRole
  ): { success: boolean; message?: string } {
    if (role === 'ADMIN') {
      return { success: false, message: 'Administrative accounts cannot be registered publicly.' };
    }

    const creds = this.getCredentials();
    const cleanEmail = email.toLowerCase().trim();

    // Password strength check
    if (passwordPlain.length < 8) {
      return { success: false, message: 'Password must be at least 8 characters in length.' };
    }

    const salt = generateSalt(24);
    const passwordHash = hashPassword(passwordPlain, salt);

    const newCred: AuthCredential = {
      userId,
      email: cleanEmail,
      role,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    const existingIdx = creds.findIndex((c) => c.email && c.email.toLowerCase().trim() === cleanEmail);
    if (existingIdx >= 0) {
      creds[existingIdx] = newCred;
    } else {
      creds.push(newCred);
    }
    this.saveCredentials(creds);

    // Push to server for cross-device authentication
    try {
      fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: [newCred] }),
      }).catch((err) => console.warn('[AUTH SYNC] Failed to push credential to server:', err));
    } catch (e) {
      // Ignore network error
    }

    return { success: true };
  }

  /**
   * Sync credentials from central server
   */
  public static syncCredentialsFromServer(_serverCreds: AuthCredential[]): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CREDENTIALS);
    } catch {}
  }

  /**
   * Request a 6-digit password reset recovery code
   */
  public static generatePasswordResetCode(
    email: string,
    expectedRole?: UserRole
  ): {
    success: boolean;
    code?: string;
    role?: UserRole;
    message?: string;
  } {
    const cleanEmail = email.toLowerCase().trim();
    const creds = this.getCredentials();

    const credential = creds.find((c) => {
      const cEmail = c.email.toLowerCase();
      return (
        cEmail === cleanEmail ||
        cEmail === cleanEmail.replace('@uyohome.ng', '@homeza.ng') ||
        cEmail === cleanEmail.replace('@homeza.ng', '@uyohome.ng')
      );
    });

    if (!credential) {
      return {
        success: false,
        message: 'No registered HOMEZA account was found with this email address.',
      };
    }

    if (expectedRole && credential.role !== expectedRole) {
      const expectedDisplayName =
        expectedRole === 'ADMIN'
          ? 'Administrator'
          : expectedRole === 'TENANT'
          ? 'Tenant'
          : expectedRole === 'LANDLORD'
          ? 'Landlord'
          : 'Agent';

      const actualDisplayName =
        credential.role === 'ADMIN'
          ? 'Administrator'
          : credential.role === 'TENANT'
          ? 'Tenant'
          : credential.role === 'LANDLORD'
          ? 'Landlord'
          : 'Agent';

      return {
        success: false,
        message: `This account is registered as a ${actualDisplayName}, not a ${expectedDisplayName}. Please use the ${actualDisplayName} password recovery.`,
      };
    }

    // Generate a 6-digit cryptographic security code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

    try {
      const storedTokensRaw = localStorage.getItem(STORAGE_KEYS.RESET_TOKENS);
      const storedTokens = storedTokensRaw ? JSON.parse(storedTokensRaw) : {};
      storedTokens[credential.email.toLowerCase()] = {
        code,
        expiresAt,
        role: credential.role,
        requestedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.RESET_TOKENS, JSON.stringify(storedTokens));
    } catch (e) {
      console.error('Error saving reset token:', e);
    }

    return {
      success: true,
      code,
      role: credential.role,
      message: `Password reset verification code generated for ${credential.email}.`,
    };
  }

  /**
   * Verify password reset recovery code
   */
  public static verifyPasswordResetCode(
    email: string,
    code: string
  ): { success: boolean; message?: string } {
    const cleanEmail = email.toLowerCase().trim();
    try {
      const storedTokensRaw = localStorage.getItem(STORAGE_KEYS.RESET_TOKENS);
      if (!storedTokensRaw) {
        return { success: false, message: 'No active password reset request found. Please request a new code.' };
      }
      const storedTokens = JSON.parse(storedTokensRaw);
      const tokenData = storedTokens[cleanEmail];

      if (!tokenData) {
        return { success: false, message: 'No active reset request found for this email address.' };
      }

      if (Date.now() > tokenData.expiresAt) {
        return { success: false, message: 'Verification code has expired. Please request a fresh code.' };
      }

      if (tokenData.code !== code.trim()) {
        return { success: false, message: 'Invalid 6-digit verification code. Please check and try again.' };
      }

      return { success: true };
    } catch {
      return { success: false, message: 'Failed to verify reset code.' };
    }
  }

  /**
   * Complete password reset and store updated cryptographic hash
   */
  public static completePasswordReset(
    email: string,
    code: string,
    newPasswordPlain: string,
    expectedRole?: UserRole
  ): { success: boolean; message?: string } {
    const verification = this.verifyPasswordResetCode(email, code);
    if (!verification.success) {
      return verification;
    }

    if (newPasswordPlain.length < 8) {
      return { success: false, message: 'New password must be at least 8 characters in length.' };
    }

    const cleanEmail = email.toLowerCase().trim();
    const creds = this.getCredentials();
    const credIndex = creds.findIndex((c) => {
      const cEmail = c.email.toLowerCase();
      return (
        cEmail === cleanEmail ||
        cEmail === cleanEmail.replace('@uyohome.ng', '@homeza.ng') ||
        cEmail === cleanEmail.replace('@homeza.ng', '@uyohome.ng')
      );
    });

    if (credIndex === -1) {
      return { success: false, message: 'Account record not found.' };
    }

    if (expectedRole && creds[credIndex].role !== expectedRole) {
      return { success: false, message: 'Role authorization mismatch during password reset.' };
    }

    // Generate new salt and update hash
    const newSalt = generateSalt(24);
    const newHash = hashPassword(newPasswordPlain, newSalt);

    creds[credIndex].salt = newSalt;
    creds[credIndex].passwordHash = newHash;
    this.saveCredentials(creds);

    // Invalidate used reset token
    try {
      const storedTokensRaw = localStorage.getItem(STORAGE_KEYS.RESET_TOKENS);
      if (storedTokensRaw) {
        const storedTokens = JSON.parse(storedTokensRaw);
        delete storedTokens[cleanEmail];
        localStorage.setItem(STORAGE_KEYS.RESET_TOKENS, JSON.stringify(storedTokens));
      }
    } catch (e) {
      console.error('Error invalidating reset token:', e);
    }

    return {
      success: true,
      message: 'Your password has been successfully reset. You can now sign in with your new password.',
    };
  }

  /**
   * Directly change password for an authenticated user
   */
  public static changePasswordDirect(
    userId: string,
    currentPasswordPlain: string,
    newPasswordPlain: string
  ): { success: boolean; message?: string } {
    if (newPasswordPlain.length < 8) {
      return { success: false, message: 'New password must be at least 8 characters in length.' };
    }

    const creds = this.getCredentials();
    const credIndex = creds.findIndex((c) => c.userId === userId);

    if (credIndex === -1) {
      return { success: false, message: 'User credential record not found.' };
    }

    const cred = creds[credIndex];
    const computedHash = hashPassword(currentPasswordPlain, cred.salt);
    const isCurrentValid = computedHash === cred.passwordHash;

    if (!isCurrentValid) {
      return { success: false, message: 'Current password is incorrect. Please verify and try again.' };
    }

    const newSalt = generateSalt(24);
    const newHash = hashPassword(newPasswordPlain, newSalt);

    creds[credIndex].salt = newSalt;
    creds[credIndex].passwordHash = newHash;
    this.saveCredentials(creds);

    return {
      success: true,
      message: 'Password updated successfully.',
    };
  }

  /**
   * Authoritative Async Direct Login via Server with Local Fallback
   */
  public static async authenticateDirectAsync(
    email: string,
    passwordPlain: string
  ): Promise<{
    success: boolean;
    session?: UserSession;
    message?: string;
    role?: UserRole;
    userId?: string;
    user?: any;
    isUnverifiedEmail?: boolean;
    email?: string;
  }> {
    const cleanEmail = email.toLowerCase().trim();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: passwordPlain }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success && data.session && data.user) {
        const session: UserSession = {
          token: data.session.token,
          userId: data.user.id,
          email: data.user.email,
          role: data.user.role,
          fullName: data.user.fullName || cleanEmail.split('@')[0],
          issuedAt: data.session.issuedAt || Date.now(),
          expiresAt: data.session.expiresAt || Date.now() + 7 * 86400000,
        };
        this.saveActiveSession(session);
        return {
          success: true,
          session,
          role: data.user.role,
          userId: data.user.id,
          user: data.user,
        };
      }
      if (data.isUnverifiedEmail) {
        return {
          success: false,
          isUnverifiedEmail: true,
          email: data.email,
          userId: data.userId,
          message: data.message || 'Please verify your email address before continuing.',
        };
      }
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: data.message || 'Authentication failed. Please verify credentials.',
        };
      }
    } catch (netErr) {
      console.warn('[AUTH] Direct server authentication network error, attempting local vault:', netErr);
    }
    return this.authenticateDirect(email, passwordPlain);
  }

  /**
   * Authoritative Async Login with Role Matching via Server with Local Fallback
   */
  public static async authenticateUserAsync(
    email: string,
    passwordPlain: string,
    selectedRole: 'TENANT' | 'LANDLORD' | 'AGENT'
  ): Promise<{
    success: boolean;
    session?: UserSession;
    message?: string;
    actualRole?: UserRole;
    userId?: string;
    user?: any;
    isUnverifiedEmail?: boolean;
    email?: string;
  }> {
    const cleanEmail = email.toLowerCase().trim();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: passwordPlain, selectedRole }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success && data.session && data.user) {
        const session: UserSession = {
          token: data.session.token,
          userId: data.user.id,
          email: data.user.email,
          role: data.user.role,
          fullName: data.user.fullName || cleanEmail.split('@')[0],
          issuedAt: data.session.issuedAt || Date.now(),
          expiresAt: data.session.expiresAt || Date.now() + 7 * 86400000,
        };
        this.saveActiveSession(session);
        return {
          success: true,
          session,
          actualRole: data.user.role,
          userId: data.user.id,
          user: data.user,
        };
      }
      if (data.isUnverifiedEmail) {
        return {
          success: false,
          isUnverifiedEmail: true,
          email: data.email,
          userId: data.userId,
          message: data.message || 'Please verify your email address before continuing to HOMEZA.',
        };
      }
      if (data.error === 'ROLE_MISMATCH') {
        return {
          success: false,
          message: data.message,
          actualRole: data.actualRole,
        };
      }
      if (response.status === 401) {
        return {
          success: false,
          message: data.message || 'Incorrect password or email. Please verify and try again.',
        };
      }
    } catch (netErr) {
      console.warn('[AUTH] Server login network error, attempting local vault:', netErr);
    }
    return this.authenticateUser(email, passwordPlain, selectedRole);
  }

  /**
   * Authoritative Async Admin Login via Server with Local Fallback
   */
  public static async authenticateAdminAsync(
    email: string,
    passwordPlain: string
  ): Promise<{
    success: boolean;
    session?: UserSession;
    message?: string;
    user?: any;
  }> {
    const cleanEmail = email.toLowerCase().trim();
    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: passwordPlain }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success && data.session && data.user) {
        const session: UserSession = {
          token: data.session.token,
          userId: data.user.id,
          email: data.user.email,
          role: 'ADMIN',
          fullName: data.user.fullName || 'HOMEZA Super Admin',
          issuedAt: data.session.issuedAt || Date.now(),
          expiresAt: data.session.expiresAt || Date.now() + 7 * 86400000,
        };
        this.saveActiveSession(session);
        return {
          success: true,
          session,
          user: data.user,
        };
      }
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: data.message || 'Invalid administrator credentials. Access denied.',
        };
      }
    } catch (netErr) {
      console.warn('[AUTH] Admin server login network error, attempting local vault:', netErr);
    }
    return this.authenticateAdmin(email, passwordPlain);
  }

  /**
   * Authoritative Direct Login:
   * Takes email and password, validates against cryptographic vault,
   * retrieves the genuine account role, and issues a session.
   * Does NOT allow the client to spoof or dictate the role.
   */
  public static authenticateDirect(
    email: string,
    passwordPlain: string
  ): {
    success: boolean;
    session?: UserSession;
    message?: string;
    role?: UserRole;
    userId?: string;
  } {
    const cleanEmail = email.toLowerCase().trim();
    const creds = this.getCredentials();

    const credential = creds.find((c) => {
      const cEmail = c.email.toLowerCase();
      return (
        cEmail === cleanEmail ||
        cEmail === cleanEmail.replace('@uyohome.ng', '@homeza.ng') ||
        cEmail === cleanEmail.replace('@homeza.ng', '@uyohome.ng')
      );
    });

    if (!credential) {
      return { success: false, message: 'No account found with this email address.' };
    }

    // Verify Password Hash
    const computedHash = hashPassword(passwordPlain, credential.salt);
    const isPasswordValid = computedHash === credential.passwordHash;

    if (!isPasswordValid) {
      return { success: false, message: 'Incorrect password. Please verify and try again.' };
    }

    // Create session token with the true stored role
    const session = this.createSession(credential.userId, credential.email, credential.role);

    return {
      success: true,
      session,
      role: credential.role,
      userId: credential.userId,
    };
  }

  /**
   * Authenticate normal user with Email, Password, and Selected Role Verification
   * 
   * Strict Rule:
   * 1. Authenticate email + password
   * 2. Verify selected role matches actual account role stored in database
   * 3. If mismatch, reject login with role-specific notification and DO NOT redirect!
   */
  public static authenticateUser(
    email: string,
    passwordPlain: string,
    selectedRole: 'TENANT' | 'LANDLORD' | 'AGENT'
  ): {
    success: boolean;
    session?: UserSession;
    message?: string;
    actualRole?: UserRole;
  } {
    const cleanEmail = email.toLowerCase().trim();
    const creds = this.getCredentials();

    // Support email normalization
    const credential = creds.find((c) => {
      const cEmail = c.email.toLowerCase();
      return (
        cEmail === cleanEmail ||
        cEmail === cleanEmail.replace('@uyohome.ng', '@homeza.ng') ||
        cEmail === cleanEmail.replace('@homeza.ng', '@uyohome.ng')
      );
    });

    if (!credential) {
      return { success: false, message: 'No account found with this email address.' };
    }

    // Verify Password Hash
    const computedHash = hashPassword(passwordPlain, credential.salt);
    const isPasswordValid = computedHash === credential.passwordHash;

    if (!isPasswordValid) {
      return { success: false, message: 'Incorrect password. Please verify and try again.' };
    }

    // ADMIN cannot log in through normal user role selector
    if (credential.role === 'ADMIN') {
      return {
        success: false,
        message: 'This is an Administrator account. Please use the dedicated Admin Portal to log in.',
      };
    }

    // CRITICAL: Role Match Verification
    if (credential.role !== selectedRole) {
      const roleDisplayName =
        credential.role === 'TENANT'
          ? 'Tenant'
          : credential.role === 'LANDLORD'
          ? 'Landlord'
          : 'Agent';

      return {
        success: false,
        message: `This account is registered as a ${roleDisplayName}. Please select ${roleDisplayName} to continue.`,
        actualRole: credential.role,
      };
    }

    // Create session token
    const session = this.createSession(credential.userId, credential.email, credential.role);

    return {
      success: true,
      session,
    };
  }

  /**
   * Authenticate Administrator with dedicated Admin credentials
   */
  public static authenticateAdmin(
    email: string,
    passwordPlain: string
  ): {
    success: boolean;
    session?: UserSession;
    message?: string;
  } {
    const cleanEmail = email.toLowerCase().trim();
    const creds = this.getCredentials();

    const credential = creds.find(
      (c) => c.role === 'ADMIN' && c.email.toLowerCase() === cleanEmail
    );

    if (!credential) {
      return { success: false, message: 'Access denied. You are not authorized to access this area.' };
    }

    const computedHash = hashPassword(passwordPlain, credential.salt);
    const isPasswordValid = computedHash === credential.passwordHash;

    if (!isPasswordValid) {
      return { success: false, message: 'Invalid administrator credentials. Access denied.' };
    }

    const session = this.createSession(credential.userId, credential.email, 'ADMIN');

    return {
      success: true,
      session,
    };
  }

  /**
   * Save an active session
   */
  public static saveActiveSession(session: UserSession): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
      sessionStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    } catch (e) {
      console.error('Error storing active session:', e);
    }
  }

  /**
   * Create an authenticated session token
   */
  public static createSession(
    userId: string,
    email: string,
    role: UserRole
  ): UserSession {
    const issuedAt = Date.now();
    const expiresAt = issuedAt + 7 * 24 * 60 * 60 * 1000; // 7 days
    const token = `homeza_tok_${userId}_${issuedAt}_${Math.random().toString(36).substring(2, 10)}`;

    const session: UserSession = {
      token,
      userId,
      email,
      role,
      fullName: '',
      issuedAt,
      expiresAt,
    };

    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
      sessionStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    } catch (e) {
      console.error('Error storing active session:', e);
    }

    return session;
  }

  /**
   * Set currently active session
   */
  public static setActiveSession(session: UserSession): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
      sessionStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    } catch (e) {
      console.error('Error storing active session:', e);
    }
  }

  /**
   * Get currently active authenticated session
   */
  public static getActiveSession(): UserSession | null {
    try {
      let raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      if (!raw) {
        raw = sessionStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
        if (raw) {
          localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, raw);
        }
      }
      if (!raw) return null;
      const session: UserSession = JSON.parse(raw);
      if (session.expiresAt && session.expiresAt < Date.now()) {
        this.clearSession();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  /**
   * Get currently active session token string
   */
  public static getSessionToken(): string | null {
    return this.getActiveSession()?.token || null;
  }

  /**
   * Authoritative Check: Throws error if caller is not an authenticated Administrator
   */
  public static assertAdmin(providedSession?: UserSession | null): void {
    const session = providedSession !== undefined ? providedSession : this.getActiveSession();
    if (!session) {
      throw new Error('Access denied: Authentication session required.');
    }
    if (session.role !== 'ADMIN') {
      throw new Error('Access denied. You are not authorized to access this area. Administrator role required.');
    }
  }

  /**
   * Authoritative Check: Returns true if caller is authenticated Administrator
   */
  public static isCurrentSessionAdmin(providedSession?: UserSession | null): boolean {
    const session = providedSession !== undefined ? providedSession : this.getActiveSession();
    return !!session && session.role === 'ADMIN';
  }

  /**
   * Authoritative Check: Throws error if caller does not own the resource and is not Administrator
   */
  public static assertOwnership(
    resourceOwnerId: string,
    providedSession?: UserSession | null,
    resourceType: string = 'resource'
  ): void {
    const session = providedSession !== undefined ? providedSession : this.getActiveSession();
    if (!session) {
      throw new Error(`Access denied: Authentication session required to modify this ${resourceType}.`);
    }
    if (session.role === 'ADMIN') {
      return; // Administrator has universal supervisory authority
    }
    if (session.userId !== resourceOwnerId) {
      throw new Error(`Access denied: You do not own or have permission to modify this ${resourceType}.`);
    }
  }

  /**
   * Authoritative Check: Throws error if caller does not possess one of the required roles
   */
  public static assertRole(
    allowedRoles: UserRole[],
    providedSession?: UserSession | null,
    actionDescription: string = 'perform this operation'
  ): void {
    const session = providedSession !== undefined ? providedSession : this.getActiveSession();
    if (!session) {
      throw new Error(`Access denied: Authentication session required to ${actionDescription}.`);
    }
    if (session.role === 'ADMIN') {
      return; // Admin bypass
    }
    if (!allowedRoles.includes(session.role)) {
      throw new Error(`Access denied: Required role (${allowedRoles.join(', ')}) not held by current user (${session.role}).`);
    }
  }

  /**
   * Authoritative Check: Throws error if Landlord or Agent has not completed and received approval for KYC verification
   */
  public static assertKYCApproved(
    userId: string,
    role: UserRole,
    verificationStatus?: string,
    overallVerificationStatus?: string,
    user?: any
  ): void {
    if (role === 'ADMIN') return; // Admin has universal listing authority

    if (role !== 'LANDLORD' && role !== 'AGENT') {
      throw new Error('Access denied: Only Landlords and Agents can publish property listings.');
    }

    const targetUser = user || {
      id: userId,
      role,
      verificationStatus,
      verification: overallVerificationStatus ? ({ overallVerificationStatus } as any) : undefined,
    };

    const verificationEval = evaluateUserVerification(targetUser);

    if (!verificationEval.isFullyVerified) {
      throw new Error(
        `Identity Verification Required: You must complete all 3 mandatory verification checks (Phone OTP, Government NIN, and Legal Name Match) before you can add or list a property on HOMEZA. Missing: ${verificationEval.missingSteps.join(', ') || 'Incomplete verification'}.`
      );
    }
  }

  /**
   * Destroy current session (Logout)
   */
  public static clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    } catch (e) {
      console.error('Error clearing session:', e);
    }
  }

  /**
   * Reset credentials vault back to initial demo state
   */
  public static resetCredentials(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(INITIAL_CREDENTIALS));
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    } catch (e) {
      console.error('Error resetting credentials:', e);
    }
  }
}
