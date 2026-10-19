import React, { useState } from 'react';
import {
  AgentClient,
  AgentUser,
  RentalApplication,
} from '../../types';
import { Store } from '../../services/store';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  HelpCircle,
  Home,
  Info,
  Mail,
  MapPin,
  Phone,
  Search,
  Shield,
  User,
  XCircle,
} from 'lucide-react';

interface AgentApplicationsViewProps {
  agent: AgentUser;
  applications: RentalApplication[];
  onViewApplicationProperty?: (propertyId: string) => void;
}

export const AgentApplicationsView: React.FC<AgentApplicationsViewProps> = ({
  agent,
  applications,
  onViewApplicationProperty,
}) => {
  const [clients] = useState<AgentClient[]>(() => Store.getAgentClients(agent.id));
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<RentalApplication | null>(null);

  // Client emails and phone numbers for matching
  const clientEmails = clients.map((c) => c.email.toLowerCase().trim()).filter(Boolean);
  const clientPhones = clients.map((c) => c.phoneNumber.replace(/\s+/g, '')).filter(Boolean);
  const clientNames = clients.map((c) => c.fullName.toLowerCase().trim());

  // Filter applications belonging to agent's clients
  const clientApplications = applications.filter((app) => {
    const emailMatch = app.email && clientEmails.includes(app.email.toLowerCase().trim());
    const phoneMatch = app.phoneNumber && clientPhones.includes(app.phoneNumber.replace(/\s+/g, ''));
    const nameMatch = app.fullName && clientNames.some((n) => app.fullName.toLowerCase().includes(n));
    return emailMatch || phoneMatch || nameMatch;
  });

  const filteredApps = clientApplications.filter((app) => {
    if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = app.fullName.toLowerCase().includes(q);
      const matchProp = app.propertyTitle.toLowerCase().includes(q);
      const matchEmail = (app.email || '').toLowerCase().includes(q);
      return matchName || matchProp || matchEmail;
    }
    return true;
  });

  const getStatusBadge = (status: RentalApplication['status']) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            <XCircle className="w-3.5 h-3.5 text-red-700" />
            Declined
          </span>
        );
      case 'ADDITIONAL_INFO_REQUESTED':
      case 'INFORMATION_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Info className="w-3.5 h-3.5 text-blue-700" />
            Info Requested
          </span>
        );
      case 'ADDITIONAL_INFO_SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <AlertCircle className="w-3.5 h-3.5 text-purple-700" />
            Info Submitted
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-300">
            <XCircle className="w-3.5 h-3.5 text-stone-500" />
            Cancelled
          </span>
        );
      case 'PENDING_LANDLORD_REVIEW':
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div id="agent-applications-view" className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2.5">
            <FileText className="w-8 h-8 text-emerald-700" />
            Client Applications Tracker
          </h1>
          <p className="text-stone-600 text-base mt-1">
            Monitor real-time rental application submission status for your prospective tenant clients.
          </p>
        </div>
      </div>

      {/* Strict Intermediary Scope Callout */}
      <div className="p-4.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-blue-950 text-xs sm:text-sm">
        <Shield className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-blue-950">
            Intermediary View-Only Access
          </p>
          <p className="text-blue-800 leading-relaxed">
            As an agent intermediary, you can monitor the review progress of your clients' rental applications.
            In compliance with platform policy, final approval or rejection rights are held strictly by verified property Landlords and platform Administrators.
          </p>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by client name, email, or property title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-700 text-sm shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['ALL', 'PENDING', 'APPROVED', 'INFO_REQUESTED', 'REJECTED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              {st === 'ALL' ? 'All Applications' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <FileText className="w-12 h-12 text-stone-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-stone-900 mb-1">No Client Applications Found</h2>
          <p className="text-stone-600 text-sm max-w-md mx-auto">
            {clientApplications.length === 0
              ? 'None of your registered clients currently have active rental applications in the system.'
              : 'No applications match your selected filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              id={`agent-app-${app.id}`}
              className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg font-bold text-stone-900">{app.propertyTitle}</h2>
                  {getStatusBadge(app.status)}
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs sm:text-sm text-stone-600">
                  <span className="flex items-center gap-1 font-semibold text-stone-900">
                    <User className="w-4 h-4 text-emerald-700" />
                    Client: {app.fullName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4 text-stone-400" />
                    {app.phoneNumber}
                  </span>
                  {app.preferredMoveInDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-stone-400" />
                      Move-in: {new Date(app.preferredMoveInDate).toLocaleDateString('en-NG')}
                    </span>
                  )}
                  {app.propertyPrice && (
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      ₦{app.propertyPrice.toLocaleString()}/yr
                    </span>
                  )}
                </div>

                {app.message && (
                  <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-100 italic">
                    "{app.message}"
                  </p>
                )}

                {app.landlordNotes && (
                  <div className="text-xs bg-emerald-50 text-emerald-900 p-2.5 rounded-lg border border-emerald-200">
                    <strong>Landlord Note:</strong> {app.landlordNotes}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                <button
                  onClick={() => setSelectedApp(app)}
                  className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                >
                  <Eye className="w-4 h-4 text-emerald-700" />
                  View Status Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-emerald-700" />
                <h2 className="text-lg font-bold text-stone-900">Application File</h2>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center bg-stone-50 p-3 rounded-xl">
                <span className="text-stone-500 font-medium">Status</span>
                {getStatusBadge(selectedApp.status)}
              </div>

              <div className="p-3 bg-stone-50 rounded-xl space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Property</span>
                <p className="font-bold text-stone-900">{selectedApp.propertyTitle}</p>
                <p className="text-xs text-stone-500">{selectedApp.propertyLocation}</p>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Client Details</span>
                <p className="font-semibold text-stone-900">{selectedApp.fullName}</p>
                <p className="text-xs text-stone-600">{selectedApp.phoneNumber} • {selectedApp.email}</p>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Submission Date</span>
                <p className="text-stone-800 text-xs">
                  {new Date(selectedApp.appliedDate).toLocaleDateString('en-NG', {
                    dateStyle: 'full',
                  })}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-200">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
