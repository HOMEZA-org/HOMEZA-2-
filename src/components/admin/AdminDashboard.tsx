import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FileText,
  Home,
  MapPin,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  LocationArea,
  Property,
  PropertyInspection,
  PropertyReport,
  RentalApplication,
  User,
} from '../../types';
import { formatNaira } from '../../config/platform';
import { UsersManagementView } from './UsersManagementView';
import { PropertiesManagementView } from './PropertiesManagementView';
import { ReportsManagementView } from './ReportsManagementView';
import { LocationsManagementView } from './LocationsManagementView';
import { PlatformSettingsView } from './PlatformSettingsView';
import { PlatformViewsView } from './PlatformViewsView';
import { AgentApprovalsView } from './AgentApprovalsView';
import { DuplicateModerationView } from './DuplicateModerationView';
import { InspectionScheduleView } from './InspectionScheduleView';
import { AdminSupportManagementView } from './AdminSupportManagementView';
import { AdminPropertyReviewModal } from './AdminPropertyReviewModal';
import { AdminLandlordReviewModal } from './AdminLandlordReviewModal';
import { AdminPendingReviewsView } from './AdminPendingReviewsView';
import { AdminKYCVerificationView } from './AdminKYCVerificationView';
import { PaymentsManagementView } from './PaymentsManagementView';
import { Store } from '../../services/store';
import { AgentUser, LandlordUser } from '../../types';
import { LifeBuoy, CreditCard } from 'lucide-react';

