import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Compass,
  Eye,
  FileCheck2,
  FileText,
  Heart,
  Home,
  Info,
  KeyRound,
  Lock,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { User } from '../../types';

interface PlatformViewsViewProps {
  users: User[];
  onEnterViewMode: (mode: 'tenant' | 'landlord', targetUserId?: string) => void;
}

export const PlatformViewsView: React.FC<PlatformViewsViewProps> = ({
  users,
  onEnterViewMode,
}) => {
  const tenants = users.filter((u) => u.role === 'TENANT');
  const landlords = users.filter((u) => u.role === 'LANDLORD');

  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id || '');
  const [selectedLandlordId, setSelectedLandlordId] = useState<string>(landlords[0]?.id || '');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Eye className="w-6 h-6 text-purple-600" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900">Role Views (Admin Inspection)</h2>
          <span className="text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300 px-3 py-1 rounded-full uppercase tracking-wider">
            Safe Inspection Mode
          </span>
        </div>
        <p className="text-sm sm:text-base text-stone-600 mt-1.5 max-w-3xl leading-relaxed">
          Inspect the live end-to-end HOMEZA experience through the lens of real tenant searchers or property landlords without changing your authenticated Admin role or compromising platform security.
        </p>
      </div>

      {/* Security Notice Banner */}
      <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-5 sm:p-6 flex items-start gap-4 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-purple-200 text-purple-900 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-sm sm:text-base text-purple-950 space-y-1.5">
          <div className="font-extrabold text-purple-900 text-base sm:text-lg">
            Admin Identity &amp; Permission Invariance
          </div>
          <p className="text-purple-900/90 leading-relaxed text-sm sm:text-base">
            While inspecting other role interfaces, your authentication identity remains strictly <strong>Super Admin</strong>. Destructive modifications and simulated impersonations (e.g. submitting rental forms on behalf of tenants or publishing unverified properties) are safely blocked in inspection mode.
          </p>
        </div>
      </div>

      {/* 2 Main Role Inspection Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        {/* 1. Tenant Experience Card */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition">
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Home className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 px-3.5 py-1.5 rounded-full">
                Tenant Portal
              </span>
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-stone-900">Tenant Experience View</h3>
              <p className="text-sm sm:text-base text-stone-600 mt-1.5 leading-relaxed">
                Inspect how renters explore Uyo neighbourhoods, filter by price and verified amenities, bookmark dream homes, submit rental applications, and reply to landlord inquiries.
              </p>
            </div>

            {/* Feature Checklist */}
            <div className="space-y-2.5 text-sm text-stone-700 bg-stone-50 p-4 sm:p-5 rounded-2xl border border-stone-200">
              <div className="font-bold text-stone-900 text-xs uppercase tracking-wider mb-1.5">
                Included in Tenant View:
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Public Marketplace &amp; Multi-Criteria Filtering</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Verified Property Details &amp; Upfront Cost Estimator</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Tenant Application Tracker &amp; Info Response Dialog</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Saved Bookmarks &amp; In-App Status Notifications</span>
              </div>
            </div>

            {/* Select Tenant User */}
            <div className="space-y-2 pt-2">
              <label className="block text-sm font-bold text-stone-800">
                Select Tenant Account to Inspect:
              </label>
              <select
                id="select-tenant-to-inspect"
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full text-sm sm:text-base font-medium bg-white border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 text-stone-900"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} — {t.email} ({t.occupation || 'Tenant'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-6 bg-stone-50 border-t border-stone-200">
            <button
              id="btn-view-tenant-experience"
              type="button"
              onClick={() => onEnterViewMode('tenant', selectedTenantId)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl transition flex items-center justify-center gap-2.5 shadow-sm cursor-pointer"
            >
              <span>Inspect Tenant Experience</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Landlord Experience Card */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-amber-300 hover:shadow-md transition">
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Building2 className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-850 border border-amber-200 px-3.5 py-1.5 rounded-full">
                Landlord Portal
              </span>
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-stone-900">Landlord Experience View</h3>
              <p className="text-sm sm:text-base text-stone-600 mt-1.5 leading-relaxed">
                Inspect how property owners manage listings across Uyo, track verification statuses, view admin correction notes, submit corrections, and review tenant applications.
              </p>
            </div>

            {/* Feature Checklist */}
            <div className="space-y-2.5 text-sm text-stone-700 bg-stone-50 p-4 sm:p-5 rounded-2xl border border-stone-200">
              <div className="font-bold text-stone-900 text-xs uppercase tracking-wider mb-1.5">
                Included in Landlord View:
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>My Properties Portfolio &amp; Occupancy Statuses</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Verification State Badges (Pending, Correction Required)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Received Rental Applications &amp; Applicant Screening</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Fix &amp; Resubmit Flow with Admin Correction Banners</span>
              </div>
            </div>

            {/* Select Landlord User */}
            <div className="space-y-2 pt-2">
              <label className="block text-sm font-bold text-stone-800">
                Select Landlord Account to Inspect:
              </label>
              <select
                id="select-landlord-to-inspect"
                value={selectedLandlordId}
                onChange={(e) => setSelectedLandlordId(e.target.value)}
                className="w-full text-sm sm:text-base font-medium bg-white border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-600 text-stone-900"
              >
                {landlords.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.fullName} — {l.email} ({l.businessName || 'Property Owner'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-6 bg-stone-50 border-t border-stone-200">
            <button
              id="btn-view-landlord-experience"
              type="button"
              onClick={() => onEnterViewMode('landlord', selectedLandlordId)}
              className="w-full py-3.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-base rounded-xl transition flex items-center justify-center gap-2.5 shadow-sm cursor-pointer"
            >
              <span>Inspect Landlord Experience</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
