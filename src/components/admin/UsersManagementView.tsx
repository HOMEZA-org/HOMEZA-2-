import React, { useState } from 'react';
import {
  Ban,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Mail,
  MapPin,
  Phone,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { AgentUser, LandlordUser, User as UserType } from '../../types';
import { Store } from '../../services/store';

interface UsersManagementViewProps {
  users: UserType[];
  filterRole?: 'ALL' | 'TENANT' | 'LANDLORD' | 'AGENT' | 'ADMIN';
  onInspectUser?: (user: UserType) => void;
  onReviewLandlord?: (landlord: LandlordUser) => void;
  onReviewAgent?: (agent: AgentUser) => void;
}

export const UsersManagementView: React.FC<UsersManagementViewProps> = ({
  users,
  filterRole = 'ALL',
  onInspectUser,
  onReviewLandlord,
  onReviewAgent,
}) => {
  const [roleFilter, setRoleFilter] = useState<string>(filterRole);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phoneNumber.includes(q)
      );
    }
    return true;
  });

  const handleVerifyLandlord = (userId: string) => {
    Store.updateUserVerification(userId, 'VERIFIED');
  };

  const handleSuspendLandlord = (userId: string) => {
    Store.updateUserVerification(userId, 'REJECTED');
  };

  const handleVerifyAgent = (userId: string) => {
    Store.approveAgent(userId, 'HOMEZA Admin');
  };

  const handleSuspendAgent = (userId: string) => {
    Store.rejectAgent(userId, 'Account suspended by platform administration', 'HOMEZA Admin');
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900">User Directory &amp; KYC Verification</h2>
          <p className="text-sm sm:text-base text-stone-600 mt-1">
            Manage tenant accounts, landlord credentials, agent intermediaries, and administrative permissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user name, email, phone..."
              className="text-sm sm:text-base border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 bg-white w-64 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-stone-900"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-stone-200 text-sm overflow-x-auto">
            {['ALL', 'TENANT', 'LANDLORD', 'AGENT', 'ADMIN'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3.5 py-2 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                  roleFilter === r
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-xs">
              <tr>
                <th className="py-4 px-5">User</th>
                <th className="py-4 px-5">Role</th>
                <th className="py-4 px-5">Contact Info</th>
                <th className="py-4 px-5">Status / KYC</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredUsers.map((user) => {
                const isLandlord = user.role === 'LANDLORD';
                const landlordUser = isLandlord ? (user as LandlordUser) : null;
                const isAgent = user.role === 'AGENT';
                const agentUser = isAgent ? (user as AgentUser) : null;

                return (
                  <tr key={user.id} className="hover:bg-stone-50/70 transition">
                    {/* User */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={
                            user.avatarUrl ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                          }
                          alt={user.fullName}
                          className="w-11 h-11 rounded-full object-cover border border-stone-200 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-stone-950 text-base">
                            {user.fullName}
                          </div>
                          <div className="text-xs text-stone-500 font-medium mt-0.5">
                            Joined {new Date(user.createdAt).toLocaleDateString('en-NG')}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-3 py-1.5 rounded-full text-xs uppercase tracking-wider ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : user.role === 'LANDLORD'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : user.role === 'AGENT'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="py-4 px-5">
                      <div className="space-y-0.5">
                        <div className="text-stone-900 font-medium text-sm sm:text-base">{user.email}</div>
                        <div className="text-stone-600 text-xs sm:text-sm">{user.phoneNumber}</div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5">
                      {isLandlord && landlordUser ? (
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md ${
                              landlordUser.verificationStatus === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-900'
                                : landlordUser.verificationStatus === 'REJECTED'
                                ? 'bg-red-100 text-red-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {landlordUser.verificationStatus === 'VERIFIED' ? (
                              <>
                                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                                <span>Verified Landlord</span>
                              </>
                            ) : landlordUser.verificationStatus === 'REJECTED' ? (
                              <>
                                <Ban className="w-4 h-4 text-red-700" />
                                <span>Suspended</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-4 h-4 text-amber-700" />
                                <span>Pending Review</span>
                              </>
                            )}
                          </span>
                          {landlordUser.idCardNumber && (
                            <div className="text-xs text-stone-500 font-medium">
                              {landlordUser.idCardType || 'ID'}: {landlordUser.idCardNumber}
                            </div>
                          )}
                        </div>
                      ) : isAgent && agentUser ? (
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md ${
                              agentUser.verificationStatus === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-900'
                                : agentUser.verificationStatus === 'SUSPENDED'
                                ? 'bg-red-100 text-red-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {agentUser.verificationStatus === 'APPROVED' || agentUser.verificationStatus === 'VERIFIED' ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                                <span>Approved Agent</span>
                              </>
                            ) : agentUser.verificationStatus === 'AGENT_CORRECTION_REQUIRED' || agentUser.verificationStatus === 'CORRECTION_REQUIRED' ? (
                              <>
                                <Clock className="w-4 h-4 text-blue-700" />
                                <span>Correction Required</span>
                              </>
                            ) : agentUser.verificationStatus === 'REJECTED' || agentUser.verificationStatus === 'SUSPENDED' ? (
                              <>
                                <XCircle className="w-4 h-4 text-red-700" />
                                <span>{agentUser.verificationStatus === 'REJECTED' ? 'Rejected' : 'Suspended'}</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-4 h-4 text-amber-700" />
                                <span>Pending Approval</span>
                              </>
                            )}
                          </span>
                          {agentUser.agencyName && (
                            <div className="text-xs text-stone-500 font-medium">
                              {agentUser.agencyName} • {agentUser.operatingArea || 'Uyo'}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-emerald-800 font-semibold text-sm flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Active User</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {onInspectUser && (user.role === 'TENANT' || user.role === 'LANDLORD') && (
                          <button
                            id={`btn-inspect-user-${user.id}`}
                            type="button"
                            onClick={() => onInspectUser(user)}
                            className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer"
                            title={`Inspect ${user.role === 'TENANT' ? 'Tenant' : 'Landlord'} Experience`}
                          >
                            <Eye className="w-3.5 h-3.5 text-purple-700" />
                            <span>Inspect View</span>
                          </button>
                        )}

                        {isLandlord && landlordUser && (
                          <>
                            {onReviewLandlord ? (
                              <button
                                type="button"
                                id={`btn-inspect-landlord-kyc-${user.id}`}
                                onClick={() => onReviewLandlord(landlordUser)}
                                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                                <span>Inspect KYC</span>
                              </button>
                            ) : landlordUser.verificationStatus !== 'VERIFIED' && (
                              <button
                                type="button"
                                onClick={() => handleVerifyLandlord(user.id)}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Verify</span>
                              </button>
                            )}
                            {landlordUser.verificationStatus !== 'REJECTED' && (
                              <button
                                type="button"
                                onClick={() => handleSuspendLandlord(user.id)}
                                className="px-3 py-1.5 bg-stone-100 hover:bg-red-50 text-red-700 rounded-xl text-xs sm:text-sm font-semibold transition border border-stone-200 cursor-pointer"
                              >
                                Suspend
                              </button>
                            )}
                          </>
                        )}

                        {isAgent && agentUser && (
                          <>
                            {onReviewAgent ? (
                              <button
                                type="button"
                                id={`btn-inspect-agent-kyc-${user.id}`}
                                onClick={() => onReviewAgent(agentUser)}
                                className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-blue-700" />
                                <span>Inspect KYC</span>
                              </button>
                            ) : agentUser.verificationStatus !== 'VERIFIED' && (
                              <button
                                type="button"
                                onClick={() => handleVerifyAgent(user.id)}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verify Agent</span>
                              </button>
                            )}
                            {agentUser.verificationStatus !== 'SUSPENDED' && (
                              <button
                                type="button"
                                onClick={() => handleSuspendAgent(user.id)}
                                className="px-3 py-1.5 bg-stone-100 hover:bg-red-50 text-red-700 rounded-xl text-xs sm:text-sm font-semibold transition border border-stone-200 cursor-pointer"
                              >
                                Suspend
                              </button>
                            )}
                          </>
                        )}
                      </div>
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
