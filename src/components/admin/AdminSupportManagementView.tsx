import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Filter,
  LifeBuoy,
  Mail,
  MessageSquare,
  Phone,
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
  SupportTicket,
  SupportTicketPriority,
  SupportTicketStatus,
} from '../../types';
import { Store } from '../../services/store';

const QUICK_TEMPLATES = [
  {
    label: 'Property Title Verification Update',
    text: 'Hello. Our physical verification team in Uyo has reviewed the title documents and scheduled a site inspection. Your property listing will be published once the site inspection is completed.',
  },
  {
    label: 'Bank Account & Payout Verified',
    text: 'Hello. Your settlement bank account has been successfully verified for automated rental disbursements. Payouts will now route directly to this account.',
  },
  {
    label: 'Agent License / ERCAAS Accreditation Approved',
    text: 'Congratulations! Your real estate practice accreditation has been approved. Your verified agent badge is now active on all your assisted property listings.',
  },
  {
    label: 'Tenant Application & Agreement Review',
    text: 'We have reviewed the application parameters. The tenant background verification has cleared and the documentation is ready for move-in agreement signing.',
  },
  {
    label: 'General Technical Resolution',
    text: 'Thank you for bringing this to our attention. Our technical engineering team has investigated and resolved the issue. Please verify on your end.',
  },
];

