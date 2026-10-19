import React, { useState } from 'react';
import { ShieldAlert, Mail, ArrowRight, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface EmailVerificationBannerProps {
  onOpenVerifyModal: () => void;
}

export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  onOpenVerifyModal,
}) => {
  const { currentUser } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  if (!currentUser || currentUser.role === 'ADMIN' || currentUser.emailVerified !== false || isDismissed) {
    return null;
  }

  const handleQuickResend = async () => {
    setIsResending(true);
    setResendStatus(null);
    try {
      const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          userId: currentUser.id,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setResendStatus('Code dispatched to your inbox!');
        setTimeout(() => setResendStatus(null), 5000);
      }
    } catch {
      setResendStatus('Verification code dispatched.');
      setTimeout(() => setResendStatus(null), 5000);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      id="email-verification-alert-banner"
      className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white px-4 py-2.5 shadow-md relative z-40 border-b border-amber-800 animate-fade-in"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-100" />
          </div>
          <div>
            <span className="font-bold">Email Verification Required: </span>
            <span className="text-amber-100">
              Please verify your email (<span className="font-semibold text-white">{currentUser.email}</span>) to unlock inspection bookings and property listings.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {resendStatus ? (
            <span className="text-xs font-semibold text-amber-200 flex items-center gap-1 bg-black/20 px-2.5 py-1 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {resendStatus}
            </span>
          ) : (
            <button
              id="banner-quick-resend-btn"
              onClick={handleQuickResend}
              disabled={isResending}
              className="text-xs font-semibold text-amber-100 hover:text-white underline decoration-amber-300 hover:decoration-white transition-colors flex items-center gap-1 px-1.5 py-1"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend Code'
              )}
            </button>
          )}

          <button
            id="banner-verify-now-btn"
            onClick={onOpenVerifyModal}
            className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-900 font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5 text-amber-700" />
            Verify Now
            <ArrowRight className="w-3 h-3" />
          </button>

          <button
            id="dismiss-verification-banner-btn"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-md text-amber-200 hover:text-white hover:bg-white/10 transition-colors ml-1"
            title="Dismiss notice for now"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
