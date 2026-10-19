import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  FileCheck2,
  FileText,
  KeyRound,
  Layers,
  MapPin,
  Phone,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  Users,
  XCircle,
  ChevronRight,
  ArrowRight,
  Calendar,
  LifeBuoy,
} from 'lucide-react';
import {
  AppNotification,
  LandlordUser,
  LocationArea,
  Property,
  PropertyStatus,
  RentalApplication,
} from '../../types';
import { formatNaira } from '../../config/platform';
import { AddEditPropertyModal } from './AddEditPropertyModal';
import { LandlordApplicationsView } from './LandlordApplicationsView';
import { LandlordNotificationsView } from './LandlordNotificationsView';
import { LandlordAddPropertyView } from './LandlordAddPropertyView';
import { SupportCenterView } from '../support/SupportCenterView';
import { DirectMessagingModal } from '../common/DirectMessagingModal';
import { InspectionWorkflowModal } from '../common/InspectionWorkflowModal';
import { KYCVerificationView } from '../kyc/KYCVerificationView';
import { KYCRequirementModal } from '../kyc/KYCRequirementModal';
import { PhoneVerificationModal } from '../kyc/PhoneVerificationModal';
import { Store } from '../../services/store';
import { useAuth } from '../../context/AuthContext';
import { evaluateUserVerification } from '../../utils/verification';

interface LandlordDashboardProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  properties: Property[];
  applications: RentalApplication[];
  locations: LocationArea[];
  notifications: AppNotification[];
  onViewProperty: (property: Property) => void;
  isInspectionMode?: boolean;
  inspectedLandlord?: LandlordUser | null;
}

