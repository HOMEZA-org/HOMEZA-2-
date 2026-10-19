import React, { useEffect, useState } from 'react';
import {
  AgentClient,
  AgentUser,
  Property,
} from '../../types';
import { Store } from '../../services/store';
import {
  Building2,
  CheckCircle2,
  Eye,
  Home,
  Layers,
  MapPin,
  Plus,
  Shield,
  Trash2,
  User,
  UserCheck,
  X,
} from 'lucide-react';

interface AgentAssistedPropertiesViewProps {
  agent: AgentUser;
  properties: Property[];
  onViewProperty: (prop: Property) => void;
  onNavigateToSearch: () => void;
}

export const AgentAssistedPropertiesView: React.FC<AgentAssistedPropertiesViewProps> = ({
  agent,
  properties,
  onViewProperty,
  onNavigateToSearch,
}) => {
  const [clients, setClients] = useState<AgentClient[]>(() => Store.getAgentClients(agent.id));
  const [selectedPropForClient, setSelectedPropForClient] = useState<Property | null>(null);
  const [assistedProps, setAssistedProps] = useState<Property[]>(() => Store.getAssistedPropertiesByAgent(agent.id));

  const refreshData = () => {
    setClients(Store.getAgentClients(agent.id));
    setAssistedProps(Store.getAssistedPropertiesByAgent(agent.id));
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = Store.subscribe(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, [agent.id]);

  const handleLinkClientToProp = (clientId: string, propertyId: string) => {
    Store.assignPropertyToClient(clientId, propertyId, agent.id);
    refreshData();
    setSelectedPropForClient(null);
  };

  const handleRemoveAssistedProp = (propertyId: string) => {
    if (confirm('Remove this property from your assisted portfolio?')) {
      Store.removeAssistedPropertyFromAgent(propertyId, agent.id);
      refreshData();
    }
  };

  return (
    <div id="agent-assisted-properties-view" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2.5">
            <Layers className="w-8 h-8 text-emerald-700" />
            Assisted Properties
          </h1>
          <p className="text-stone-600 text-base mt-1">
            Properties you are actively matching, inspecting, or advisory-assisting for your prospective tenant clients.
          </p>
        </div>

        <button
          id="browse-marketplace-btn"
          onClick={onNavigateToSearch}
          className="inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 rounded-xl text-base font-semibold transition cursor-pointer shadow-sm shrink-0"
        >
          <Home className="w-5 h-5" />
          Browse Marketplace Listings
        </button>
      </div>

      {/* Intermediary Scope Callout */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-950 text-xs sm:text-sm">
        <Shield className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-emerald-900">
            Ownership & Verification Notice
          </p>
          <p className="text-emerald-800 mt-0.5">
            Assisted properties remain officially registered, verified, and managed by their respective verified Landlords.
            As an agent intermediary, you assist clients with discovery, visits, and application preparation.
          </p>
        </div>
      </div>

      {/* Properties Grid */}
      {assistedProps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-stone-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-stone-900 mb-1">No Assisted Properties Yet</h2>
          <p className="text-stone-600 text-sm max-w-md mx-auto mb-6">
            Search verified listings in Uyo and link them to your clients or add them to your assisted portfolio.
          </p>
          <button
            onClick={onNavigateToSearch}
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Explore Properties
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {assistedProps.map((prop) => {
            const linkedClients = clients.filter((c) =>
              (c.assignedPropertyIds || []).includes(prop.id)
            );

            return (
              <div
                key={prop.id}
                id={`assisted-prop-card-${prop.id}`}
                className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden flex flex-col justify-between hover:border-stone-300 transition"
              >
                <div>
                  <div className="relative h-48 sm:h-52 bg-stone-200 overflow-hidden">
                    <img
                      src={prop.images[0]?.url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80'}
                      alt={prop.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="bg-stone-900/90 text-white text-xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs">
                        {prop.propertyType}
                      </span>
                      {prop.isVerified && (
                        <span className="bg-emerald-700/95 text-white text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 backdrop-blur-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs text-stone-900 px-3 py-1.5 rounded-xl font-bold text-sm shadow-xs">
                      ₦{prop.pricing.rent.toLocaleString()}
                      <span className="text-xs font-normal text-stone-500">/{prop.pricing.rentalPeriod === 'Per Month' ? 'mo' : prop.pricing.rentalPeriod === '2 Years' ? '2 yrs' : prop.pricing.rentalPeriod === 'Bi-Annual' ? '6mo' : 'yr'}</span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h2 className="text-lg font-bold text-stone-900 line-clamp-1">
                        {prop.title}
                      </h2>
                      <p className="text-xs text-stone-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        {prop.location.area}, {prop.location.city}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                      <span>
                        Landlord: <strong className="text-stone-900">{prop.landlordName}</strong>
                      </span>
                      <span>
                        Bedrooms: <strong className="text-stone-900">{prop.bedrooms}</strong>
                      </span>
                    </div>

                    {/* Linked Clients Pill Area */}
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-700 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                          Interested Clients ({linkedClients.length})
                        </span>
                        <button
                          onClick={() => setSelectedPropForClient(prop)}
                          className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 cursor-pointer"
                        >
                          + Link Client
                        </button>
                      </div>

                      {linkedClients.length === 0 ? (
                        <p className="text-xs text-stone-500 italic">
                          No specific client linked yet.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {linkedClients.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 bg-white border border-stone-200 text-stone-800 px-2 py-1 rounded-md text-xs font-medium shadow-2xs"
                            >
                              <User className="w-3 h-3 text-stone-400" />
                              {c.fullName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onViewProperty(prop)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-4 h-4 text-emerald-700" />
                    View Details
                  </button>

                  <button
                    onClick={() => setSelectedPropForClient(prop)}
                    className="flex-1 inline-flex items-center justify-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    Match Client
                  </button>

                  <button
                    onClick={() => handleRemoveAssistedProp(prop.id)}
                    className="p-2 rounded-xl bg-white border border-stone-300 hover:bg-red-50 text-stone-400 hover:text-red-700 transition cursor-pointer shadow-2xs"
                    title="Remove from assisted portfolio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Link Client Modal */}
      {selectedPropForClient && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h2 className="text-lg font-bold text-stone-900">
                  Link Client to Property
                </h2>
                <p className="text-xs text-stone-500 truncate max-w-sm mt-0.5">
                  {selectedPropForClient.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedPropForClient(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {clients.length === 0 ? (
                <div className="p-4 text-center text-sm text-stone-500">
                  You don't have any registered clients yet. Please add a client first.
                </div>
              ) : (
                clients.map((c) => {
                  const isAssigned = (c.assignedPropertyIds || []).includes(
                    selectedPropForClient.id
                  );

                  return (
                    <div
                      key={c.id}
                      className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-3 hover:bg-stone-100"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">{c.fullName}</h4>
                        <p className="text-xs text-stone-500">{c.phoneNumber}</p>
                      </div>

                      {isAssigned ? (
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                          Linked
                        </span>
                      ) : (
                        <button
                          onClick={() => handleLinkClientToProp(c.id, selectedPropForClient.id)}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Select Client
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-200">
              <button
                onClick={() => setSelectedPropForClient(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-medium transition cursor-pointer"
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
