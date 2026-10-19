import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Bookmark,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  Heart,
  Home,
  Info,
  Layers,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  XCircle,
} from 'lucide-react';
import {
  AppNotification,
  LocationArea,
  Property,
  RentalApplication,
  SearchFilterState,
  TenantUser,
} from '../../types';
import { formatNaira, PLATFORM_CONFIG } from '../../config/platform';
import { PropertyCard } from '../common/PropertyCard';
import { PropertySearchFilters } from './PropertySearchFilters';
import { PropertyDetailsView } from './PropertyDetailsView';
import { TenantApplicationDetailModal } from './TenantApplicationDetailModal';
import { SupportCenterView } from '../support/SupportCenterView';
import { DirectMessagingModal } from '../common/DirectMessagingModal';
import { InspectionWorkflowModal } from '../common/InspectionWorkflowModal';
import { PhoneVerificationModal } from '../kyc/PhoneVerificationModal';
import { useAuth } from '../../context/AuthContext';
import { Store } from '../../services/store';

interface TenantDashboardProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  properties: Property[];
  locations: LocationArea[];
  applications: RentalApplication[];
  notifications: AppNotification[];
  onViewProperty: (property: Property) => void;
  onOpenApply: (property: Property) => void;
  onOpenReport: (property: Property) => void;
  onOpenAuth: (mode?: 'LOGIN' | 'REGISTER_TENANT' | 'REGISTER_LANDLORD') => void;
  isInspectionMode?: boolean;
  inspectedTenant?: TenantUser | null;
}

