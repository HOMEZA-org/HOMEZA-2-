import React, { useState, useEffect } from 'react';
import { Phone, ShieldCheck, CheckCircle2, AlertCircle, X, RefreshCw, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Store } from '../../services/store';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialPhoneNumber?: string;
}

export const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPhoneNumber,
}) => {
  const { currentUser, refreshSession } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(
    initialPhoneNumber || currentUser?.phoneNumber || '+234 803 123 4567'
  );
  const [step, setStep] = useState<'ENTER_PHONE' | 'ENTER_OTP' | 'SUCCESS'>('ENTER_PHONE');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [deliveryInfo, setDeliveryInfo] = useState<{
    reference?: string;
    maskedPhone?: string;
    deliveryStatus?: string;
    provider?: string;
    messageId?: string;
    isTest?: boolean;
    explanation?: string;
  } | null>(null);

  useEffect(() => {
    if (initialPhoneNumber) {
      setPhoneNumber(initialPhoneNumber);
    } else if (currentUser?.phoneNumber) {
      setPhoneNumber(currentUser.phoneNumber);
    }
  }, [initialPhoneNumber, currentUser]);

  useEffect(() => {
    let timer: any;
    if (resendCountdown > 0) {
      timer = setInterval(() => setResendCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCountdown]);

  if (!isOpen) return null;

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanRaw = phoneNumber.trim().replace(/[\s\-\(\)\.]/g, '');
    if (!cleanRaw || cleanRaw.length < 10) {
      setErrorMsg('Please enter a valid Nigerian mobile phone number (e.g. 09044753792 or +2349044753792).');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const response = await Store.sendVerificationPhoneOtp(phoneNumber.trim(), currentUser?.id);
      setDeliveryInfo({
        reference: response.reference,
        maskedPhone: response.maskedPhone,
        deliveryStatus: response.deliveryStatus,
        provider: response.provider,
        messageId: response.messageId,
        isTest: response.isTest,
        explanation: response.explanation,
      });
      setOtpDigits(['', '', '', '', '', '']);
      setStep('ENTER_OTP');
      setResendCountdown(response.cooldownSeconds || 45);
    } catch (err: any) {
      let friendlyMsg = err?.message || 'Failed to send verification code.';
      if (friendlyMsg.toLowerCase().includes('failed to fetch') || err?.name === 'TypeError') {
        friendlyMsg = 'Unable to connect to the verification service. Please check your internet connection or try again.';
      }
      setErrorMsg(friendlyMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.charAt(value.length - 1);
    }
    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    // Auto move to next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await Store.verifyVerificationPhoneOtp(phoneNumber.trim(), enteredOtp, currentUser?.id);
      if (result.user) {
        Store.updateUser(result.user);
      }
      refreshSession();
      setStep('SUCCESS');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to verify phone number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div
        id="phone-verification-modal"
        className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-lg">Phone Number Verification</h3>
              <p className="text-xs text-stone-500">HOMEZA Trust & Anti-Scam Verification</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'ENTER_PHONE' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Mobile Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+234 803 123 4567"
                  className="w-full text-base font-semibold border border-stone-300 rounded-xl p-3.5 focus:outline-emerald-700 text-stone-900 bg-white"
                />
                <p className="text-xs text-stone-500">
                  We will send a 6-digit one-time password (OTP) to this number via SMS to confirm ownership.
                </p>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 flex items-start gap-2.5 text-xs text-stone-600">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  Phone verification guarantees that all landlords, agents, and tenants can be verified in the event of an inspection or inquiry.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isSubmitting ? 'Sending Code...' : 'Send 6-Digit OTP Code'}</span>
                </button>
              </div>
            </form>
          )}

          {step === 'ENTER_OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-4 rounded-2xl text-xs space-y-2 border bg-emerald-50 border-emerald-200 text-emerald-950">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-800" />
                    <span className="text-emerald-900">OTP Sent via SMS</span>
                  </div>
                  {deliveryInfo?.messageId && (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      ID: {deliveryInfo.messageId}
                    </span>
                  )}
                </div>

                <p className="text-stone-700">
                  A 6-digit verification code has been dispatched via SMS to{' '}
                  <strong className="text-stone-900">{phoneNumber}</strong>.
                </p>

                <p className="text-[11px] text-stone-500">
                  Please check your phone's SMS messages and enter the code below. The code expires in 5 minutes.
                </p>
              </div>

              <div className="space-y-2 text-center">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Enter OTP
                </label>
                <div className="flex items-center justify-center gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-11 h-13 text-center text-xl font-extrabold border-2 border-stone-300 rounded-xl focus:border-emerald-600 focus:outline-none bg-white text-stone-900"
                    />
                  ))}
                </div>
                <p className="text-xs text-stone-500 pt-1">
                  Sent to <strong className="text-stone-800">{phoneNumber}</strong>
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setStep('ENTER_PHONE')}
                  className="text-xs text-stone-600 hover:text-stone-900 font-semibold cursor-pointer"
                >
                  Change phone number
                </button>

                <button
                  type="button"
                  disabled={resendCountdown > 0 || isSubmitting}
                  onClick={() => handleSendOtp()}
                  className="text-xs text-emerald-800 hover:text-emerald-900 font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>{resendCountdown > 0 ? `Resend OTP (${resendCountdown}s)` : 'Resend OTP'}</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || otpDigits.join('').length !== 6}
                  className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Verifying...' : 'Verify OTP'}</span>
                </button>
              </div>
            </form>
          )}

          {step === 'SUCCESS' && (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-stone-900">Phone Number Verified!</h4>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Your phone number ({phoneNumber}) is now securely verified on HOMEZA.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