interface AdminDashboardProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  users: User[];
  properties: Property[];
  applications: RentalApplication[];
  reports: PropertyReport[];
  locations: LocationArea[];
  onViewProperty: (property: Property) => void;
  onEnterViewMode: (mode: 'tenant' | 'landlord', targetUserId?: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  activeTab,
  setActiveTab,
  users,
  properties,
  applications,
  reports,
  locations,
  onViewProperty,
  onEnterViewMode,
}) => {
  // Review Modal State
  const [reviewingProperty, setReviewingProperty] = useState<Property | null>(null);
  const [reviewingLandlord, setReviewingLandlord] = useState<LandlordUser | null>(null);
  const [inspections, setInspections] = useState<PropertyInspection[]>(() => Store.getInspections());
  const [pendingItems, setPendingItems] = useState(() => Store.getPendingReviewItems());

  useEffect(() => {
    const unsub = Store.subscribe(() => {
      setInspections(Store.getInspections());
      setPendingItems(Store.getPendingReviewItems());
    });
    return unsub;
  }, []);

  const isTodayInspection = (i: PropertyInspection): boolean => {
    const dateStr = i.preferredDate?.toLowerCase() || '';
    if (dateStr.includes('today')) return true;
    const todayIso = new Date().toISOString().split('T')[0];
    return dateStr.includes(todayIso);
  };

  // Compute key stats
  const totalUsers = users.length;
  const totalTenants = users.filter((u) => u.role === 'TENANT').length;
  const totalLandlords = users.filter((u) => u.role === 'LANDLORD').length;
  const totalAgents = users.filter((u) => u.role === 'AGENT').length;
  const pendingAgentsCount = users.filter(
    (u) =>
      u.role === 'AGENT' &&
      ((u as any).verificationStatus === 'PENDING' ||
        (u as any).verificationStatus === 'PENDING_AGENT_APPROVAL' ||
        (u as any).verificationStatus === 'AGENT_CORRECTION_REQUIRED' ||
        (u as any).verificationStatus === 'CORRECTION_REQUIRED')
  ).length;
  const pendingLandlordsCount = users.filter(
    (u) =>
      u.role === 'LANDLORD' &&
      ((u as any).verificationStatus === 'PENDING' ||
        (u as any).verificationStatus === 'CORRECTION_REQUIRED')
  ).length;
  const totalProps = properties.length;
  const pendingReports = reports.filter((r) => r.status === 'PENDING').length;
  const pendingApplications = applications.filter((a) => a.status === 'PENDING').length;
  const pendingProperties = properties.filter((p) => p.status === 'PENDING_REVIEW');
  const pendingReviewsCount = pendingItems.length;
  const pendingDuplicatesCount = properties.filter(
    (p) =>
      (p.isPossibleDuplicate || (p.duplicateScore && p.duplicateScore > 0)) &&
      (!p.duplicateDecision || p.duplicateDecision === 'PENDING')
  ).length;

  const todayInspectionsCount = inspections.filter(
    (i) => isTodayInspection(i) && i.status !== 'INSPECTION_CANCELLED' && i.status !== 'INSPECTION_DECLINED'
  ).length;
  const pendingInspectionsCount = inspections.filter(
    (i) => i.status === 'INSPECTION_REQUESTED' || !i.homezaCoordinationConfirmed
  ).length;

  const [supportTickets, setSupportTickets] = useState(() => Store.getSupportTickets());
  useEffect(() => {
    const unsub = Store.subscribe(() => {
      setSupportTickets(Store.getSupportTickets());
    });
    return unsub;
  }, []);
  const openSupportTicketsCount = supportTickets.filter((t) => t.status === 'OPEN').length;

  const handleReviewProperty = (prop: Property) => {
    setReviewingProperty(prop);
  };

  return (
    <div className="min-h-screen bg-stone-100/70 pb-20">
      {/* Top Banner with Stats */}
      <div className="bg-stone-950 text-white border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2.5">
                <Shield className="w-6 h-6 text-purple-400" />
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Admin Control Center</h1>
                <span className="bg-purple-900/90 text-purple-200 border border-purple-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
              <p className="text-sm sm:text-base text-stone-300 mt-1.5 leading-relaxed">
                Platform moderation: verify properties, inspect landlord KYC, review tenant applications, and monitor scam reports.
              </p>
            </div>

            {/* Quick action buttons for common tabs */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 text-sm">
              <button
                id="btn-admin-quick-inspections"
                type="button"
                onClick={() => setActiveTab('admin-inspections')}
                className={`px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
                  todayInspectionsCount > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                    : pendingInspectionsCount > 0
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                }`}
              >
                <CalendarCheck2 className="w-4 h-4" />
                <span>
                  {todayInspectionsCount > 0
                    ? `${todayInspectionsCount} Walkthrough${todayInspectionsCount > 1 ? 's' : ''} Today`
                    : pendingInspectionsCount > 0
                    ? `${pendingInspectionsCount} Coordination Pending`
                    : 'Inspection Schedule'}
                </span>
              </button>

              <button
                id="btn-admin-quick-pending-reviews"
                type="button"
                onClick={() => setActiveTab('admin-pending-reviews')}
                className={`px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
                  pendingReviewsCount > 0
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{pendingReviewsCount} Pending Reviews</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('admin-reports')}
                className={`px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
                  pendingReports > 0
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{pendingReports} Reports</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('admin-landlords')}
                className="px-4 py-2.5 rounded-xl font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 transition cursor-pointer"
              >
                Verify Landlords
              </button>

              <button
                id="btn-admin-quick-agents"
                type="button"
                onClick={() => setActiveTab('admin-agents')}
                className={`px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
                  pendingAgentsCount > 0
                    ? 'bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-md'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>{pendingAgentsCount > 0 ? `${pendingAgentsCount} Agent Review${pendingAgentsCount > 1 ? 's' : ''}` : 'Agent Approvals'}</span>
              </button>
            </div>
          </div>

          {/* 6 Metric KPI Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-7">
            <div
              onClick={() => setActiveTab('admin-pending-reviews')}
              className={`cursor-pointer p-4 rounded-2xl border transition ${
                pendingReviewsCount > 0
                  ? 'bg-amber-950/50 hover:bg-amber-950/70 border-amber-500'
                  : 'bg-stone-900 hover:bg-stone-850 border-stone-800'
              }`}
            >
              <div className="text-xs sm:text-sm text-amber-300 font-semibold">Pending Reviews</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1">{pendingReviewsCount}</div>
            </div>

            <div
              onClick={() => setActiveTab('admin-properties')}
              className="bg-stone-900 hover:bg-stone-850 cursor-pointer p-4 rounded-2xl border border-stone-800 transition"
            >
              <div className="text-xs sm:text-sm text-stone-400 font-semibold">All Properties</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1">{totalProps}</div>
            </div>

            <div
              onClick={() => setActiveTab('admin-users')}
              className="bg-stone-900 hover:bg-stone-850 cursor-pointer p-4 rounded-2xl border border-stone-800 transition"
            >
              <div className="text-xs sm:text-sm text-stone-400 font-semibold">Total Users</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{totalUsers}</div>
            </div>

            <div
              onClick={() => setActiveTab('admin-landlords')}
              className="bg-stone-900 hover:bg-stone-850 cursor-pointer p-4 rounded-2xl border border-stone-800 transition"
            >
              <div className="text-xs sm:text-sm text-stone-400 font-semibold">Landlords & KYC</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1">{totalLandlords}</div>
            </div>

            <div
              onClick={() => setActiveTab('admin-applications')}
              className="bg-stone-900 hover:bg-stone-850 cursor-pointer p-4 rounded-2xl border border-stone-800 transition"
            >
              <div className="text-xs sm:text-sm text-stone-400 font-semibold">Applications</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-purple-400 mt-1">{applications.length}</div>
            </div>

            <div
              onClick={() => setActiveTab('admin-reports')}
              className="bg-stone-900 hover:bg-stone-850 cursor-pointer p-4 rounded-2xl border border-stone-800 transition"
            >
              <div className="text-xs sm:text-sm text-stone-400 font-semibold">Reports</div>
              <div
                className={`text-2xl sm:text-3xl font-extrabold mt-1 ${
                  pendingReports > 0 ? 'text-red-400' : 'text-stone-300'
                }`}
              >
                {pendingReports}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Nav Tabs */}
      <div className="bg-white border-b border-stone-200 sticky top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-2.5 text-sm sm:text-base font-semibold">
            {[
              { id: 'admin-dashboard', label: 'Overview' },
              {
                id: 'admin-platform-views',
                label: 'Role Views (Inspect)',
                icon: Eye,
                isHighlight: true,
              },
              {
                id: 'admin-inspections',
                label: `Inspection Schedule${
                  todayInspectionsCount > 0
                    ? ` (${todayInspectionsCount} Today)`
                    : pendingInspectionsCount > 0
                    ? ` (${pendingInspectionsCount})`
                    : ''
                }`,
                icon: CalendarCheck2,
                isHighlight: todayInspectionsCount > 0,
                isPending: pendingInspectionsCount > 0,
              },
              {
                id: 'admin-pending-reviews',
                label: `Pending Reviews (${pendingReviewsCount})`,
                isPending: pendingReviewsCount > 0,
              },
              {
                id: 'admin-payments',
                label: `Payments & Escrow${Store.getPaymentStats().pendingBankCount > 0 ? ` (${Store.getPaymentStats().pendingBankCount})` : ''}`,
                icon: CreditCard,
                isPending: Store.getPaymentStats().pendingBankCount > 0,
              },
              {
                id: 'admin-duplicates',
                label: `Duplicates${pendingDuplicatesCount > 0 ? ` (${pendingDuplicatesCount})` : ''}`,
                isPending: pendingDuplicatesCount > 0,
              },
              {
                id: 'admin-kyc',
                label: 'Identity & KYC Audits',
                icon: ShieldCheck,
                isPending: applications.length >= 0 && Store.getKYCApplications().some(a => a.status === 'PENDING'),
              },
              { id: 'admin-properties', label: 'All Properties' },
              { id: 'admin-users', label: 'All Users' },
              {
                id: 'admin-agents',
                label: `Agent Approvals${pendingAgentsCount > 0 ? ` (${pendingAgentsCount})` : ''}`,
                isPending: pendingAgentsCount > 0,
              },
              { id: 'admin-tenants', label: 'Tenants' },
              { id: 'admin-landlords', label: 'Landlords & KYC' },
              { id: 'admin-applications', label: 'Applications' },
              { id: 'admin-reports', label: `Reports (${pendingReports})` },
              {
                id: 'admin-support',
                label: `Support Tickets${openSupportTicketsCount > 0 ? ` (${openSupportTicketsCount})` : ''}`,
                icon: LifeBuoy,
                isPending: openSupportTicketsCount > 0,
              },
              { id: 'admin-locations', label: 'Uyo Locations' },
              { id: 'admin-settings', label: 'Settings' },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-stone-900 text-white shadow-sm font-bold'
                    : tab.isPending
                    ? 'text-amber-900 bg-amber-50 hover:bg-amber-100 font-bold border border-amber-200'
                    : tab.isHighlight
                    ? 'text-purple-900 bg-purple-50 hover:bg-purple-100 font-bold border border-purple-300'
                    : 'text-stone-700 hover:bg-stone-100 hover:text-stone-950 font-medium'
                }`}
              >
                {tab.icon && <tab.icon className="w-4 h-4 text-purple-700" />}
                <span>{tab.label}</span>
                {tab.isPending && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping"></span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Admin Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* SUBVIEW: OVERVIEW */}
        {activeTab === 'admin-dashboard' && (
          <div className="space-y-8">
            {/* 1. Prominent Pending Property Reviews Queue Section */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-extrabold text-stone-900 text-lg sm:text-xl">Pending Property Reviews</h3>
                      <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                        {pendingReviewsCount} Awaiting Verification
                      </span>
                    </div>
                    <p className="text-sm text-stone-600 mt-0.5">
                      Newly submitted listings awaiting admin verification before becoming visible to tenants.
                    </p>
                  </div>
                </div>

                {pendingReviewsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin-pending-reviews')}
                    className="text-sm font-bold text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-4 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto"
                  >
                    View All Pending ({pendingReviewsCount})
                  </button>
                )}
              </div>

              {pendingProperties.length === 0 ? (
                <div className="py-10 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-600">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2 opacity-90" />
                  <p className="font-bold text-base text-stone-900">All Clear!</p>
                  <p className="text-sm text-stone-500 mt-1">There are no property listings currently pending admin review.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {pendingProperties.slice(0, 3).map((prop) => (
                    <div
                      key={prop.id}
                      className="bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                    >
                      <div>
                        {/* Image preview */}
                        <div className="relative aspect-16/9 bg-stone-200">
                          <img
                            src={
                              prop.images[0]?.url ||
                              'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&auto=format&fit=crop&q=80'
                            }
                            alt={prop.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2.5 left-2.5">
                            <span className="bg-amber-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                              PENDING REVIEW
                            </span>
                          </div>
                          <div className="absolute bottom-2.5 right-2.5 bg-stone-900/85 text-white text-xs px-2.5 py-0.5 rounded font-mono font-bold">
                            {prop.images.length} Photos
                          </div>
                        </div>

                        <div className="p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-emerald-900 text-lg sm:text-xl">
                              {formatNaira(prop.pricing.rent)}{' '}
                              <span className="text-xs font-medium text-stone-600">
                                / {prop.pricing.rentalPeriod.toLowerCase()}
                              </span>
                            </span>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-stone-100 text-stone-800 border border-stone-200">
                              {prop.propertyType}
                            </span>
                          </div>

                          <h4 className="font-bold text-stone-950 text-base line-clamp-1">
                            {prop.title}
                          </h4>

                          <div className="flex items-center gap-1.5 text-stone-600 text-sm">
                            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{prop.location.area}, Uyo</span>
                          </div>

                          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs sm:text-sm text-stone-600">
                            <div>
                              <span className="text-stone-500">Landlord: </span>
                              <strong className="text-stone-900">{prop.landlordName}</strong>
                            </div>
                            <div className="text-stone-500 font-medium">
                              {new Date(prop.createdAt).toLocaleDateString('en-NG', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-stone-50 border-t border-stone-200">
                        <button
                          id={`btn-review-prop-overview-${prop.id}`}
                          type="button"
                          onClick={() => handleReviewProperty(prop)}
                          className="w-full py-2.5 bg-purple-800 hover:bg-purple-900 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        >
                          <FileCheck2 className="w-4 h-4" />
                          <span>Review Property</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick summaries: Recent Applications & Reports */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Applications Card */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-stone-900 text-lg">Recent Applications</h3>
                    <p className="text-xs sm:text-sm text-stone-500">Live inquiries submitted by tenants</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin-applications')}
                    className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-900"
                  >
                    View All ({applications.length})
                  </button>
                </div>

                <div className="divide-y divide-stone-100">
                  {applications.slice(0, 4).map((app) => (
                    <div key={app.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                      <div>
                        <div className="font-bold text-stone-900">{app.fullName}</div>
                        <div className="text-stone-500 text-xs truncate max-w-xs">
                          {app.propertyTitle}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          app.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Reports Card */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-stone-900 text-lg">Flagged Listings</h3>
                    <p className="text-xs sm:text-sm text-stone-500">Scam and inaccurate listing alerts</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin-reports')}
                    className="text-xs sm:text-sm font-bold text-red-600 hover:text-red-800"
                  >
                    Resolve Reports ({reports.length})
                  </button>
                </div>

                {reports.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 text-sm">Zero flagged reports.</div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {reports.slice(0, 4).map((rep) => (
                      <div key={rep.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                        <div>
                          <div className="font-bold text-red-700 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4" />
                            <span>{rep.reason}</span>
                          </div>
                          <div className="text-stone-500 text-xs truncate max-w-xs">
                            {rep.propertyTitle}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            rep.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Role Views & Experience Inspection Section in Overview */}
            <div className="bg-stone-900 rounded-2xl p-6 text-white border border-stone-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-800/60 border border-purple-600 flex items-center justify-center text-purple-200">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-white">Platform Role Views</h3>
                      <span className="text-xs bg-purple-700 text-purple-200 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Inspection Mode
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-stone-300 mt-0.5">
                      Inspect the live Tenant search portal or Landlord management dashboard without changing your authenticated Admin role.
                    </p>
                  </div>
                </div>

                <button
                  id="btn-overview-all-role-views"
                  type="button"
                  onClick={() => setActiveTab('admin-platform-views')}
                  className="text-xs sm:text-sm font-bold text-purple-200 hover:text-white bg-purple-800 hover:bg-purple-700 border border-purple-600 px-4 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto"
                >
                  Configure & Inspect Views
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="bg-stone-850 border border-stone-700/80 p-4 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-blue-300">Tenant Experience</div>
                    <div className="text-xs text-stone-400">Public search, filter, apply & saved homes</div>
                  </div>
                  <button
                    id="btn-quick-inspect-tenant"
                    type="button"
                    onClick={() => onEnterViewMode('tenant')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer"
                  >
                    View Tenant
                  </button>
                </div>

                <div className="bg-stone-850 border border-stone-700/80 p-4 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-amber-300">Landlord Experience</div>
                    <div className="text-xs text-stone-400">Portfolio management, applications & KYC</div>
                  </div>
                  <button
                    id="btn-quick-inspect-landlord"
                    type="button"
                    onClick={() => onEnterViewMode('landlord')}
                    className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer"
                  >
                    View Landlord
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Need to add new areas in Uyo?</h4>
                <p className="text-xs text-stone-500">
                  Expand the location directory to include new estates, streets, and suburban quarters.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('admin-locations')}
                className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Manage Uyo Locations
              </button>
            </div>
          </div>
        )}

        {/* SUBVIEW: PLATFORM ROLE VIEWS */}
        {activeTab === 'admin-platform-views' && (
          <PlatformViewsView users={users} onEnterViewMode={onEnterViewMode} />
        )}

        {/* SUBVIEW: PENDING REVIEWS & VERIFICATION CENTER */}
        {activeTab === 'admin-pending-reviews' && (
          <AdminPendingReviewsView
            properties={properties}
            users={users}
            onViewProperty={onViewProperty}
          />
        )}

        {/* SUBVIEW: USERS (ALL) */}
        {activeTab === 'admin-users' && (
          <UsersManagementView
            users={users}
            filterRole="ALL"
            onInspectUser={(u) => onEnterViewMode(u.role === 'TENANT' ? 'tenant' : 'landlord', u.id)}
            onReviewLandlord={(l) => setReviewingLandlord(l)}
          />
        )}

        {/* SUBVIEW: TENANTS */}
        {activeTab === 'admin-tenants' && (
          <UsersManagementView
            users={users}
            filterRole="TENANT"
            onInspectUser={(u) => onEnterViewMode('tenant', u.id)}
          />
        )}

        {/* SUBVIEW: LANDLORDS & KYC */}
        {activeTab === 'admin-landlords' && (
          <UsersManagementView
            users={users}
            filterRole="LANDLORD"
            onInspectUser={(u) => onEnterViewMode('landlord', u.id)}
            onReviewLandlord={(l) => setReviewingLandlord(l)}
          />
        )}

        {/* SUBVIEW: PROPERTIES */}
        {activeTab === 'admin-properties' && (
          <PropertiesManagementView
            properties={properties}
            onViewProperty={onViewProperty}
            onReviewProperty={handleReviewProperty}
          />
        )}

        {/* SUBVIEW: APPLICATIONS */}
        {activeTab === 'admin-applications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-stone-900">
                All Tenant Applications ({applications.length})
              </h2>
              <p className="text-xs text-stone-500">
                Track applications submitted across all Uyo properties.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                    <tr>
                      <th className="p-4">Applicant</th>
                      <th className="p-4">Property</th>
                      <th className="p-4">Move-in Date</th>
                      <th className="p-4">Employment</th>
                      <th className="p-4">Submitted</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-stone-50/60">
                        <td className="p-4">
                          <div className="font-bold text-stone-900">{app.fullName}</div>
                          <div className="text-stone-500 text-[11px]">{app.phoneNumber}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-stone-800">{app.propertyTitle}</div>
                          <div className="text-stone-500 text-[11px]">{app.propertyLocation}</div>
                        </td>
                        <td className="p-4">{app.moveInDate}</td>
                        <td className="p-4">
                          <div>{app.employmentStatus}</div>
                          <div className="text-stone-500 text-[11px]">{app.employerName}</div>
                        </td>
                        <td className="p-4 text-stone-500">
                          {new Date(app.createdAt).toLocaleDateString('en-NG')}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              app.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : app.status === 'REJECTED'
                                ? 'bg-red-100 text-red-800'
                                : app.status === 'ADDITIONAL_INFO_SUBMITTED'
                                ? 'bg-blue-100 text-blue-800'
                                : app.status === 'ADDITIONAL_INFO_REQUESTED' || app.status === 'INFORMATION_REQUESTED'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-stone-100 text-stone-800'
                            }`}
                          >
                            {app.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUBVIEW: INSPECTION SCHEDULE & HOMEZA COORDINATION */}
        {activeTab === 'admin-inspections' && (
          <InspectionScheduleView onViewProperty={onViewProperty} />
        )}

        {/* SUBVIEW: PAYMENTS & ESCROW MANAGEMENT */}
        {activeTab === 'admin-payments' && <PaymentsManagementView />}

        {/* SUBVIEW: IDENTITY & KYC AUDITS */}
        {activeTab === 'admin-kyc' && <AdminKYCVerificationView />}

        {/* SUBVIEW: AGENT APPROVALS */}
        {activeTab === 'admin-agents' && <AgentApprovalsView users={users} />}

        {/* SUBVIEW: DUPLICATES MODERATION */}
        {activeTab === 'admin-duplicates' && (
          <DuplicateModerationView properties={properties} onViewProperty={onViewProperty} />
        )}

        {/* SUBVIEW: REPORTS */}
        {activeTab === 'admin-reports' && (
          <ReportsManagementView reports={reports} onViewProperty={onViewProperty} />
        )}

        {/* SUBVIEW: SUPPORT & HELP DESK */}
        {activeTab === 'admin-support' && <AdminSupportManagementView />}

        {/* SUBVIEW: LOCATIONS */}
        {activeTab === 'admin-locations' && (
          <LocationsManagementView locations={locations} properties={properties} />
        )}

        {/* SUBVIEW: PLATFORM SETTINGS */}
        {activeTab === 'admin-settings' && <PlatformSettingsView />}
      </div>

      {/* ADMIN PROPERTY REVIEW MODAL */}
      <AdminPropertyReviewModal
        property={reviewingProperty}
        isOpen={!!reviewingProperty}
        onClose={() => setReviewingProperty(null)}
        onStatusUpdated={(propertyId) => {
          const updated = Store.getPropertyById(propertyId);
          if (updated) setReviewingProperty(updated);
        }}
      />

      {/* ADMIN LANDLORD KYC REVIEW MODAL */}
      <AdminLandlordReviewModal
        landlord={reviewingLandlord}
        isOpen={!!reviewingLandlord}
        onClose={() => setReviewingLandlord(null)}
        onStatusUpdated={(landlordId) => {
          const updated = Store.getUserById(landlordId);
          if (updated && updated.role === 'LANDLORD') {
            setReviewingLandlord(updated as LandlordUser);
          }
        }}
      />
    </div>
  );
};
