import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  MessageSquare,
  Eye,
  Filter,
  Search,
  Building2,
  Lock,
  Unlock,
  ChevronRight,
  Phone,
  Mail,
  UserCheck,
  ClipboardCheck,
  AlertTriangle,
  History,
  Info,
  CalendarCheck2,
  Radio,
  Send,
  Flag,
} from 'lucide-react';
import {
  HomezaRepresentative,
  InspectionAuditEntry,
  InspectionCoordinationMode,
  InspectionOutcomeType,
  InspectionStatus,
  Property,
  PropertyInspection,
} from '../../types';
import { Store } from '../../services/store';
import { useAuth } from '../../context/AuthContext';
import { DirectMessagingModal } from '../common/DirectMessagingModal';

interface InspectionScheduleViewProps {
  onViewProperty?: (property: Property) => void;
}

const DEFAULT_REPRESENTATIVES: HomezaRepresentative[] = [
  {
    id: 'rep-admin',
    name: 'HOMEZA Super Admin',
    role: 'Super Admin / Lead Coordinator',
    phone: '+234 800 466 3921',
    email: 'admin@homeza.ng',
  },
  {
    id: 'rep-1',
    name: 'Inemesit Udofia',
    role: 'HOMEZA Senior Inspection Officer',
    phone: '+234 802 334 5566',
    email: 'inemesit.udofia@homeza.ng',
  },
  {
    id: 'rep-2',
    name: 'Nsikak Essien',
    role: 'HOMEZA Field Inspection Officer',
    phone: '+234 803 889 1122',
    email: 'nsikak.essien@homeza.ng',
  },
  {
    id: 'rep-3',
    name: 'Kufre Akpabio',
    role: 'HOMEZA Field Verification Officer',
    phone: '+234 802 998 7766',
    email: 'kufre.akpabio@homeza.ng',
  },
];