export const LandlordDashboard: React.FC<LandlordDashboardProps> = ({
  activeTab,
  setActiveTab,
  properties,
  applications,
  locations,
  notifications,
  onViewProperty,
  isInspectionMode = false,
  inspectedLandlord = null,
}) => {
  const { currentUser, updateCurrentUserProfile, refreshSession } = useAuth();
  const landlord = isInspectionMode
    ? inspectedLandlord
    : (currentUser as LandlordUser);

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [selectedInspectionModalId, setSelectedInspectionModalId] = useState<string | null>(null);
  const [directChatInspectionId, setDirectChatInspectionId] = useState<string | null>(null);
  const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState(false);

  // Inspection mode notification
  const [inspectionAlertMsg, setInspectionAlertMsg] = useState<string | null>(null);

  const showInspectionNotice = (actionName: string) => {
    const msg = `Admin inspection mode: ${actionName} is disabled because you are viewing the Landlord experience.`;
    setInspectionAlertMsg(msg);
    setTimeout(() => setInspectionAlertMsg(null), 5000);
  };

  // Profile Edit State
  const [businessName, setBusinessName] = useState(landlord?.businessName || '');
  const [fullName, setFullName] = useState(landlord?.fullName || '');
  const [phone, setPhone] = useState(landlord?.phoneNumber || '');
  const [bankName, setBankName] = useState(landlord?.bankDetails?.bankName || 'Zenith Bank Nigeria');
  const [accNum, setAccNum] = useState(landlord?.bankDetails?.accountNumber || '');
  const [accName, setAccName] = useState(landlord?.bankDetails?.accountName || '');
  const [profileMsg, setProfileMsg] = useState(false);

  // Sync profile fields if inspected landlord changes
  React.useEffect(() => {
    if (landlord) {
      setBusinessName(landlord.businessName || '');
      setFullName(landlord.fullName || '');
      setPhone(landlord.phoneNumber || '');
      setBankName(landlord.bankDetails?.bankName || 'Zenith Bank Nigeria');
      setAccNum(landlord.bankDetails?.accountNumber || '');
      setAccName(landlord.bankDetails?.accountName || '');
    }
  }, [landlord]);

  // Landlord's own properties
  const myProperties = useMemo(() => {
    return properties.filter((p) => p.landlordId === landlord?.id);
  }, [properties, landlord?.id]);

  // Landlord's received applications for their properties
  const myApplications = useMemo(() => {
    return applications.filter((a) => a.landlordId === landlord?.id);
  }, [applications, landlord?.id]);

  // Landlord's inspection appointments & requests
  const myInspections = useMemo(() => {
    return Store.getInspections().filter(
      (i) => i.landlordId === landlord?.id || (currentUser && i.landlordId === currentUser.id)
    );
  }, [landlord?.id, currentUser?.id, properties]);

  // Filtered Landlord notifications
  const landlordNotifications = useMemo(() => {
    return notifications.filter(
      (n) => n.userId === landlord?.id || n.userId === 'all'
    );
  }, [notifications, landlord?.id]);

  // 6 Required Metrics
  const totalProperties = myProperties.length;
  const availableProperties = myProperties.filter((p) => p.status === 'AVAILABLE' || p.status === 'APPROVED').length;
  const rentedProperties = myProperties.filter((p) => p.status === 'RENTED').length;
  const pendingPropertyReviews = myProperties.filter(
    (p) => p.status === 'PENDING_REVIEW' || p.status === 'CORRECTION_REQUIRED'
  ).length;
  const pendingTenantApplications = myApplications.filter(
    (a) => a.status === 'PENDING' || a.status === 'INFORMATION_REQUESTED'
  ).length;
  const approvedApplications = myApplications.filter((a) => a.status === 'APPROVED').length;

  const [showKYCModal, setShowKYCModal] = useState(false);

  // Fetch authoritative verification status from server on mount and tab switch
  React.useEffect(() => {
    if (landlord?.id && !isInspectionMode) {
      Store.getVerificationStatus(landlord.id);
    }
  }, [landlord?.id, activeTab, isInspectionMode]);

  const verificationEval = useMemo(() => {
    return evaluateUserVerification(landlord);
  }, [landlord]);

  const isKYCApproved = verificationEval.isFullyVerified;
  const kycState = verificationEval.kycState;

  const handleOpenAdd = () => {
    if (isInspectionMode) {
      showInspectionNotice('Adding new properties');
      return;
    }
    if (!isKYCApproved) {
      setShowKYCModal(true);
      return;
    }
    setActiveTab('landlord-add-property');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEdit = (property: Property) => {
    if (isInspectionMode) {
      showInspectionNotice('Editing properties');
      return;
    }
    setPropertyToEdit(property);
    setIsAddEditOpen(true);
  };

  const handleDeleteProperty = (propId: string, title: string) => {
    if (isInspectionMode) {
      showInspectionNotice('Deleting properties');
      return;
    }
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      Store.deleteProperty(propId);
    }
  };

  const handleToggleStatus = (propId: string, currentStatus: PropertyStatus) => {
    if (isInspectionMode) {
      showInspectionNotice('Toggling property status');
      return;
    }
    const nextStatus: PropertyStatus =
      currentStatus === 'AVAILABLE' ? 'RENTED' : currentStatus === 'RENTED' ? 'AVAILABLE' : 'AVAILABLE';
    Store.updatePropertyStatus(propId, nextStatus);
  };

  const handleQuickApprove = (appId: string) => {
    if (isInspectionMode) {
      showInspectionNotice('Quick approving applications');
      return;
    }
    Store.updateApplicationStatus(appId, 'APPROVED', 'Application approved by landlord.');
  };

  const handleQuickReject = (appId: string) => {
    if (isInspectionMode) {
      showInspectionNotice('Quick rejecting applications');
      return;
    }
    Store.updateApplicationStatus(appId, 'REJECTED', 'Application declined by landlord.');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (isInspectionMode) {
      showInspectionNotice('Updating landlord profile');
      return;
    }
    updateCurrentUserProfile({
      fullName: fullName.trim(),
      phoneNumber: phone.trim(),
      businessName: businessName.trim(),
      bankDetails: {
        bankName: bankName.trim(),
        accountNumber: accNum.trim(),
        accountName: accName.trim() || fullName.trim(),
      },
    });
    setProfileMsg(true);
    setTimeout(() => setProfileMsg(false), 3000);
  };

  return (
    <div className="min-h-screen bg-stone-100/60 pb-16">
      {/* Inspection Mode Alert Banner */}
      {inspectionAlertMsg && (
        <div
          id="landlord-inspection-alert-banner"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-purple-200 font-bold text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-2xl border-2 border-purple-500 flex items-center gap-3 animate-fade-in"
        >
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{inspectionAlertMsg}</span>
          <button
            onClick={() => setInspectionAlertMsg(null)}
            className="ml-2 text-xs bg-purple-950 hover:bg-purple-900 px-2.5 py-1 rounded-lg text-purple-200 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner with Stats Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                  Landlord Management Dashboard
                </h1>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
                    isKYCApproved
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {isKYCApproved ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>✓ Verified Landlord</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Verification Pending</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-sm sm:text-base text-stone-600 mt-1.5 leading-relaxed">
                Manage your residential portfolio in Uyo, respond to tenant applications, and list available properties.
              </p>
            </div>

            {/* Quick Add CTA */}
            <div className="flex items-center gap-3">
              <button
                id="btn-landlord-add-property-top"
                type="button"
                onClick={handleOpenAdd}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm sm:text-base px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-5 h-5" />
                <span>+ Add Property</span>
              </button>
            </div>
          </div>

          {/* 6 Required KPI Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4 mt-6">
            {/* 1. Total Properties */}
            <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-600 font-bold uppercase tracking-wider">
                  Total
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-stone-900">{totalProperties}</div>
                <div className="text-xs text-stone-600 font-medium mt-0.5">Total Properties</div>
              </div>
            </div>

            {/* 2. Available Properties */}
            <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-600 font-bold uppercase tracking-wider">
                  Available
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-stone-900">{availableProperties}</div>
                <div className="text-xs text-stone-600 font-medium mt-0.5">Available Units</div>
              </div>
            </div>

            {/* 3. Rented Properties */}
            <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-600 font-bold uppercase tracking-wider">
                  Rented
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-stone-900">{rentedProperties}</div>
                <div className="text-xs text-stone-600 font-medium mt-0.5">Rented Properties</div>
              </div>
            </div>

            {/* 4. Pending Property Reviews */}
            <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-600 font-bold uppercase tracking-wider">
                  Review
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-stone-900">{pendingPropertyReviews}</div>
                <div className="text-xs text-stone-600 font-medium mt-0.5">Property Reviews</div>
              </div>
            </div>

            {/* 5. Pending Tenant Applications */}
            <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-600 font-bold uppercase tracking-wider">
                  Pending
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-stone-900">{pendingTenantApplications}</div>
                <div className="text-xs text-stone-600 font-medium mt-0.5">Tenant Applications</div>
              </div>
            </div>

            {/* 6. Approved Applications */}
            <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-600 font-bold uppercase tracking-wider">
                  Approved
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-stone-900">{approvedApplications}</div>
                <div className="text-xs text-stone-600 font-medium mt-0.5">Approved Tenants</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* SUBVIEW 1: DASHBOARD OVERVIEW */}
        {(activeTab === 'landlord-dashboard' || activeTab === 'overview' || activeTab === 'explore' || (!['landlord-properties', 'landlord-add-property', 'landlord-applications', 'landlord-notifications', 'profile', 'landlord-support', 'landlord-kyc', 'kyc', 'verification'].includes(activeTab))) && (
          <div className="space-y-8">
            {/* Identity & Verification Warning for Unverified Landlords */}
            {landlord?.verificationStatus !== 'VERIFIED' && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-amber-950">Identity & Property Security (KYC Required)</h4>
                    <p className="text-xs text-amber-900 mt-0.5 max-w-xl">
                      Under HOMEZA Phase 1 trust guidelines, all Landlords and Agents must complete government ID verification and phone OTP confirmation before publishing active property listings.
                    </p>
                  </div>
                </div>
                <button
                  id="btn-landlord-complete-kyc-banner"
                  type="button"
                  onClick={() => setActiveTab('landlord-kyc')}
                  className="px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Complete Identity Verification</span>
                </button>
              </div>
            )}

            {/* Dashboard Action Buttons Bar */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-4">
              <h3 className="font-bold text-stone-900 text-sm sm:text-base uppercase tracking-wider text-stone-600">
                Dashboard Quick Actions
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <button
                  id="btn-dash-add-property"
                  type="button"
                  onClick={handleOpenAdd}
                  className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-950 transition flex flex-col items-start justify-between gap-3.5 text-left cursor-pointer group shadow-xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-base font-bold block text-emerald-950">Add Property</strong>
                    <span className="text-xs text-emerald-800 font-medium">List a new home</span>
                  </div>
                </button>

                <button
                  id="btn-dash-view-properties"
                  type="button"
                  onClick={() => setActiveTab('landlord-properties')}
                  className="p-5 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-900 transition flex flex-col items-start justify-between gap-3.5 text-left cursor-pointer group shadow-xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-stone-800 text-white flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-base font-bold block text-stone-900">View Properties</strong>
                    <span className="text-xs text-stone-600 font-medium">{totalProperties} total units</span>
                  </div>
                </button>

                <button
                  id="btn-dash-view-applications"
                  type="button"
                  onClick={() => setActiveTab('landlord-applications')}
                  className="p-5 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-900 transition flex flex-col items-start justify-between gap-3.5 text-left cursor-pointer group shadow-xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-base font-bold block text-stone-900">View Applications</strong>
                    <span className="text-xs text-stone-600 font-medium">{pendingTenantApplications} pending</span>
                  </div>
                </button>

                <button
                  id="btn-dash-view-notifications"
                  type="button"
                  onClick={() => setActiveTab('landlord-notifications')}
                  className="p-5 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-900 transition flex flex-col items-start justify-between gap-3.5 text-left cursor-pointer group shadow-xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-base font-bold block text-stone-900">View Notifications</strong>
                    <span className="text-xs text-stone-600 font-medium">
                      {landlordNotifications.filter((n) => !n.isRead).length} unread alerts
                    </span>
                  </div>
                </button>

                <button
                  id="btn-dash-kyc-verification"
                  type="button"
                  onClick={() => setActiveTab('landlord-kyc')}
                  className="p-5 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-900 transition flex flex-col items-start justify-between gap-3.5 text-left cursor-pointer group shadow-xs"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition shadow-xs ${
                    landlord?.verificationStatus === 'VERIFIED' ? 'bg-emerald-700 text-white' : 'bg-amber-600 text-white'
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-base font-bold block text-stone-900">Identity & KYC</strong>
                    <span className="text-xs text-stone-600 font-medium">
                      {landlord?.verificationStatus === 'VERIFIED' ? '✓ Verified Status' : 'Verification Pending'}
                    </span>
                  </div>
                </button>

                <button
                  id="btn-dash-support-center"
                  type="button"
                  onClick={() => setActiveTab('landlord-support')}
                  className="p-5 rounded-2xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-purple-950 transition flex flex-col items-start justify-between gap-3.5 text-left cursor-pointer group shadow-xs col-span-2 sm:col-span-4 lg:col-span-4"
                >
                  <div className="flex items-center gap-3 w-full justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                        <LifeBuoy className="w-5 h-5" />
                      </div>
                      <div>
                        <strong className="text-base font-bold block text-purple-950">HOMEZA Support & Help Desk</strong>
                        <span className="text-xs text-purple-800 font-medium">
                          Need help with title verification, bank account updates, or tenant disputes? Open an official support ticket.
                        </span>
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold bg-purple-200/80 text-purple-900 px-3 py-1.5 rounded-xl">
                      Open Support <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Inspection Requests & Schedule */}
            {myInspections.length > 0 && (
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div>
                    <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-700" />
                      <span>Inspection Requests & Viewings</span>
                      <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                        {myInspections.length}
                      </span>
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Physical inspection requests submitted by prospective tenants
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-stone-100">
                  {myInspections.map((insp) => (
                    <div
                      key={insp.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-sm">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-stone-900 text-sm truncate">
                              {insp.tenantName}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                insp.status === 'INSPECTION_CONFIRMED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : insp.status === 'INSPECTION_RESCHEDULED'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : insp.status === 'INSPECTION_CANCELLED'
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : insp.status === 'INSPECTION_COMPLETED'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {insp.status.replace('INSPECTION_', '')}
                            </span>
                          </div>

                          <div className="text-xs text-stone-600 truncate font-medium">
                            {insp.propertyTitle} • {insp.propertyLocationArea}, Uyo
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400">
                            <span>
                              Requested Date: <strong className="text-stone-700 font-bold">{insp.preferredDate}</strong> ({insp.preferredTime})
                            </span>
                            {insp.notes && (
                              <>
                                <span>•</span>
                                <span className="italic text-stone-500 truncate max-w-xs">"{insp.notes}"</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          id={`btn-landlord-manage-insp-${insp.id}`}
                          type="button"
                          onClick={() => setSelectedInspectionModalId(insp.id)}
                          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Coordinate Inspection</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Applications Section */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-700" />
                    <span>Recent Applications</span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      {myApplications.length}
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Tenant applications received for your properties in Uyo
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('landlord-applications')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Applications</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {myApplications.length === 0 ? (
                <div className="text-center py-10 text-stone-400">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-30 text-stone-400" />
                  <h4 className="text-sm font-bold text-stone-800">No Applications Received Yet</h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    When prospective tenants submit rental applications for your properties, they will appear here with full contact details.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {myApplications.map((app) => (
                    <div
                      key={app.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-sm">
                          {app.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 text-sm truncate">
                              {app.fullName}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                app.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : app.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {app.status}
                            </span>
                          </div>

                          <div className="text-xs text-stone-600 truncate font-medium">
                            {app.propertyTitle}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400">
                            <span>
                              Applied:{' '}
                              <strong className="text-stone-600 font-medium">
                                {new Date(app.appliedDate).toLocaleDateString('en-NG', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              Move-in: <strong className="text-stone-600 font-medium">{app.preferredMoveInDate}</strong>
                            </span>
                            <span>•</span>
                            <span>{app.phoneNumber}</span>
                          </div>
                        </div>
                      </div>

                      {/* Inline Quick Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {app.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleQuickApprove(app.id)}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleQuickReject(app.id)}
                              className="px-3 py-1.5 bg-stone-100 hover:bg-red-50 text-red-700 text-xs font-semibold rounded-lg transition border border-stone-200 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setActiveTab('landlord-applications')}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg transition cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Properties Quick Table */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-700" />
                    <span>My Properties Portfolio</span>
                    <span className="text-xs bg-stone-100 text-stone-700 font-bold px-2 py-0.5 rounded-full">
                      {totalProperties}
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">Overview of your real estate listings in Uyo</p>
                </div>
                <button
                  onClick={() => setActiveTab('landlord-properties')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Properties</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {myProperties.length === 0 ? (
                <div className="text-center py-10 text-stone-400">
                  <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30 text-stone-400" />
                  <h4 className="text-sm font-bold text-stone-800">No Properties Listed Yet</h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto mb-4">
                    List your first apartment or house to start receiving applications from qualified tenants in Uyo.
                  </p>
                  <button
                    onClick={() => setActiveTab('landlord-add-property')}
                    className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    + Add Your First Property
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {myProperties.slice(0, 4).map((prop) => (
                    <div
                      key={prop.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={
                            prop.images[0]?.url ||
                            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&auto=format&fit=crop&q=80'
                          }
                          alt={prop.title}
                          className="w-16 h-13 object-cover rounded-xl shrink-0"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <h4 className="font-bold text-stone-900 text-xs sm:text-sm truncate max-w-md">
                            {prop.title}
                          </h4>
                          <div className="text-xs text-stone-500 flex items-center gap-2 flex-wrap">
                            <span>{prop.location.area}, Uyo</span>
                            <span>•</span>
                            <span className="font-bold text-emerald-800">
                              {formatNaira(prop.pricing.rent)} / yr
                            </span>
                            <span>•</span>
                            <span className="text-stone-600 font-medium">
                              Inspection: <strong className="text-stone-900">{formatNaira(prop.inspectionFee || prop.pricing?.inspectionFee || 3000)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                            prop.status === 'AVAILABLE' || prop.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : prop.status === 'RENTED'
                              ? 'bg-stone-800 text-white'
                              : prop.status === 'CORRECTION_REQUIRED'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : prop.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {prop.status === 'PENDING_REVIEW'
                            ? 'Pending Review'
                            : prop.status === 'CORRECTION_REQUIRED'
                            ? 'Correction Required'
                            : prop.status === 'REJECTED'
                            ? 'Rejected'
                            : prop.status === 'AVAILABLE' || prop.status === 'APPROVED'
                            ? 'Approved'
                            : 'Rented'}
                        </span>

                        {prop.status === 'CORRECTION_REQUIRED' && (
                          <button
                            id={`btn-landlord-fix-resubmit-recent-${prop.id}`}
                            onClick={() => handleOpenEdit(prop)}
                            className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Fix requested issues and resubmit"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Fix & Resubmit</span>
                          </button>
                        )}

                        <button
                          onClick={() => onViewProperty(prop)}
                          className="p-1.5 hover:bg-stone-100 text-stone-600 rounded-lg cursor-pointer"
                          title="Preview details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(prop)}
                          className="p-1.5 hover:bg-stone-100 text-stone-600 rounded-lg cursor-pointer"
                          title="Edit property"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBVIEW 2: MY PROPERTIES FULL LIST */}
        {activeTab === 'landlord-properties' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-700" />
                  <span>My Properties ({myProperties.length})</span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Manage availability, update rent and fees, edit specs, or preview listings as seen by tenants.
                </p>
              </div>

              <button
                onClick={handleOpenAdd}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm self-start sm:self-auto cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Add Property</span>
              </button>
            </div>

            {myProperties.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 shadow-sm max-w-md mx-auto">
                <Building2 className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-stone-900 mb-1">No Properties Listed Yet</h3>
                <p className="text-xs text-stone-600 mb-5">
                  List your first apartment or duplex in Uyo to begin receiving direct tenant applications.
                </p>
                <button
                  onClick={handleOpenAdd}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Create Property Listing
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myProperties.map((prop) => (
                  <div
                    key={prop.id}
                    className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Header */}
                      <div className="relative aspect-16/10 bg-stone-100">
                        <img
                          src={
                            prop.images[0]?.url ||
                            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80'
                          }
                          alt={prop.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase shadow-sm ${
                              prop.status === 'AVAILABLE' || prop.status === 'APPROVED'
                                ? 'bg-emerald-600 text-white'
                                : prop.status === 'RENTED'
                                ? 'bg-stone-800 text-white'
                                : prop.status === 'CORRECTION_REQUIRED'
                                ? 'bg-orange-600 text-white animate-pulse'
                                : prop.status === 'REJECTED'
                                ? 'bg-red-600 text-white'
                                : 'bg-amber-600 text-white'
                            }`}
                          >
                            {prop.status === 'PENDING_REVIEW'
                              ? 'Pending Admin Review'
                              : prop.status === 'REJECTED'
                              ? 'Rejected'
                              : prop.status === 'AVAILABLE' || prop.status === 'APPROVED'
                              ? 'Approved — Visible to Tenants'
                              : prop.status === 'CORRECTION_REQUIRED'
                              ? 'Correction Required'
                              : 'Rented'}
                          </span>

                          {prop.isVerified && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-950/80 backdrop-blur-xs text-white border border-emerald-400 text-[10px] font-bold rounded-full shadow-sm">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>Verified Listing</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 space-y-2">
                        <div className="text-lg font-bold text-stone-900">
                          {formatNaira(prop.pricing.rent)}{' '}
                          <span className="text-xs font-normal text-stone-500">
                            / {prop.pricing.rentalPeriod.toLowerCase()}
                          </span>
                        </div>

                        <h3 className="font-semibold text-stone-900 text-sm line-clamp-2">
                          {prop.title}
                        </h3>

                        <div className="flex items-center gap-1.5 text-xs text-stone-500">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{prop.location.area}, Uyo</span>
                        </div>

                        <div className="flex items-center gap-3 pt-2 text-xs text-stone-600">
                          <span>{prop.bedrooms} Beds</span>
                          <span>•</span>
                          <span>{prop.bathrooms} Baths</span>
                          <span>•</span>
                          <span>{prop.facilities.length} Facilities</span>
                        </div>

                        <div className="text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 flex items-center justify-between">
                          <span className="text-stone-500">Inspection Fee:</span>
                          <span className="font-extrabold text-stone-900">
                            {formatNaira(prop.inspectionFee || prop.pricing?.inspectionFee || 3000)}
                          </span>
                        </div>

                        {prop.status === 'PENDING_REVIEW' && (
                          <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                            <strong className="block text-amber-950 font-semibold mb-0.5">Status: Pending Admin Review</strong>
                            Your listing is under review by the HOMEZA Admin team before being published to tenants.
                          </div>
                        )}

                        {prop.status === 'REJECTED' && (
                          <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-950">
                            <strong className="block text-red-900 font-semibold mb-0.5">Status: Rejected</strong>
                            {prop.adminRejectionReason ? (
                              <p className="mt-0.5">
                                <span className="font-semibold">Reason:</span> {prop.adminRejectionReason}
                              </p>
                            ) : (
                              <p className="mt-0.5">Please check and update your listing details or contact admin support.</p>
                            )}
                          </div>
                        )}

                        {prop.status === 'CORRECTION_REQUIRED' && prop.adminCorrectionNote && (
                          <div className="mt-2 p-2.5 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-950">
                            <strong className="block text-orange-900 font-semibold mb-0.5">Admin Requested Changes:</strong>
                            {prop.adminCorrectionNote}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-stone-50 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => onViewProperty(prop)}
                        className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {prop.status === 'CORRECTION_REQUIRED' ? (
                          <button
                            id={`btn-landlord-fix-resubmit-grid-${prop.id}`}
                            onClick={() => handleOpenEdit(prop)}
                            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Fix & Resubmit</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenEdit(prop)}
                            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteProperty(prop.id, prop.title)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200 cursor-pointer"
                          title="Delete property"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBVIEW 3: ADD PROPERTY */}
        {activeTab === 'landlord-add-property' && (
          isKYCApproved ? (
            <LandlordAddPropertyView
              landlord={landlord}
              locations={locations}
              onSuccess={() => {
                setActiveTab('landlord-properties');
              }}
              onCancel={() => {
                setActiveTab('landlord-dashboard');
              }}
            />
          ) : (
            <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
              <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-8 text-center space-y-4 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-sm">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-black text-amber-950">KYC Required</h3>
                  <p className="text-sm sm:text-base text-amber-900 max-w-lg mx-auto leading-relaxed">
                    You need to complete your KYC first before you are able to add or list a property on HOMEZA.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('landlord-dashboard')}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-sm font-bold transition cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('landlord-kyc');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <span>Complete KYC</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {/* SUBVIEW 4: APPLICATIONS MANAGEMENT */}
        {activeTab === 'landlord-applications' && (
          <LandlordApplicationsView
            applications={myApplications}
            isInspectionMode={isInspectionMode}
            onInspectionAction={showInspectionNotice}
          />
        )}

        {/* SUBVIEW 5: NOTIFICATIONS */}
        {activeTab === 'landlord-notifications' && (
          <LandlordNotificationsView
            notifications={landlordNotifications}
            onNavigateToApplications={() => setActiveTab('landlord-applications')}
            onNavigateToProperties={() => setActiveTab('landlord-properties')}
            onNavigateToInspection={(inspectionId) => setSelectedInspectionModalId(inspectionId)}
          />
        )}

        {/* SUBVIEW 6: PROFILE & KYC */}
        {activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 flex items-center gap-2.5">
                <User className="w-7 h-7 text-emerald-700" />
                <span>Landlord Profile & Verification</span>
              </h2>
              <p className="text-sm sm:text-base text-stone-600 mt-1">
                Maintain your identity credentials and contact information displayed to prospective tenants.
              </p>
            </div>

            {profileMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-bold p-4 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Landlord profile saved successfully.</span>
              </div>
            )}

            <form
              onSubmit={handleSaveProfile}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6"
            >
              {/* Verification status header banner */}
              <div
                className={`p-5 rounded-2xl border flex items-center justify-between ${
                  landlord.verificationStatus === 'VERIFIED'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <ShieldCheck
                    className={`w-7 h-7 ${
                      landlord.verificationStatus === 'VERIFIED' ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  />
                  <div>
                    <div className="text-base font-extrabold text-stone-900">
                      Account Status: {landlord.verificationStatus === 'VERIFIED' ? 'Verified Landlord' : 'Verification Under Review'}
                    </div>
                    <div className="text-xs sm:text-sm text-stone-600 mt-0.5">
                      {landlord.idCardType || 'National ID (NIN)'}: {landlord.idCardNumber || 'Verified by Admin'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-stone-800 mb-1.5">Full Legal Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full text-sm sm:text-base border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-stone-900 font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-bold text-stone-800">Phone Number</label>
                    {currentUser?.isPhoneVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPhoneVerifyModal(true)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-md transition cursor-pointer"
                      >
                        <Phone className="w-3 h-3" />
                        Verify Phone via OTP
                      </button>
                    )}
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full text-sm sm:text-base border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-stone-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-800 mb-1.5">
                  Business / Property Brand Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Akpan Heritage Properties Ltd"
                  className="w-full text-sm sm:text-base border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-stone-900 font-medium"
                />
              </div>

              {/* Settlement Bank Details */}
              <div className="pt-5 border-t border-stone-200 space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-stone-700">
                  Bank Settlement Details (Optional)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-stone-700 mb-1.5">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Zenith Bank"
                      className="w-full text-sm sm:text-base border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-stone-700 mb-1.5">Account Number</label>
                    <input
                      type="text"
                      value={accNum}
                      onChange={(e) => setAccNum(e.target.value)}
                      placeholder="0123456789"
                      className="w-full text-sm sm:text-base border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-stone-700 mb-1.5">Account Name</label>
                    <input
                      type="text"
                      value={accName}
                      onChange={(e) => setAccName(e.target.value)}
                      placeholder="Account Holder Name"
                      className="w-full text-sm sm:text-base border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm sm:text-base px-6 py-3 rounded-xl transition shadow-sm cursor-pointer"
                >
                  Save Landlord Settings
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SUBVIEW 7: SUPPORT & HELP DESK */}
        {activeTab === 'landlord-support' && (
          <div className="max-w-5xl mx-auto">
            <SupportCenterView />
          </div>
        )}

        {/* SUBVIEW 8: IDENTITY & KYC VERIFICATION */}
        {(activeTab === 'landlord-kyc' || activeTab === 'kyc' || activeTab === 'verification') && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                id="btn-return-to-landlord-dashboard"
                onClick={() => {
                  setActiveTab('landlord-dashboard');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <span>← Return to Landlord Dashboard</span>
              </button>
            </div>
            <KYCVerificationView
              onNavigateToAddProperty={() => {
                setActiveTab('landlord-add-property');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSuccess={() => {
                setActiveTab('landlord-dashboard');
              }}
            />
          </div>
        )}
      </div>

      {/* Add / Edit Property Modal */}
      {isAddEditOpen && (
        <AddEditPropertyModal
          isOpen={isAddEditOpen}
          onClose={() => setIsAddEditOpen(false)}
          landlord={landlord}
          propertyToEdit={propertyToEdit}
          locations={locations}
          onSuccess={() => setIsAddEditOpen(false)}
        />
      )}

      {/* Inspection Workflow Management Modal */}
      {selectedInspectionModalId && (
        <InspectionWorkflowModal
          inspectionId={selectedInspectionModalId}
          onClose={() => setSelectedInspectionModalId(null)}
          onOpenDirectMessaging={(inspId) => {
            setSelectedInspectionModalId(null);
            setDirectChatInspectionId(inspId);
          }}
        />
      )}

      {/* Direct Messaging Modal */}
      {directChatInspectionId && (
        <DirectMessagingModal
          inspectionId={directChatInspectionId}
          onClose={() => setDirectChatInspectionId(null)}
        />
      )}

      {/* KYC Requirement Intercept Modal */}
      {showKYCModal && (
        <KYCRequirementModal
          isOpen={showKYCModal}
          onClose={() => setShowKYCModal(false)}
          role="LANDLORD"
          userRole="LANDLORD"
          kycState={kycState}
          fullName={landlord?.fullName || 'Landlord'}
          adminNote={landlord?.adminCorrectionNote || landlord?.adminRejectionReason}
          onNavigateToKYC={() => {
            setShowKYCModal(false);
            setActiveTab('landlord-kyc');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        isOpen={showPhoneVerifyModal}
        onClose={() => setShowPhoneVerifyModal(false)}
        initialPhoneNumber={phone || currentUser?.phoneNumber}
        onSuccess={() => {
          refreshSession();
          setShowPhoneVerifyModal(false);
        }}
      />
    </div>
  );
};
