import React, { useState } from 'react';
import { CheckCircle2, MapPin, Plus, Power, Trash2 } from 'lucide-react';
import { LocationArea, Property } from '../../types';
import { Store } from '../../services/store';

interface LocationsManagementViewProps {
  locations: LocationArea[];
  properties?: Property[];
}

export const LocationsManagementView: React.FC<LocationsManagementViewProps> = ({
  locations,
  properties = Store.getProperties(),
}) => {
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaType, setNewAreaType] = useState<'ESTATE' | 'MAJOR_ROAD' | 'NEIGHBOURHOOD' | 'COMMERCIAL'>(
    'ESTATE'
  );
  const [isAdding, setIsAdding] = useState(false);

  const handleAddArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;

    const newLoc: LocationArea = {
      id: 'loc-' + Date.now(),
      name: newAreaName.trim(),
      city: 'Uyo',
      state: 'Akwa Ibom State',
      type: newAreaType,
      isActive: true,
    };

    Store.addLocation(newLoc);
    setNewAreaName('');
    setIsAdding(false);
  };

  const handleToggleActive = (locId: string, current: boolean) => {
    Store.updateLocationStatus(locId, !current);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Uyo Location & Neighbourhood Master List</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure residential zones, government estates, commercial streets, and suburban areas in Uyo, Akwa Ibom.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Neighbourhood</span>
        </button>
      </div>

      {/* Add New Area Inline Form */}
      {isAdding && (
        <form
          onSubmit={handleAddArea}
          className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-4 animate-fadeIn"
        >
          <h3 className="font-bold text-stone-900 text-xs uppercase tracking-wider">
            Add Area / Zone to Uyo Directory
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Neighbourhood / Estate Name
              </label>
              <input
                type="text"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="e.g. Banking District, Brooks Street, Nwaniba Road"
                required
                className="w-full text-xs border border-stone-300 rounded-xl px-3 py-2 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Zone Type</label>
              <select
                id="select-zone-type"
                value={newAreaType}
                onChange={(e) => setNewAreaType(e.target.value as any)}
                className="w-full text-base sm:text-xs border border-stone-300 rounded-xl px-3.5 py-2.5 sm:px-3 sm:py-2 bg-white text-stone-900 min-h-[44px] sm:min-h-[38px] cursor-pointer"
              >
                <option value="ESTATE">Gated Estate / Housing</option>
                <option value="MAJOR_ROAD">Major Road Corridor</option>
                <option value="NEIGHBOURHOOD">Residential Neighbourhood</option>
                <option value="COMMERCIAL">Commercial / Hub</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-1.5 rounded-lg"
            >
              Save Area
            </button>
          </div>
        </form>
      )}

      {/* Locations Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Neighbourhood</th>
                <th className="py-3.5 px-4">Zone Type</th>
                <th className="py-3.5 px-4">City / State</th>
                <th className="py-3.5 px-4">Active Properties</th>
                <th className="py-3.5 px-4">Visibility Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {locations.map((loc) => {
                const count = properties.filter((p) => p.location.area === loc.name).length;

                return (
                  <tr key={loc.id} className="hover:bg-stone-50/50 transition">
                    <td className="py-3.5 px-4 font-bold text-stone-900 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{loc.name}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {loc.type}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-stone-600">
                      {loc.city}, {loc.state}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-emerald-800">
                      {count} {count === 1 ? 'property' : 'properties'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          loc.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {loc.isActive ? 'Active (Searchable)' : 'Disabled'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleActive(loc.id, loc.isActive)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                          loc.isActive
                            ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold'
                        }`}
                      >
                        {loc.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
