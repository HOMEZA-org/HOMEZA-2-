import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Filter,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  Shield,
  Tag,
  User,
  X,
  XCircle,
} from 'lucide-react';
import {
  Property,
  SupportTicket,
  SupportTicketPriority,
  SupportTicketStatus,
  UserRole,
} from '../../types';
import { Store } from '../../services/store';
import { useAuth } from '../../context/AuthContext';
import { PLATFORM_CONFIG } from '../../config/platform';

interface SupportCenterViewProps {
  userRole?: 'LANDLORD' | 'AGENT' | 'TENANT' | 'ADMIN';
  userProperties?: Property[];
  onViewProperty?: (property: Property) => void;
  isInspectionMode?: boolean;
}

export const SUPPORT_CATEGORIES = [
  'Account/Login problem',
  'Property/listing problem',
  'Payment problem',
  'Inspection problem',
  'KYC/verification problem',
  'Report a suspicious user/property',
  'Technical problem',
  'General question',
] as const;

export const SupportCenterView: React.FC<SupportCenterViewProps> = ({
  userRole = 'TENANT',
  userProperties = [],
  onViewProperty,
  isInspectionMode = false,
}) => {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>(() =>
    currentUser ? Store.getSupportTickets(currentUser.id) : []
  );

  const businessEmail = PLATFORM_CONFIG.supportEmail || 'support@homeza.com.ng';
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Success message banner after ticket submission
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // New Ticket Form State
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [emailAddress, setEmailAddress] = useState(currentUser?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [category, setCategory] = useState<string>(SUPPORT_CATEGORIES[0]);
  const [priority, setPriority] = useState<SupportTicketPriority>('MEDIUM');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply state for selected ticket
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Sync tickets from Store
  React.useEffect(() => {
    const unsub = Store.subscribe(() => {
      if (currentUser) {
        setTickets(Store.getSupportTickets(currentUser.id));
        if (selectedTicket) {
          const fresh = Store.getSupportTicketById(selectedTicket.id);
          if (fresh) setSelectedTicket(fresh);
        }
      }
    });
    return unsub;
  }, [currentUser, selectedTicket?.id]);

  // Keep form user fields in sync with currentUser
  React.useEffect(() => {
    if (currentUser) {
      if (!fullName) setFullName(currentUser.fullName);
      if (!emailAddress) setEmailAddress(currentUser.email);
      if (!phoneNumber && currentUser.phoneNumber) setPhoneNumber(currentUser.phoneNumber);
    }
  }, [currentUser]);

  // Counts
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(
    (t) => t.status === 'RESOLVED' || t.status === 'CLOSED'
  ).length;

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = t.id.toLowerCase().includes(q);
        const matchesSubj = t.subject.toLowerCase().includes(q);
        const matchesDesc = t.description.toLowerCase().includes(q);
        const matchesCat = t.category.toLowerCase().includes(q);
        return matchesId || matchesSubj || matchesDesc || matchesCat;
      }
      return true;
    });
  }, [tickets, statusFilter, priorityFilter, categoryFilter, searchQuery]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(businessEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleOpenCreateModal = () => {
    if (isInspectionMode) {
      alert('Admin Inspection Mode: Support ticket submission is disabled during inspection view.');
      return;
    }
    setFullName(currentUser?.fullName || '');
    setEmailAddress(currentUser?.email || '');
    setPhoneNumber(currentUser?.phoneNumber || '');
    setCategory(SUPPORT_CATEGORIES[0]);
    setPriority('MEDIUM');
    setSubject('');
    setDescription('');
    setSelectedPropertyId('');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInspectionMode) return;

    const senderName = fullName.trim() || currentUser?.fullName || 'Valued User';
    const senderEmail = emailAddress.trim() || currentUser?.email || '';

    if (!senderEmail) {
      setFormError('Please enter your email address so our support team can reach you.');
      return;
    }
    if (subject.trim().length < 5) {
      setFormError('Please enter a descriptive subject (at least 5 characters).');
      return;
    }
    if (description.trim().length < 10) {
      setFormError('Please provide more details in the description (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const relatedProp = userProperties.find((p) => p.id === selectedPropertyId);

    // 1. Create in local Store
    const newTicket = Store.createSupportTicket({
      userId: currentUser?.id || `guest-${Date.now()}`,
      userName: senderName,
      userEmail: senderEmail,
      userPhone: phoneNumber.trim() || currentUser?.phoneNumber,
      userRole: (userRole || 'TENANT') as UserRole,
      category,
      subject: subject.trim(),
      description: description.trim(),
      priority,
      propertyId: relatedProp?.id,
      propertyTitle: relatedProp?.title,
    });

    // 2. Dispatch to backend API to send real emails to support@homeza.com.ng and user confirmation
    try {
      await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || newTicket.userId,
          name: senderName,
          userName: senderName,
          email: senderEmail,
          userEmail: senderEmail,
          phone: phoneNumber.trim(),
          userPhone: phoneNumber.trim(),
          userRole: userRole,
          category,
          subject: subject.trim(),
          description: description.trim(),
          priority,
          propertyId: relatedProp?.id,
          propertyTitle: relatedProp?.title,
        }),
      });
    } catch (err) {
      console.warn('Backend support notification fetch error:', err);
    }

    setIsSubmitting(false);
    setIsCreateModalOpen(false);
    setSelectedTicket(newTicket);
    setSuccessBanner(
      'Your support request has been sent successfully. HOMEZA Support will review your message and respond to you.'
    );

    // Auto clear banner after 8s
    setTimeout(() => {
      setSuccessBanner(null);
    }, 8000);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInspectionMode) {
      alert('Admin Inspection Mode: Sending replies is disabled in inspection view.');
      return;
    }
    if (!selectedTicket || !replyMessage.trim()) return;

    setIsSendingReply(true);
    const senderId = currentUser?.id || 'user-anon';
    const senderName = currentUser?.fullName || selectedTicket.userName || 'User';

    // 1. Update in local Store
    const updated = Store.addSupportTicketMessage(
      selectedTicket.id,
      replyMessage.trim(),
      {
        id: senderId,
        name: senderName,
        role: (userRole || 'TENANT') as UserRole,
      }
    );

    if (updated) {
      setSelectedTicket(updated);
    }

    // 2. Send to backend
    try {
      await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId,
          senderName,
          senderRole: userRole,
          message: replyMessage.trim(),
        }),
      });
    } catch (err) {
      console.warn('Backend message reply error:', err);
    }

    setReplyMessage('');
    setIsSendingReply(false);
  };

  const handleMarkResolved = async () => {
    if (isInspectionMode || !selectedTicket) return;
    const updated = Store.updateSupportTicketStatus(
      selectedTicket.id,
      'RESOLVED',
      'Marked as resolved by user.'
    );
    if (updated) setSelectedTicket(updated);
  };

  const getPriorityBadge = (p: SupportTicketPriority) => {
    switch (p) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOW':
        return 'bg-stone-100 text-stone-700 border-stone-300';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-300';
    }
  };

  const getStatusBadge = (s: SupportTicketStatus) => {
    switch (s) {
      case 'OPEN':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'CLOSED':
        return 'bg-stone-200 text-stone-800 border-stone-300';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-300';
    }
  };

  const mailtoHref = `mailto:${businessEmail}?subject=${encodeURIComponent(
    `[HOMEZA Support Request] - ${currentUser?.fullName || 'User Inquiry'}`
  )}&body=${encodeURIComponent(
    `Hello HOMEZA Support Team,\n\nName: ${currentUser?.fullName || ''}\nEmail: ${
      currentUser?.email || ''
    }\nRole: ${userRole}\nPhone: ${currentUser?.phoneNumber || ''}\n\nProblem Description:\n\n`
  )}`;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* SUCCESS CONFIRMATION BANNER */}
      {successBanner && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm text-emerald-900">Support Ticket Created</h4>
            <p className="text-xs text-emerald-800 mt-0.5">{successBanner}</p>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Official Business Email Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900">
                HOMEZA Support Center
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                {userRole === 'LANDLORD' ? 'Landlord Desk' : userRole === 'AGENT' ? 'Agent Desk' : 'Help Desk'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
              Get direct assistance with login, verification, property listings, payments, and account inquiries. All requests are handled directly by HOMEZA Operations.
            </p>
          </div>
        </div>

        {/* Action Buttons & Direct Email Pill */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <a
            id="btn-contact-support-mailto"
            href={mailtoHref}
            className="inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-sm transition shrink-0"
          >
            <Mail className="w-4 h-4 text-emerald-400" />
            <span>Contact HOMEZA Support</span>
          </a>

          <button
            id="btn-open-create-ticket"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-sm transition shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit In-App Ticket</span>
          </button>
        </div>
      </div>

      {/* Official Business Email Contact Info Bar */}
      <div className="bg-stone-900 text-white rounded-3xl p-5 sm:p-6 border border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Official Business & Support Email
            </div>
            <div className="text-sm sm:text-base font-bold text-emerald-400 font-mono select-all">
              {businessEmail}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleCopyEmail}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold px-3.5 py-2 rounded-xl border border-stone-700 transition cursor-pointer"
          >
            {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedEmail ? 'Copied to Clipboard!' : 'Copy Email'}</span>
          </button>

          <a
            href={mailtoHref}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Email App</span>
          </a>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
              : 'bg-white hover:bg-stone-50 border-stone-200'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider opacity-70">Total Tickets</div>
          <div className="text-2xl font-extrabold mt-1">{totalCount}</div>
          <div className="text-[11px] opacity-80 mt-0.5">Your submitted inquiries</div>
        </div>

        <div
          onClick={() => setStatusFilter('OPEN')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'OPEN'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white hover:bg-amber-50/50 border-stone-200'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-amber-600">Open Tickets</div>
          <div className="text-2xl font-extrabold mt-1 text-amber-600">{openCount}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Awaiting first review</div>
        </div>

        <div
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white hover:bg-blue-50/50 border-stone-200'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600">In Progress</div>
          <div className="text-2xl font-extrabold mt-1 text-blue-600">{inProgressCount}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Under active investigation</div>
        </div>

        <div
          onClick={() => setStatusFilter('RESOLVED')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'RESOLVED'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white hover:bg-emerald-50/50 border-stone-200'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Resolved</div>
          <div className="text-2xl font-extrabold mt-1 text-emerald-600">{resolvedCount}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Completed inquiries</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ticket ID, subject, keywords, or issue type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open Only</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-semibold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">All Categories</option>
              {SUPPORT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs font-semibold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List or Empty State */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-stone-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <HelpCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">No Support Tickets Found</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
              {tickets.length === 0
                ? 'You do not have any open or previous support requests. If you have an inquiry, submit a ticket or contact us directly.'
                : 'No tickets matched your search or filter criteria. Try clearing the filters.'}
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Ticket</span>
            </button>
            <a
              href={mailtoHref}
              className="inline-flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold px-4 py-2.5 rounded-xl transition"
            >
              <Mail className="w-4 h-4 text-stone-600" />
              <span>Email Support</span>
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => {
            const hasAdminReply = ticket.messages.some((m) => m.senderRole === 'ADMIN');
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-emerald-500 hover:shadow-md transition cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                      #{ticket.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadge(
                        ticket.status
                      )}`}
                    >
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getPriorityBadge(
                        ticket.priority
                      )}`}
                    >
                      {ticket.priority} Priority
                    </span>
                    <span className="text-[10px] font-semibold text-stone-600 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-stone-400" />
                      {ticket.category}
                    </span>
                    {hasAdminReply && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Admin Replied
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-stone-900 truncate">
                      {ticket.subject}
                    </h4>
                    <p className="text-xs text-stone-600 line-clamp-2 mt-0.5">
                      {ticket.description}
                    </p>
                  </div>

                  {ticket.propertyTitle && (
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">Related Property: {ticket.propertyTitle}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between lg:flex-col lg:items-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-100 shrink-0">
                  <div className="text-[11px] text-stone-400 text-left lg:text-right">
                    <div>Created {new Date(ticket.createdAt).toLocaleDateString()}</div>
                    <div>
                      {ticket.messages.length} message{ticket.messages.length > 1 ? 's' : ''}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTicket(ticket);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-xl border border-emerald-200 transition cursor-pointer"
                  >
                    <span>View Thread</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {isCreateModalOpen && (
        <div
          id="modal-create-support-ticket"
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-fadeIn my-8">
            <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <LifeBuoy className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-extrabold text-base">Create Support Ticket</h3>
                  <p className="text-[11px] text-stone-400">
                    Direct communication with HOMEZA Platform Operations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3.5 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* User Identity Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Your Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs font-medium border border-stone-300 rounded-xl px-3 py-2.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Your Registered Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="w-full text-xs font-medium border border-stone-300 rounded-xl px-3 py-2.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder="e.g. name@gmail.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Issue Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="input-ticket-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs font-medium border border-stone-300 rounded-xl px-3 py-2.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {SUPPORT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Priority Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="input-ticket-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as SupportTicketPriority)}
                    className="w-full text-xs font-medium border border-stone-300 rounded-xl px-3 py-2.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="LOW">Low — General inquiry</option>
                    <option value="MEDIUM">Medium — Standard request</option>
                    <option value="HIGH">High — Property / Payment issue</option>
                    <option value="URGENT">Urgent — Critical blocker</option>
                  </select>
                </div>
              </div>

              {/* Optional Property Selector */}
              {userProperties.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Related Property (Optional)
                  </label>
                  <select
                    id="input-ticket-property"
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="w-full text-xs font-medium border border-stone-300 rounded-xl px-3 py-2.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="">-- None / General Account Issue --</option>
                    {userProperties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.location.area})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Subject / Summary <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-ticket-subject"
                  type="text"
                  placeholder="e.g. Need assistance with OTP verification or property title upload"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs font-medium border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Detailed Explanation <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="input-ticket-description"
                  rows={4}
                  placeholder="Please describe your issue in detail. Include any relevant reference codes, property addresses, or steps so our support desk can assist you promptly..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  All submitted tickets are automatically dispatched to <strong>{businessEmail}</strong>. You will receive an email confirmation.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Support Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SELECTED TICKET DETAIL & THREAD MODAL */}
      {selectedTicket && (
        <div
          id="modal-ticket-thread"
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-fadeIn my-8 flex flex-col max-h-[88vh]">
            {/* Header */}
            <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-stone-800 px-2.5 py-1 rounded-lg">
                  #{selectedTicket.id}
                </span>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base truncate max-w-md">
                    {selectedTicket.subject}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-0.5">
                    <span>Category: {selectedTicket.category}</span>
                    <span>•</span>
                    <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Badges & Meta info */}
            <div className="bg-stone-50 px-6 py-3 border-b border-stone-200 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(selectedTicket.status)}`}>
                  Status: {selectedTicket.status.replace('_', ' ')}
                </span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full border ${getPriorityBadge(selectedTicket.priority)}`}>
                  Priority: {selectedTicket.priority}
                </span>
                {selectedTicket.propertyTitle && (
                  <span className="text-stone-600 bg-white border border-stone-200 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-stone-400" />
                    {selectedTicket.propertyTitle}
                  </span>
                )}
              </div>

              {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                <button
                  onClick={handleMarkResolved}
                  className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-lg transition cursor-pointer"
                >
                  Mark as Resolved
                </button>
              )}
            </div>

            {/* Messages Thread (Scrollable) */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-stone-50/50">
              {/* Initial Ticket Description */}
              <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-stone-200 text-stone-700 font-bold flex items-center justify-center text-[10px]">
                      {selectedTicket.userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-stone-900">{selectedTicket.userName}</span>
                    <span className="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-600 font-semibold">
                      {selectedTicket.userRole}
                    </span>
                  </div>
                  <span>{new Date(selectedTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs sm:text-sm text-stone-800 whitespace-pre-line leading-relaxed">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Thread Messages */}
              {selectedTicket.messages.slice(1).map((msg) => {
                const isAdmin = msg.senderRole === 'ADMIN';
                return (
                  <div
                    key={msg.id}
                    className={`rounded-2xl p-4 border shadow-xs ${
                      isAdmin
                        ? 'bg-emerald-50/80 border-emerald-200 ml-4 sm:ml-8'
                        : 'bg-white border-stone-200 mr-4 sm:mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-[10px] ${
                            isAdmin
                              ? 'bg-emerald-700 text-white'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {isAdmin ? 'H' : msg.senderName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-stone-900">
                          {isAdmin ? 'HOMEZA Operations' : msg.senderName}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            isAdmin
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {isAdmin ? 'ADMIN DESK' : msg.senderRole}
                        </span>
                      </div>
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-stone-800 whitespace-pre-line leading-relaxed">
                      {msg.message}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Bar */}
            <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-stone-200 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a reply or additional information..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="flex-1 text-xs border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  type="submit"
                  disabled={isSendingReply || !replyMessage.trim()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingReply ? 'Sending...' : 'Reply'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
