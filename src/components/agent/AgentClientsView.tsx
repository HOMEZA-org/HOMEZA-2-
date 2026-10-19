import React, { useEffect, useState } from 'react';
import {
  AgentClient,
  AgentUser,
  LocationArea,
  Property,
} from '../../types';
import { Store } from '../../services/store';
import {
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  Eye,
  FilePlus,
  Home,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';

interface AgentClientsViewProps {
  agent: AgentUser;
  properties: Property[];
  locations: LocationArea[];
  onViewProperty: (prop: Property) => void;
}

export const AgentClientsView: React.FC<AgentClientsViewProps> = ({
  agent,
  properties,
  locations,
  onViewProperty,
}) => {
  const [clients, setClients] = useState<AgentClient[]>(() => Store.getAgentClients(agent.id));
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setClients(Store.getAgentClients(agent.id));
    const unsubscribe = Store.subscribe(() => {
      setClients(Store.getAgentClients(agent.id));
    });
    return () => unsubscribe();
  }, [agent.id]);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<AgentClient | null>(null);
  const [selectedClientForAssign, setSelectedClientForAssign] = useState<AgentClient | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [budgetMin, setBudgetMin] = useState<string>('');
  const [budgetMax, setBudgetMax] = useState<string>('');
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [preferredPropertyTypes, setPreferredPropertyTypes] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<AgentClient['status']>('ACTIVE');

  // Refresh helper
  const reloadClients = () => {
    setClients(Store.getAgentClients(agent.id));
  };

  const handleOpenAddModal = () => {
    setEditingClient(null);
    setFullName('');
    setPhoneNumber('');
    setEmail('');
    setBudgetMin('');
    setBudgetMax('');
    setPreferredLocations([]);
    setPreferredPropertyTypes([]);
    setNotes('');
    setStatus('ACTIVE');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (c: AgentClient) => {
    setEditingClient(c);
    setFullName(c.fullName);
    setPhoneNumber(c.phoneNumber);
    setEmail(c.email);
    setBudgetMin(c.budgetMin ? String(c.budgetMin) : '');
    setBudgetMax(c.budgetMax ? String(c.budgetMax) : '');
    setPreferredLocations(c.preferredLocations || []);
    setPreferredPropertyTypes(c.preferredPropertyTypes || []);
    setNotes(c.notes || '');
    setStatus(c.status);
    setIsAddModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phoneNumber.trim()) {
      alert('Please fill in client name and phone number.');
      return;
    }

    const nowIso = new Date().toISOString();
    if (editingClient) {
      const updated: AgentClient = {
        ...editingClient,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
        budgetMax: budgetMax ? Number(budgetMax) : undefined,
        preferredLocations,
        preferredPropertyTypes,
        notes: notes.trim(),
        status,
        updatedAt: nowIso,
      };
      Store.updateAgentClient(updated);
    } else {
      const newClient: AgentClient = {
        id: 'client-' + Date.now(),
        agentId: agent.id,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
        budgetMax: budgetMax ? Number(budgetMax) : undefined,
        preferredLocations,
        preferredPropertyTypes,
        notes: notes.trim(),
        status,
        assignedPropertyIds: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      Store.addAgentClient(newClient);
    }

    setIsAddModalOpen(false);
    reloadClients();
  };

  const handleDeleteClient = (clientId: string, clientName: string) => {
    if (window.confirm(`Are you sure you want to delete client record "${clientName}"?`)) {
      Store.deleteAgentClient(clientId);
      reloadClients();
      if (expandedClientId === clientId) {
        setExpandedClientId(null);
      }
    }
  };

  const handleAssignProperty = (clientId: string, propertyId: string) => {
    Store.assignPropertyToClient(clientId, propertyId, agent.id);
    reloadClients();
    setSelectedClientForAssign(null);
  };

  const handleRemoveAssignedProperty = (clientId: string, propertyId: string) => {
    Store.removePropertyFromClient(clientId, propertyId, agent.id);
    reloadClients();
  };

  const filteredClients = clients.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.fullName.toLowerCase().includes(q);
      const matchPhone = c.phoneNumber.includes(q);
      const matchEmail = c.email.toLowerCase().includes(q);
      const matchNotes = (c.notes || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchEmail || matchNotes;
    }
    return true;
  });

  const getStatusBadge = (st: AgentClient['status']) => {
    switch (st) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Active Client
          </span>
        );
      case 'IN_SEARCH':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            Searching Rentals
          </span>
        );
      case 'APPLICATION_SUBMITTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            Application Filed
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            Lease Completed
          </span>
        );
      case 'INACTIVE':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-stone-200 text-stone-700 border border-stone-300">
            Inactive
          </span>
        );
    }
  };

  const publicApprovedProperties = properties.filter(
    (p) => p.status === 'AVAILABLE' || p.status === 'APPROVED' || p.status === 'RENTED'
  );

  return (
    <div id="agent-clients-view" className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2.5">
            <UserCheck className="w-8 h-8 text-emerald-700" />
            Client Directory
          </h1>
          <p className="text-stone-600 text-base mt-1">
            Manage your prospective tenant clients, track rental preferences, and match listings across Uyo.
          </p>
        </div>

        <button
          id="add-new-client-btn"
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 rounded-xl text-base font-semibold transition cursor-pointer shadow-sm shrink-0"
        >
          <UserPlus className="w-5 h-5" />
          Add New Client
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search clients by name, phone, email, or requirements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-700 text-sm shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['ALL', 'ACTIVE', 'IN_SEARCH', 'APPLICATION_SUBMITTED', 'COMPLETED', 'INACTIVE'] as const).map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {st === 'ALL' ? 'All Clients' : st.replace('_', ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Client List Cards */}
      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <User className="w-12 h-12 text-stone-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-stone-900 mb-1">No Clients Found</h2>
          <p className="text-stone-600 text-sm max-w-md mx-auto mb-6">
            {searchQuery
              ? 'No client records match your current search criteria.'
              : 'You have not added any clients to your directory yet.'}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add First Client
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClients.map((client) => {
            const isExpanded = expandedClientId === client.id;
            const assignedProps = properties.filter((p) =>
              (client.assignedPropertyIds || []).includes(p.id)
            );

            return (
              <div
                key={client.id}
                id={`client-card-${client.id}`}
                className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden transition hover:border-stone-300"
              >
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-xl font-bold text-stone-900">{client.fullName}</h2>
                      {getStatusBadge(client.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-stone-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Phone className="w-4 h-4 text-emerald-700" />
                        {client.phoneNumber}
                      </span>
                      {client.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-stone-400" />
                          {client.email}
                        </span>
                      )}
                      {(client.budgetMin || client.budgetMax) && (
                        <span className="font-semibold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md">
                          Budget: ₦{(client.budgetMin || 0).toLocaleString()} – ₦
                          {(client.budgetMax || 0).toLocaleString()}/yr
                        </span>
                      )}
                    </div>

                    {client.notes && (
                      <p className="text-sm text-stone-600 line-clamp-1 italic bg-stone-50 p-2 rounded-lg border border-stone-100">
                        "{client.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                    <button
                      onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                      className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 px-3.5 py-2 rounded-xl text-sm font-semibold transition cursor-pointer"
                    >
                      <Home className="w-4 h-4 text-emerald-700" />
                      Assisted ({assignedProps.length})
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-stone-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-stone-500" />
                      )}
                    </button>

                    <button
                      onClick={() => setSelectedClientForAssign(client)}
                      className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-xl text-sm font-semibold transition cursor-pointer"
                      title="Assign property listing to this client"
                    >
                      <Plus className="w-4 h-4" />
                      Match Property
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(client)}
                      className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                      title="Edit client details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteClient(client.id, client.fullName)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                      title="Delete client record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Section: Assigned Assisted Properties & Details */}
                {isExpanded && (
                  <div className="border-t border-stone-200 bg-stone-50/80 p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                        <Home className="w-4 h-4 text-emerald-700" />
                        Assisted Properties for {client.fullName} ({assignedProps.length})
                      </h3>
                      <button
                        onClick={() => setSelectedClientForAssign(client)}
                        className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 hover:underline cursor-pointer"
                      >
                        + Add Another Property
                      </button>
                    </div>

                    {assignedProps.length === 0 ? (
                      <div className="p-4 bg-white rounded-xl border border-stone-200 text-center text-sm text-stone-500">
                        No property listings currently attached to this client. Click{' '}
                        <strong className="text-emerald-800 cursor-pointer" onClick={() => setSelectedClientForAssign(client)}>
                          Match Property
                        </strong>{' '}
                        to link a listing.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {assignedProps.map((prop) => (
                          <div
                            key={prop.id}
                            className="bg-white p-3.5 rounded-xl border border-stone-200 flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <img
                                src={prop.images[0]?.url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&auto=format&fit=crop&q=80'}
                                alt={prop.title}
                                className="w-14 h-14 rounded-lg object-cover shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="truncate">
                                <h4 className="font-bold text-stone-900 text-sm truncate">{prop.title}</h4>
                                <p className="text-xs text-stone-500 truncate flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                                  {prop.location.area}, {prop.location.city}
                                </p>
                                <p className="text-xs font-bold text-emerald-800 mt-0.5">
                                  ₦{prop.pricing.rent.toLocaleString()}/{prop.pricing.rentalPeriod === 'Per Month' ? 'mo' : prop.pricing.rentalPeriod === '2 Years' ? '2 yrs' : prop.pricing.rentalPeriod === 'Bi-Annual' ? '6mo' : 'yr'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => onViewProperty(prop)}
                                className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition cursor-pointer"
                                title="View full property details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveAssignedProperty(client.id, prop.id)}
                                className="p-1.5 bg-stone-100 hover:bg-red-100 text-stone-400 hover:text-red-700 rounded-lg transition cursor-pointer"
                                title="Unassign from this client"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Client Preferences Summary */}
                    {(client.preferredLocations?.length || client.preferredPropertyTypes?.length) && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-stone-600">
                        <span className="font-semibold text-stone-700">Preferences:</span>
                        {client.preferredLocations?.map((loc) => (
                          <span key={loc} className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                            {loc}
                          </span>
                        ))}
                        {client.preferredPropertyTypes?.map((typ) => (
                          <span key={typ} className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md font-medium">
                            {typ}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-xl w-full p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-emerald-700" />
                {editingClient ? 'Edit Client Record' : 'Register New Client'}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">
                    Client Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Akanimo Udofia"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">
                    Client Status
                  </label>
                  <select
                    id="select-client-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AgentClient['status'])}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 bg-white focus:ring-2 focus:ring-emerald-700 text-base sm:text-sm min-h-[44px] cursor-pointer"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="IN_SEARCH">Searching for Rentals</option>
                    <option value="APPLICATION_SUBMITTED">Application Submitted</option>
                    <option value="COMPLETED">Lease Completed</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">
                    Min Budget (₦/yr)
                  </label>
                  <input
                    type="number"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder="e.g. 500000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">
                    Max Budget (₦/yr)
                  </label>
                  <input
                    type="number"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="e.g. 2000000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-700 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">
                  Internal Notes / Specific Requirements
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Needs 24/7 power, borehole water, detached duplex with BQ in Ewet Housing..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-700 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer shadow-sm"
                >
                  {editingClient ? 'Update Client' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Property Assignment Modal */}
      {selectedClientForAssign && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-2xl w-full p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  Match Property for {selectedClientForAssign.fullName}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Select a verified public listing to link to this client.
                </p>
              </div>
              <button
                onClick={() => setSelectedClientForAssign(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
              {publicApprovedProperties.map((prop) => {
                const isAlreadyAssigned = (
                  selectedClientForAssign.assignedPropertyIds || []
                ).includes(prop.id);

                return (
                  <div
                    key={prop.id}
                    className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-3 hover:bg-stone-100/70 transition"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img
                        src={prop.images[0]?.url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&auto=format&fit=crop&q=80'}
                        alt={prop.title}
                        className="w-14 h-14 rounded-lg object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="truncate">
                        <h4 className="font-bold text-stone-900 text-sm truncate">{prop.title}</h4>
                        <p className="text-xs text-stone-500 truncate">
                          {prop.location.area}, {prop.location.city} • {prop.propertyType}
                        </p>
                        <p className="text-xs font-bold text-emerald-800 mt-0.5">
                          ₦{prop.pricing.rent.toLocaleString()}/{prop.pricing.rentalPeriod === 'Per Month' ? 'mo' : prop.pricing.rentalPeriod === '2 Years' ? '2 yrs' : prop.pricing.rentalPeriod === 'Bi-Annual' ? '6mo' : 'yr'}
                        </p>
                      </div>
                    </div>

                    {isAlreadyAssigned ? (
                      <span className="text-xs font-bold text-stone-500 bg-stone-200 px-3 py-1.5 rounded-lg">
                        Linked
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAssignProperty(selectedClientForAssign.id, prop.id)}
                        className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Link Listing
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-200">
              <button
                onClick={() => setSelectedClientForAssign(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-sm font-medium transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
