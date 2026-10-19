import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Copy,
  Check,
  AlertCircle,
  X,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Payment, PaymentMethod, Property, PropertyInspection } from '../../types';
import { Store } from '../../services/store';
import { PLATFORM_CONFIG, formatNaira } from '../../config/platform';
import { useAuth } from '../../context/AuthContext';

interface PaymentModalProps {
  property: Property;
  inspectionId?: string;
  amount?: number;
  onClose: () => void;
  onSuccess?: (payment: Payment) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  property,
  inspectionId,
  amount: initialAmount,
  onClose,
  onSuccess,
}) => {
  const effectiveAmount =
    initialAmount ||
    property.inspectionFee ||
    (typeof property.pricing?.inspectionFee === 'number' ? property.pricing.inspectionFee : 3000);
  const amount = Math.min(Math.max(effectiveAmount, 3000), 5000);

  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'PAYSTACK' | 'BANK_TRANSFER'>('PAYSTACK');

  // Authoritative Inspection Booking Record
  const [activeBooking, setActiveBooking] = useState<PropertyInspection | null>(() => {
    if (inspectionId) {
      return Store.getInspections().find((i) => i.id === inspectionId || i.bookingId === inspectionId) || null;
    }
    return null;
  });
  const [bookingId, setBookingId] = useState<string>(
    inspectionId || activeBooking?.bookingId || activeBooking?.id || ''
  );

  // Contact Details
  const [tenantName, setTenantName] = useState(activeBooking?.tenantName || currentUser?.fullName || '');
  const [tenantEmail, setTenantEmail] = useState(activeBooking?.tenantEmail || currentUser?.email || '');
  const [tenantPhone, setTenantPhone] = useState(activeBooking?.tenantPhone || currentUser?.phoneNumber || '');

  // Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);

  // Result & Active Checkout States
  const [completedPayment, setCompletedPayment] = useState<Payment | null>(null);
  const [activePaystackPayment, setActivePaystackPayment] = useState<{
    payment: Payment;
    authUrl?: string;
    accessCode?: string;
    reference: string;
    publicKey?: string;
    isLiveMode?: boolean;
    isBankTransferFlow?: boolean;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Ensure persistent inspection booking record exists and is synchronized
  useEffect(() => {
    let b = inspectionId
      ? Store.getInspections().find((i) => i.id === inspectionId || i.bookingId === inspectionId) || null
      : null;
    const currentUserId = currentUser?.id || 'tenant-user';
    if (!b) {
      const existing = Store.getInspections().find(
        (i) => i.propertyId === property.id && i.tenantId === currentUserId && i.paymentStatus !== 'PAID' && i.paymentStatus !== 'verified'
      );
      if (existing) {
        b = existing;
      } else {
        b = Store.requestInspection({
          propertyId: property.id,
          propertyTitle: property.title,
          propertyLocationArea: property.location?.area || 'Afaha Ube Itam',
          propertyExactAddress: `${property.location?.street || ''}, ${property.location?.area || 'Afaha Ube Itam'}, Uyo`,
          propertyPrice: property.pricing?.rent || 450000,
          propertyImage: property.images?.[0]?.url,
          tenantId: currentUserId,
          tenantName: currentUser?.fullName || 'Valued Tenant',
          tenantPhone: currentUser?.phoneNumber || '',
          tenantEmail: currentUser?.email || 'tenant@homeza.ng',
          landlordId: property.landlordId,
          landlordName: property.landlordName,
          agentId: property.listingSource === 'AGENT' ? property.submittingAgentId : undefined,
          agentName: property.listingSource === 'AGENT' ? property.submittingAgentName : undefined,
          preferredDate: new Date().toISOString().split('T')[0],
          preferredTime: 'Morning (9:00 AM - 12:00 PM)',
          inspectionFee: property.inspectionFee || property.pricing?.inspectionFee || 3000,
        });
      }
    }

    if (b) {
      setActiveBooking(b);
      setBookingId(b.bookingId || b.id);
      if (b.tenantName && !tenantName) setTenantName(b.tenantName);
      if (b.tenantEmail && !tenantEmail) setTenantEmail(b.tenantEmail);
      if (b.tenantPhone && !tenantPhone) setTenantPhone(b.tenantPhone);
    }
  }, [inspectionId, property.id, currentUser]);

  // Check if this inspection was already paid
  useEffect(() => {
    const targetId = inspectionId || bookingId || activeBooking?.id;
    if (targetId) {
      const existing = Store.getPayments().find(
        (p) =>
          (p.inspectionId === targetId || p.bookingId === targetId) &&
          (p.status === 'PAID' || p.status === 'SUCCESSFUL' || p.status === 'verified')
      );
      if (existing) {
        setCompletedPayment(existing);
      }
    }
  }, [inspectionId, bookingId, activeBooking]);

  // Authoritative server-side verification call
  const handleVerifyPayment = async (reference: string, paymentId?: string) => {
    setIsVerifying(true);
    setErrorMsg('');
    try {
      const verifyResult = await Store.verifyPayment(reference, paymentId);
      if (verifyResult.success && verifyResult.data && (verifyResult.data.status === 'PAID' || verifyResult.data.status === 'SUCCESSFUL')) {
        setCompletedPayment(verifyResult.data);
        setActivePaystackPayment(null);
        if (onSuccess) {
          onSuccess(verifyResult.data);
        }
      } else {
        setErrorMsg(verifyResult.error || 'Payment not yet confirmed by Paystack. Please complete the payment or transfer first.');
      }
    } catch (err: any) {
      console.error('Payment verification error:', err);
      setErrorMsg(err.message || 'Payment verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Background polling to auto-detect payment completion on Paystack Live
  useEffect(() => {
    if (!activePaystackPayment || completedPayment) return;

    const pollInterval = setInterval(async () => {
      try {
        const check = await Store.verifyPayment(activePaystackPayment.reference, activePaystackPayment.payment.id);
        if (check.success && check.data && (check.data.status === 'PAID' || check.data.status === 'SUCCESSFUL')) {
          setCompletedPayment(check.data);
          setActivePaystackPayment(null);
          if (onSuccess) {
            onSuccess(check.data);
          }
        }
      } catch {
        // Silently continue polling until completed or modal dismissed
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [activePaystackPayment, completedPayment, onSuccess]);

  // Unified Paystack Live Payment Initiation
  const handleInitiatePayment = async (mode: 'PAYSTACK' | 'BANK_TRANSFER') => {
    if (!tenantName.trim() || !tenantEmail.trim()) {
      setErrorMsg('Please provide your full name and email address for receipt delivery.');
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);

    try {
      const isBankTransferFlow = mode === 'BANK_TRANSFER';
      const selectedChannels = isBankTransferFlow
        ? ['bank_transfer']
        : ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'];

      const initResult = await Store.initializePayment({
        propertyId: property.id,
        propertyTitle: property.title,
        propertyLocationArea: property.location.area,
        inspectionId: bookingId || activeBooking?.id || inspectionId,
        amount,
        tenantId: currentUser?.id || 'tenant-guest',
        tenantName: tenantName.trim(),
        tenantEmail: tenantEmail.trim(),
        tenantPhone: tenantPhone.trim(),
        paymentMethod: isBankTransferFlow ? 'BANK_TRANSFER' : 'PAYSTACK',
        channels: selectedChannels,
      });

      if (!initResult.success || !initResult.data) {
        throw new Error(initResult.error || 'Failed to initialize Paystack checkout.');
      }

      const payment = initResult.data;
      const authUrl = initResult.authorization_url;
      const accessCode = initResult.access_code;
      const reference = initResult.reference || payment.reference;
      const publicKey = (initResult as any).paystackPublicKey || PLATFORM_CONFIG.paystackPublicKey;
      const isLiveMode = (initResult as any).isLiveMode !== undefined
        ? Boolean((initResult as any).isLiveMode)
        : (publicKey ? !publicKey.startsWith('pk_test_') : true);

      setActivePaystackPayment({
        payment,
        authUrl,
        accessCode,
        reference,
        publicKey,
        isLiveMode,
        isBankTransferFlow,
      });

      setIsProcessing(false);

      // Launch Paystack Inline Modal if PaystackPop script is loaded
      if (typeof window !== 'undefined' && (window as any).PaystackPop && publicKey) {
        try {
          const handler = (window as any).PaystackPop.setup({
            key: publicKey,
            email: tenantEmail.trim(),
            amount: amount * 100, // in Kobo
            currency: 'NGN',
            ref: reference,
            access_code: accessCode,
            channels: selectedChannels,
            metadata: {
              custom_fields: [
                { display_name: 'Tenant Name', variable_name: 'tenant_name', value: tenantName.trim() },
                { display_name: 'Property', variable_name: 'property_title', value: property.title },
                { display_name: 'Inspection Fee', variable_name: 'fee_naira', value: `₦${amount.toLocaleString()}` },
                { display_name: 'Channel', variable_name: 'preferred_channel', value: mode },
              ],
            },
            callback: async (response: any) => {
              const verifyRef = response.reference || response.trxref || reference;
              await handleVerifyPayment(verifyRef, payment.id);
            },
            onClose: () => {
              // Modal closed by user; keep activePaystackPayment active so user can re-open or verify
            },
          });
          handler.openIframe();
        } catch (popErr) {
          console.warn('Paystack inline iframe notice:', popErr);
        }
      }
    } catch (err: any) {
      console.error('Paystack initialization error:', err);
      setIsProcessing(false);
      setErrorMsg(err.message || 'Payment could not be started. Please check connection and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div
        id="payment-modal-container"
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg sm:text-xl text-white">
                  Inspection Booking Fee
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Secured by Paystack Live
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Unlock exact meeting location and coordinator assistance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6">
          {/* SUCCESS STATE */}
          {completedPayment ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-inner bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-2xl font-extrabold text-stone-950">
                  Payment Confirmed & Verified!
                </h4>
                <p className="text-stone-600 text-sm max-w-md mx-auto mt-1 leading-relaxed">
                  Your inspection fee of ₦{completedPayment.amount?.toLocaleString()} has been confirmed on Paystack Live. Exact address coordinates and coordinator contacts are now unlocked on your dashboard.
                </p>
              </div>

              {/* Transaction Receipt Card */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left space-y-2.5 text-xs text-stone-700">
                <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                  <span className="text-stone-500 font-bold uppercase tracking-wider">Transaction Ref</span>
                  <span className="font-mono font-bold text-stone-900">{completedPayment.reference}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Property</span>
                  <span className="font-bold text-stone-900">{property.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Payment Processor</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Paystack Live
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Amount Paid</span>
                  <span className="font-extrabold text-stone-950 text-sm">{formatNaira(completedPayment.amount)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                  <span className="text-stone-500">Status</span>
                  <span className="font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    VERIFIED • SUCCESS
                  </span>
                </div>
              </div>

              <div className="pt-3 flex gap-3 justify-center">
                <button
                  id="btn-done-payment-view-details"
                  onClick={onClose}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-3 rounded-xl transition shadow-md cursor-pointer text-sm flex items-center gap-2"
                >
                  <span>Done & View Inspection Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* PROPERTY & FEE SUMMARY PILL */}
              <div className="flex items-center gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                <img
                  src={property.images[0]?.url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300'}
                  alt={property.title}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-stone-900 text-sm truncate">{property.title}</h4>
                  <p className="text-xs text-stone-500 truncate">{property.location.area}, Uyo</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-stone-600">Inspection Fee:</span>
                    <span className="font-extrabold text-stone-950 text-base">{formatNaira(amount)}</span>
                  </div>
                </div>
              </div>

              {/* PAYMENT METHOD TABS */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Select Payment Option (Both Processed by Paystack Live)
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-2xl">
                  <button
                    type="button"
                    id="tab-paystack-payment"
                    onClick={() => {
                      setActiveTab('PAYSTACK');
                      setErrorMsg('');
                    }}
                    className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                      activeTab === 'PAYSTACK'
                        ? 'bg-white text-stone-950 shadow-xs border border-stone-200/80'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Pay with Paystack</span>
                  </button>

                  <button
                    type="button"
                    id="tab-bank-transfer-payment"
                    onClick={() => {
                      setActiveTab('BANK_TRANSFER');
                      setErrorMsg('');
                    }}
                    className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                      activeTab === 'BANK_TRANSFER'
                        ? 'bg-white text-stone-950 shadow-xs border border-stone-200/80'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>Pay via Bank Transfer</span>
                  </button>
                </div>
              </div>

              {/* ACTIVE CHECKOUT IN PROGRESS VIEW (Shared for both tabs) */}
              {activePaystackPayment ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4.5 text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                        <Sparkles className="w-4 h-4 text-emerald-700" />
                        <span>
                          {activePaystackPayment.isBankTransferFlow
                            ? 'Paystack Bank Transfer Checkout Active'
                            : 'Paystack Checkout Active'}
                        </span>
                      </div>
                      <span className="bg-emerald-200/80 text-emerald-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Live Gateway
                      </span>
                    </div>

                    <p className="text-emerald-900 leading-relaxed">
                      {activePaystackPayment.isBankTransferFlow
                        ? 'Your transaction has been registered on Paystack. Complete the transfer into the Paystack-assigned account details shown in the checkout.'
                        : 'Your transaction has been registered on Paystack. Complete your payment in the checkout window below.'}
                    </p>

                    <div className="pt-1">
                      <span className="text-stone-500 block text-[11px] font-bold">Transaction Reference</span>
                      <div className="font-mono font-bold text-stone-900 bg-white/80 px-2.5 py-1.5 rounded-lg border border-emerald-200/80 select-all flex items-center justify-between mt-0.5">
                        <span>{activePaystackPayment.reference}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(activePaystackPayment.reference);
                            setCopiedRef(true);
                            setTimeout(() => setCopiedRef(false), 2000);
                          }}
                          className="text-stone-400 hover:text-stone-700 p-1"
                          title="Copy reference"
                        >
                          {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Primary Paystack Window Launch Button */}
                  {activePaystackPayment.authUrl && (
                    <a
                      href={activePaystackPayment.authUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-xs flex items-center justify-center gap-2 text-xs sm:text-sm text-center"
                    >
                      <span>
                        {activePaystackPayment.isBankTransferFlow
                          ? 'Open Paystack Bank Transfer Window'
                          : 'Open Paystack Checkout Window'}
                      </span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  {/* Manual Verification Button */}
                  <button
                    type="button"
                    id="btn-verify-paystack-manual"
                    disabled={isVerifying}
                    onClick={() => handleVerifyPayment(activePaystackPayment.reference, activePaystackPayment.payment.id)}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying with Paystack Gateway...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>
                          {activePaystackPayment.isBankTransferFlow
                            ? 'I Have Sent the Transfer — Verify Now'
                            : 'I Have Completed Payment — Verify Now'}
                        </span>
                      </>
                    )}
                  </button>

                  <div className="flex justify-between items-center pt-1 text-xs">
                    <span className="text-stone-500 flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                      Listening for Paystack Live confirmation...
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePaystackPayment(null);
                        setErrorMsg('');
                      }}
                      className="text-stone-500 hover:text-stone-800 font-semibold underline cursor-pointer"
                    >
                      Cancel / Edit Details
                    </button>
                  </div>
                </div>
              ) : (
                /* INITIATION FORM */
                <div className="space-y-4">
                  {/* TAB 1: PAY WITH PAYSTACK INFORMATION */}
                  {activeTab === 'PAYSTACK' && (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                        <Zap className="w-4 h-4 text-emerald-700" />
                        <span>Instant Paystack Online Checkout</span>
                      </div>
                      <p className="leading-relaxed text-emerald-800">
                        Supports Nigerian Debit Cards (Mastercard, Visa, Verve), Bank USSD (*737#, *966#, etc.), Apple Pay, and online channels. Instant automated confirmation.
                      </p>
                    </div>
                  )}

                  {/* TAB 2: PAY VIA BANK TRANSFER INFORMATION */}
                  {activeTab === 'BANK_TRANSFER' && (
                    <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-xs text-blue-950 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
                        <Building2 className="w-4 h-4 text-blue-700" />
                        <span>Paystack Automated Bank Transfer</span>
                      </div>
                      <p className="leading-relaxed text-blue-800">
                        Paystack will dynamically generate a dedicated virtual account specifically for this transaction. Transfer exactly <strong>{formatNaira(amount)}</strong> from any Nigerian banking app (OPay, Kuda, PalmPay, GTBank, Zenith, Access, etc.). Paystack detects the deposit within seconds.
                      </p>
                    </div>
                  )}

                  {/* Contact Info Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">Your Full Name</label>
                      <input
                        type="text"
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        placeholder="e.g. Victor Akpan"
                        required
                        className="w-full text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={tenantEmail}
                        onChange={(e) => setTenantEmail(e.target.value)}
                        placeholder="e.g. victor@example.com"
                        required
                        className="w-full text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Fee Breakdown */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
                    <div className="flex justify-between text-stone-600">
                      <span>Inspection Coordination & Booking</span>
                      <span className="font-semibold text-stone-900">{formatNaira(amount)}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Anti-Scam & Escrow Protection</span>
                      <span className="font-semibold text-emerald-700">₦0 (Included)</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-stone-950 pt-2 border-t border-stone-200">
                      <span>Total Amount Payable</span>
                      <span className="text-emerald-700">{formatNaira(amount)}</span>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    type="button"
                    id={activeTab === 'PAYSTACK' ? 'btn-paystack-submit' : 'btn-bank-transfer-submit'}
                    disabled={isProcessing}
                    onClick={() => handleInitiatePayment(activeTab)}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Initializing Paystack Live Checkout...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>
                          {activeTab === 'PAYSTACK'
                            ? `Pay ${formatNaira(amount)} with Paystack`
                            : `Pay ${formatNaira(amount)} via Bank Transfer`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