export const InspectionScheduleView: React.FC<InspectionScheduleViewProps> = ({
  onViewProperty,
}) => {
  const { currentUser } = useAuth();
  const [inspections, setInspections] = useState<PropertyInspection[]>([]);
  const [activeFilterTab, setActiveFilterTab] = useState<
    'ALL' | 'TODAY' | 'UPCOMING' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedInspectionForAudit, setSelectedInspectionForAudit] = useState<PropertyInspection | null>(null);
  const [coordinatingInspection, setCoordinatingInspection] = useState<PropertyInspection | null>(null);
  const [outcomeInspection, setOutcomeInspection] = useState<PropertyInspection | null>(null);
  const [rescheduleInspection, setRescheduleInspection] = useState<PropertyInspection | null>(null);
  const [cancelInspection, setCancelInspection] = useState<PropertyInspection | null>(null);
  const [messagingParticipant, setMessagingParticipant] = useState<{
    participantId: string;
    participantName: string;
    participantRole: 'LANDLORD' | 'AGENT' | 'TENANT';
    propertyId?: string;
    propertyTitle?: string;
  } | null>(null);

  // Form states for Coordination
  const [coordMode, setCoordMode] = useState<InspectionCoordinationMode>('REMOTE_COORDINATION');
  const [selectedRepId, setSelectedRepId] = useState<string>('rep-admin');
  const [customRepName, setCustomRepName] = useState('');
  const [customRepRole, setCustomRepRole] = useState('HOMEZA Field Officer');
  const [customRepPhone, setCustomRepPhone] = useState('');
  const [coordNotes, setCoordNotes] = useState('');

  // Form states for Outcome
  const [selectedOutcome, setSelectedOutcome] = useState<InspectionOutcomeType>('COMPLETED');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [flagListing, setFlagListing] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  // Form states for Reschedule
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('11:00 AM');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Form states for Cancel
  const [cancelReason, setCancelReason] = useState('');

  const loadInspections = () => {
    setInspections(Store.getInspections());
  };

  useEffect(() => {
    loadInspections();
    const unsubscribe = Store.subscribe(() => {
      loadInspections();
    });
    return unsubscribe;
  }, []);

  const isInspectionToday = (inspection: PropertyInspection): boolean => {
    const dateStr = inspection.preferredDate?.toLowerCase() || '';
    if (dateStr.includes('today')) return true;
    const todayIso = new Date().toISOString().split('T')[0];
    return dateStr.includes(todayIso);
  };

  // Filtered Inspections
  const filteredInspections = inspections.filter((i) => {
    const matchesSearch =
      i.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.propertyLocationArea.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.landlordName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.agentName && i.agentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (i.assignedHomezaRep && i.assignedHomezaRep.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    const isToday = isInspectionToday(i);

    switch (activeFilterTab) {
      case 'TODAY':
        return isToday && i.status !== 'INSPECTION_CANCELLED' && i.status !== 'INSPECTION_DECLINED';
      case 'UPCOMING':
        return (
          (i.status === 'INSPECTION_CONFIRMED' || i.status === 'INSPECTION_REQUESTED') &&
          !isToday
        );
      case 'PENDING':
        return i.status === 'INSPECTION_REQUESTED' || !i.homezaCoordinationConfirmed;
      case 'CONFIRMED':
        return i.status === 'INSPECTION_CONFIRMED';
      case 'COMPLETED':
        return i.status === 'INSPECTION_COMPLETED';
      case 'RESCHEDULED':
        return i.status === 'INSPECTION_RESCHEDULED';
      case 'CANCELLED':
        return i.status === 'INSPECTION_CANCELLED' || i.status === 'INSPECTION_DECLINED';
      case 'ALL':
      default:
        return true;
    }
  });

  // Counts
  const todayCount = inspections.filter(
    (i) => isInspectionToday(i) && i.status !== 'INSPECTION_CANCELLED' && i.status !== 'INSPECTION_DECLINED'
  ).length;
  const pendingCount = inspections.filter(
    (i) => i.status === 'INSPECTION_REQUESTED' || !i.homezaCoordinationConfirmed
  ).length;
  const confirmedCount = inspections.filter((i) => i.status === 'INSPECTION_CONFIRMED').length;
  const completedCount = inspections.filter((i) => i.status === 'INSPECTION_COMPLETED').length;

  // Handlers
  const handleOpenCoordination = (inspection: PropertyInspection) => {
    setCoordinatingInspection(inspection);
    setCoordMode(inspection.coordinationMode || 'REMOTE_COORDINATION');
    if (inspection.assignedHomezaRep?.id) {
      setSelectedRepId(inspection.assignedHomezaRep.id);
    } else {
      setSelectedRepId('rep-admin');
    }
    setCustomRepName('');
    setCoordNotes(inspection.homezaNotes || '');
  };

  const handleSaveCoordination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordinatingInspection) return;

    let repToAssign: HomezaRepresentative = DEFAULT_REPRESENTATIVES[0];
    if (selectedRepId === 'custom') {
      if (!customRepName.trim()) {
        alert('Please enter the custom representative name.');
        return;
      }
      repToAssign = {
        id: 'rep-custom-' + Date.now(),
        name: customRepName.trim(),
        role: customRepRole.trim() || 'HOMEZA Inspection Officer',
        phone: customRepPhone.trim(),
      };
    } else {
      const found = DEFAULT_REPRESENTATIVES.find((r) => r.id === selectedRepId);
      if (found) repToAssign = found;
    }

    Store.confirmHomezaCoordination(
      coordinatingInspection.id,
      coordMode,
      repToAssign,
      coordNotes,
      currentUser?.fullName || 'Super Admin'
    );

    setCoordinatingInspection(null);
    loadInspections();
  };

  const handleOpenOutcome = (inspection: PropertyInspection) => {
    setOutcomeInspection(inspection);
    setSelectedOutcome(inspection.outcome || 'COMPLETED');
    setOutcomeNotes(inspection.outcomeNotes || '');
    setFlagListing(!!inspection.flaggedForReview);
    setFlagReason(inspection.flaggedReason || '');
  };

  const handleSaveOutcome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcomeInspection) return;

    Store.recordInspectionOutcome(
      outcomeInspection.id,
      selectedOutcome,
      outcomeNotes,
      currentUser?.fullName || 'Super Admin',
      flagListing,
      flagReason
    );

    setOutcomeInspection(null);
    loadInspections();
  };

  const handleSaveReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleInspection) return;
    if (!newDate.trim()) {
      alert('Please provide a rescheduled date.');
      return;
    }

    Store.adminRescheduleInspection(
      rescheduleInspection.id,
      newDate,
      newTime,
      rescheduleReason,
      currentUser?.fullName || 'Super Admin'
    );

    setRescheduleInspection(null);
    loadInspections();
  };

  const handleSaveCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelInspection) return;

    Store.adminCancelInspection(
      cancelInspection.id,
      cancelReason || 'Cancelled by HOMEZA Admin Coordinator',
      currentUser?.fullName || 'Super Admin'
    );

    setCancelInspection(null);
    loadInspections();
  };

  const handleReleaseLocation = (inspection: PropertyInspection) => {
    if (
      window.confirm(
        `Release exact address "${inspection.propertyExactAddress || inspection.propertyLocationArea}" to tenant ${inspection.tenantName}?`
      )
    ) {
      Store.releaseInspectionExactLocation(inspection.id, currentUser?.fullName || 'Super Admin');
      loadInspections();
    }
  };

  const getStatusBadge = (status: InspectionStatus, isToday: boolean) => {
    switch (status) {
      case 'INSPECTION_CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmed
          </span>
        );
      case 'INSPECTION_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            Pending Coordination
          </span>
        );
      case 'INSPECTION_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <ClipboardCheck className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'INSPECTION_RESCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
            <RotateCcw className="w-3.5 h-3.5" />
            Rescheduled
          </span>
        );
      case 'INSPECTION_CANCELLED':
      case 'INSPECTION_DECLINED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <XCircle className="w-3.5 h-3.5" />
            {status === 'INSPECTION_DECLINED' ? 'Declined' : 'Cancelled'}
          </span>
        );
      default:
        return null;
    }
  };

  const getCoordinationBadge = (mode?: InspectionCoordinationMode) => {
    switch (mode) {
      case 'ATTEND_IN_PERSON':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <UserCheck className="w-3.5 h-3.5" />
            In-Person Walkthrough
          </span>
        );
      case 'ASSIGNED_REPRESENTATIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Assigned Field Officer
          </span>
        );
      case 'REMOTE_COORDINATION':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-300">
            <Radio className="w-3.5 h-3.5" />
            Remote Coordination
          </span>
        );
    }
  };

  return (
    <div id="admin-inspection-schedule-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900 text-white rounded-2xl p-5 sm:p-7 shadow-lg border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                HOMEZA Inspection Schedule & Coordination
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 mt-0.5">
                Manage physical walkthroughs, assign officers, monitor privacy compliance & record walkthrough outcomes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-stone-800/90 border border-stone-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-stone-200">
              Coordinator: <strong className="text-white font-bold">{currentUser?.fullName || 'Super Admin'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Quick Summary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveFilterTab('TODAY')}
          className={`p-4 sm:p-5 rounded-2xl border transition cursor-pointer ${
            activeFilterTab === 'TODAY'
              ? 'bg-emerald-950 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500'
              : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-900 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-emerald-700">Today's Schedule</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              {todayCount}
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black mt-2">{todayCount}</p>
          <p className="text-xs text-stone-700 mt-1">Walkthroughs happening today</p>
        </div>

        <div
          onClick={() => setActiveFilterTab('PENDING')}
          className={`p-4 sm:p-5 rounded-2xl border transition cursor-pointer ${
            activeFilterTab === 'PENDING'
              ? 'bg-amber-950 text-white border-amber-600 shadow-md ring-2 ring-amber-500'
              : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-900 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-amber-700">Pending Actions</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              {pendingCount}
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black mt-2">{pendingCount}</p>
          <p className="text-xs text-stone-700 mt-1">Awaiting HOMEZA coordination</p>
        </div>

        <div
          onClick={() => setActiveFilterTab('CONFIRMED')}
          className={`p-4 sm:p-5 rounded-2xl border transition cursor-pointer ${
            activeFilterTab === 'CONFIRMED'
              ? 'bg-stone-900 text-white border-stone-700 shadow-md ring-2 ring-emerald-400'
              : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-900 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-stone-700">Confirmed Slots</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              {confirmedCount}
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black mt-2">{confirmedCount}</p>
          <p className="text-xs text-stone-700 mt-1">Scheduled walkthroughs</p>
        </div>

        <div
          onClick={() => setActiveFilterTab('COMPLETED')}
          className={`p-4 sm:p-5 rounded-2xl border transition cursor-pointer ${
            activeFilterTab === 'COMPLETED'
              ? 'bg-blue-950 text-white border-blue-600 shadow-md ring-2 ring-blue-500'
              : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-900 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-blue-700">Completed</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              {completedCount}
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black mt-2">{completedCount}</p>
          <p className="text-xs text-stone-700 mt-1">Outcomes logged in audit history</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-4">
        {/* Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by property, tenant, landlord, agent, area, officer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl text-base text-stone-900 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[48px]"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2.5 text-sm font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 rounded-xl cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>

        {/* Tab Filters (Mobile friendly horizontal scroll) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs sm:text-sm font-semibold">
          {[
            { id: 'ALL', label: `All (${inspections.length})` },
            { id: 'TODAY', label: `Today's Inspections (${todayCount})`, highlight: todayCount > 0 },
            { id: 'PENDING', label: `Pending (${pendingCount})`, highlight: pendingCount > 0 },
            { id: 'CONFIRMED', label: `Confirmed (${confirmedCount})` },
            { id: 'UPCOMING', label: 'Upcoming' },
            { id: 'COMPLETED', label: `Completed (${completedCount})` },
            { id: 'RESCHEDULED', label: 'Rescheduled' },
            { id: 'CANCELLED', label: 'Cancelled / Declined' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilterTab(tab.id as any)}
              className={`px-3.5 py-2.5 rounded-xl whitespace-nowrap transition cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
                activeFilterTab === tab.id
                  ? 'bg-stone-900 text-white font-bold shadow-xs'
                  : tab.highlight
                  ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300 hover:bg-amber-200'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Inspections Cards List */}
      <div className="space-y-4">
        {filteredInspections.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-stone-200 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">No inspections found</h3>
            <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
              No physical property inspections match your current filter criteria or search query.
            </p>
            {activeFilterTab !== 'ALL' && (
              <button
                onClick={() => setActiveFilterTab('ALL')}
                className="mt-4 px-4 py-2 bg-stone-900 text-white text-sm font-semibold rounded-xl hover:bg-stone-800 cursor-pointer"
              >
                Show All Inspections
              </button>
            )}
          </div>
        ) : (
          filteredInspections.map((inspection) => {
            const isToday = isInspectionToday(inspection);
            const isConfirmed = inspection.status === 'INSPECTION_CONFIRMED';
            const isPending = inspection.status === 'INSPECTION_REQUESTED';
            const rep = inspection.assignedHomezaRep || DEFAULT_REPRESENTATIVES[0];

            return (
              <div
                key={inspection.id}
                id={`inspection-card-${inspection.id}`}
                className={`bg-white rounded-2xl border transition shadow-xs overflow-hidden ${
                  isToday
                    ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/10'
                    : inspection.flaggedForReview
                    ? 'border-rose-300 bg-rose-50/20'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                {/* Inspection Today Top Banner */}
                {isToday && (
                  <div className="bg-emerald-700 text-white px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span>INSPECTION TODAY • Walkthrough Scheduled</span>
                    </div>
                    <span className="text-emerald-100 font-mono text-xs">{inspection.preferredTime}</span>
                  </div>
                )}

                {/* Flagged Listing Notice */}
                {inspection.flaggedForReview && (
                  <div className="bg-rose-600 text-white px-4 py-1.5 text-xs font-bold flex items-center gap-2">
                    <Flag className="w-3.5 h-3.5" />
                    <span>FLAGGED FOR ADMIN REVIEW: {inspection.flaggedReason || 'Issue noted in inspection'}</span>
                  </div>
                )}

                <div className="p-5 sm:p-6 space-y-5">
                  {/* Top Bar: Property Title, Badges & Price */}
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      {inspection.propertyImage ? (
                        <img
                          src={inspection.propertyImage}
                          alt={inspection.propertyTitle}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-stone-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                          <Building2 className="w-8 h-8" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(inspection.status, isToday)}
                          {getCoordinationBadge(inspection.coordinationMode)}
                          {inspection.isLocationReleased ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Unlock className="w-3 h-3" /> Exact Address Released
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                              <Lock className="w-3 h-3" /> Address Protected
                            </span>
                          )}
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-stone-900 hover:text-emerald-700 transition">
                          {inspection.propertyTitle}
                        </h3>

                        <div className="flex items-center gap-1.5 text-xs text-stone-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>{inspection.propertyLocationArea}, Uyo</span>
                        </div>
                      </div>
                    </div>

                    <div className="lg:text-right space-y-1 border-t lg:border-t-0 pt-3 lg:pt-0 border-stone-100">
                      <div className="text-xs text-stone-700 font-medium">Rent Fee</div>
                      <div className="text-lg sm:text-xl font-black text-stone-950 font-mono">
                        ₦{Number(inspection.propertyPrice).toLocaleString()}
                        <span className="text-xs font-normal text-stone-700">/yr</span>
                      </div>
                    </div>
                  </div>

                  {/* Core Inspection Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs sm:text-sm">
                    {/* 1. Scheduled Time */}
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                        Schedule Date & Time
                      </span>
                      <div className="flex items-center gap-1.5 text-stone-900 font-semibold">
                        <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>{inspection.preferredDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-stone-700 font-medium pl-5">
                        <Clock className="w-3.5 h-3.5 text-stone-600" />
                        <span>{inspection.preferredTime}</span>
                      </div>
                    </div>

                    {/* 2. Tenant Participant */}
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                        Tenant Participant
                      </span>
                      <div className="flex items-center gap-1.5 text-stone-900 font-bold">
                        <User className="w-4 h-4 text-blue-700 shrink-0" />
                        <span>{inspection.tenantName}</span>
                      </div>
                      <div className="text-xs text-stone-700 pl-5">
                        <span>{inspection.tenantPhone}</span>
                      </div>
                    </div>

                    {/* 3. Landlord / Agent Representative */}
                    <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                      <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                        Listing Representative
                      </span>
                      <div className="flex items-center gap-1.5 text-stone-900 font-bold">
                        <Building2 className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>{inspection.agentName || inspection.landlordName}</span>
                      </div>
                      <div className="text-xs text-stone-700 pl-5">
                        <span>{inspection.agentName ? 'Verified Agent' : 'Verified Landlord'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Assigned HOMEZA Representative Bar */}
                  <div className="p-3.5 bg-emerald-950/5 rounded-xl border border-emerald-900/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-stone-700">
                          Assigned HOMEZA Representative:
                        </div>
                        <div className="font-bold text-stone-900 flex items-center gap-2">
                          <span>{rep.name}</span>
                          <span className="text-xs font-normal text-stone-700 bg-white px-2 py-0.5 rounded border border-stone-200">
                            {rep.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenCoordination(inspection)}
                        className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-900 text-xs font-bold rounded-lg border border-stone-300 transition cursor-pointer min-h-[36px]"
                      >
                        {inspection.homezaCoordinationConfirmed ? 'Change Officer / Mode' : 'Confirm Coordination'}
                      </button>
                    </div>
                  </div>

                  {/* Address Privacy Section */}
                  <div className="p-3.5 bg-stone-100/70 rounded-xl border border-stone-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-stone-900">
                          {inspection.isLocationReleased
                            ? `Exact Location Released: ${inspection.propertyExactAddress || inspection.propertyLocationArea}`
                            : `Protected Area: ${inspection.propertyLocationArea} (Exact address hidden from public)`}
                        </div>
                        <div className="text-stone-700 mt-0.5">
                          Admin exact address:{' '}
                          <strong className="text-stone-800">
                            {inspection.propertyExactAddress || `${inspection.propertyLocationArea}, Uyo`}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {!inspection.isLocationReleased && (
                      <button
                        onClick={() => handleReleaseLocation(inspection)}
                        className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer min-h-[36px]"
                      >
                        Unlock & Release Address
                      </button>
                    )}
                  </div>

                  {/* Notes & Outcome if logged */}
                  {inspection.notes && (
                    <div className="text-xs text-stone-700 bg-white p-3 rounded-xl border border-stone-200">
                      <span className="font-bold text-stone-800">Tenant Note: </span>
                      <span className="italic">"{inspection.notes}"</span>
                    </div>
                  )}

                  {inspection.outcome && (
                    <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                        <ClipboardCheck className="w-4 h-4 text-blue-700" />
                        <span>Recorded Outcome: {inspection.outcome}</span>
                      </div>
                      {inspection.outcomeNotes && (
                        <p className="text-xs text-blue-950 mt-1 italic">"{inspection.outcomeNotes}"</p>
                      )}
                      <div className="text-[11px] text-blue-800 mt-1 font-medium">
                        Logged by {inspection.outcomeRecordedBy || 'Super Admin'}
                      </div>
                    </div>
                  )}

                  {/* Action Controls Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setSelectedInspectionForAudit(inspection)}
                        className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer min-h-[44px]"
                      >
                        <History className="w-4 h-4 text-stone-600" />
                        <span>Audit Log ({inspection.auditHistory?.length || 0})</span>
                      </button>

                      <button
                        onClick={() =>
                          setMessagingParticipant({
                            participantId: inspection.tenantId,
                            participantName: inspection.tenantName,
                            participantRole: 'TENANT',
                            propertyId: inspection.propertyId,
                            propertyTitle: inspection.propertyTitle,
                          })
                        }
                        className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer min-h-[44px]"
                      >
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <span>Message Tenant</span>
                      </button>

                      <button
                        onClick={() =>
                          setMessagingParticipant({
                            participantId: inspection.agentId || inspection.landlordId,
                            participantName: inspection.agentName || inspection.landlordName,
                            participantRole: inspection.agentId ? 'AGENT' : 'LANDLORD',
                            propertyId: inspection.propertyId,
                            propertyTitle: inspection.propertyTitle,
                          })
                        }
                        className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer min-h-[44px]"
                      >
                        <MessageSquare className="w-4 h-4 text-amber-600" />
                        <span>Message Representative</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Record Outcome Button */}
                      <button
                        onClick={() => handleOpenOutcome(inspection)}
                        className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer min-h-[44px]"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                        <span>Record Outcome</span>
                      </button>

                      {/* Reschedule */}
                      <button
                        onClick={() => {
                          setRescheduleInspection(inspection);
                          setNewDate(inspection.preferredDate);
                          setNewTime(inspection.preferredTime);
                          setRescheduleReason('');
                        }}
                        className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer min-h-[44px]"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reschedule</span>
                      </button>

                      {/* Cancel / Flag */}
                      <button
                        onClick={() => {
                          setCancelInspection(inspection);
                          setCancelReason('');
                        }}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition cursor-pointer min-h-[44px]"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel / Flag</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: AUDIT TRAIL & HISTORY MODAL */}
      {selectedInspectionForAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                  Chronological Audit Trail
                </span>
                <h3 className="text-xl font-bold text-stone-900 mt-1">
                  Inspection History & Lifecycle
                </h3>
                <p className="text-xs text-stone-700 mt-0.5">
                  {selectedInspectionForAudit.propertyTitle} ({selectedInspectionForAudit.propertyLocationArea})
                </p>
              </div>
              <button
                onClick={() => setSelectedInspectionForAudit(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Audit History Timeline */}
            <div className="space-y-4">
              <div className="relative pl-6 border-l-2 border-emerald-600 space-y-6">
                {(selectedInspectionForAudit.auditHistory && selectedInspectionForAudit.auditHistory.length > 0
                  ? selectedInspectionForAudit.auditHistory
                  : [
                      {
                        id: 'aud-fallback-1',
                        timestamp: selectedInspectionForAudit.createdAt,
                        action: 'INSPECTION_REQUESTED',
                        title: 'Inspection Requested by Tenant',
                        actorName: selectedInspectionForAudit.tenantName,
                        actorRole: 'TENANT' as const,
                        notes: `Requested date: ${selectedInspectionForAudit.preferredDate}`,
                      },
                      {
                        id: 'aud-fallback-2',
                        timestamp: selectedInspectionForAudit.updatedAt,
                        action: 'HOMEZA_COORDINATION_CONFIRMED',
                        title: 'Inspection Coordination Logged',
                        actorName: 'HOMEZA Admin',
                        actorRole: 'ADMIN' as const,
                      },
                    ]
                ).map((entry, idx) => (
                  <div key={entry.id || idx} className="relative">
                    {/* Circle Dot */}
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white ring-2 ring-emerald-600/30" />

                    <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-stone-900">{entry.title}</span>
                        <span className="text-[11px] font-mono text-stone-700">
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Recent'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-stone-700">
                        <span>Actor:</span>
                        <strong className="text-stone-800">{entry.actorName}</strong>
                        <span className="px-1.5 py-0.2 rounded bg-stone-200 text-stone-700 text-[10px] font-bold">
                          {entry.actorRole}
                        </span>
                      </div>

                      {entry.notes && (
                        <p className="text-xs text-stone-800 pt-1 border-t border-stone-200/60 italic">
                          "{entry.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-stone-200">
              <button
                onClick={() => setSelectedInspectionForAudit(null)}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold rounded-xl cursor-pointer"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM HOMEZA COORDINATION & ASSIGN REPRESENTATIVE */}
      {coordinatingInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                  Admin Inspection Coordination
                </span>
                <h3 className="text-xl font-bold text-stone-900 mt-1">
                  Confirm HOMEZA Coordination & Representative
                </h3>
              </div>
              <button
                onClick={() => setCoordinatingInspection(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCoordination} className="space-y-5">
              {/* Property Summary */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <div className="font-bold text-stone-900">{coordinatingInspection.propertyTitle}</div>
                <div className="text-stone-700 mt-0.5">
                  Tenant: <strong>{coordinatingInspection.tenantName}</strong> • Representative:{' '}
                  <strong>{coordinatingInspection.agentName || coordinatingInspection.landlordName}</strong>
                </div>
                <div className="text-emerald-800 font-semibold mt-1">
                  Requested: {coordinatingInspection.preferredDate} ({coordinatingInspection.preferredTime})
                </div>
              </div>

              {/* Requirement 6: Coordination Mode (Attend in person, Remote, Assign rep) */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-stone-900">
                  HOMEZA Participation Mode
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    {
                      value: 'REMOTE_COORDINATION',
                      title: 'Coordinate remotely',
                      desc: 'Monitor in-app timeline, verify confirmation & release meeting point without field presence.',
                    },
                    {
                      value: 'ATTEND_IN_PERSON',
                      title: 'Attend the inspection in person',
                      desc: 'HOMEZA representative will physically attend the property walkthrough with tenant.',
                    },
                    {
                      value: 'ASSIGNED_REPRESENTATIVE',
                      title: 'Assign a dedicated Field Officer',
                      desc: 'Delegate dedicated verification officer to oversee property access and checklist.',
                    },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                        coordMode === opt.value
                          ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="coordMode"
                        value={opt.value}
                        checked={coordMode === opt.value}
                        onChange={() => setCoordMode(opt.value as InspectionCoordinationMode)}
                        className="mt-1 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <div>
                        <div className="text-sm font-bold text-stone-900">{opt.title}</div>
                        <div className="text-xs text-stone-700 mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Requirement 4: Assigned HOMEZA Representative */}
              <div className="space-y-2">
                <label htmlFor="rep-select" className="block text-sm font-bold text-stone-900">
                  Assigned HOMEZA Representative
                </label>
                <select
                  id="rep-select"
                  value={selectedRepId}
                  onChange={(e) => setSelectedRepId(e.target.value)}
                  className="w-full text-base border border-stone-300 rounded-xl px-4 py-3 bg-white font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[48px]"
                >
                  {DEFAULT_REPRESENTATIVES.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name} — {rep.role}
                    </option>
                  ))}
                  <option value="custom">+ Assign Other HOMEZA Staff / Inspection Officer</option>
                </select>
              </div>

              {selectedRepId === 'custom' && (
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">Officer Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Victor Udo"
                      value={customRepName}
                      onChange={(e) => setCustomRepName(e.target.value)}
                      className="w-full text-base border border-stone-300 rounded-xl px-3.5 py-2.5 bg-white text-stone-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">Role Title</label>
                      <input
                        type="text"
                        placeholder="HOMEZA Field Coordinator"
                        value={customRepRole}
                        onChange={(e) => setCustomRepRole(e.target.value)}
                        className="w-full text-base border border-stone-300 rounded-xl px-3.5 py-2.5 bg-white text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+234 80..."
                        value={customRepPhone}
                        onChange={(e) => setCustomRepPhone(e.target.value)}
                        className="w-full text-base border border-stone-300 rounded-xl px-3.5 py-2.5 bg-white text-stone-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Coordination Notes */}
              <div className="space-y-1">
                <label className="block text-sm font-bold text-stone-900">
                  Coordination Note (Internal & Participants)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Landlord confirmed caretaker will meet tenant at Grace Bill junction."
                  value={coordNotes}
                  onChange={(e) => setCoordNotes(e.target.value)}
                  className="w-full text-base border border-stone-300 rounded-xl p-3 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setCoordinatingInspection(null)}
                  className="px-4 py-2.5 text-sm font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-bold rounded-xl shadow-xs cursor-pointer min-h-[44px]"
                >
                  Confirm HOMEZA Coordination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD INSPECTION OUTCOME (Requirement 9) */}
      {outcomeInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                  Post-Walkthrough Audit
                </span>
                <h3 className="text-xl font-bold text-stone-900 mt-1">
                  Record Inspection Outcome
                </h3>
              </div>
              <button
                onClick={() => setOutcomeInspection(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOutcome} className="space-y-5">
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <div className="font-bold text-stone-900">{outcomeInspection.propertyTitle}</div>
                <div className="text-stone-700 mt-0.5">
                  Tenant: <strong>{outcomeInspection.tenantName}</strong> • Officer:{' '}
                  <strong>{outcomeInspection.assignedHomezaRep?.name || 'Super Admin'}</strong>
                </div>
              </div>

              {/* Requirement 9: Outcome Choices */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-stone-900">
                  Select Walkthrough Outcome
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'COMPLETED', label: 'COMPLETED — Walkthrough successful, access provided' },
                    { value: 'TENANT_NO_SHOW', label: 'TENANT DID NOT SHOW' },
                    { value: 'LANDLORD_AGENT_NO_SHOW', label: 'LANDLORD / AGENT DID NOT SHOW' },
                    { value: 'RESCHEDULED', label: 'RESCHEDULED — Follow-up date required' },
                    { value: 'PROPERTY_ISSUE_REPORTED', label: 'PROPERTY ISSUE REPORTED — Condition discrepancy' },
                    { value: 'LISTING_FLAGGED_FOR_REVIEW', label: 'LISTING FLAGGED FOR ADMIN REVIEW' },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                        selectedOutcome === opt.value
                          ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500 font-bold text-blue-950'
                          : 'border-stone-200 hover:bg-stone-50 text-stone-800 font-medium'
                      }`}
                    >
                      <input
                        type="radio"
                        name="outcomeChoice"
                        value={opt.value}
                        checked={selectedOutcome === opt.value}
                        onChange={() => setSelectedOutcome(opt.value as InspectionOutcomeType)}
                        className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span className="text-xs sm:text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Optional Internal Note */}
              <div className="space-y-1">
                <label className="block text-sm font-bold text-stone-900">
                  Walkthrough & Inspection Notes
                </label>
                <textarea
                  rows={3}
                  placeholder='e.g. "Inspection completed. Tenant attended. Agent provided access. Tenant verified dedicated water tank."'
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  className="w-full text-base border border-stone-300 rounded-xl p-3 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Flag Listing Checkbox */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flagListing}
                    onChange={(e) => setFlagListing(e.target.checked)}
                    className="h-4 w-4 text-rose-600 rounded border-stone-300 focus:ring-rose-500"
                  />
                  <span className="text-xs sm:text-sm font-bold text-stone-900">
                    Flag listing for Admin Property Review
                  </span>
                </label>
                {flagListing && (
                  <input
                    type="text"
                    placeholder="Specify reason (e.g. Property looks occupied, inaccurate photos)"
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    className="w-full text-xs sm:text-sm border border-stone-300 rounded-lg p-2 bg-white text-stone-900"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setOutcomeInspection(null)}
                  className="px-4 py-2.5 text-sm font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-xl shadow-xs cursor-pointer min-h-[44px]"
                >
                  Save Outcome to Audit History
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: RESCHEDULE MODAL */}
      {rescheduleInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                  Admin Schedule Adjustment
                </span>
                <h3 className="text-lg font-bold text-stone-900 mt-1">Reschedule Inspection</h3>
              </div>
              <button
                onClick={() => setRescheduleInspection(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReschedule} className="space-y-4">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <div className="font-bold text-stone-900">{rescheduleInspection.propertyTitle}</div>
                <div className="text-stone-700 mt-0.5">
                  Current: {rescheduleInspection.preferredDate} ({rescheduleInspection.preferredTime})
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">New Date</label>
                <input
                  type="text"
                  placeholder="e.g. Saturday, Aug 29, 2026"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full text-base border border-stone-300 rounded-xl px-3.5 py-2.5 bg-white text-stone-900 min-h-[48px]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">New Time</label>
                <select
                  id="select-admin-reschedule-time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full text-base border border-stone-300 rounded-xl px-3.5 py-2.5 bg-white text-stone-900 min-h-[48px] cursor-pointer"
                >
                  <option value="9:00 AM">9:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="1:00 PM">1:00 PM</option>
                  <option value="2:00 PM">2:00 PM</option>
                  <option value="3:00 PM">3:00 PM</option>
                  <option value="4:00 PM">4:00 PM</option>
                  <option value="5:00 PM">5:00 PM</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">Reason for Rescheduling</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Landlord unavailable in morning; moved to afternoon walkthrough."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full text-base border border-stone-300 rounded-xl p-3 bg-white text-stone-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setRescheduleInspection(null)}
                  className="px-4 py-2 text-sm font-semibold text-stone-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold rounded-xl cursor-pointer"
                >
                  Update & Notify Participants
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CANCEL / FLAG MODAL */}
      {cancelInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-rose-900">Cancel Inspection</h3>
                <p className="text-xs text-stone-700 mt-0.5">
                  This will cancel the scheduled inspection and update all participants.
                </p>
              </div>
              <button
                onClick={() => setCancelInspection(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">Reason for Cancellation</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Property already leased or tenant requested withdrawal."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full text-base border border-stone-300 rounded-xl p-3 bg-white text-stone-900"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setCancelInspection(null)}
                  className="px-4 py-2 text-sm font-semibold text-stone-600"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-sm font-bold rounded-xl cursor-pointer"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT MESSAGING MODAL */}
      {messagingParticipant && (
        <DirectMessagingModal
          isOpen={true}
          onClose={() => setMessagingParticipant(null)}
          participantId={messagingParticipant.participantId}
          participantName={messagingParticipant.participantName}
          participantRole={messagingParticipant.participantRole as any}
          propertyId={messagingParticipant.propertyId}
          propertyTitle={messagingParticipant.propertyTitle}
        />
      )}
    </div>
  );
};
