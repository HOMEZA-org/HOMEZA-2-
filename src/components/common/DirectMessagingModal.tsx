import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { DirectMessage, Property, PropertyInspection, User as UserType } from '../../types';
import { Store } from '../../services/store';
import { useAuth } from '../../context/AuthContext';
import { formatNaira } from '../../config/platform';
import { checkMessageContactSafety } from '../../utils/contactProtection';

export interface DirectMessagingModalProps {
  property?: Property;
  propertyId?: string;
  propertyTitle?: string;
  recipientId?: string;
  recipientName?: string;
  recipientRole?: 'LANDLORD' | 'AGENT' | 'TENANT' | 'ADMIN';
  participantId?: string;
  participantName?: string;
  participantRole?: 'LANDLORD' | 'AGENT' | 'TENANT' | 'ADMIN';
  initialSubject?: string;
  isOpen?: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
  inspectionId?: string;
}

export const DirectMessagingModal: React.FC<DirectMessagingModalProps> = ({
  property: initialProperty,
  propertyId,
  propertyTitle,
  recipientId: initialRecipientId,
  recipientName: initialRecipientName,
  recipientRole: initialRecipientRole,
  participantId,
  participantName,
  participantRole,
  isOpen = true,
  onClose,
  onOpenAuth,
  inspectionId,
}) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [activeInspection, setActiveInspection] = useState<PropertyInspection | null>(null);
  const [resolvedProperty, setResolvedProperty] = useState<Property | null>(
    initialProperty || (propertyId ? Store.getPropertyById(propertyId) || null : null)
  );

  // Unify props and aliases
  const effectiveRecipientId = initialRecipientId || participantId;
  const effectiveRecipientName = initialRecipientName || participantName;
  const effectiveRecipientRole = initialRecipientRole || participantRole;

  // Inspection action states
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00 AM');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Body scroll lock and Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Load inspection and property data cleanly
  useEffect(() => {
    if (!currentUser || !isOpen) return;

    const syncInspectionAndProperty = () => {
      let insp: PropertyInspection | null = null;
      const allInspections = Store.getInspections();

      if (inspectionId) {
        insp = allInspections.find((i) => i.id === inspectionId) || null;
      } else if (initialProperty) {
        insp =
          allInspections.find(
            (i) =>
              i.propertyId === initialProperty.id &&
              (i.tenantId === currentUser.id ||
                i.landlordId === currentUser.id ||
                i.agentId === currentUser.id ||
                currentUser.role === 'ADMIN')
          ) || null;
      } else if (propertyId) {
        insp =
          allInspections.find(
            (i) =>
              i.propertyId === propertyId &&
              (i.tenantId === currentUser.id ||
                i.landlordId === currentUser.id ||
                i.agentId === currentUser.id ||
                currentUser.role === 'ADMIN')
          ) || null;
      }

      setActiveInspection(insp);

      // Resolve property if not passed in directly
      if (initialProperty) {
        setResolvedProperty(initialProperty);
      } else if (insp && insp.propertyId) {
        const prop = Store.getPropertyById(insp.propertyId);
        if (prop) setResolvedProperty(prop);
      } else if (propertyId) {
        const prop = Store.getPropertyById(propertyId);
        if (prop) setResolvedProperty(prop);
      }
    };

    syncInspectionAndProperty();
    const unsub = Store.subscribe(syncInspectionAndProperty);
    return () => unsub();
  }, [currentUser, inspectionId, initialProperty, propertyId, isOpen]);

  // Derive target recipient accurately based on inspection / property context & current user role
  const isCurrentUserTenant =
    currentUser?.role === 'TENANT' || (activeInspection && currentUser?.id === activeInspection.tenantId);

  const targetRecipientId =
    effectiveRecipientId ||
    (activeInspection
      ? isCurrentUserTenant
        ? (activeInspection.agentId || activeInspection.landlordId || '')
        : activeInspection.tenantId
      : (resolvedProperty?.listingSource === 'AGENT' && resolvedProperty.submittingAgentId
          ? resolvedProperty.submittingAgentId
          : resolvedProperty?.landlordId || ''));

  const targetRecipientName =
    effectiveRecipientName ||
    (activeInspection
      ? isCurrentUserTenant
        ? (activeInspection.agentName || activeInspection.landlordName || 'Property Representative')
        : activeInspection.tenantName
      : (resolvedProperty?.listingSource === 'AGENT' && resolvedProperty.submittingAgentName
          ? resolvedProperty.submittingAgentName
          : resolvedProperty?.landlordName || 'Property Representative'));

  const targetRecipientRole =
    effectiveRecipientRole ||
    (activeInspection
      ? isCurrentUserTenant
        ? (activeInspection.agentId ? 'AGENT' : 'LANDLORD')
        : 'TENANT'
      : (resolvedProperty?.listingSource === 'AGENT' ? 'AGENT' : 'LANDLORD'));

  // Load conversation messages and synchronize state without feedback loops
  useEffect(() => {
    if (!currentUser || !isOpen || !targetRecipientId) return;

    const syncMessages = () => {
      const convs = Store.getConversations(currentUser.id);
      const activeConv = convs.find(
        (c) =>
          (c.tenantId === currentUser.id && c.participantId === targetRecipientId) ||
          (c.participantId === currentUser.id && c.tenantId === targetRecipientId) ||
          (resolvedProperty &&
            c.propertyId === resolvedProperty.id &&
            (c.tenantId === currentUser.id || c.participantId === currentUser.id))
      );

      if (activeConv) {
        const msgs = Store.getMessages(activeConv.id);
        setMessages(msgs);
      } else {
        setMessages([]);
      }
    };

    // Initial load
    syncMessages();

    // Mark as read once when entering if unread exist
    const convs = Store.getConversations(currentUser.id);
    const activeConv = convs.find(
      (c) =>
        (c.tenantId === currentUser.id && c.participantId === targetRecipientId) ||
        (c.participantId === currentUser.id && c.tenantId === targetRecipientId) ||
        (resolvedProperty &&
          c.propertyId === resolvedProperty.id &&
          (c.tenantId === currentUser.id || c.participantId === currentUser.id))
    );
    if (activeConv) {
      Store.markConversationRead(activeConv.id, currentUser.id);
    }

    // Subscribe to store updates (pure synchronization only)
    const unsub = Store.subscribe(syncMessages);
    return () => unsub();
  }, [currentUser, targetRecipientId, resolvedProperty, isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message handler
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    // Contact Protection Check (Strict anti-bypass)
    const safetyCheck = checkMessageContactSafety(trimmed);
    if (safetyCheck.isBlocked) {
      setSendError(
        safetyCheck.reason ||
          'For your protection against rental fraud and extortion, sharing phone numbers, emails, or off-platform messaging links is prohibited on HOMEZA.'
      );
      return;
    }

    setIsSending(true);
    setSendError(null);
    try {
      Store.sendMessage(
        currentUser,
        targetRecipientId,
        targetRecipientName,
        targetRecipientRole as 'LANDLORD' | 'AGENT' | 'TENANT',
        trimmed,
        resolvedProperty?.id,
        resolvedProperty?.title || propertyTitle,
        resolvedProperty?.images[0]?.url
      );
      setInputText('');
    } catch (err) {
      console.error('Error delivering direct message:', err);
      setSendError('Failed to deliver message. Please retry.');
    } finally {
      setIsSending(false);
    }
  };

  // Inspection Action: Confirm
  const handleConfirmInspection = () => {
    if (!activeInspection || !currentUser) return;
    try {
      Store.confirmInspection(activeInspection.id);
      // Post system action message in chat
      Store.sendMessage(
        currentUser,
        targetRecipientId,
        targetRecipientName,
        targetRecipientRole as 'LANDLORD' | 'AGENT' | 'TENANT',
        `✅ [INSPECTION CONFIRMED] The inspection for ${activeInspection.preferredDate} at ${activeInspection.preferredTime} has been confirmed. Meeting location is set for ${activeInspection.propertyLocationArea}.`,
        resolvedProperty?.id,
        resolvedProperty?.title || propertyTitle,
        resolvedProperty?.images[0]?.url
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Inspection Action: Reschedule
  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInspection || !currentUser || !rescheduleDate) return;
    try {
      Store.rescheduleInspection(activeInspection.id, rescheduleDate, rescheduleTime, rescheduleReason);
      setShowRescheduleForm(false);
      // Post proposal message in chat
      Store.sendMessage(
        currentUser,
        targetRecipientId,
        targetRecipientName,
        targetRecipientRole as 'LANDLORD' | 'AGENT' | 'TENANT',
        `📅 [INSPECTION RESCHEDULE PROPOSAL] Proposed new time: ${rescheduleDate} at ${rescheduleTime}.${rescheduleReason ? ` Reason: "${rescheduleReason}"` : ''}`,
        resolvedProperty?.id,
        resolvedProperty?.title || propertyTitle,
        resolvedProperty?.images[0]?.url
      );
      setRescheduleDate('');
      setRescheduleReason('');
    } catch (err) {
      console.error(err);
    }
  };

  // Inspection Action: Cancel
  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInspection || !currentUser) return;
    try {
      Store.cancelInspection(activeInspection.id, cancelReason);
      setShowCancelForm(false);
      // Post cancellation in chat
      Store.sendMessage(
        currentUser,
        targetRecipientId,
        targetRecipientName,
        targetRecipientRole as 'LANDLORD' | 'AGENT' | 'TENANT',
        `❌ [INSPECTION CANCELLED] The inspection scheduled for ${activeInspection.preferredDate} has been cancelled.${cancelReason ? ` Reason: "${cancelReason}"` : ''}`,
        resolvedProperty?.id,
        resolvedProperty?.title || propertyTitle,
        resolvedProperty?.images[0]?.url
      );
      setCancelReason('');
    } catch (err) {
      console.error(err);
    }
  };

  // Inspection Action: Complete
  const handleCompleteInspection = () => {
    if (!activeInspection || !currentUser) return;
    try {
      Store.completeInspection(activeInspection.id);
      Store.sendMessage(
        currentUser,
        targetRecipientId,
        targetRecipientName,
        targetRecipientRole as 'LANDLORD' | 'AGENT' | 'TENANT',
        `🎉 [INSPECTION COMPLETED] The physical viewing for ${activeInspection.propertyTitle} has concluded successfully.`,
        resolvedProperty?.id,
        resolvedProperty?.title || propertyTitle,
        resolvedProperty?.images[0]?.url
      );
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  if (!currentUser) {
    return (
      <div
        className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 border border-stone-200 shadow-2xl">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-stone-950">In-App Messaging</h3>
          <p className="text-stone-600 text-sm">
            Please sign in to message this {targetRecipientRole.toLowerCase()} directly and coordinate inspections inside HOMEZA.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              id="btn-unauth-cancel-messaging"
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-sm hover:bg-stone-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-unauth-signin-messaging"
              type="button"
              onClick={() => {
                onClose();
                if (onOpenAuth) onOpenAuth();
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="in-app-messaging-modal"
        ref={modalContainerRef}
        className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col h-[95vh] sm:h-[88vh] max-h-[820px]"
      >
        {/* Header */}
        <div className="p-3.5 sm:p-5 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
              {targetRecipientName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg text-white truncate">
                  {targetRecipientName}
                </h3>
                <span className="text-[10px] sm:text-[11px] bg-emerald-800/80 text-emerald-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                  {targetRecipientRole === 'AGENT'
                    ? 'Verified Agent'
                    : targetRecipientRole === 'ADMIN'
                    ? 'HOMEZA Admin'
                    : targetRecipientRole === 'TENANT'
                    ? 'Tenant'
                    : 'Verified Landlord'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-300 truncate">
                🔒 In-App Secure Chat • Monitored by HOMEZA Operations
              </p>
            </div>
          </div>

          <button
            id="btn-close-direct-messaging"
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 z-10"
            aria-label="Close message window"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Property Context Header */}
        {resolvedProperty && (
          <div className="px-3.5 sm:px-4 py-2 bg-stone-100 border-b border-stone-200 flex items-center gap-2.5 sm:gap-3 shrink-0">
            <img
              src={resolvedProperty.images[0]?.url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300'}
              alt={resolvedProperty.title}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-stone-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                {resolvedProperty.title}
              </div>
              <div className="text-[11px] sm:text-xs text-stone-600 flex items-center gap-1.5 font-medium flex-wrap">
                <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>{resolvedProperty.location.area}, Uyo</span>
                <span>•</span>
                <span className="font-bold text-stone-900">{formatNaira(resolvedProperty.pricing.rent)}/yr</span>
              </div>
            </div>
          </div>
        )}

        {/* Active Inspection Action Panel */}
        {activeInspection && (
          <div className="bg-amber-50/90 border-b border-amber-200 px-3.5 sm:px-4 py-2.5 shrink-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar className="w-4 h-4 text-amber-800 shrink-0" />
                <span className="text-xs font-extrabold text-amber-950">
                  Inspection: {activeInspection.preferredDate} ({activeInspection.preferredTime})
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    activeInspection.status === 'INSPECTION_CONFIRMED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : activeInspection.status === 'INSPECTION_RESCHEDULED'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : activeInspection.status === 'INSPECTION_CANCELLED'
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : activeInspection.status === 'INSPECTION_COMPLETED'
                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                      : 'bg-amber-200/80 text-amber-900 border border-amber-300'
                  }`}
                >
                  {activeInspection.status.replace('INSPECTION_', '')}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(activeInspection.status === 'INSPECTION_REQUESTED' ||
                  activeInspection.status === 'INSPECTION_RESCHEDULED') && (
                  <>
                    <button
                      id="btn-inspection-confirm"
                      type="button"
                      onClick={handleConfirmInspection}
                      className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm</span>
                    </button>
                    <button
                      id="btn-inspection-reschedule-toggle"
                      type="button"
                      onClick={() => {
                        setShowRescheduleForm(!showRescheduleForm);
                        setShowCancelForm(false);
                      }}
                      className="text-xs font-bold bg-amber-200 hover:bg-amber-300 text-amber-950 px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Reschedule</span>
                    </button>
                    <button
                      id="btn-inspection-cancel-toggle"
                      type="button"
                      onClick={() => {
                        setShowCancelForm(!showCancelForm);
                        setShowRescheduleForm(false);
                      }}
                      className="text-xs font-bold text-red-700 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer border border-red-200"
                    >
                      Cancel
                    </button>
                  </>
                )}

                {activeInspection.status === 'INSPECTION_CONFIRMED' && (
                  <>
                    <button
                      id="btn-inspection-complete"
                      type="button"
                      onClick={handleCompleteInspection}
                      className="text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Completed</span>
                    </button>
                    <button
                      id="btn-inspection-reschedule-toggle"
                      type="button"
                      onClick={() => setShowRescheduleForm(!showRescheduleForm)}
                      className="text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      Reschedule
                    </button>
                    <button
                      id="btn-inspection-cancel-toggle"
                      type="button"
                      onClick={() => setShowCancelForm(!showCancelForm)}
                      className="text-xs font-semibold text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Unlocked Meeting Details if Confirmed */}
            {activeInspection.status === 'INSPECTION_CONFIRMED' && (
              <div className="bg-emerald-100/70 p-2 rounded-xl border border-emerald-300 text-xs text-emerald-950 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Inspection Location: </span>
                  <span>{activeInspection.propertyExactAddress || `${activeInspection.propertyLocationArea}, Uyo`}</span>
                </div>
              </div>
            )}

            {/* Inline Reschedule Form */}
            {showRescheduleForm && (
              <form onSubmit={handleRescheduleSubmit} className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2.5 mt-2 shadow-xs">
                <div className="text-xs font-bold text-stone-900">Propose New Inspection Slot:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">New Date</label>
                    <input
                      type="date"
                      required
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full text-xs border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">Time Slot</label>
                    <select
                      id="select-reschedule-time"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full text-base sm:text-xs border border-stone-300 rounded-lg p-2.5 sm:p-2 focus:ring-1 focus:ring-emerald-600 bg-white text-stone-900 min-h-[44px] sm:min-h-[38px] cursor-pointer"
                    >
                      <option value="09:00 AM">09:00 AM - 10:00 AM</option>
                      <option value="10:30 AM">10:30 AM - 11:30 AM</option>
                      <option value="01:00 PM">01:00 PM - 02:00 PM</option>
                      <option value="02:30 PM">02:30 PM - 03:30 PM</option>
                      <option value="04:00 PM">04:00 PM - 05:00 PM</option>
                      <option value="05:30 PM">05:30 PM - 06:30 PM</option>
                    </select>
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Reason or note for proposed time..."
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    className="w-full text-xs border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRescheduleForm(false)}
                    className="text-xs px-3 py-1.5 text-stone-600 hover:bg-stone-100 rounded-md cursor-pointer font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs bg-amber-700 hover:bg-amber-800 text-white font-bold px-3.5 py-1.5 rounded-md shadow-xs cursor-pointer"
                  >
                    Send Proposal
                  </button>
                </div>
              </form>
            )}

            {/* Inline Cancel Form */}
            {showCancelForm && (
              <form onSubmit={handleCancelSubmit} className="bg-white p-3.5 rounded-xl border border-red-200 space-y-2.5 mt-2 shadow-xs">
                <div className="text-xs font-bold text-red-900">Reason for Inspection Cancellation:</div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule clash, no longer available, rented another property..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full text-xs border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-red-600"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCancelForm(false)}
                    className="text-xs px-3 py-1.5 text-stone-600 hover:bg-stone-100 rounded-md cursor-pointer font-medium"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="text-xs bg-red-700 hover:bg-red-800 text-white font-bold px-3.5 py-1.5 rounded-md shadow-xs cursor-pointer"
                  >
                    Confirm Cancellation
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto min-h-0 p-3.5 sm:p-5 space-y-3 bg-stone-50/50 overscroll-contain">
          {messages.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-stone-800 font-bold text-sm">Start a conversation</p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Ask questions about amenities, power availability, compound rules, or coordinate an inspection.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              const isSystemAction =
                msg.content.startsWith('✅') ||
                msg.content.startsWith('📅') ||
                msg.content.startsWith('❌') ||
                msg.content.startsWith('🎉');

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-baseline gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-bold text-stone-600">
                      {isMe ? 'You' : msg.senderName}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div
                    className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isSystemAction
                        ? 'bg-amber-100/90 text-amber-950 border border-amber-300 font-medium'
                        : isMe
                        ? 'bg-emerald-700 text-white rounded-tr-xs'
                        : 'bg-white text-stone-900 border border-stone-200 rounded-tl-xs'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Send Error Notice */}
        {sendError && (
          <div className="px-4 py-2 bg-red-100 text-red-800 text-xs font-semibold flex items-center gap-1.5 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{sendError}</span>
          </div>
        )}

        {/* Message Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-2.5 sm:p-4 bg-white border-t border-stone-200 flex items-center gap-2 shrink-0"
        >
          <input
            id="input-direct-message"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${targetRecipientName}...`}
            className="flex-1 text-xs sm:text-sm border border-stone-300 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />
          <button
            id="btn-send-direct-message"
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs sm:text-sm shrink-0 min-h-[42px]"
          >
            <span>{isSending ? 'Sending...' : 'Send'}</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
