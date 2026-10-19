import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  User,
  MapPin,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Eye,
  FileText,
  DollarSign,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Payment, PaymentMethod, PaymentStatus } from '../../types';
import { Store, subscribeToStore } from '../../services/store';
import { PLATFORM_CONFIG, formatNaira } from '../../config/platform';
import { useAuth } from '../../context/AuthContext';

export const PaymentsManagementView: React.FC = () => {
  const { currentUser } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');

  // Review Modal State
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadData = () => {
    const all = Store.getPayments();
    setPayments(all);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToStore(loadData);
    return unsub;
  }, []);

  const stats = Store.getPaymentStats();

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.propertyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.tenantEmail && p.tenantEmail.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesMethod = methodFilter === 'ALL' || p.paymentMethod === methodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  const handleAdminDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    setIsSubmitting(true);
    try {
      const res = await Store.adminReviewBankTransfer(
        selectedPayment.id,
        reviewDecision,
        reviewNotes.trim() || undefined,
        currentUser?.fullName || 'HOMEZA Operations'
      );

      if (res.success) {
        setActionFeedback(
          reviewDecision === 'APPROVED'
            ? `Bank transfer ${selectedPayment.reference} approved! Inspection unlocked.`
            : `Bank transfer ${selectedPayment.reference} rejected.`
        );
        setSelectedPayment(null);
        setReviewNotes('');
        loadData();
      } else {
        alert(res.error || 'Failed to submit admin decision');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error processing decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Stats Bento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-emerald-700" />
            <span>Payments & Inspection Escrow</span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage Paystack card gateways and confirm manual bank transfer deposits
          </p>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center justify-between text-sm font-bold animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            <span>{actionFeedback}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Paystack Integration & Endpoints Setup Box */}
      <div className="bg-stone-900 text-white rounded-3xl p-5 sm:p-6 border border-stone-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              💳
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base">Paystack Gateway Configuration</h3>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  {PLATFORM_CONFIG.paystackPublicKey?.startsWith('pk_live_') ? 'PAYSTACK LIVE' : 'TEST MODE'}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Dynamic per-property inspection fees (₦3,000 – ₦5,000) • Server-side verification enforced
              </p>
            </div>
          </div>
          <div className="text-xs text-stone-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secret Key Hidden on Backend</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Webhook URL */}
          <div className="bg-stone-950/80 p-4 rounded-2xl border border-stone-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                1. Webhook URL (For Paystack Dashboard)
              </span>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/api/paystack/webhook`;
                  navigator.clipboard.writeText(url);
                  setActionFeedback(`Copied Webhook URL: ${url}`);
                }}
                className="text-stone-400 hover:text-white flex items-center gap-1 transition cursor-pointer text-[11px]"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
            <p className="font-mono text-stone-200 bg-stone-900 px-3 py-2 rounded-xl text-[11px] truncate">
              {window.location.origin}/api/paystack/webhook
            </p>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              👉 <strong>Enter this in Paystack Dashboard</strong> &gt; Settings &gt; API Keys &amp; Webhooks &gt; <em>Live/Test Webhook URL</em>. Paystack sends signed background event notifications here.
            </p>
          </div>

          {/* Callback URL */}
          <div className="bg-stone-950/80 p-4 rounded-2xl border border-stone-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">
                2. Callback URL (Supplied Automatically)
              </span>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/payment/callback`;
                  navigator.clipboard.writeText(url);
                  setActionFeedback(`Copied Callback URL: ${url}`);
                }}
                className="text-stone-400 hover:text-white flex items-center gap-1 transition cursor-pointer text-[11px]"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
            <p className="font-mono text-stone-200 bg-stone-900 px-3 py-2 rounded-xl text-[11px] truncate">
              {window.location.origin}/payment/callback
            </p>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              ⚡ <strong>Passed dynamically per transaction</strong> when initializing Paystack checkout. Customers are redirected here to verify before unlocking meeting coordinates.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Total Collected</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-stone-950">{formatNaira(stats.totalRevenue)}</div>
          <div className="text-xs text-stone-500">{stats.successfulCount} verified transactions</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Paystack Instant</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-blue-950">{formatNaira(stats.paystackRevenue)}</div>
          <div className="text-xs text-stone-500">Automated card & USSD payments</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Bank Transfers</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-purple-950">{formatNaira(stats.bankTransferRevenue)}</div>
          <div className="text-xs text-stone-500">Bank Transfer payments</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-200 shadow-xs space-y-1 bg-amber-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Pending Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-950">{stats.pendingBankCount}</div>
          <div className="text-xs text-amber-700 font-medium">Transfers awaiting admin approval</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ref, tenant, property..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold border border-stone-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="AWAITING_ADMIN_CONFIRMATION">Awaiting Confirmation</option>
            <option value="SUCCESSFUL">Successful / Paid</option>
            <option value="PENDING">Pending Checkout</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="text-xs font-semibold border border-stone-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          >
            <option value="ALL">All Methods</option>
            <option value="PAYSTACK">Paystack</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-stone-600">
            <thead className="bg-stone-50 text-stone-500 font-bold uppercase tracking-wider text-[11px] border-b border-stone-200">
              <tr>
                <th className="py-3.5 px-4">Transaction Ref</th>
                <th className="py-3.5 px-4">Tenant / Payer</th>
                <th className="py-3.5 px-4">Property</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    No transactions matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-900 text-xs">
                      {p.reference}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-stone-900">{p.tenantName}</div>
                      <div className="text-[11px] text-stone-400">{p.tenantEmail || p.tenantPhone}</div>
                    </td>

                    <td className="py-3.5 px-4 max-w-[200px] truncate">
                      <div className="font-medium text-stone-900 truncate">{p.propertyTitle}</div>
                      <div className="text-[11px] text-stone-400 truncate">{p.propertyLocationArea}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {p.paymentMethod === 'PAYSTACK' ? (
                        <span className="inline-flex items-center gap-1.5 font-bold text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Paystack</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-bold text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Bank Transfer</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-extrabold text-stone-950">
                      {formatNaira(p.amount)}
                    </td>

                    <td className="py-3.5 px-4">
                      {(p.status === 'SUCCESSFUL' || p.status === 'PAID') && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Confirmed / Paid</span>
                        </span>
                      )}
                      {(p.status === 'AWAITING_ADMIN_CONFIRMATION' || p.status === 'AWAITING_BANK_TRANSFER_VERIFICATION') && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full animate-pulse">
                          <Clock className="w-3 h-3" />
                          <span>Review Required</span>
                        </span>
                      )}
                      {p.status === 'AMOUNT_MISMATCH' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-800 bg-orange-100 px-2.5 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Amount Mismatch</span>
                        </span>
                      )}
                      {p.status === 'PROCESSING' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Processing</span>
                        </span>
                      )}
                      {p.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                          <span>Pending</span>
                        </span>
                      )}
                      {(p.status === 'REJECTED' || p.status === 'FAILED') && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-100 px-2.5 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          <span>{p.status === 'REJECTED' ? 'Rejected' : 'Failed'}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-stone-500 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {(p.paymentMethod === 'BANK_TRANSFER' && (p.status === 'AWAITING_ADMIN_CONFIRMATION' || p.status === 'AWAITING_BANK_TRANSFER_VERIFICATION')) ? (
                        <button
                          id={`btn-review-payment-${p.id}`}
                          onClick={() => {
                            setSelectedPayment(p);
                            setReviewDecision('APPROVED');
                          }}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
                        >
                          Review & Confirm
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedPayment(p)}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADMIN REVIEW & RECEIPT MODAL */}
      {selectedPayment && (
        <div className="fixed inset-0 z-60 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 overflow-hidden space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-950 text-base">
                    {selectedPayment.status === 'AWAITING_ADMIN_CONFIRMATION'
                      ? 'Review Bank Transfer Deposit'
                      : 'Transaction Details & Audit'}
                  </h3>
                  <p className="text-xs text-stone-500 font-mono">{selectedPayment.reference}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Payment Details */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-stone-500 font-bold">Payer / Tenant:</span>
                <span className="font-bold text-stone-900">{selectedPayment.tenantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-bold">Property:</span>
                <span className="font-bold text-stone-900">{selectedPayment.propertyTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-bold">Amount:</span>
                <span className="font-extrabold text-stone-950 text-sm">{formatNaira(selectedPayment.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-bold">Method:</span>
                <span className="font-bold text-stone-900">{selectedPayment.paymentMethod}</span>
              </div>
              {selectedPayment.bankTransferDetails && (
                <>
                  <div className="pt-2 border-t border-stone-200 font-bold text-stone-700">
                    Bank Transfer Sender Details:
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Sender Name:</span>
                    <span className="font-bold text-stone-900">{selectedPayment.bankTransferDetails.senderName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Sender Bank:</span>
                    <span className="font-bold text-stone-900">{selectedPayment.bankTransferDetails.senderBank}</span>
                  </div>
                  {selectedPayment.bankTransferDetails.senderAccountNumber && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Sender Account:</span>
                      <span className="font-mono text-stone-900">{selectedPayment.bankTransferDetails.senderAccountNumber}</span>
                    </div>
                  )}
                  {selectedPayment.bankTransferDetails.transferNotes && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Transfer Remarks:</span>
                      <span className="italic text-stone-800">"{selectedPayment.bankTransferDetails.transferNotes}"</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Decision Form if Awaiting Review */}
            {selectedPayment.status === 'AWAITING_ADMIN_CONFIRMATION' ? (
              <form onSubmit={handleAdminDecision} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Verification Decision
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="btn-admin-approve-transfer"
                      onClick={() => setReviewDecision('APPROVED')}
                      className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                        reviewDecision === 'APPROVED'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/30'
                          : 'border-stone-200 bg-white text-stone-700'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Approve Deposit</span>
                    </button>

                    <button
                      type="button"
                      id="btn-admin-reject-transfer"
                      onClick={() => setReviewDecision('REJECTED')}
                      className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                        reviewDecision === 'REJECTED'
                          ? 'border-red-600 bg-red-50 text-red-950 ring-2 ring-red-600/30'
                          : 'border-stone-200 bg-white text-stone-700'
                      }`}
                    >
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span>Reject Transfer</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Internal Verification Notes / Reason
                  </label>
                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={
                      reviewDecision === 'APPROVED'
                        ? 'e.g. Deposit verified in bank statement ₦3,000 credit.'
                        : 'e.g. Bank credit not found or account name mismatch.'
                    }
                    className="w-full text-xs border border-stone-300 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPayment(null)}
                    className="px-4 py-2.5 rounded-xl font-bold text-stone-600 hover:bg-stone-100 transition text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-submit-admin-payment-decision"
                    disabled={isSubmitting}
                    className={`px-5 py-2.5 rounded-xl font-bold text-white text-xs transition shadow-md cursor-pointer flex items-center gap-2 ${
                      reviewDecision === 'APPROVED'
                        ? 'bg-emerald-700 hover:bg-emerald-800'
                        : 'bg-red-700 hover:bg-red-800'
                    }`}
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : reviewDecision === 'APPROVED' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{reviewDecision === 'APPROVED' ? 'Confirm & Unlock Inspection' : 'Reject Transfer'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Close Receipt
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
