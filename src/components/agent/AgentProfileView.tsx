import React, { useState } from 'react';
import {
  AgentUser,
  AgentVerificationStatus,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  User,
  XCircle,
} from 'lucide-react';

interface AgentProfileViewProps {
  agent: AgentUser;
}

export const AgentProfileView: React.FC<AgentProfileViewProps> = ({ agent }) => {
  const { updateCurrentUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(agent.fullName);
  const [phoneNumber, setPhoneNumber] = useState(agent.phoneNumber);
  const [agencyName, setAgencyName] = useState(agent.agencyName || '');
  const [operatingArea, setOperatingArea] = useState(agent.operatingArea || '');
  const [cacNumber, setCacNumber] = useState(agent.cacNumber || '');
  const [licenseNumber, setLicenseNumber] = useState(agent.licenseNumber || '');
  const [bio, setBio] = useState(agent.bio || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUserProfile({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      agencyName: agencyName.trim(),
      operatingArea: operatingArea.trim(),
      cacNumber: cacNumber.trim(),
      licenseNumber: licenseNumber.trim(),
      bio: bio.trim(),
    });
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const getStatusBadge = (status: AgentVerificationStatus) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            Verified Agent
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-300">
            <XCircle className="w-4 h-4 text-red-700" />
            Account Suspended
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-4 h-4 text-amber-700" />
            Pending Verification
          </span>
        );
    }
  };

  return (
    <div id="agent-profile-view" className="space-y-6 max-w-4xl mx-auto">
      {/* Verification Notice Banner */}
      {agent.verificationStatus === 'PENDING' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 text-amber-900">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="font-bold text-base text-amber-950">Verification in Progress</h2>
            <p className="text-sm text-amber-800 leading-relaxed">
              Your intermediary agent profile is currently awaiting verification by the HOMEZA compliance team.
              You can still create client files, bookmark properties, and search marketplace listings.
            </p>
          </div>
        </div>
      )}

      {agent.verificationStatus === 'VERIFIED' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4 text-emerald-900">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="font-bold text-base text-emerald-950">Verified Intermediary Agent</h2>
            <p className="text-sm text-emerald-800 leading-relaxed">
              Your profile has been vetted by HOMEZA administration. You have full access to client management and assisted rental tools.
            </p>
          </div>
        </div>
      )}

      {agent.verificationStatus === 'SUSPENDED' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4 text-red-900">
          <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="font-bold text-base text-red-950">Agent Account Suspended</h2>
            <p className="text-sm text-red-800 leading-relaxed">
              This agent account has been temporarily flagged or suspended by administration. Please contact HOMEZA support for assistance.
            </p>
          </div>
        </div>
      )}

      {savedSuccess && (
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          Your agent profile details were updated successfully!
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="bg-stone-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-emerald-800 border-2 border-stone-700 shrink-0 flex items-center justify-center">
              {agent.avatarUrl ? (
                <img
                  src={agent.avatarUrl}
                  alt={agent.fullName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h1 className="text-2xl font-bold text-white">{agent.fullName}</h1>
                {getStatusBadge(agent.verificationStatus)}
              </div>
              <p className="text-stone-300 text-sm font-medium flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                {agent.agencyName || 'Independent Real Estate Intermediary'}
              </p>
              <p className="text-stone-400 text-xs mt-1">
                Member since {new Date(agent.createdAt).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {!isEditing && (
            <button
              id="edit-agent-profile-btn"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer self-start sm:self-auto shadow-sm"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>

        {/* Profile Content */}
        <div className="p-6 sm:p-8">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    Agency / Firm Name
                  </label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="e.g. Prime Akwa Realtors"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    Operating Coverage Area in Uyo
                  </label>
                  <input
                    type="text"
                    value={operatingArea}
                    onChange={(e) => setOperatingArea(e.target.value)}
                    placeholder="e.g. Ewet Housing Estate, Shelter Afrique, Osongama"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    CAC Registration / Business RC Number
                  </label>
                  <input
                    type="text"
                    value={cacNumber}
                    onChange={(e) => setCacNumber(e.target.value)}
                    placeholder="e.g. RC-1849204 or BN-3920194"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    Practicing License / Accreditation ID
                  </label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. NIESV/AKW/2023/048 or REDAN/AK/2024/119"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-700 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                  Professional Bio & Experience
                </label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your property intermediary experience, focus areas, and advisory services..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-700 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFullName(agent.fullName);
                    setPhoneNumber(agent.phoneNumber);
                    setAgencyName(agent.agencyName || '');
                    setOperatingArea(agent.operatingArea || '');
                    setCacNumber(agent.cacNumber || '');
                    setLicenseNumber(agent.licenseNumber || '');
                    setBio(agent.bio || '');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                    Contact Email
                  </span>
                  <p className="text-stone-900 font-semibold text-base flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-700" />
                    {agent.email}
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                    Phone Contact
                  </span>
                  <p className="text-stone-900 font-semibold text-base flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-700" />
                    {agent.phoneNumber}
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                    Operating Coverage
                  </span>
                  <p className="text-stone-900 font-semibold text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    {agent.operatingArea || 'Uyo Metropolis & Environs'}
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                    Agency Affiliation
                  </span>
                  <p className="text-stone-900 font-semibold text-base flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-700" />
                    {agent.agencyName || 'Independent Real Estate Consultant'}
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                    CAC / Business Registration
                  </span>
                  <p className="text-stone-900 font-semibold text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-700" />
                    {agent.cacNumber || 'Pending CAC Registration'}
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                    License / Accreditation
                  </span>
                  <p className="text-stone-900 font-semibold text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    {agent.licenseNumber || 'Verified Practitioner'}
                  </p>
                </div>
              </div>

              {agent.bio && (
                <div className="p-5 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-2">
                    About / Professional Bio
                  </span>
                  <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line">
                    {agent.bio}
                  </p>
                </div>
              )}

              {/* Intermediary Scope Guidelines */}
              <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl space-y-2 text-blue-900">
                <div className="flex items-center gap-2 font-bold text-sm text-blue-950">
                  <Shield className="w-4 h-4 text-blue-700" />
                  HOMEZA Agent Intermediary Role & Compliance Guidelines
                </div>
                <ul className="text-xs text-blue-800 space-y-1.5 list-disc list-inside">
                  <li>Agents operate as helpful intermediaries connecting prospective tenants with verified landlords.</li>
                  <li>Properties remain listed and managed by their registered landlords.</li>
                  <li>Rental applications are reviewed and approved directly by property owners or system admins.</li>
                  <li>Always verify client budget, requirements, and move-in schedules before scheduling property tours.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