export const TenantDashboard: React.FC<TenantDashboardProps> = ({
  activeTab,
  setActiveTab,
  properties,
  locations,
  applications,
  notifications,
  onViewProperty,
  onOpenApply,
  onOpenReport,
  onOpenAuth,
  isInspectionMode = false,
  inspectedTenant = null,
}) => {
  const { currentUser, updateCurrentUserProfile, refreshSession } = useAuth();
  const tenantUser = isInspectionMode
    ? inspectedTenant
    : currentUser && currentUser.role === 'TENANT'
    ? (currentUser as TenantUser)
    : null;

  // Phone Verification Modal State
  const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState(false);

  // Selected Property for In-Page View
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // Inspection mode alert message
  const [inspectionAlertMsg, setInspectionAlertMsg] = useState<string | null>(null);

  // Search Filter State
  const [filters, setFilters] = useState<SearchFilterState>({
    city: 'All Cities',
    area: 'All Areas',
    propertyType: 'All Types',
    bedrooms: 'all',
    minPrice: 0,
    maxPrice: 100000000,
    facility: 'All',
  });

  // Profile Edit State
  const [profileName, setProfileName] = useState(tenantUser?.fullName || currentUser?.fullName || '');
  const [profilePhone, setProfilePhone] = useState(tenantUser?.phoneNumber || currentUser?.phoneNumber || '');
  const [profileEmail, setProfileEmail] = useState(tenantUser?.email || currentUser?.email || '');
  const [profileOcc, setProfileOcc] = useState(tenantUser?.occupation || '');
  const [profileAddress, setProfileAddress] = useState(tenantUser?.currentAddress || '');
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);

  // Update profile fields if inspected tenant changes
  React.useEffect(() => {
    if (tenantUser) {
      setProfileName(tenantUser.fullName || '');
      setProfilePhone(tenantUser.phoneNumber || '');
      setProfileEmail(tenantUser.email || '');
      setProfileOcc(tenantUser.occupation || '');
      setProfileAddress(tenantUser.currentAddress || '');
    }
  }, [tenantUser]);

  // Application Details / Provide Info Modal State
  const [selectedAppForModal, setSelectedAppForModal] = useState<RentalApplication | null>(null);
  const [autoFocusModalResponse, setAutoFocusModalResponse] = useState(false);
  const [selectedInspectionModalId, setSelectedInspectionModalId] = useState<string | null>(null);
  const [directChatInspectionId, setDirectChatInspectionId] = useState<string | null>(null);

  // Filter properties (Only public / available or rented listings)
  const publicProperties = useMemo(() => {
    return properties.filter(
      (p) => p.status === 'AVAILABLE' || p.status === 'RENTED' || p.status === 'APPROVED'
    );
  }, [properties]);

  const filteredProperties = useMemo(() => {
    return publicProperties.filter((p) => {
      // 1. City / Town Filter
      if (filters.city && filters.city !== 'All Cities') {
        const propCity = (p.location?.city || '').toLowerCase().trim();
        const filterCity = filters.city.toLowerCase().trim();
        if (propCity !== filterCity && !propCity.includes(filterCity) && !filterCity.includes(propCity)) {
          return false;
        }
      }

      // 2. Area / Neighbourhood Filter
      if (filters.area && filters.area !== 'All Areas') {
        const selectedArea = filters.area.toLowerCase().trim();
        const propArea = (p.location?.area || '').toLowerCase().trim();
        const propStreet = (p.location?.street || '').toLowerCase().trim();
        const propLandmark = (p.location?.landmark || '').toLowerCase().trim();

        const directMatch = propArea === selectedArea;
        const subMatch = propArea.includes(selectedArea) || selectedArea.includes(propArea);
        const streetOrLandmarkMatch = propStreet.includes(selectedArea) || propLandmark.includes(selectedArea);

        if (!directMatch && !subMatch && !streetOrLandmarkMatch) {
          return false;
        }
      }

      // 3. Property Type Filter
      if (filters.propertyType && filters.propertyType !== 'All Types') {
        const pType = (p.propertyType || '').toLowerCase().trim();
        const pTitle = (p.title || '').toLowerCase().trim();
        const fType = filters.propertyType.toLowerCase().trim();

        const normPType = pType.replace(/[\s-_]/g, '');
        const normFType = fType.replace(/[\s-_]/g, '');

        let matches = false;
        if (normPType === normFType || normPType.includes(normFType) || normFType.includes(normPType)) {
          matches = true;
        } else if (fType === 'flat' || fType === 'flat / apartment') {
          matches = normPType.includes('flat') || normPType.includes('bedroom') || pTitle.includes('flat');
        } else if (fType.includes('duplex')) {
          matches = normPType.includes('duplex') || pTitle.includes('duplex');
        } else if (fType.includes('compound') || fType.includes('full compound')) {
          matches = normPType.includes('compound') || normPType.includes('detached') || pTitle.includes('compound');
        } else if (fType.includes('self-contained') || fType.includes('self contained') || fType.includes('studio')) {
          matches = normPType.includes('selfcontained') || normPType.includes('studio') || pTitle.includes('self-contained') || pTitle.includes('studio');
        } else if (fType.includes('room and parlour') || fType.includes('mini flat')) {
          matches = normPType.includes('roomandparlour') || normPType.includes('miniflat') || pTitle.includes('room and parlour') || pTitle.includes('mini flat');
        } else if (fType.includes('detached')) {
          matches = normPType.includes('detached') || pTitle.includes('detached') || pTitle.includes('bungalow');
        }

        if (!matches) return false;
      }

      // 4. Number of Bedrooms Filter
      if (filters.bedrooms && filters.bedrooms !== 'all') {
        const numBeds = Number(p.bedrooms || 0);
        if (filters.bedrooms === '5+') {
          if (numBeds < 5) return false;
        } else {
          const requiredBeds = Number(filters.bedrooms);
          if (numBeds !== requiredBeds) return false;
        }
      }

      // 5. Min Price Filter (rent >= minPrice)
      if (typeof filters.minPrice === 'number' && filters.minPrice > 0) {
        if (p.pricing.rent < filters.minPrice) return false;
      }

      // 6. Max Price Filter (rent <= maxPrice)
      if (typeof filters.maxPrice === 'number' && filters.maxPrice < 100000000) {
        if (p.pricing.rent > filters.maxPrice) return false;
      }

      return true;
    });
  }, [publicProperties, filters]);

  // Saved Properties
  const savedPropertyIds = tenantUser?.savedPropertyIds || [];
  const savedPropertiesList = useMemo(() => {
    return properties.filter((p) => savedPropertyIds.includes(p.id));
  }, [properties, savedPropertyIds]);

  // Tenant's own applications & inspections
  const effectiveTenantId = tenantUser?.id || currentUser?.id;
  const myApplications = useMemo(() => {
    return effectiveTenantId
      ? applications.filter((app) => app.tenantId === effectiveTenantId)
      : [];
  }, [applications, effectiveTenantId]);

  const myInspections = useMemo(() => {
    return effectiveTenantId
      ? Store.getInspections().filter((insp) => insp.tenantId === effectiveTenantId)
      : [];
  }, [effectiveTenantId, properties]);

  const showInspectionNotice = (actionName: string) => {
    const msg = `Admin inspection mode: ${actionName} is disabled because you are viewing the Tenant experience.`;
    setInspectionAlertMsg(msg);
    setTimeout(() => setInspectionAlertMsg(null), 5000);
  };

  const handleSelectProperty = (property: Property) => {
    setSelectedPropertyId(property.id);
    setActiveTab('property-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToProperties = () => {
    setSelectedPropertyId(null);
    setActiveTab('explore');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelApplication = (appId: string) => {
    if (isInspectionMode) {
      showInspectionNotice('Cancelling tenant applications');
      return;
    }
    if (window.confirm('Are you sure you want to cancel this rental application?')) {
      Store.updateApplicationStatus(appId, 'CANCELLED', 'Cancelled by tenant.');
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (isInspectionMode) {
      showInspectionNotice('Updating tenant profile data');
      return;
    }
    updateCurrentUserProfile({
      fullName: profileName.trim(),
      phoneNumber: profilePhone.trim(),
      email: profileEmail.trim(),
      ...(tenantUser ? { occupation: profileOcc.trim(), currentAddress: profileAddress.trim() } : {}),
    });
    setProfileSavedMsg(true);
    setTimeout(() => setProfileSavedMsg(false), 3000);
  };

  const handleResetFilters = () => {
    setFilters({
      city: 'All Cities',
      area: 'All Areas',
      propertyType: 'All Types',
      bedrooms: 'all',
      minPrice: 0,
      maxPrice: 100000000,
      facility: 'All',
    });
  };

  const activeSelectedProperty = selectedPropertyId
    ? Store.getPropertyById(selectedPropertyId) || properties.find((p) => p.id === selectedPropertyId)
    : null;

  return (
    <div className="min-h-screen bg-stone-100/60 pb-16">
      {/* Inspection Mode Alert Banner */}
      {inspectionAlertMsg && (
        <div
          id="tenant-inspection-alert-banner"
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

      {/* 1. PROPERTY DETAILS FULL VIEW */}
      {(activeTab === 'property-details' || selectedPropertyId !== null) && activeSelectedProperty && (
        <PropertyDetailsView
          property={activeSelectedProperty}
          onBack={handleBackToProperties}
          onApplyToRent={(prop) => onOpenApply(prop)}
          onReportProperty={(prop) => onOpenReport(prop)}
          onOpenAuth={() => onOpenAuth('LOGIN')}
        />
      )}

      {/* 2. HOME & SEARCH EXPLORE VIEW */}
      {(activeTab === 'explore' || activeTab === 'search') && selectedPropertyId === null && (() => {
        const currentCity =
          filters.city && filters.city !== 'All Cities'
            ? filters.city
            : PLATFORM_CONFIG.defaultCity || 'Uyo';

        const cityLocations = locations.filter(
          (l) => l.isActive && l.city.toLowerCase() === currentCity.toLowerCase()
        );

        const popularAreasForCity =
          cityLocations.length > 0
            ? ['All Areas', ...cityLocations.map((l) => l.name).slice(0, 7)]
            : [
                'All Areas',
                'Ewet Housing Estate',
                'Shelter Afrique Estate',
                'Osongama Estate',
                'Oron Road',
                'Udo Udoma Avenue',
                'Ikpa Road',
              ];

        return (
          <div>
            {/* Hero Banner Section */}
            <div className="relative bg-emerald-950 text-white overflow-hidden py-12 sm:py-16">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="max-w-3xl space-y-4">
                  {/* Promotional Trust & Security Pill */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/90 border border-emerald-700/60 text-emerald-300 text-xs sm:text-sm font-semibold shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Verified Properties • Trusted Property Providers • Secure Inspections</span>
                  </div>

                  {/* Dynamic Welcome Heading */}
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                    Welcome to HOMEZA <span className="text-emerald-400">{currentCity}</span>
                  </h1>

                  {/* Dynamic Subtitle */}
                  <p className="text-stone-200 text-sm sm:text-base md:text-lg leading-relaxed font-normal">
                    Find verified homes in {currentCity} and connect with trusted property providers.
                  </p>
                </div>

                {/* Quick Area Filter Pills */}
                <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2 text-xs">
                  <span className="text-stone-400 shrink-0 font-medium">Popular Areas:</span>
                  {popularAreasForCity.map((areaName) => (
                    <button
                      key={areaName}
                      onClick={() => {
                        setFilters((prev) => ({ ...prev, city: currentCity, area: areaName }));
                        const el = document.getElementById('search-results-anchor');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`px-3.5 py-1.5 rounded-full transition whitespace-nowrap font-medium cursor-pointer ${
                        filters.area === areaName
                          ? 'bg-emerald-500 text-white font-bold shadow-sm'
                          : 'bg-emerald-900/70 hover:bg-emerald-900 text-emerald-200 border border-emerald-800'
                      }`}
                    >
                      {areaName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Search Filter Box (Floats right below hero) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
              <PropertySearchFilters
                filters={filters}
                setFilters={setFilters}
                locations={locations}
                onSearch={() => {
                  const el = document.getElementById('search-results-anchor');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                onReset={handleResetFilters}
              />
            </div>

            {/* Search Results Listing Container */}
            <div id="search-results-anchor" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
                    {filters.area !== 'All Areas' ? `${filters.area} Listings` : `Available Properties in ${currentCity}`}
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                    Showing <strong className="text-stone-800">{filteredProperties.length}</strong> of {publicProperties.length} verified listings
                  </p>
                </div>

                {/* Status helper badge */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Admin Inspected Properties</span>
                  </span>
                </div>
              </div>

              {/* Empty State when no properties match or marketplace is initially empty */}
              {filteredProperties.length === 0 ? (
                <div id="marketplace-empty-state" className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-stone-200 shadow-sm max-w-xl mx-auto my-8">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                    <Building2 className="w-8 h-8" />
                  </div>
                  {publicProperties.length === 0 ? (
                    <>
                      <h3 className="text-xl font-bold text-stone-900 mb-2">
                        No properties available yet.
                      </h3>
                      <p className="text-sm text-stone-600 leading-relaxed max-w-md mx-auto mb-6">
                        The marketplace is active and awaiting real listings. Properties submitted by property owners and verified agents will appear here immediately after admin review and approval.
                      </p>
                      {currentUser?.role === 'LANDLORD' ? (
                        <button
                          id="btn-empty-state-add-property-landlord"
                          type="button"
                          onClick={() => setActiveTab('landlord-add-property')}
                          className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm px-6 py-3 rounded-xl transition cursor-pointer shadow-sm"
                        >
                          <Building2 className="w-4 h-4" />
                          <span>Add Your First Property</span>
                        </button>
                      ) : currentUser?.role === 'AGENT' ? (
                        <button
                          id="btn-empty-state-add-property-agent"
                          type="button"
                          onClick={() => setActiveTab('agent-listings')}
                          className="inline-flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm px-6 py-3 rounded-xl transition cursor-pointer shadow-sm"
                        >
                          <Building2 className="w-4 h-4" />
                          <span>Submit Agent Listing</span>
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>100% Real, Verified Listings Only</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-stone-900 mb-2">
                        No properties match your search.
                      </h3>
                      <p className="text-sm text-stone-600 leading-relaxed mb-6">
                        Try changing your filters, adjusting your price range, or clearing your active filters.
                      </p>
                      <button
                        id="btn-clear-filters-empty-state"
                        type="button"
                        onClick={handleResetFilters}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition cursor-pointer shadow-sm"
                      >
                        Clear Filters
                      </button>
                    </>
                  )}
                </div>
              ) : (
                /* Properties Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProperties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onViewDetails={handleSelectProperty}
                      onOpenAuth={() => onOpenAuth('LOGIN')}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 3. SAVED PROPERTIES VIEW */}
      {activeTab === 'saved' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 flex items-center gap-2.5">
                <Bookmark className="w-7 h-7 text-emerald-700" />
                <span>Saved Properties ({savedPropertiesList.length})</span>
              </h1>
              <p className="text-sm sm:text-base text-stone-600 mt-1">
                Your bookmarked apartments and houses in Uyo for easy comparison.
              </p>
            </div>

            {savedPropertiesList.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className="text-sm font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl border border-emerald-200 transition self-start cursor-pointer"
              >
                + Browse More Properties
              </button>
            )}
          </div>

          {!currentUser ? (
            <div className="bg-white rounded-3xl p-10 sm:p-12 text-center border border-stone-200 max-w-md mx-auto shadow-sm">
              <Heart className="w-14 h-14 text-stone-300 mx-auto mb-3.5" />
              <h3 className="text-xl font-bold text-stone-900 mb-1.5">Sign In to View Saved Homes</h3>
              <p className="text-sm text-stone-600 mb-6 leading-relaxed">
                Sign in to your tenant account to bookmark and track your favorite Uyo rental properties.
              </p>
              <button
                type="button"
                onClick={() => onOpenAuth('LOGIN')}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm sm:text-base px-6 py-3 rounded-xl transition cursor-pointer shadow-sm"
              >
                Sign In
              </button>
            </div>
          ) : savedPropertiesList.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 max-w-md mx-auto shadow-sm">
              <Bookmark className="w-14 h-14 text-stone-300 mx-auto mb-3.5" />
              <h3 className="text-xl font-bold text-stone-900 mb-1.5">
                You have not saved any properties yet.
              </h3>
              <p className="text-sm text-stone-600 mb-6 leading-relaxed">
                Click the bookmark button on any property card or details view to save it here for quick access.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm sm:text-base px-6 py-3 rounded-xl transition cursor-pointer shadow-sm"
              >
                Explore Properties in Uyo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedPropertiesList.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onViewDetails={handleSelectProperty}
                  onOpenAuth={() => onOpenAuth('LOGIN')}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. MY APPLICATIONS VIEW */}
      {activeTab === 'applications' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 flex items-center gap-2.5">
                <FileText className="w-7 h-7 text-emerald-700" />
                <span>My Rental Applications ({myApplications.length})</span>
              </h1>
              <p className="text-sm sm:text-base text-stone-600 mt-1">
                Track and manage applications sent directly to property landlords in Uyo.
              </p>
            </div>

            {myApplications.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className="text-sm font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl border border-emerald-200 transition self-start cursor-pointer"
              >
                + Find Another Property
              </button>
            )}
          </div>

          {!currentUser ? (
            <div className="bg-white rounded-3xl p-10 sm:p-12 text-center border border-stone-200 max-w-md mx-auto shadow-sm">
              <FileCheck className="w-14 h-14 text-stone-300 mx-auto mb-3.5" />
              <h3 className="text-xl font-bold text-stone-900 mb-1.5">Sign In to Track Applications</h3>
              <p className="text-sm text-stone-600 mb-6 leading-relaxed">
                Log in to check the status of applications submitted to landlords.
              </p>
              <button
                type="button"
                onClick={() => onOpenAuth('LOGIN')}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm sm:text-base px-6 py-3 rounded-xl transition cursor-pointer shadow-sm"
              >
                Sign In
              </button>
            </div>
          ) : myApplications.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 max-w-md mx-auto shadow-sm">
              <FileText className="w-14 h-14 text-stone-300 mx-auto mb-3.5" />
              <h3 className="text-xl font-bold text-stone-900 mb-1.5">
                You have not submitted any rental applications yet.
              </h3>
              <p className="text-sm text-stone-600 mb-6 leading-relaxed">
                When you find an apartment you like, click "Apply to Rent" on the property details page.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm sm:text-base px-6 py-3 rounded-xl transition cursor-pointer shadow-sm"
              >
                Browse Available Properties
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {myApplications.map((app) => {
                const prop = Store.getPropertyById(app.propertyId);
                return (
                  <div
                    key={app.id}
                    className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between"
                  >
                    {/* Left: Property Image & Info */}
                    <div className="flex items-start gap-4 sm:gap-5 min-w-0">
                      <img
                        src={app.propertyImage}
                        alt={app.propertyTitle}
                        className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-2xl shrink-0 border border-stone-200"
                      />
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                              app.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : app.status === 'REJECTED'
                                ? 'bg-red-100 text-red-900 border border-red-300'
                                : app.status === 'ADDITIONAL_INFO_REQUESTED' || app.status === 'INFORMATION_REQUESTED'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                : app.status === 'ADDITIONAL_INFO_SUBMITTED'
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : app.status === 'CANCELLED'
                                ? 'bg-stone-200 text-stone-700'
                                : 'bg-stone-100 text-stone-800 border border-stone-300'
                            }`}
                          >
                            {app.status === 'APPROVED'
                              ? '✓ Approved by Landlord'
                              : app.status === 'REJECTED'
                              ? '✕ Declined'
                              : app.status === 'ADDITIONAL_INFO_REQUESTED' || app.status === 'INFORMATION_REQUESTED'
                              ? '⚠️ ADDITIONAL INFORMATION REQUIRED'
                              : app.status === 'ADDITIONAL_INFO_SUBMITTED'
                              ? 'Response Submitted — Awaiting Landlord Review'
                              : app.status === 'CANCELLED'
                              ? 'Cancelled'
                              : '⏳ Pending Landlord Review'}
                          </span>
                          <span className="text-xs text-stone-500 font-medium">
                            Applied:{' '}
                            {new Date(app.appliedDate).toLocaleDateString('en-NG', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-stone-950 text-lg sm:text-xl leading-tight truncate">
                          {app.propertyTitle}
                        </h3>

                        <div className="flex items-center gap-2.5 text-sm text-stone-600 font-medium">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{app.propertyLocation}</span>
                          <span>•</span>
                          <span className="font-bold text-stone-900 text-base">
                            {formatNaira(app.propertyPrice)} / yr
                          </span>
                        </div>

                        <div className="text-xs sm:text-sm text-stone-600">
                          Preferred Move-in: <strong className="text-stone-900">{app.preferredMoveInDate}</strong>
                        </div>

                        {(app.status === 'ADDITIONAL_INFO_REQUESTED' || app.status === 'INFORMATION_REQUESTED') && (
                          <div className="mt-2.5 bg-amber-50 p-4 rounded-2xl border border-amber-200 text-sm text-amber-950 space-y-1.5">
                            <div className="font-bold flex items-center gap-2 text-amber-900 text-sm">
                              <Info className="w-4 h-4" />
                              <span>Landlord Requested Information:</span>
                            </div>
                            <p className="italic leading-relaxed">
                              "{app.infoRequestMessage || (app.infoRequests && app.infoRequests.length > 0 ? app.infoRequests[app.infoRequests.length - 1].requestMessage : 'Please review and respond.')}"
                            </p>
                          </div>
                        )}

                        {app.status === 'ADDITIONAL_INFO_SUBMITTED' && app.tenantResponse && (
                          <div className="mt-2.5 bg-blue-50 p-4 rounded-2xl border border-blue-200 text-sm text-blue-950 space-y-1.5">
                            <div className="font-bold flex items-center gap-2 text-blue-900 text-sm">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Your Submitted Response:</span>
                            </div>
                            <p className="italic leading-relaxed">"{app.tenantResponse}"</p>
                          </div>
                        )}

                        {app.landlordNotes && (
                          <div className="mt-2.5 bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-sm text-stone-700">
                            <strong className="text-stone-900">Landlord Note:</strong> {app.landlordNotes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-stone-100 shrink-0">
                      {(app.status === 'ADDITIONAL_INFO_REQUESTED' || app.status === 'INFORMATION_REQUESTED') && (
                        <button
                          id={`btn-provide-info-${app.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedAppForModal(app);
                            setAutoFocusModalResponse(true);
                          }}
                          className="px-4 py-2.5 text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
                        >
                          <Send className="w-4 h-4" />
                          <span>Provide Information</span>
                        </button>
                      )}

                      <button
                        id={`btn-view-application-${app.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedAppForModal(app);
                          setAutoFocusModalResponse(false);
                        }}
                        className="px-4 py-2.5 text-sm font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl transition cursor-pointer"
                      >
                        View Application
                      </button>

                      {prop && (
                        <button
                          type="button"
                          onClick={() => handleSelectProperty(prop)}
                          className="px-4 py-2.5 text-sm font-bold bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl transition cursor-pointer"
                        >
                          View Property
                        </button>
                      )}

                      {app.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleCancelApplication(app.id)}
                          className="px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition border border-red-200 cursor-pointer"
                        >
                          Cancel Application
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Booked Property Inspections */}
          {currentUser && myInspections.length > 0 && (
            <div className="mt-10 space-y-4">
              <div className="border-b border-stone-200 pb-3">
                <h2 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-emerald-700" />
                  <span>Booked Physical Inspections ({myInspections.length})</span>
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                  Physical property viewing appointments with verified landlords and agents in Uyo.
                </p>
              </div>

              <div className="space-y-4">
                {myInspections.map((insp) => (
                  <div
                    key={insp.id}
                    className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-col md:flex-row gap-5 items-start md:items-center justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                              insp.status === 'INSPECTION_CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : insp.status === 'PROPOSED_NEW_TIME'
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : insp.status === 'INSPECTION_COMPLETED'
                                ? 'bg-stone-200 text-stone-800'
                                : insp.status === 'CANCELLED'
                                ? 'bg-red-100 text-red-900'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {insp.status === 'INSPECTION_CONFIRMED'
                              ? '✓ Confirmed'
                              : insp.status === 'PROPOSED_NEW_TIME'
                              ? '🔄 New Time Proposed'
                              : insp.status === 'INSPECTION_COMPLETED'
                              ? 'Completed'
                              : insp.status === 'CANCELLED'
                              ? 'Cancelled'
                              : '⏳ Inspection Requested'}
                          </span>
                          <span className="text-xs text-stone-500 font-medium">
                            {insp.preferredDate} at {insp.preferredTime}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-stone-950 text-base sm:text-lg">
                          {insp.propertyTitle}
                        </h3>

                        <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-600">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            {insp.isLocationReleased
                              ? `Exact Location: ${insp.propertyExactAddress || insp.propertyLocationArea}`
                              : `Area: ${insp.propertyLocationArea} (Exact address hidden for security until verified)`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-3 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-stone-100">
                      <button
                        id={`btn-manage-inspection-${insp.id}`}
                        type="button"
                        onClick={() => setSelectedInspectionModalId(insp.id)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Manage & Coordinate</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. NOTIFICATIONS VIEW */}
      {activeTab === 'notifications' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 flex items-center gap-2.5">
              <Bell className="w-7 h-7 text-emerald-700" />
              <span>Notifications ({notifications.length})</span>
            </h1>
            <p className="text-sm sm:text-base text-stone-600 mt-1">
              Updates on your rental applications, newly verified properties, and landlord messages.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-stone-500">
                <Bell className="w-14 h-14 text-stone-300 mx-auto mb-3.5" />
                <h3 className="font-bold text-stone-900 text-lg">No Notifications</h3>
                <p className="text-sm text-stone-600 mt-1">You are all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {notifications.map((notif) => {
                  const targetApp = notif.applicationId
                    ? Store.getApplicationById(notif.applicationId)
                    : null;
                  const isInfoReqNotif =
                    notif.title.toLowerCase().includes('additional information required') ||
                    targetApp?.status === 'ADDITIONAL_INFO_REQUESTED' ||
                    targetApp?.status === 'INFORMATION_REQUESTED';

                  return (
                    <div
                      key={notif.id}
                      className={`py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                        !notif.isRead ? 'bg-emerald-50/60 -mx-4 px-4 rounded-2xl' : ''
                      }`}
                    >
                      <div
                        onClick={() => Store.markNotificationAsRead(notif.id)}
                        className="flex items-start gap-4 cursor-pointer flex-1 min-w-0"
                      >
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                            !notif.isRead ? 'bg-emerald-600 text-white shadow-xs' : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          <Bell className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-base font-bold text-stone-900 truncate">{notif.title}</h4>
                            <span className="text-xs text-stone-500 font-medium whitespace-nowrap">
                              {new Date(notif.createdAt).toLocaleDateString('en-NG', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-stone-600 mt-1 leading-relaxed">{notif.message}</p>
                        </div>
                      </div>

                      {/* Action button if Info Requested */}
                      {isInfoReqNotif && targetApp && (
                        <div className="shrink-0 flex items-center justify-end sm:pl-3">
                          <button
                            id={`btn-notif-provide-info-${notif.id}`}
                            type="button"
                            onClick={() => {
                              Store.markNotificationAsRead(notif.id);
                              setSelectedAppForModal(targetApp);
                              setAutoFocusModalResponse(true);
                            }}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
                          >
                            <Send className="w-4 h-4" />
                            <span>Provide Information</span>
                          </button>
                        </div>
                      )}

                      {/* Action button if Inspection Notification */}
                      {(notif.type === 'INSPECTION' || notif.inspectionId || notif.title.toLowerCase().includes('inspection')) && notif.inspectionId && (
                        <div className="shrink-0 flex items-center justify-end sm:pl-3">
                          <button
                            id={`btn-notif-view-inspection-${notif.id}`}
                            type="button"
                            onClick={() => {
                              Store.markNotificationAsRead(notif.id);
                              setSelectedInspectionModalId(notif.inspectionId!);
                            }}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
                          >
                            <Calendar className="w-4 h-4" />
                            <span>View & Coordinate Inspection</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. TENANT PROFILE VIEW */}
      {activeTab === 'profile' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 flex items-center gap-2.5">
              <User className="w-7 h-7 text-emerald-700" />
              <span>Tenant Profile</span>
            </h1>
            <p className="text-sm sm:text-base text-stone-600 mt-1">
              Manage your personal information used when applying for rental properties.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
            {profileSavedMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-bold p-4 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Profile updated successfully.</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex items-center gap-4 pb-5 border-b border-stone-200">
                <img
                  src={
                    currentUser?.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                  }
                  alt={currentUser?.fullName || 'User'}
                  className="w-18 h-18 rounded-2xl object-cover border-2 border-emerald-600 shadow-sm"
                />
                <div>
                  <h3 className="font-extrabold text-stone-900 text-lg">{currentUser?.fullName}</h3>
                  <p className="text-sm text-stone-600 font-medium">{currentUser?.email}</p>
                  <span className="inline-block mt-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
                    Tenant Account
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-stone-800 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
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
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    required
                    className="w-full text-sm sm:text-base border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-stone-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-stone-800 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    required
                    className="w-full text-sm sm:text-base border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-stone-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-800 mb-1.5">
                    Occupation / Field of Work
                  </label>
                  <input
                    type="text"
                    value={profileOcc}
                    onChange={(e) => setProfileOcc(e.target.value)}
                    placeholder="e.g. Architect, Software Engineer, Banker"
                    className="w-full text-sm sm:text-base border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-stone-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-800 mb-1.5">
                  Current Residential Area in Uyo
                </label>
                <input
                  type="text"
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  placeholder="e.g. Osongama Estate, Uyo"
                  className="w-full text-sm sm:text-base border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-stone-900 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm sm:text-base px-6 py-3 rounded-xl transition shadow-sm cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBVIEW: SUPPORT CENTER */}
      {activeTab === 'support' && (
        <div className="max-w-5xl mx-auto">
          <SupportCenterView />
        </div>
      )}

      {/* Tenant Application Detail & Info Response Modal */}
      {selectedAppForModal && (
        <TenantApplicationDetailModal
          application={selectedAppForModal}
          isOpen={!!selectedAppForModal}
          onClose={() => setSelectedAppForModal(null)}
          autoFocusResponse={autoFocusModalResponse}
        />
      )}

      {/* Inspection Workflow Modal */}
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
          onOpenAuth={() => onOpenAuth('LOGIN')}
        />
      )}

      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        isOpen={showPhoneVerifyModal}
        onClose={() => setShowPhoneVerifyModal(false)}
        initialPhoneNumber={profilePhone || currentUser?.phoneNumber}
        onSuccess={() => {
          refreshSession();
          setShowPhoneVerifyModal(false);
        }}
      />
    </div>
  );
};
