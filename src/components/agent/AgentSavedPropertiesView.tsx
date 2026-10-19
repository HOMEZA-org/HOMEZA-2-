import React, { useState } from 'react';
import {
  AgentClient,
  AgentUser,
  Property,
} from '../../types';
import { Store } from '../../services/store';
import { useAuth } from '../../context/AuthContext';
import {
  Bookmark,
  Building2,
  CheckCircle2,
  Eye,
  Heart,
  Home,
  MapPin,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

interface AgentSavedPropertiesViewProps {
  agent: AgentUser;
  properties: Property[];
  onViewProperty: (prop: Property) => void;
  onNavigateToSearch: () => void;
}

export const AgentSavedPropertiesView: React.FC<AgentSavedPropertiesViewProps> = ({
  agent,
  properties,
  onViewProperty,
  onNavigateToSearch,
}) => {
  const { toggleSavedProperty, isPropertySaved } = useAuth();
  const [clients] = useState<AgentClient[]>(() => Store.getAgentClients(agent.id));
  const [selectedPropForClient, setSelectedPropForClient] = useState<Property | null>(null);

  // Saved properties list
  const savedProps = properties.filter((p) => (agent.savedPropertyIds || []).includes(p.id));

  const handleLinkClient = (clientId: string, propertyId: string) => {
    Store.assignPropertyToClient(clientId, propertyId, agent.id);
    setSelectedPropForClient(null);
  };

  return (
    <div id="agent-saved-properties-view" className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2.5">
            <Bookmark className="w-8 h-8 text-emerald-700" />
            Saved / Shortlisted Properties
          </h1>
          <p className="text-stone-600 text-base mt-1">
            Properties you have bookmarked for client recommendation and portfolio tracking.
          </p>
        </div>

        <button
          onClick={onNavigateToSearch}
          className="inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 rounded-xl text-base font-semibold transition cursor-pointer shadow-sm shrink-0"
        >
          <Home className="w-5 h-5" />
          Find More Properties
        </button>
      </div>

      {/* Grid of Saved Properties */}
      {savedProps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <Bookmark className="w-12 h-12 text-stone-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-stone-900 mb-1">No Saved Properties</h2>
          <p className="text-stone-600 text-sm max-w-md mx-auto mb-6">
            You haven't bookmarked any listings yet. Browse public marketplace properties in Uyo and save the ones that fit your clients.
          </p>
          <button
            onClick={onNavigateToSearch}
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Explore Marketplace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedProps.map((prop) => (
            <div
              key={prop.id}
              id={`saved-prop-card-${prop.id}`}
              className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden flex flex-col justify-between hover:border-stone-300 transition"
            >
              <div>
                <div className="relative h-48 bg-stone-200 overflow-hidden">
                  <img
                    src={prop.images[0]?.url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80'}
                    alt={prop.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-stone-900/90 text-white text-xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs">
                      {prop.propertyType}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleSavedProperty(prop.id)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/90 text-red-600 hover:bg-white transition cursor-pointer shadow-xs"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs text-stone-900 px-3 py-1 rounded-xl font-bold text-sm shadow-xs">
                    ₦{prop.pricing.rent.toLocaleString()}
                    <span className="text-xs font-normal text-stone-500">/{prop.pricing.rentalPeriod === 'Per Month' ? 'mo' : prop.pricing.rentalPeriod === '2 Years' ? '2 yrs' : prop.pricing.rentalPeriod === 'Bi-Annual' ? '6mo' : 'yr'}</span>
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <h2 className="text-base font-bold text-stone-900 line-clamp-1">{prop.title}</h2>
                  <p className="text-xs text-stone-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    {prop.location.area}, {prop.location.city}
                  </p>
                  <p className="text-xs text-stone-600 line-clamp-2 mt-1">
                    {prop.description}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
                <button
                  onClick={() => onViewProperty(prop)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Match Client Modal */}
      {selectedPropForClient && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h2 className="text-lg font-bold text-stone-900">
                  Assign to Client
                </h2>
                <p className="text-xs text-stone-500 truncate max-w-sm">
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
                clients.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-3 hover:bg-stone-100"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-stone-900">{c.fullName}</h4>
                      <p className="text-xs text-stone-500">{c.phoneNumber}</p>
                    </div>

                    <button
                      onClick={() => handleLinkClient(c.id, selectedPropForClient.id)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      Assign
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-200">
              <button
                onClick={() => setSelectedPropForClient(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
