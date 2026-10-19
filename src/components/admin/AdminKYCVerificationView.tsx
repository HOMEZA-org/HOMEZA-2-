import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Building2,
  User,
  Phone,
  Search,
  Filter,
  Eye,
  ExternalLink,
  Check,
  X,
  MessageSquare,
  ArrowRight,
  Sparkles,
  RotateCcw,
  History,
  Lock,
  Unlock,
} from 'lucide-react';
import { KYCApplication, KYCApplicationStatus, User as AppUser, UserVerificationStatus } from '../../types';
import { Store, subscribeToStore } from '../../services/store';
import { useAuth } from '../../context/AuthContext';

export const AdminKYCVerificationView: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'PIPELINE' | 'APPLICATIONS'>('PIPELINE');

  // Legacy KYC Applications
  const [applications, setApplications] = useState<KYCApplication[]>([]);
  const [filterRole, setFilterRole] = useState<'ALL' | 'LANDLORD' | 'AGENT'>('ALL');
  const [filterStatus, setFilterStatus] = useState<KYCApplicationStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState<KYCApplication | null>(null);

  // 3-Step Pipeline Users & Audits
  const [verificationUsers, setVerificationUsers] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [pipelineFilterStatus, setPipelineFilterStatus] = useState<string>('ALL');
  const [selectedUserForAction, setSelectedUserForAction] = useState<any | null>(null);
  const [userActionType, setUserActionType] = useState<'APPROVE' | 'REQUEST_CORRECTION' | 'REJECT' | null>(null);
  const [userActionReason, setUserActionReason] = useState('');

  // Action states
  const [actionType, setActionType] = useState<'NONE' | 'APPROVE' | 'CORRECTION' | 'REJECT'>('NONE');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Image preview modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const loadData = () => {
    const apps = Store.getKYCApplications();
    setApplications(apps);
    if (selectedApp) {
      const updated = apps.find((a) => a.id === selectedApp.id);
      if (updated) setSelectedApp(updated);
    }

    Store.getAdminVerificationList().then((res) => {
      if (res?.users) setVerificationUsers(res.users);
      if (res?.audits) setAudits(res.audits);
    });
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToStore(loadData);
    return unsub;
  }, []);

  const handlePipelineDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForAction || !userActionType) return;

    if (userActionType !== 'APPROVE' && !userActionReason.trim()) {
      setFeedback({ type: 'error', text: 'Please specify the reason for this action.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await Store.submitAdminVerificationDecision({
        userId: selectedUserForAction.id,
        decision: userActionType,
        adminNotes: userActionReason.trim() || undefined,
        adminName: currentUser?.fullName || 'Compliance Admin',
      });

      setFeedback({
        type: 'success',
        text: `Verification status for ${selectedUserForAction.fullName} updated to ${
          userActionType === 'APPROVE' ? 'VERIFIED' : userActionType === 'REJECT' ? 'FAILED' : 'REVIEW'
        }.`,
      });

      setSelectedUserForAction(null);
      setUserActionType(null);
      setUserActionReason('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update verification status.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetUserTest = async (userId: string, userName: string) => {
    setIsSubmitting(true);
    try {
      await Store.resetTestVerification(userId);
      setFeedback({
        type: 'success',
        text: `Reset verification status for ${userName} to NOT_STARTED.`,
      });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to reset user status.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPipelineUsers = verificationUsers.filter((u) => {
    const vStatus = u.verification?.overallVerificationStatus || (u.isPhoneVerified && u.verificationStatus === 'VERIFIED' ? 'VERIFIED' : 'NOT_STARTED');
    if (pipelineFilterStatus !== 'ALL' && vStatus !== pipelineFilterStatus) return false;
    if (filterRole !== 'ALL' && u.role !== filterRole) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phoneNumber?.toLowerCase().includes(q) ||
        (u.verification?.providerReference && u.verification.providerReference.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredApps = applications.filter((app) => {
    if (filterRole !== 'ALL' && app.userRole !== filterRole) return false;
    if (filterStatus !== 'ALL' && app.status !== filterStatus) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        app.fullName.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q) ||
        app.phoneNumber.toLowerCase().includes(q) ||
        (app.agencyName && app.agencyName.toLowerCase().includes(q)) ||
        (app.cacNumber && app.cacNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleReviewAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || actionType === 'NONE') return;

    if (actionType === 'CORRECTION' && !adminNotes.trim()) {
      setFeedback({ type: 'error', text: 'Please specify the exact correction instructions for the applicant.' });
      return;
    }

    if (actionType === 'REJECT' && !adminNotes.trim()) {
      setFeedback({ type: 'error', text: 'Please specify the reason for rejecting this verification.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      let decision: 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUIRED' = 'APPROVED';
      if (actionType === 'CORRECTION') decision = 'CORRECTION_REQUIRED';
      if (actionType === 'REJECT') decision = 'REJECTED';

      Store.reviewKYCApplication(
        selectedApp.id,
        decision,
        adminNotes.trim() || undefined,
        currentUser?.fullName || 'Super Admin'
      );

      setFeedback({
        type: 'success',
        text: `Application for ${selectedApp.fullName} successfully marked as ${decision}.`,
      });
      setActionType('NONE');
      setAdminNotes('');
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to submit review decision.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-700" />
            <span>Identity & Property Security (Phase 1 KYC)</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Admin verification queue for Landlords and Real Estate Agents in Uyo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-300">
            {applications.filter((a) => a.status === 'PENDING').length} Pending Audits
          </span>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-red-50 text-red-900 border-red-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-stone-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('PIPELINE')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'PIPELINE'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>3-Step Verification Pipeline & Audits</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'PIPELINE' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-700'
          }`}>
            {verificationUsers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('APPLICATIONS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'APPLICATIONS'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Document Submissions Queue</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'APPLICATIONS' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-700'
          }`}>
            {applications.length}
          </span>
        </button>
      </div>

      {activeTab === 'PIPELINE' ? (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                Total Landlords / Agents
              </span>
              <p className="text-2xl font-black text-stone-900">{verificationUsers.length}</p>
              <span className="text-[10px] text-stone-400">Registered on platform</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                Fully Verified
              </span>
              <p className="text-2xl font-black text-emerald-800">
                {verificationUsers.filter((u) => u.verification?.overallVerificationStatus === 'VERIFIED' || (u.isPhoneVerified && u.verificationStatus === 'VERIFIED')).length}
              </p>
              <span className="text-[10px] text-emerald-600">Eligible to publish properties</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                Review Flagged
              </span>
              <p className="text-2xl font-black text-amber-800">
                {verificationUsers.filter((u) => u.verification?.overallVerificationStatus === 'REVIEW').length}
              </p>
              <span className="text-[10px] text-amber-600">Manual review required</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                Audit Trail Records
              </span>
              <p className="text-2xl font-black text-stone-900">{audits.length}</p>
              <span className="text-[10px] text-stone-400">Immutable security logs</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px] relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search user name, email, phone, reference..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-stone-300 rounded-xl focus:outline-emerald-700 bg-stone-50"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="text-xs border border-stone-300 rounded-xl px-3 py-2 bg-stone-50 font-medium focus:outline-emerald-700"
              >
                <option value="ALL">All Roles</option>
                <option value="LANDLORD">Landlords</option>
                <option value="AGENT">Agents</option>
              </select>

              <select
                value={pipelineFilterStatus}
                onChange={(e) => setPipelineFilterStatus(e.target.value)}
                className="text-xs border border-stone-300 rounded-xl px-3 py-2 bg-stone-50 font-medium focus:outline-emerald-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="REVIEW">REVIEW</option>
                <option value="FAILED">FAILED</option>
                <option value="NOT_STARTED">NOT_STARTED</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">User Identity & Security Status</h3>
                <p className="text-xs text-stone-500">Live authoritative check results across Phone, NIN, and Name matching</p>
              </div>
              <span className="text-xs font-bold text-stone-500">
                Showing {filteredPipelineUsers.length} of {verificationUsers.length} accounts
              </span>
            </div>

            {filteredPipelineUsers.length === 0 ? (
              <div className="p-8 text-center text-stone-500">
                <ShieldCheck className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-bold">No users match the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">User</th>
                      <th className="p-3.5">Phone OTP</th>
                      <th className="p-3.5">NIN / Identity</th>
                      <th className="p-3.5">Name Match</th>
                      <th className="p-3.5">Overall Status</th>
                      <th className="p-3.5">Reference / Updated</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {filteredPipelineUsers.map((user) => {
                      const v = user.verification as UserVerificationStatus | undefined;
                      const overall = v?.overallVerificationStatus || (user.isPhoneVerified && user.verificationStatus === 'VERIFIED' ? 'VERIFIED' : 'NOT_STARTED');
                      const phoneVerified = user.isPhoneVerified || v?.phoneVerified;
                      const ninStatus = v?.identityCheckStatus || 'NOT_STARTED';
                      const nameStatus = v?.nameMatchStatus || 'NOT_STARTED';

                      return (
                        <tr key={user.id} className="hover:bg-stone-50/70 transition">
                          <td className="p-3.5">
                            <div className="font-bold text-stone-900">{user.fullName}</div>
                            <div className="text-[11px] text-stone-500">{user.email}</div>
                            <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              user.role === 'AGENT' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>

                          <td className="p-3.5">
                            {phoneVerified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>VERIFIED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
                                <Clock className="w-3 h-3" />
                                <span>PENDING</span>
                              </span>
                            )}
                            <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                              {user.phoneNumber ? user.phoneNumber.replace(/(\d{4})\d{4}(\d{3})/, '$1****$2') : 'No phone'}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                              ninStatus === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ninStatus === 'REVIEW'
                                ? 'bg-amber-100 text-amber-800'
                                : ninStatus === 'FAILED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-stone-100 text-stone-600'
                            }`}>
                              {ninStatus === 'VERIFIED' && <CheckCircle2 className="w-3 h-3" />}
                              {ninStatus === 'REVIEW' && <AlertTriangle className="w-3 h-3" />}
                              {ninStatus === 'FAILED' && <XCircle className="w-3 h-3" />}
                              <span>{ninStatus}</span>
                            </span>
                            {v?.maskedIdNumber && (
                              <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                                {v.idType}: {v.maskedIdNumber}
                              </div>
                            )}
                          </td>

                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                              nameStatus === 'MATCH'
                                ? 'bg-emerald-100 text-emerald-800'
                                : nameStatus === 'REVIEW'
                                ? 'bg-amber-100 text-amber-800'
                                : nameStatus === 'MISMATCH'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-stone-100 text-stone-600'
                            }`}>
                              <span>{nameStatus}</span>
                              {v?.nameMatchConfidence !== undefined && (
                                <span className="opacity-80">({v.nameMatchConfidence}%)</span>
                              )}
                            </span>
                            {v?.verifiedFullName && (
                              <div className="text-[10px] text-stone-500 truncate max-w-[140px] mt-0.5" title={v.verifiedFullName}>
                                NIMC: {v.verifiedFullName}
                              </div>
                            )}
                          </td>

                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide uppercase ${
                              overall === 'VERIFIED'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : overall === 'REVIEW'
                                ? 'bg-amber-500 text-white'
                                : overall === 'FAILED'
                                ? 'bg-red-600 text-white'
                                : overall === 'IN_PROGRESS'
                                ? 'bg-blue-600 text-white'
                                : 'bg-stone-200 text-stone-700'
                            }`}>
                              {overall === 'VERIFIED' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                              <span>{overall}</span>
                            </span>
                            <div className="text-[10px] text-stone-500 mt-0.5">
                              {overall === 'VERIFIED' ? 'Listing Allowed' : 'Listing Blocked'}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="text-[11px] font-mono text-stone-600 truncate max-w-[130px]" title={v?.providerReference}>
                              {v?.providerReference || '—'}
                            </div>
                            <div className="text-[10px] text-stone-400">
                              {v?.lastVerifiedAt ? new Date(v.lastVerifiedAt).toLocaleString() : 'Never'}
                            </div>
                          </td>

                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserForAction(user);
                                setUserActionType('APPROVE');
                                setUserActionReason('');
                              }}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Review / Override
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResetUserTest(user.id, user.fullName)}
                              title="Reset user verification status to NOT_STARTED"
                              className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-xs transition cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audit Trail Card */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-stone-900">Security Audit Trail (Server Authoritative)</h3>
              </div>
              <span className="text-xs font-bold text-stone-500">{audits.length} Records</span>
            </div>

            {audits.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">No security audit records logged yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {audits.slice(0, 20).map((audit) => (
                  <div
                    key={audit.id}
                    className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          audit.result === 'SUCCESS' || audit.result === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : audit.result === 'MISMATCH' || audit.result === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {audit.result}
                        </span>
                        <span className="font-bold text-stone-800">{audit.eventType}</span>
                        <span className="text-stone-400">•</span>
                        <span className="font-semibold text-stone-600">{audit.userName || 'System'}</span>
                        <span className="text-[10px] text-stone-400">({audit.userRole || 'USER'})</span>
                      </div>
                      <p className="text-[11px] text-stone-600">
                        {audit.reason || (audit.details ? JSON.stringify(audit.details) : 'Automated check processed')}
                      </p>
                    </div>

                    <div className="text-right text-[10px] text-stone-400 shrink-0 font-mono">
                      <div>{new Date(audit.timestamp).toLocaleTimeString()}</div>
                      <div className="text-[9px] text-stone-400">{audit.provider} ({audit.environment})</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Applications Submissions View */
        <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, phone, CAC number..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-stone-300 rounded-xl focus:outline-emerald-700 bg-stone-50"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="text-xs border border-stone-300 rounded-xl px-3 py-2 bg-stone-50 font-medium focus:outline-emerald-700"
          >
            <option value="ALL">All Roles</option>
            <option value="LANDLORD">Landlords</option>
            <option value="AGENT">Agents</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="text-xs border border-stone-300 rounded-xl px-3 py-2 bg-stone-50 font-medium focus:outline-emerald-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="CORRECTION_REQUIRED">Correction Required</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Grid: List + Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Applications List */}
        <div className="lg:col-span-5 space-y-3">
          {filteredApps.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center text-stone-500 space-y-2">
              <ShieldCheck className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-sm font-bold">No KYC applications match filters.</p>
            </div>
          ) : (
            filteredApps.map((app) => (
              <div
                key={app.id}
                onClick={() => {
                  setSelectedApp(app);
                  setActionType('NONE');
                  setAdminNotes('');
                }}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col gap-2 ${
                  selectedApp?.id === app.id
                    ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white hover:bg-stone-50 border-stone-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        app.userRole === 'AGENT' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {app.userRole === 'AGENT' ? 'AG' : 'LL'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-900">{app.fullName}</h4>
                      <p className="text-xs text-stone-500">
                        {app.agencyName ? `${app.agencyName} • ` : ''}
                        {app.userRole}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      app.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : app.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : app.status === 'CORRECTION_REQUIRED'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-red-100 text-red-800 border-red-300'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-stone-100">
                  <span>{app.phoneNumber}</span>
                  <span>{new Date(app.appliedDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Deep Dive Review Pane */}
        <div className="lg:col-span-7">
          {selectedApp ? (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-6">
              {/* Applicant Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-200">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-extrabold text-lg shrink-0">
                    {selectedApp.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-extrabold text-stone-900">{selectedApp.fullName}</h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800 font-bold border">
                        {selectedApp.userRole}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5 flex items-center gap-2">
                      <span>{selectedApp.email}</span>
                      <span>•</span>
                      <span className="font-bold text-stone-800">{selectedApp.phoneNumber}</span>
                      <span className="text-emerald-700 text-[11px] font-bold">✓ Phone Verified</span>
                    </p>
                  </div>
                </div>

                <span
                  className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${
                    selectedApp.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : selectedApp.status === 'PENDING'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : selectedApp.status === 'CORRECTION_REQUIRED'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-red-100 text-red-800 border-red-300'
                  }`}
                >
                  {selectedApp.status}
                </span>
              </div>

              {/* Identity & Address Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs">
                <div>
                  <span className="font-bold text-stone-500 uppercase tracking-wider block">ID Document Type</span>
                  <span className="font-bold text-stone-900 text-sm">{selectedApp.idCardType.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="font-bold text-stone-500 uppercase tracking-wider block">ID / NIN Number</span>
                  <span className="font-mono font-bold text-stone-900 text-sm">{selectedApp.idCardNumber}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-bold text-stone-500 uppercase tracking-wider block">Residential / Operating Address</span>
                  <span className="font-medium text-stone-900">{selectedApp.residentialAddress || 'Not specified'}</span>
                </div>
              </div>

              {/* Agent Details (If Applicable) */}
              {selectedApp.userRole === 'AGENT' && (
                <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200 text-xs space-y-2">
                  <h4 className="font-bold text-purple-950 flex items-center gap-1.5 text-sm">
                    <Building2 className="w-4 h-4 text-purple-700" />
                    <span>Real Estate Agency & CAC Credentials</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-stone-500 font-bold uppercase">Agency Name</span>
                      <p className="font-bold text-stone-900">{selectedApp.agencyName || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-stone-500 font-bold uppercase">CAC Registration Number</span>
                      <p className="font-mono font-bold text-stone-900">{selectedApp.cacNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-stone-500 font-bold uppercase">License / Reg Number</span>
                      <p className="font-medium text-stone-900">{selectedApp.licenseNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-stone-500 font-bold uppercase">Office Address</span>
                      <p className="font-medium text-stone-900">{selectedApp.officeAddress || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Document Images & Previews */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Uploaded Document Scans & Verification Photos
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Government ID Scan */}
                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                      <span>Government ID Scan</span>
                      {selectedApp.idCardDocumentUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewImageUrl(selectedApp.idCardDocumentUrl)}
                          className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Full</span>
                        </button>
                      )}
                    </div>

                    {selectedApp.idCardDocumentUrl ? (
                      <img
                        src={selectedApp.idCardDocumentUrl}
                        alt="Government ID"
                        className="w-full h-36 rounded-xl object-cover border border-stone-200 cursor-pointer"
                        onClick={() => setPreviewImageUrl(selectedApp.idCardDocumentUrl)}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-36 rounded-xl bg-stone-100 flex items-center justify-center text-xs text-stone-400">
                        No ID photo uploaded
                      </div>
                    )}
                  </div>

                  {/* Selfie / Portrait */}
                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                      <span>Facial Portrait with ID</span>
                      {selectedApp.selfieWithIdUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewImageUrl(selectedApp.selfieWithIdUrl || null)}
                          className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Full</span>
                        </button>
                      )}
                    </div>

                    {selectedApp.selfieWithIdUrl ? (
                      <img
                        src={selectedApp.selfieWithIdUrl}
                        alt="Facial Portrait"
                        className="w-full h-36 rounded-xl object-cover border border-stone-200 cursor-pointer"
                        onClick={() => setPreviewImageUrl(selectedApp.selfieWithIdUrl || null)}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-36 rounded-xl bg-stone-100 flex items-center justify-center text-xs text-stone-400">
                        No selfie uploaded
                      </div>
                    )}
                  </div>

                  {/* CAC Certificate (if Agent) */}
                  {selectedApp.userRole === 'AGENT' && selectedApp.cacDocumentUrl && (
                    <div className="sm:col-span-2 bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                        <span>CAC Certificate Scan</span>
                        <button
                          type="button"
                          onClick={() => setPreviewImageUrl(selectedApp.cacDocumentUrl || null)}
                          className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Full</span>
                        </button>
                      </div>
                      <img
                        src={selectedApp.cacDocumentUrl}
                        alt="CAC Certificate"
                        className="w-full h-44 rounded-xl object-cover border border-stone-200 cursor-pointer"
                        onClick={() => setPreviewImageUrl(selectedApp.cacDocumentUrl || null)}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ADMIN REVIEW ACTIONS */}
              <div className="pt-4 border-t border-stone-200 space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-500">
                  Compliance Audit Decision
                </h4>

                {actionType === 'NONE' ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActionType('APPROVE')}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Grant Listing Authority</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionType('CORRECTION')}
                      className="px-5 py-2.5 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Request Document Correction</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionType('REJECT')}
                      className="px-5 py-2.5 bg-red-50 text-red-800 hover:bg-red-100 border border-red-300 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject Application</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleReviewAction} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-stone-900">
                        {actionType === 'APPROVE'
                          ? 'Confirm Approval for ' + selectedApp.fullName
                          : actionType === 'CORRECTION'
                          ? 'Request Correction from ' + selectedApp.fullName
                          : 'Reject KYC for ' + selectedApp.fullName}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActionType('NONE')}
                        className="text-xs text-stone-500 hover:text-stone-800 font-semibold"
                      >
                        Cancel
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        {actionType === 'APPROVE'
                          ? 'Admin Audit Note (Optional)'
                          : actionType === 'CORRECTION'
                          ? 'Correction Instructions (Sent to user) *'
                          : 'Reason for Rejection *'}
                      </label>
                      <textarea
                        required={actionType !== 'APPROVE'}
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder={
                          actionType === 'APPROVE'
                            ? 'e.g. Verified against NIMC database.'
                            : actionType === 'CORRECTION'
                            ? 'e.g. The uploaded NIN slip is too blurry to read the 11-digit number.'
                            : 'e.g. Inconsistent identity information provided.'
                        }
                        rows={3}
                        className="w-full text-xs font-medium bg-white border border-stone-300 rounded-xl p-3 focus:outline-emerald-700 text-stone-900"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setActionType('NONE')}
                        className="px-4 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition flex items-center gap-2 cursor-pointer ${
                          actionType === 'APPROVE'
                            ? 'bg-emerald-700 hover:bg-emerald-800'
                            : actionType === 'CORRECTION'
                            ? 'bg-blue-700 hover:bg-blue-800'
                            : 'bg-red-700 hover:bg-red-800'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span>{isSubmitting ? 'Processing...' : 'Confirm Decision'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center text-stone-400 space-y-2">
              <ShieldCheck className="w-12 h-12 mx-auto text-stone-300" />
              <h4 className="font-bold text-stone-800 text-base">Select an Application</h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Choose an applicant from the left list to review their submitted documents, verify their phone status, and approve listing privileges.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )}

  {/* Action Dialog for 3-Step Pipeline Users */}
  {selectedUserForAction && (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-stone-200 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-stone-900">Manual Verification Decision</h3>
            <p className="text-xs text-stone-500">{selectedUserForAction.fullName} ({selectedUserForAction.role})</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedUserForAction(null)}
            className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handlePipelineDecision} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-stone-700 uppercase tracking-wider mb-2">
              Select Compliance Decision
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setUserActionType('APPROVE')}
                className={`py-2 px-1 rounded-xl font-bold text-center border transition cursor-pointer ${
                  userActionType === 'APPROVE'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setUserActionType('REQUEST_CORRECTION')}
                className={`py-2 px-1 rounded-xl font-bold text-center border transition cursor-pointer ${
                  userActionType === 'REQUEST_CORRECTION'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                Flag Review
              </button>
              <button
                type="button"
                onClick={() => setUserActionType('REJECT')}
                className={`py-2 px-1 rounded-xl font-bold text-center border transition cursor-pointer ${
                  userActionType === 'REJECT'
                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                Reject
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Audit Reason / Compliance Note {userActionType !== 'APPROVE' && '*'}
            </label>
            <textarea
              required={userActionType !== 'APPROVE'}
              rows={3}
              value={userActionReason}
              onChange={(e) => setUserActionReason(e.target.value)}
              placeholder={
                userActionType === 'APPROVE'
                  ? 'e.g. Identity manually verified against state physical registry.'
                  : 'e.g. Mismatched family name on provided document.'
              }
              className="w-full text-xs font-medium border border-stone-300 rounded-xl p-3 focus:outline-emerald-700 text-stone-900 bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setSelectedUserForAction(null)}
              className="px-4 py-2 bg-white border border-stone-300 rounded-xl font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !userActionType}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Apply Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* Image Preview Modal */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-4 border border-stone-200 shadow-2xl relative">
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-2">
              <img
                src={previewImageUrl}
                alt="Enlarged Document"
                className="w-full max-h-[75vh] object-contain rounded-2xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