export const AdminSupportManagementView: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>(() =>
    Store.getSupportTickets()
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Selected Ticket for Modal / Thread
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Admin Reply Form
  const [adminReplyText, setAdminReplyText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [adminNotesText, setAdminNotesText] = useState('');
  const [targetStatus, setTargetStatus] = useState<SupportTicketStatus>('IN_PROGRESS');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Sync with Store
  React.useEffect(() => {
    const unsub = Store.subscribe(() => {
      setTickets(Store.getSupportTickets());
      if (selectedTicket) {
        const fresh = Store.getSupportTicketById(selectedTicket.id);
        if (fresh) {
          setSelectedTicket(fresh);
          setAdminNotesText(fresh.adminNotes || '');
        }
      }
    });
    return unsub;
  }, [selectedTicket?.id]);

  // When ticket opened
  const handleOpenTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setAdminReplyText('');
    setSelectedTemplate('');
    setAdminNotesText(ticket.adminNotes || '');
    setTargetStatus(ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status);
  };

  // Metrics
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === 'OPEN').length;
  const inProgressTickets = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const urgentTickets = tickets.filter((t) => t.priority === 'URGENT' && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
  const resolvedTickets = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

  // Categories list
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (roleFilter !== 'ALL' && t.userRole !== roleFilter) return false;
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mId = t.id.toLowerCase().includes(q);
        const mUser = t.userName.toLowerCase().includes(q);
        const mEmail = t.userEmail.toLowerCase().includes(q);
        const mSubj = t.subject.toLowerCase().includes(q);
        const mDesc = t.description.toLowerCase().includes(q);
        const mProp = (t.propertyTitle || '').toLowerCase().includes(q);
        return mId || mUser || mEmail || mSubj || mDesc || mProp;
      }

      return true;
    });
  }, [tickets, statusFilter, roleFilter, priorityFilter, categoryFilter, searchQuery]);

  const handleApplyTemplate = (templateText: string) => {
    if (!templateText) return;
    setAdminReplyText(templateText);
  };

  const handleSendAdminResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    if (!adminReplyText.trim() && targetStatus === selectedTicket.status && adminNotesText === (selectedTicket.adminNotes || '')) {
      return;
    }

    setIsSubmittingReply(true);

    // If there is reply text, post message to Store
    if (adminReplyText.trim()) {
      Store.addSupportTicketMessage(selectedTicket.id, adminReplyText.trim(), {
        id: 'user-admin-1',
        name: 'HOMEZA Operations Desk',
        role: 'ADMIN',
      });

      // Dispatch to backend to send real email reply to user
      try {
        await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: 'user-admin-1',
            senderName: 'HOMEZA Operations Desk',
            senderRole: 'ADMIN',
            message: adminReplyText.trim(),
          }),
        });
      } catch (err) {
        console.warn('Backend admin reply dispatch error:', err);
      }
    }

    // Update status or notes
    const updated = Store.updateSupportTicketStatus(selectedTicket.id, targetStatus, adminNotesText.trim());
    if (updated) {
      setSelectedTicket(updated);
      setAdminReplyText('');
      setSelectedTemplate('');
    }

    setIsSubmittingReply(false);
  };

  const handleQuickStatusChange = (ticketId: string, newStatus: SupportTicketStatus) => {
    Store.updateSupportTicketStatus(ticketId, newStatus);
  };

  const handleQuickPriorityChange = (ticketId: string, newPriority: SupportTicketPriority) => {
    Store.updateSupportTicketPriority(ticketId, newPriority);
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & KPI Summary */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900">
              Support & Help Desk Operations
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
              Admin Control
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Manage inquiries, dispute resolutions, property verification appeals, and payout verifications from Landlords and Verified Agents.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
              : 'bg-white hover:bg-stone-50 border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span>Total Tickets</span>
            <LifeBuoy className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-2xl font-extrabold mt-2">{totalTickets}</div>
          <div className="text-[11px] opacity-80 mt-0.5">Platform total</div>
        </div>

        <div
          onClick={() => setStatusFilter('OPEN')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'OPEN'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white hover:bg-amber-50/50 border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span>Open (New)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold mt-2 text-amber-600">{openTickets}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Needs first response</div>
        </div>

        <div
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white hover:bg-blue-50/50 border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span>In Progress</span>
            <RefreshCw className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold mt-2 text-blue-600">{inProgressTickets}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Actively working</div>
        </div>

        <div
          onClick={() => {
            setPriorityFilter('URGENT');
            setStatusFilter('ALL');
          }}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            priorityFilter === 'URGENT'
              ? 'bg-red-600 text-white border-red-600 shadow-sm'
              : 'bg-white hover:bg-red-50/50 border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span>Urgent</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-extrabold mt-2 text-red-600">{urgentTickets}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">High priority action</div>
        </div>

        <div
          onClick={() => setStatusFilter('RESOLVED')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'RESOLVED'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white hover:bg-emerald-50/50 border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span>Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold mt-2 text-emerald-600">{resolvedTickets}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Closed resolutions</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            id="admin-support-search"
            type="text"
            placeholder="Search by ticket ID, user name, email, subject, or property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm border border-stone-200 rounded-xl bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            id="admin-ticket-role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs font-medium border border-stone-200 rounded-xl px-3 py-2 bg-stone-50/60 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="LANDLORD">Landlords Only</option>
            <option value="AGENT">Agents Only</option>
            <option value="TENANT">Tenants</option>
          </select>

          {/* Status Filter */}
          <select
            id="admin-ticket-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium border border-stone-200 rounded-xl px-3 py-2 bg-stone-50/60 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open Only</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            id="admin-ticket-priority-filter"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs font-medium border border-stone-200 rounded-xl px-3 py-2 bg-stone-50/60 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Category Filter */}
          {allCategories.length > 0 && (
            <select
              id="admin-ticket-cat-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-medium border border-stone-200 rounded-xl px-3 py-2 bg-stone-50/60 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {(searchQuery || statusFilter !== 'ALL' || roleFilter !== 'ALL' || priorityFilter !== 'ALL' || categoryFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setRoleFilter('ALL');
                setPriorityFilter('ALL');
                setCategoryFilter('ALL');
              }}
              className="text-xs font-semibold text-stone-500 hover:text-stone-900 px-2 py-2 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Tickets List Table */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
          <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-stone-900">No Support Tickets Found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            There are currently no tickets matching your active filter criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Ticket</th>
                  <th className="py-3.5 px-4">User & Role</th>
                  <th className="py-3.5 px-4">Subject & Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Last Update</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTickets.map((ticket) => {
                  const lastMessage = ticket.messages?.[ticket.messages.length - 1];

                  return (
                    <tr
                      key={ticket.id}
                      id={`admin-ticket-row-${ticket.id}`}
                      className="hover:bg-stone-50/70 transition cursor-pointer"
                      onClick={() => handleOpenTicket(ticket)}
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-extrabold text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                          {ticket.id}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">{ticket.userName}</div>
                        <div className="flex items-center gap-1 text-[11px] text-stone-500">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              ticket.userRole === 'LANDLORD'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ticket.userRole === 'AGENT'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {ticket.userRole}
                          </span>
                          <span className="truncate max-w-[120px]">{ticket.userEmail}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-stone-900 truncate">{ticket.subject}</div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                          <span className="bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded text-[10px]">
                            {ticket.category}
                          </span>
                          {ticket.propertyTitle && (
                            <span className="truncate text-stone-400 max-w-[140px]">
                              • {ticket.propertyTitle}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={ticket.priority}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            handleQuickPriorityChange(
                              ticket.id,
                              e.target.value as SupportTicketPriority
                            )
                          }
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border cursor-pointer ${getPriorityBadge(
                            ticket.priority
                          )}`}
                        >
                          <option value="LOW">LOW</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HIGH">HIGH</option>
                          <option value="URGENT">URGENT</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={ticket.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            handleQuickStatusChange(
                              ticket.id,
                              e.target.value as SupportTicketStatus
                            )
                          }
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border cursor-pointer ${getStatusBadge(
                            ticket.status
                          )}`}
                        >
                          <option value="OPEN">OPEN</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="RESOLVED">RESOLVED</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-stone-500 text-[11px]">
                        <div>{new Date(ticket.updatedAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-stone-400">
                          {ticket.messages.length} msg{ticket.messages.length > 1 ? 's' : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTicket(ticket);
                          }}
                          className="inline-flex items-center gap-1 bg-stone-900 hover:bg-black text-white font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADMIN TICKET RESPONSE & AUDIT MODAL */}
      {selectedTicket && (
        <div
          id="modal-admin-ticket-detail"
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-fadeIn my-8 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold bg-stone-800 px-2 py-0.5 rounded text-emerald-400">
                    {selectedTicket.id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${getStatusBadge(
                      selectedTicket.status
                    )}`}
                  >
                    {selectedTicket.status.replace('_', ' ')}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPriorityBadge(
                      selectedTicket.priority
                    )}`}
                  >
                    {selectedTicket.priority} Priority
                  </span>
                  <span className="text-[10px] font-semibold bg-stone-800 text-stone-300 px-2 py-0.5 rounded">
                    {selectedTicket.category}
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-white leading-tight">
                  {selectedTicket.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-bar with User Details & Property info */}
            <div className="bg-stone-50 border-b border-stone-200 px-6 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-stone-700 shrink-0">
              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase">Submitting User</div>
                <div className="font-bold text-stone-900">{selectedTicket.userName}</div>
                <div className="text-[11px] text-stone-500 flex items-center gap-1">
                  <span className="font-semibold text-emerald-800">[{selectedTicket.userRole}]</span>
                  <span>{selectedTicket.userEmail}</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase">Contact Phone</div>
                <div className="font-medium text-stone-800">{selectedTicket.userPhone || 'Not provided'}</div>
                <div className="text-[11px] text-stone-400">Filed: {new Date(selectedTicket.createdAt).toLocaleDateString()}</div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase">Property Attachment</div>
                <div className="font-medium text-stone-800 truncate">
                  {selectedTicket.propertyTitle ? selectedTicket.propertyTitle : 'None (General Inquiry)'}
                </div>
                {selectedTicket.propertyId && (
                  <div className="text-[10px] font-mono text-stone-400">ID: {selectedTicket.propertyId}</div>
                )}
              </div>
            </div>

            {/* Conversation Messages Thread */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-stone-100/50">
              {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                selectedTicket.messages.map((msg, idx) => {
                  const isAdmin = msg.senderRole === 'ADMIN';

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 text-[11px] text-stone-500 font-medium">
                        <span className="font-bold text-stone-800">{msg.senderName}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isAdmin
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isAdmin ? 'ADMIN DESK' : msg.senderRole}
                        </span>
                        <span>• {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`p-4 rounded-2xl max-w-lg text-xs leading-relaxed ${
                          isAdmin
                            ? 'bg-purple-900 text-white rounded-tr-xs shadow-xs'
                            : 'bg-white border border-stone-200 text-stone-900 rounded-tl-xs shadow-xs'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-white rounded-xl text-xs text-stone-700 border border-stone-200">
                  {selectedTicket.description}
                </div>
              )}
            </div>

            {/* Admin Response & Action Box */}
            <form
              onSubmit={handleSendAdminResponse}
              className="p-5 bg-white border-t border-stone-200 shrink-0 space-y-3"
            >
              {/* Quick Template Selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-stone-700">
                  Compose Admin Response / Quick Templates:
                </label>

                <select
                  id="admin-template-picker"
                  value={selectedTemplate}
                  onChange={(e) => {
                    setSelectedTemplate(e.target.value);
                    handleApplyTemplate(e.target.value);
                  }}
                  className="text-[11px] font-medium border border-stone-300 rounded-lg px-2.5 py-1 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                >
                  <option value="">-- Load Quick Response Template --</option>
                  {QUICK_TEMPLATES.map((tmpl) => (
                    <option key={tmpl.label} value={tmpl.text}>
                      {tmpl.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Text Input */}
              <textarea
                id="admin-ticket-response-input"
                rows={3}
                placeholder="Type official response to user. Dispatches instant in-app notification to the landlord/agent..."
                value={adminReplyText}
                onChange={(e) => setAdminReplyText(e.target.value)}
                className="w-full text-xs border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
              />

              {/* Status & Action Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                      Set Status:
                    </label>
                    <select
                      id="admin-update-ticket-status"
                      value={targetStatus}
                      onChange={(e) => setTargetStatus(e.target.value as SupportTicketStatus)}
                      className="text-xs font-bold border border-stone-300 rounded-xl px-3 py-1.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                      Internal Admin Notes (Optional):
                    </label>
                    <input
                      id="admin-ticket-notes"
                      type="text"
                      placeholder="e.g. Officer Udofia assigned for site check"
                      value={adminNotesText}
                      onChange={(e) => setAdminNotesText(e.target.value)}
                      className="text-xs border border-stone-300 rounded-xl px-3 py-1.5 text-stone-900 w-48 sm:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
                  >
                    Close Window
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReply}
                    className="px-4 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingReply ? 'Dispatching...' : 'Dispatch Reply & Update'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
