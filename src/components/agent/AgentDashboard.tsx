import React, { useEffect, useMemo, useState } from 'react';
import {
  AgentClient,
  AgentUser,
  AppNotification,
  LocationArea,
  Property,
  RentalApplication,
  SearchFilterState,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Store } from '../../services/store';
import {
  AgentCorrectionRequiredView,
  AgentPendingApprovalView,
  AgentRejectedView,
} from './AgentStatusScreens';
import { AgentProfileView } from './AgentProfileView';
import { AgentClientsView } from './AgentClientsView';
import { AgentAssistedPropertiesView } from './AgentAssistedPropertiesView';
import { AgentApplicationsView } from './AgentApplicationsView';
import { AgentSavedPropertiesView } from './AgentSavedPropertiesView';
import { AgentNotificationsView } from './AgentNotificationsView';
import { AgentListingsView } from './AgentListingsView';
import { KYCVerificationView } from '../kyc/KYCVerificationView';
import { KYCRequirementModal } from '../kyc/KYCRequirementModal';
import { SupportCenterView } from '../support/SupportCenterView';
import { PropertyCard } from '../common/PropertyCard';
import { PropertySearchFilters } from '../tenant/PropertySearchFilters';
import { PropertyDetailsView } from '../tenant/PropertyDetailsView';
import { DirectMessagingModal } from '../common/DirectMessagingModal';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Bookmark,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Heart,
  Home,
  Layers,
  LifeBuoy,
  MapPin,
  Plus,
  PlusCircle,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  User,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';

