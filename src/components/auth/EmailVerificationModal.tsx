import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit2,
  ShieldCheck,
  X,
  Lock,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { useAuth, isAllowedRegistrationEmail } from '../../context/AuthContext';
import { Store, syncStoreWithServer } from '../../services/store';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetEmail?: string;
  targetUserId?: string;
  onSuccess?: () => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  onClose,
  targetEmail,
  targetUserId,
  onSuccess,
}) => {
  const { currentUser, updateCurrentUserProfile } = useAuth();

  const activeEmail = targetEmail || currentUser?.email || '';
  const activeUserId = targetUserId || currentUser?.id || '';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Resend cooldown timer (60s default)
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  // Change Email State
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [editEmailError, setEditEmailError] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setResendNotice(null);
      setDigits(['', '', '', '', '', '']);
      setIsSuccess(false);
      setIsEditingEmail(false);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen, activeEmail]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, value: string) => {
    // Handle pasting 6 digits
    if (value.length > 1) {
      const sanitized = value.replace(/[^0-9]/g, '').slice(0, 6);
      if (sanitized) {
        const newDigits = [...digits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = sanitized[i] || '';
        }
        setDigits(newDigits);
        const nextFocus = Math.min(sanitized.length, 5);
        inputRefs.current[nextFocus]?.focus();
        return;
      }
    }

    const singleDigit = value.replace(/[^0-9]/g, '');
    const newDigits = [...digits];
    newDigits[index] = singleDigit;
    setDigits(newDigits);

    if (singleDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullCode = digits.join('');

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code from your email.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResendNotice(null);

    try {
      // Call authoritative backend verification endpoint
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: activeEmail,
          userId: activeUserId,
          code: fullCode,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || 'Invalid verification code. Please check your email and try again.');
        setIsSubmitting(false);
        return;
      }

      // Mark verified in client Store and Context
      if (currentUser && (currentUser.email === activeEmail || currentUser.id === activeUserId)) {
        const updatedUser = {
          ...currentUser,
          emailVerified: true,
          emailVerifiedAt: new Date().toISOString(),
        };
        Store.updateUser(updatedUser);
        updateCurrentUserProfile(updatedUser);
      } else {
        const found = (activeUserId ? Store.getUserById(activeUserId) : null) || (activeEmail ? Store.getUserByEmail(activeEmail) : null);
        if (found) {
          const updatedUser = {
            ...found,
            emailVerified: true,
            emailVerifiedAt: new Date().toISOString(),
          };
          Store.updateUser(updatedUser);
          Store.setCurrentUserId(updatedUser.id);
          updateCurrentUserProfile(updatedUser);
        }
      }

      syncStoreWithServer(true);
      setIsSuccess(true);

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1600);
    } catch (err: any) {
      setError('Network connection error. Could not connect to verification server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    setResendNotice(null);

    try {
      const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: activeEmail,
          userId: activeUserId,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCooldown(60);
        setResendNotice(`A fresh verification code was sent to ${activeEmail}. Please check your inbox.`);
      } else {
        setError(data.message || "We couldn't send the verification email right now. Please try again.");
      }
    } catch (err) {
      setError("We couldn't send the verification email right now. Please check your connection and try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleSaveNewEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditEmailError(null);

    const clean = newEmail.trim().toLowerCase();
    if (!clean) {
      setEditEmailError('Please enter a valid email address.');
      return;
    }

    if (!isAllowedRegistrationEmail(clean)) {
      setEditEmailError('Registration is restricted to @gmail.com, @yahoo.com, @outlook.com, and @hotmail.com domains.');
      return;
    }

    if (clean === activeEmail.toLowerCase()) {
      setIsEditingEmail(false);
      return;
    }

    setIsSavingEmail(true);
    try {
      const response = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldEmail: activeEmail,
          newEmail: clean,
          userId: activeUserId,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setEditEmailError(data.message || 'Could not update email address.');
        setIsSavingEmail(false);
        return;
      }

      if (currentUser && currentUser.id === activeUserId) {
        const updated = {
          ...currentUser,
          email: clean,
          emailVerified: false,
          emailVerifiedAt: undefined,
        };
        Store.updateUser(updated);
        updateCurrentUserProfile(updated);
      }

      setIsEditingEmail(false);
      setCooldown(60);
      setResendNotice(`Email updated to ${clean}. A new verification code has been dispatched to your inbox.`);
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setEditEmailError('Failed to update email. Please check your connection and try again.');
    } finally {
      setIsSavingEmail(false);
    }
  };

  return (
    <div
      id="email-verification-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="email-verification-modal-card"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden"
      >
        {/* Top Header Banner */}
        <div className="bg-emerald-800 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg leading-tight">Verify Your Email</h3>
              <p className="text-xs text-emerald-100/80">HOMEZA Account Security</p>
            </div>
          </div>
          <button
            id="close-email-verification-modal-btn"
            onClick={onClose}
            aria-label="Close verification modal"
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {isSuccess ? (
            <div className="text-center py-6 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="font-serif font-bold text-xl text-stone-900 mb-2">Email Verified Successfully!</h4>
              <p className="text-sm text-stone-600 mb-4 max-w-xs mx-auto">
                Your email address has been verified. You now have full access to HOMEZA.
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5" />
                Unlocking Full Access...
              </div>
            </div>
          ) : (
            <>
              {/* Instructions and Recipient Pill */}
              <div className="mb-4">
                <p className="text-sm text-stone-700 leading-relaxed">
                  We've sent a verification code to <strong className="text-stone-900 font-semibold">{activeEmail || 'your email address'}</strong>. Please check your inbox and enter the code below.
                </p>
              </div>

              {/* Recipient Email Address Pill with Change Email Trigger */}
              <div className="mb-5 bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Mail className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <div className="truncate">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Target Email</p>
                    <p className="text-xs font-bold text-stone-900 truncate">{activeEmail || 'Your registered email'}</p>
                  </div>
                </div>
                {!isEditingEmail && (
                  <button
                    id="change-email-btn"
                    type="button"
                    onClick={() => {
                      setNewEmail(activeEmail);
                      setIsEditingEmail(true);
                      setEditEmailError(null);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 px-2.5 py-1 rounded-lg transition-all flex-shrink-0 ml-2"
                  >
                    <Edit2 className="w-3 h-3" />
                    Change Email
                  </button>
                )}
              </div>

              {/* Inline Change Email Form */}
              {isEditingEmail && (
                <form onSubmit={handleSaveNewEmail} className="mb-5 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl animate-fade-in">
                  <h5 className="text-xs font-bold text-stone-900 mb-1">Change Email Address</h5>
                  <p className="text-[11px] text-stone-600 mb-3">
                    Enter your correct email. A fresh 6-digit verification code will be sent immediately.
                  </p>
                  <div className="flex gap-2">
                    <input
                      id="new-email-input"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. name@gmail.com"
                      required
                      className="flex-1 text-sm px-3 py-2 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      id="save-new-email-btn"
                      type="submit"
                      disabled={isSavingEmail}
                      className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isSavingEmail ? 'Sending...' : 'Update & Send'}
                    </button>
                    <button
                      id="cancel-edit-email-btn"
                      type="button"
                      onClick={() => setIsEditingEmail(false)}
                      className="px-2.5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {editEmailError && (
                    <p className="text-xs text-red-600 mt-2 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {editEmailError}
                    </p>
                  )}
                </form>
              )}

              {/* Error Notice */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              {/* Resend Notice */}
              {resendNotice && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                  <p className="font-medium">{resendNotice}</p>
                </div>
              )}

              <form onSubmit={handleVerify}>
                <div className="mb-5">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2.5 text-center">
                    Enter 6-Digit Code
                  </label>
                  <div className="flex justify-center items-center gap-2 sm:gap-2.5">
                    {digits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          inputRefs.current[idx] = el;
                        }}
                        id={`verification-digit-${idx + 1}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        className="w-11 h-13 text-center text-xl font-bold font-mono text-stone-900 bg-stone-50 border-2 border-stone-300 rounded-xl focus:border-emerald-600 focus:bg-white focus:outline-none transition-all shadow-xs"
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-stone-500 text-center mt-2.5">
                    This code expires in 10 minutes.
                  </p>
                </div>

                {/* Primary Action Button */}
                <button
                  id="confirm-verify-email-btn"
                  type="submit"
                  disabled={isSubmitting || fullCode.length !== 6}
                  className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Verifying Email...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Verify Email
                    </>
                  )}
                </button>
              </form>

              {/* Spam/Junk Folder Help Note */}
              <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <Inbox className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-700" />
                <p className="leading-tight">
                  Didn't receive the email? Check your <strong>spam or junk folder</strong>, or click Resend Code below.
                </p>
              </div>

              {/* Footer Actions */}
              <div className="mt-4 pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <button
                  id="resend-verification-code-btn"
                  type="button"
                  onClick={handleResendCode}
                  disabled={cooldown > 0 || isResending}
                  className="flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 disabled:text-stone-400 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  {cooldown > 0 ? `Resend Code in (${cooldown}s)` : 'Resend Code'}
                </button>

                <span className="text-[11px] text-stone-500 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-stone-400" />
                  Protected by HOMEZA Security
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
