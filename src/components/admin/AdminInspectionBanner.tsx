import React from 'react';
import { ArrowLeft, Eye, Shield, User, Users, Building2 } from 'lucide-react';
import { User as UserType } from '../../types';

interface AdminInspectionBannerProps {
  mode: 'tenant' | 'landlord';
  inspectedUser: UserType | null;
  availableUsers: UserType[];
  onExitInspection: () => void;
  onSwitchMode: (mode: 'tenant' | 'landlord') => void;
  onSelectUser: (userId?: string) => void;
}

export const AdminInspectionBanner: React.FC<AdminInspectionBannerProps> = ({
  mode,
  inspectedUser,
  availableUsers,
  onExitInspection,
  onSwitchMode,
  onSelectUser,
}) => {
  const isTenant = mode === 'tenant';
  const filteredUsers = availableUsers.filter((u) =>
    isTenant ? u.role === 'TENANT' : u.role === 'LANDLORD'
  );

  return (
    <div
      id="admin-inspection-banner"
      className="sticky top-0 z-50 bg-stone-950 text-white border-b-2 border-purple-500 shadow-xl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: View Mode Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/50 flex items-center justify-center text-purple-300 shrink-0">
              <Eye className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs sm:text-sm font-black uppercase tracking-wider bg-purple-900 text-purple-100 border border-purple-500 px-3 py-1 rounded-lg">
                  ADMIN INSPECTION MODE — {isTenant ? 'TENANT VIEW' : 'LANDLORD VIEW'}
                </span>
                <span className="text-xs text-stone-300 font-semibold hidden sm:inline">
                  (Read-Only Audit • Authenticated as Super Admin)
                </span>
              </div>
              <p className="text-sm text-stone-200 mt-1">
                Viewing platform as{' '}
                <strong className="text-purple-300 font-bold">
                  {inspectedUser?.fullName || (isTenant ? 'Sample Tenant' : 'Sample Landlord')}
                </strong>
                . Destructive actions are disabled during inspection.
              </p>
            </div>
          </div>

          {/* Right: Switch Mode, User Selector & Return Button */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Quick Switch between Tenant & Landlord */}
            <div className="flex items-center bg-stone-900 border border-stone-700 rounded-xl p-1">
              <button
                type="button"
                onClick={() => onSwitchMode('tenant')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                  isTenant ? 'bg-blue-600 text-white' : 'text-stone-300 hover:text-white'
                }`}
              >
                Tenant View
              </button>
              <button
                type="button"
                onClick={() => onSwitchMode('landlord')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                  !isTenant ? 'bg-amber-600 text-white' : 'text-stone-300 hover:text-white'
                }`}
              >
                Landlord View
              </button>
            </div>

            {/* User Switcher Dropdown */}
            {filteredUsers.length > 0 && (
              <div className="flex items-center gap-2 bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5">
                <span className="text-xs text-stone-400 hidden lg:inline font-medium">Account:</span>
                <select
                  id="select-inspected-user"
                  value={inspectedUser?.id || ''}
                  onChange={(e) => onSelectUser(e.target.value)}
                  aria-label="Select account to inspect"
                  className="bg-stone-900 text-xs sm:text-sm font-semibold text-purple-200 focus:outline-none cursor-pointer pr-1"
                >
                  {filteredUsers.map((u) => (
                    <option key={u.id} value={u.id} className="bg-stone-900 text-white">
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Return to Admin Control Center */}
            <button
              id="btn-return-to-admin"
              type="button"
              onClick={onExitInspection}
              className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-sm px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer border border-purple-400"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

