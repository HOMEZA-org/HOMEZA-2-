import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Edit3,
  FileCheck,
  FileText,
  HelpCircle,
  LogOut,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  User,
  XCircle,
} from 'lucide-react';
import { AgentUser } from '../../types';
import { Store } from '../../services/store';
import { useAuth } from '../../context/AuthContext';

interface AgentStatusScreenProps {
  agent: AgentUser;
  onExploreProperties?: () => void;
  onOpenKYC?: () => void;
}

/**
 * 1. PENDING APPROVAL SCREEN
 * Shown when an Agent has submitted registration and is awaiting Admin review
 */
export const AgentPendingApprovalView: React.FC<AgentStatusScreenProps> = ({
  agent,
  onExploreProperties,
  onOpenKYC,
}) => {
  const { logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(
    'Agent application submitted successfully.'
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Success Notification Banner */}
      {successBanner && (
        <div
          id="agent-submission-success-banner"
          className="bg-emerald-50 border-2 border-emerald-500/80 rounded-2xl p-5 shadow-sm flex items-start justify-between gap-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-950 text-base sm:text-lg">
                Agent application submitted successfully.
              </h3>
              <p className="text-emerald-900 text-sm mt-1 leading-relaxed">
                Your Agent account is currently under Admin review. You will receive a notification when your application has been approved.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Pending Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-amber-900 to-stone-900 text-white p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-md font-bold">
                <Clock className="w-8 h-8 text-stone-950 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                    Agent Application Pending Review
                  </h1>
                  <span className="bg-amber-400 text-stone-950 font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                    Pending Admin Approval
                  </span>
                </div>
                <p className="text-amber-100/90 text-sm mt-1">
                  HOMEZA Trust &amp; Compliance Verification for {agent.fullName}
                </p>
              </div>
            </div>

            <button
              id="btn-agent-refresh-status"
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl border border-stone-700 transition cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-7">
          {/* Explanation Box */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2.5 text-amber-950 font-bold text-base">
              <Shield className="w-5 h-5 text-amber-700" />
              <span>What happens next?</span>
            </div>
            <p className="text-stone-700 text-sm leading-relaxed">
              To protect renters and property owners across Uyo, all real estate agents undergo manual credential review by the HOMEZA Operations Team. Once your agency and practicing credentials are confirmed, your account will be granted full access to the <strong>Agent Dashboard</strong>, client CRM tools, and verified property matching.
            </p>
            <div className="text-xs text-amber-900 font-semibold pt-1 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Typical verification turnaround: <strong>1 to 4 business hours</strong>.</span>
            </div>
          </div>

          {/* Submitted Application Details */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-stone-900 text-base sm:text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-700" />
              <span>Submitted Application Summary</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-5 rounded-2xl border border-stone-200 text-sm">
              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">
                  Agent Full Name
                </span>
                <span className="font-bold text-stone-900 text-base">{agent.fullName}</span>
              </div>

              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">
                  Email Address
                </span>
                <span className="font-medium text-stone-900">{agent.email}</span>
              </div>

              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">
                  Phone Number
                </span>
                <span className="font-medium text-stone-900">{agent.phoneNumber}</span>
              </div>

              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">
                  Agency / Business Name
                </span>
                <span className="font-bold text-stone-900">
                  {agent.agencyName || 'Independent Real Estate Intermediary'}
                </span>
              </div>

              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">
                  Primary Operating Areas
                </span>
                <span className="font-medium text-stone-900">
                  {agent.operatingArea || 'All Uyo Metropolitan'}
                </span>
              </div>

              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">
                  CAC / Registration Number
                </span>
                <span className="font-medium text-stone-900">
                  {agent.cacNumber || 'Not provided / Sole Proprietor'}
                </span>
              </div>

              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">
                  License / Accreditation Number
                </span>
                <span className="font-medium text-stone-900">
                  {agent.licenseNumber || 'Under verification'}
                </span>
              </div>

              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">
                  Application Submitted On
                </span>
                <span className="font-medium text-stone-900">
                  {agent.appliedDate
                    ? new Date(agent.appliedDate).toLocaleDateString('en-NG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : new Date(agent.createdAt).toLocaleDateString('en-NG')}
                </span>
              </div>

              {agent.bio && (
                <div className="sm:col-span-2 pt-2 border-t border-stone-200">
                  <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block mb-1">
                    Professional Bio / Description
                  </span>
                  <p className="text-stone-700 text-sm italic">{agent.bio}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {onOpenKYC && (
                <button
                  id="btn-pending-open-kyc"
                  type="button"
                  onClick={onOpenKYC}
                  className="w-full sm:w-auto px-5 py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Update KYC & Identity Verification</span>
                </button>
              )}
              <button
                id="btn-pending-explore-marketplace"
                type="button"
                onClick={onExploreProperties}
                className="w-full sm:w-auto px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Browse Uyo Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <button
              id="btn-pending-agent-logout"
              type="button"
              onClick={logout}
              className="w-full sm:w-auto px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-stone-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 2. CORRECTION REQUIRED SCREEN
 * Shown when Admin has requested specific additions/corrections before approval
 */
export const AgentCorrectionRequiredView: React.FC<AgentStatusScreenProps> = ({
  agent,
  onExploreProperties,
}) => {
  const { logout } = useAuth();
  const [fullName, setFullName] = useState(agent.fullName);
  const [phoneNumber, setPhoneNumber] = useState(agent.phoneNumber);
  const [agencyName, setAgencyName] = useState(agent.agencyName || '');
  const [operatingArea, setOperatingArea] = useState(agent.operatingArea || 'Shelter Afrique & Ewet Housing');
  const [cacNumber, setCacNumber] = useState(agent.cacNumber || '');
  const [licenseNumber, setLicenseNumber] = useState(agent.licenseNumber || '');
  const [bio, setBio] = useState(agent.bio || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resubmissionSuccess, setResubmissionSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleResubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || !phoneNumber.trim()) {
      setErrorMsg('Full name and phone number are required.');
      return;
    }

    setIsSubmitting(true);
    Store.resubmitAgentApplication(agent.id, {
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      agencyName: agencyName.trim(),
      operatingArea: operatingArea.trim(),
      cacNumber: cacNumber.trim(),
      licenseNumber: licenseNumber.trim(),
      bio: bio.trim(),
    });

    setTimeout(() => {
      setIsSubmitting(false);
      setResubmissionSuccess(true);
    }, 400);
  };

  if (resubmissionSuccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-fadeIn">
        <div className="bg-white rounded-3xl border border-stone-200 shadow-lg p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-stone-900">
              Agent application resubmitted successfully.
            </h2>
            <p className="text-stone-600 text-base max-w-lg mx-auto leading-relaxed">
              Your updated credentials and profile information have been sent to the Admin team for priority verification.
            </p>
          </div>
          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onExploreProperties}
              className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm transition cursor-pointer"
            >
              Return to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Alert Header */}
      <div className="bg-amber-50 border-2 border-amber-400 rounded-3xl p-6 sm:p-7 shadow-sm space-y-3">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-extrabold text-amber-950">
                Additional Information Required
              </h2>
              <span className="bg-amber-200 text-amber-950 font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                Correction Requested
              </span>
            </div>
            <p className="text-stone-700 text-sm sm:text-base leading-relaxed">
              The administrator reviewed your Agent application and requested the following updates before approval:
            </p>
          </div>
        </div>

        {/* Admin Note Box */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-300 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block mb-1">
            Administrator's Request Note:
          </span>
          <p className="text-stone-900 font-semibold text-base sm:text-lg">
            "{agent.adminCorrectionNote || 'Please update your professional credentials and operating information.'}"
          </p>
        </div>
      </div>

      {/* Resubmission Form */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-md p-6 sm:p-8 space-y-6">
        <div className="border-b border-stone-200 pb-4">
          <h3 className="text-lg sm:text-xl font-extrabold text-stone-900 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-emerald-700" />
            <span>Update &amp; Resubmit Agent Profile</span>
          </h3>
          <p className="text-stone-500 text-sm mt-1">
            Edit your application details below to address the administrator's request.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleResubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full text-sm border border-stone-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="w-full text-sm border border-stone-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Agency / Firm Name
              </label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="e.g. Prime Akwa Realtors"
                className="w-full text-sm border border-stone-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Operating Areas in Uyo
              </label>
              <input
                type="text"
                value={operatingArea}
                onChange={(e) => setOperatingArea(e.target.value)}
                placeholder="e.g. Ewet Housing, Shelter Afrique, Osongama"
                className="w-full text-sm border border-stone-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                CAC / Business Registration (RC / BN)
              </label>
              <input
                type="text"
                value={cacNumber}
                onChange={(e) => setCacNumber(e.target.value)}
                placeholder="e.g. RC-1849204 or BN-3920194"
                className="w-full text-sm border border-stone-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Professional License / Accreditation (NIESV / REDAN)
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. NIESV/AKW/2024/082"
                className="w-full text-sm border border-stone-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Professional Bio &amp; Service Description
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your property advisory experience in Uyo..."
              className="w-full text-sm border border-stone-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
            />
          </div>

          <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              id="btn-resubmit-agent-app"
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-7 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm sm:text-base transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Resubmit Application for Approval'}</span>
            </button>

            <button
              type="button"
              onClick={onExploreProperties}
              className="w-full sm:w-auto px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-sm transition"
            >
              Browse Properties as Tenant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * 3. REJECTED SCREEN
 * Shown when an Agent application was declined by Admin
 */
export const AgentRejectedView: React.FC<AgentStatusScreenProps> = ({
  agent,
  onExploreProperties,
  onOpenKYC,
}) => {
  const { logout } = useAuth();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 animate-fadeIn">
      <div className="bg-white rounded-3xl border border-red-200 shadow-md overflow-hidden">
        <div className="bg-red-900 text-white p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <XCircle className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  Agent Application Declined
                </h1>
                <span className="bg-red-500 text-white font-bold text-xs px-3 py-0.5 rounded-full uppercase tracking-wider">
                  Not Approved
                </span>
              </div>
              <p className="text-red-200 text-sm mt-0.5">
                HOMEZA Compliance Review for {agent.fullName}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-900 block">
              Reason Provided by Administrator:
            </span>
            <p className="text-stone-900 text-sm sm:text-base font-semibold">
              "{agent.adminRejectionReason || 'The application did not meet our current real estate intermediary verification requirements.'}"
            </p>
          </div>

          <p className="text-stone-600 text-sm leading-relaxed">
            You may continue using HOMEZA as a tenant to explore verified listings, schedule inspections, and submit tenancy applications. If you believe this decision was made in error or have updated credentials, please submit updated identity credentials or contact platform support.
          </p>

          <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {onOpenKYC && (
                <button
                  id="btn-rejected-open-kyc"
                  type="button"
                  onClick={onOpenKYC}
                  className="w-full sm:w-auto px-5 py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-sm transition cursor-pointer"
                >
                  Submit Updated KYC
                </button>
              )}
              <button
                id="btn-rejected-explore"
                type="button"
                onClick={onExploreProperties}
                className="w-full sm:w-auto px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm transition cursor-pointer"
              >
                Browse Marketplace
              </button>
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-full sm:w-auto px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-sm transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

