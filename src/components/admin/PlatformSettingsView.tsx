import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  DollarSign,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { PLATFORM_CONFIG } from '../../config/platform';
import { useAuth } from '../../context/AuthContext';

export const PlatformSettingsView: React.FC = () => {
  const { currentUser, changePassword } = useAuth();

  const [appName, setAppName] = useState(PLATFORM_CONFIG.appName);
  const [tagline, setTagline] = useState(PLATFORM_CONFIG.tagline || 'Find verified homes. Connect with trusted property providers.');
  const [state, setState] = useState(PLATFORM_CONFIG.defaultState);
  const [capitalCity, setCapitalCity] = useState(PLATFORM_CONFIG.defaultCity);
  const [supportEmail, setSupportEmail] = useState(PLATFORM_CONFIG.supportEmail);
  const [supportPhone, setSupportPhone] = useState(PLATFORM_CONFIG.supportPhone);
  const [saved, setSaved] = useState(false);

  // Security password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current administrator password.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = changePassword(currentPassword, newPassword);
      if (res.success) {
        setPasswordSuccess('Administrator security password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(null), 5000);
      } else {
        setPasswordError(res.message || 'Failed to update password.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'An error occurred while updating password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Platform Configuration & Admin Security</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Modify the platform name, state jurisdiction, currency standards, and manage administrator credentials.
        </p>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3.5 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Platform configuration updated successfully.</span>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6"
      >
        {/* Brand & Name */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Brand Identity & Location
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Platform Name (Configurable)
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                required
                className="w-full text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Brand Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Primary State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 bg-stone-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Capital City</label>
              <input
                type="text"
                value={capitalCity}
                onChange={(e) => setCapitalCity(e.target.value)}
                className="w-full text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 bg-stone-50"
              />
            </div>
          </div>
        </div>

        {/* Support contacts */}
        <div className="pt-4 border-t border-stone-100 space-y-4">
          <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Public Support & Inquiries
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Support Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Support Helpline</label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Currency & Financial Standards */}
        <div className="pt-4 border-t border-stone-100 space-y-3">
          <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Currency & Fee Standards
          </h3>
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Base Currency:</span>
              <span className="font-bold text-stone-900">Nigerian Naira (NGN - ₦)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Default Rental Period:</span>
              <span className="font-bold text-stone-900">Per Annum (Annual lease)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Phase 1 Direct Payments:</span>
              <span className="text-stone-500">Disabled (Physical inspection & Direct settlement)</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
          >
            Save Configuration Changes
          </button>
        </div>
      </form>

      {/* Admin Security & Password Change */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Administrator Security Credentials</h3>
              <p className="text-xs text-stone-500">
                Update the administrator password used to access this console.
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            Current Account: {currentUser?.email || 'admin@homeza.ng'}
          </span>
        </div>

        {passwordSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3.5 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold p-3.5 rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  id="admin-settings-current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full text-xs border border-stone-300 rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                New Password (Min 8 chars)
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  id="admin-settings-new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New secure password"
                  className="w-full text-xs border border-stone-300 rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  id="admin-settings-confirm-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full text-xs border border-stone-300 rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              id="btn-admin-settings-update-password"
              disabled={isUpdatingPassword}
              className="bg-purple-950 hover:bg-purple-900 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-purple-300" />
              <span>{isUpdatingPassword ? 'Updating Password...' : 'Update Admin Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