interface AgentDashboardProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  properties: Property[];
  locations: LocationArea[];
  applications: RentalApplication[];
  notifications: AppNotification[];
  onViewProperty?: (prop: Property) => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  activeTab,
  setActiveTab,
  properties,
  locations,
  applications,
  notifications,
}) => {
  const { currentUser } = useAuth();
  const agent = currentUser as AgentUser;

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedInspectionModalId, setSelectedInspectionModalId] = useState<string | null>(null);
  const [showKYCModal, setShowKYCModal] = useState(false);

  // Check Agent KYC status
  const kycApplication = useMemo(() => {
    return agent ? Store.getKYCApplicationByUserId(agent.id) : null;
  }, [agent?.id]);

  const effectiveVerificationStatus = agent?.verificationStatus || kycApplication?.status || 'NOT_SUBMITTED';
  const isKYCApproved = effectiveVerificationStatus === 'VERIFIED' || effectiveVerificationStatus === 'APPROVED';

  const kycState: 'NOT_STARTED' | 'PENDING' | 'REJECTED' | 'CORRECTION_REQUIRED' = useMemo(() => {
    if (
      effectiveVerificationStatus === 'PENDING' ||
      effectiveVerificationStatus === 'UNDER_REVIEW' ||
      effectiveVerificationStatus === 'PENDING_AGENT_APPROVAL'
    )
      return 'PENDING';
    if (effectiveVerificationStatus === 'REJECTED') return 'REJECTED';
    if (
      effectiveVerificationStatus === 'CORRECTION_REQUIRED' ||
      effectiveVerificationStatus === 'AGENT_CORRECTION_REQUIRED'
    )
      return 'CORRECTION_REQUIRED';
    return 'NOT_STARTED';
  }, [effectiveVerificationStatus]);

  // Clear modal and property detail states whenever activeTab changes
  useEffect(() => {
    setSelectedProperty(null);
    setSelectedInspectionModalId(null);
  }, [activeTab]);

  const normalizedTab = useMemo(() => {
    const raw = (activeTab || '').toLowerCase().trim();
    if (raw === 'agent-listings' || raw === 'listings' || raw === 'my-listings') return 'listings';
    if (raw === 'agent-clients' || raw === 'clients' || raw === 'manage-clients') return 'clients';
    if (raw === 'agent-assisted' || raw === 'assisted' || raw === 'assisted-properties') return 'assisted';
    if (raw === 'agent-search' || raw === 'search' || raw === 'search-listings') return 'search';
    if (raw === 'agent-applications' || raw === 'applications' || raw === 'client-applications') return 'applications';
    if (raw === 'agent-saved' || raw === 'saved' || raw === 'saved-properties') return 'saved';
    if (raw === 'agent-profile' || raw === 'profile' || raw === 'my-profile') return 'profile';
    if (raw === 'agent-kyc' || raw === 'kyc' || raw === 'verification' || raw === 'verification-center') return 'kyc';
    if (raw === 'agent-notifications' || raw === 'notifications') return 'notifications';
    if (raw === 'agent-support' || raw === 'support' || raw === 'support-center') return 'support';
    return 'overview';
  }, [activeTab]);

  // Search filter state for the Search tab
  const initialFilters: SearchFilterState = {
    city: 'All Cities',
    area: 'All Areas',
    propertyType: 'All Types',
    bedrooms: 'All',
    minPrice: 0,
    maxPrice: 10000000,
    facility: 'All Facilities',
  };

  const [filters, setFilters] = useState<SearchFilterState>(initialFilters);

  // Client count and assisted props count
  const clients = useMemo(() => {
    if (!agent) return [];
    return Store.getAgentClients(agent.id);
  }, [agent]);

  const assistedProps = useMemo(() => {
    if (!agent) return [];
    return Store.getAssistedPropertiesByAgent(agent.id);
  }, [agent]);

  const agentListings = useMemo(() => {
    if (!agent) return [];
    return properties.filter(
      (p) => (p.listingSource === 'AGENT' && p.submittingAgentId === agent.id) || p.submittingAgentId === agent.id
    );
  }, [properties, agent]);

  const unreadNotifsCount = useMemo(() => {
    if (!agent) return 0;
    return notifications.filter((n) => n.userId === agent.id && !n.isRead).length;
  }, [agent, notifications]);

  // Client applications matching
  const clientEmails = useMemo(() => clients.map((c) => c.email.toLowerCase().trim()).filter(Boolean), [clients]);
  const clientPhones = useMemo(() => clients.map((c) => c.phoneNumber.replace(/\s+/g, '')).filter(Boolean), [clients]);
  const clientNames = useMemo(() => clients.map((c) => c.fullName.toLowerCase().trim()), [clients]);

  const clientApplications = useMemo(() => {
    return applications.filter((app) => {
      const emailMatch = app.email && clientEmails.includes(app.email.toLowerCase().trim());
      const phoneMatch = app.phoneNumber && clientPhones.includes(app.phoneNumber.replace(/\s+/g, ''));
      const nameMatch = app.fullName && clientNames.some((n) => app.fullName.toLowerCase().includes(n));
      return emailMatch || phoneMatch || nameMatch;
    });
  }, [applications, clientEmails, clientPhones, clientNames]);

  // Filtered properties for marketplace search
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      // Must be approved/active for public search
      if (p.status !== 'AVAILABLE' && p.status !== 'APPROVED' && p.status !== 'RENTED') return false;

      if (filters.city !== 'All Cities' && p.location.city.toLowerCase() !== filters.city.toLowerCase()) return false;
      if (filters.area !== 'All Areas' && p.location.area !== filters.area) return false;
      if (filters.propertyType !== 'All Types' && p.propertyType !== filters.propertyType) return false;
      if (filters.bedrooms !== 'All') {
        if (filters.bedrooms === '5+') {
          if (p.bedrooms < 5) return false;
        } else if (p.bedrooms !== Number(filters.bedrooms)) {
          return false;
        }
      }
      if (filters.minPrice > 0 && p.pricing.rent < filters.minPrice) return false;
      if (filters.maxPrice > 0 && p.pricing.rent > filters.maxPrice) return false;
      if (filters.facility !== 'All Facilities' && !p.facilities.includes(filters.facility as any)) return false;

      return true;
    });
  }, [properties, filters]);

  if (!agent) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-stone-600 text-lg">Please sign in as an Agent to view this workspace.</p>
      </div>
    );
  }

  // If agent explicitly navigated to KYC / Verification Center
  if (normalizedTab === 'kyc') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveTab('overview')}
            className="text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3.5 py-2 rounded-xl transition cursor-pointer"
          >
            ← Return to Dashboard
          </button>
        </div>
        <KYCVerificationView onSuccess={() => setActiveTab('overview')} />
      </div>
    );
  }

  // Verification Status Guards: Only APPROVED/VERIFIED agents get full dashboard
  if (
    agent.verificationStatus === 'PENDING' ||
    agent.verificationStatus === 'PENDING_AGENT_APPROVAL'
  ) {
    return (
      <AgentPendingApprovalView
        agent={agent}
        onExploreProperties={() => setActiveTab('explore')}
        onOpenKYC={() => setActiveTab('kyc')}
      />
    );
  }

  if (
    agent.verificationStatus === 'AGENT_CORRECTION_REQUIRED' ||
    agent.verificationStatus === 'CORRECTION_REQUIRED'
  ) {
    return (
      <AgentCorrectionRequiredView
        agent={agent}
        onExploreProperties={() => setActiveTab('explore')}
        onOpenKYC={() => setActiveTab('kyc')}
      />
    );
  }

  if (agent.verificationStatus === 'REJECTED') {
    return (
      <AgentRejectedView
        agent={agent}
        onExploreProperties={() => setActiveTab('explore')}
        onOpenKYC={() => setActiveTab('kyc')}
      />
    );
  }

  // If a property detail view is open
  if (selectedProperty) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PropertyDetailsView
          property={selectedProperty}
          onBack={() => setSelectedProperty(null)}
          onApplyToRent={() => {
            // Agents assist clients directly with rental applications
          }}
          onReportProperty={() => {}}
        />
      </div>
    );
  }

  return (
    <div id="agent-dashboard-root" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Agent Top Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-stone-200 no-scrollbar">
        {[
          { id: 'overview', label: 'Overview', icon: Home },
          { id: 'listings', label: `My Listings (${agentListings.length})`, icon: Building2 },
          { id: 'clients', label: `Clients (${clients.length})`, icon: UserCheck },
          { id: 'assisted', label: `Assisted Properties (${assistedProps.length})`, icon: Layers },
          { id: 'search', label: 'Search Listings', icon: Search },
          { id: 'applications', label: `Client Applications (${clientApplications.length})`, icon: FileText },
          { id: 'saved', label: `Saved (${(agent.savedPropertyIds || []).length})`, icon: Bookmark },
          { id: 'kyc', label: 'Verification Center', icon: ShieldCheck },
          { id: 'profile', label: 'Agent Profile', icon: User },
          {
            id: 'notifications',
            label: `Notifications${unreadNotifsCount > 0 ? ` (${unreadNotifsCount})` : ''}`,
            icon: Bell,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = normalizedTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`agent-nav-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Overview */}
      {normalizedTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Welcome & Verification Banner */}
          <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-md">
            <div className="relative z-10 space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-emerald-600/90 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Agent Workspace
                </span>
                {agent.verificationStatus === 'VERIFIED' ? (
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    Verified Intermediary
                  </span>
                ) : agent.verificationStatus === 'SUSPENDED' ? (
                  <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-red-700" />
                    Suspended
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    Pending Verification
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Welcome back, {agent.fullName}
              </h1>
              <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
                {agent.agencyName || 'Independent Real Estate Intermediary'} • Covering{' '}
                {agent.operatingArea || 'Uyo Metropolis'}
              </p>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
            <div
              id="agent-metric-my-listings"
              onClick={() => setActiveTab('listings')}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-purple-500 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  My Listings
                </span>
                <div className="p-2 bg-purple-50 rounded-xl text-purple-700 group-hover:bg-purple-700 group-hover:text-white transition">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-stone-900">{agentListings.length}</p>
              <p className="text-xs text-stone-500 mt-1">Submitted properties</p>
            </div>

            <div
              onClick={() => setActiveTab('clients')}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-emerald-500 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Clients
                </span>
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-stone-900">{clients.length}</p>
              <p className="text-xs text-stone-500 mt-1">Prospective tenants</p>
            </div>

            <div
              onClick={() => setActiveTab('assisted')}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-emerald-500 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Assisted
                </span>
                <div className="p-2 bg-blue-50 rounded-xl text-blue-700 group-hover:bg-blue-700 group-hover:text-white transition">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-stone-900">{assistedProps.length}</p>
              <p className="text-xs text-stone-500 mt-1">Active advisory</p>
            </div>

            <div
              onClick={() => setActiveTab('applications')}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-emerald-500 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Applications
                </span>
                <div className="p-2 bg-purple-50 rounded-xl text-purple-700 group-hover:bg-purple-700 group-hover:text-white transition">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-stone-900">{clientApplications.length}</p>
              <p className="text-xs text-stone-500 mt-1">Client files</p>
            </div>

            <div
              onClick={() => setActiveTab('saved')}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-emerald-500 transition cursor-pointer group col-span-2 sm:col-span-1"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Shortlisted
                </span>
                <div className="p-2 bg-amber-50 rounded-xl text-amber-700 group-hover:bg-amber-700 group-hover:text-white transition">
                  <Bookmark className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                {(agent.savedPropertyIds || []).length}
              </p>
              <p className="text-xs text-stone-500 mt-1">Bookmarked</p>
            </div>
          </div>

          {/* Quick Action Hub */}
          <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200 space-y-4">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-700" />
              Quick Agent Tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <button
                id="btn-quick-agent-add-property"
                onClick={() => {
                  if (!isKYCApproved) {
                    setShowKYCModal(true);
                    return;
                  }
                  setActiveTab('listings');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-stone-200 hover:border-purple-600 text-left transition cursor-pointer shadow-2xs group"
              >
                <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700 group-hover:bg-purple-700 group-hover:text-white transition">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Add Property</h3>
                  <p className="text-xs text-stone-500">Submit for verification</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('clients')}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-stone-200 hover:border-emerald-600 text-left transition cursor-pointer shadow-2xs group"
              >
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Register Client</h3>
                  <p className="text-xs text-stone-500">Add tenant requirements</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('search')}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-stone-200 hover:border-emerald-600 text-left transition cursor-pointer shadow-2xs group"
              >
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-700 group-hover:text-white transition">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Browse HOMEZA Listings</h3>
                  <p className="text-xs text-stone-500">Search verified properties</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-stone-200 hover:border-emerald-600 text-left transition cursor-pointer shadow-2xs group"
              >
                <div className="p-2.5 rounded-lg bg-stone-100 text-stone-700 group-hover:bg-emerald-700 group-hover:text-white transition">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Profile & Verification</h3>
                  <p className="text-xs text-stone-500">Coverage & status</p>
                </div>
              </button>

              <button
                id="btn-quick-agent-support"
                onClick={() => setActiveTab('support')}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-purple-200 hover:border-purple-600 text-left transition cursor-pointer shadow-2xs group"
              >
                <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700 group-hover:bg-purple-700 group-hover:text-white transition">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Support Center</h3>
                  <p className="text-xs text-stone-500">Inquiries & accreditation</p>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Clients Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-700" />
                Recent Clients
              </h2>
              <button
                onClick={() => setActiveTab('clients')}
                className="text-sm font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
              >
                View All Clients
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {clients.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-stone-200 text-center text-sm text-stone-500">
                No clients added yet. Click "Register New Client" to start building your client roster.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clients.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="p-4 bg-white rounded-2xl border border-stone-200 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <h3 className="font-bold text-stone-900 text-base">{c.fullName}</h3>
                      <p className="text-xs text-stone-500">{c.phoneNumber}</p>
                      <p className="text-xs text-emerald-800 font-semibold mt-1">
                        Assigned Listings: {(c.assignedPropertyIds || []).length}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('clients')}
                      className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold cursor-pointer"
                    >
                      Manage
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Agent Submitted Property Listings */}
      {normalizedTab === 'listings' && (
        <AgentListingsView
          agent={agent}
          properties={properties}
          locations={locations}
          onViewProperty={(p) => setSelectedProperty(p)}
          onNavigateToKYC={() => setActiveTab('kyc')}
        />
      )}

      {/* TAB CONTENT: Clients */}
      {normalizedTab === 'clients' && (
        <AgentClientsView
          agent={agent}
          properties={properties}
          locations={locations}
          onViewProperty={(p) => setSelectedProperty(p)}
        />
      )}

      {/* TAB CONTENT: Assisted Properties */}
      {normalizedTab === 'assisted' && (
        <AgentAssistedPropertiesView
          agent={agent}
          properties={properties}
          onViewProperty={(p) => setSelectedProperty(p)}
          onNavigateToSearch={() => setActiveTab('search')}
        />
      )}

      {/* TAB CONTENT: Search Marketplace */}
      {normalizedTab === 'search' && (
        <div id="agent-search-view" className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2.5">
              <Search className="w-8 h-8 text-emerald-700" />
              Marketplace Property Search
            </h1>
            <p className="text-stone-600 text-base mt-1">
              Search verified rental apartments and houses across Uyo to match with your clients.
            </p>
          </div>

          <PropertySearchFilters
            filters={filters}
            setFilters={setFilters}
            locations={locations}
            onSearch={() => {}}
            onReset={() => setFilters(initialFilters)}
          />

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-700">
              Showing <span className="text-emerald-800 font-bold">{filteredProperties.length}</span>{' '}
              available listings
            </p>
          </div>

          {filteredProperties.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <Home className="w-12 h-12 text-stone-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-stone-900 mb-1">No Properties Found</h2>
              <p className="text-stone-600 text-sm max-w-md mx-auto mb-4">
                Try adjusting your search query, price range, or location area filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((prop) => (
                <PropertyCard
                  key={prop.id}
                  property={prop}
                  onViewDetails={(p) => setSelectedProperty(p)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Client Applications */}
      {normalizedTab === 'applications' && (
        <AgentApplicationsView
          agent={agent}
          applications={applications}
          onViewApplicationProperty={(pId) => {
            const found = properties.find((p) => p.id === pId);
            if (found) setSelectedProperty(found);
          }}
        />
      )}

      {/* TAB CONTENT: Saved Properties */}
      {normalizedTab === 'saved' && (
        <AgentSavedPropertiesView
          agent={agent}
          properties={properties}
          onViewProperty={(p) => setSelectedProperty(p)}
          onNavigateToSearch={() => setActiveTab('search')}
        />
      )}

      {/* TAB CONTENT: Profile & Verification */}
      {normalizedTab === 'profile' && <AgentProfileView agent={agent} />}

      {/* TAB CONTENT: Notifications */}
      {normalizedTab === 'notifications' && (
        <AgentNotificationsView
          agent={agent}
          notifications={notifications}
          onNavigateToInspection={(inspectionId) => setSelectedInspectionModalId(inspectionId)}
        />
      )}

      {/* TAB CONTENT: Support Center */}
      {normalizedTab === 'support' && (
        <div className="max-w-5xl mx-auto">
          <SupportCenterView />
        </div>
      )}

      {/* Direct Messaging & Inspection Modal */}
      {selectedInspectionModalId && (
        <DirectMessagingModal
          inspectionId={selectedInspectionModalId}
          onClose={() => setSelectedInspectionModalId(null)}
        />
      )}

      {/* KYC Requirement Modal */}
      {showKYCModal && (
        <KYCRequirementModal
          isOpen={showKYCModal}
          onClose={() => setShowKYCModal(false)}
          role="AGENT"
          userRole="AGENT"
          kycState={kycState}
          fullName={agent.fullName}
          adminNote={agent.adminCorrectionNote || agent.adminRejectionReason}
          onNavigateToKYC={() => {
            setShowKYCModal(false);
            setActiveTab('kyc');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
};
