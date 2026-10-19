import React, { useState } from 'react';
import {
  Bell,
  Building2,
  ChevronDown,
  Home,
  LogOut,
  PlusCircle,
  ShieldCheck,
  User as UserIcon,
  Search,
  Bookmark,
  FileText,
  SlidersHorizontal,
  Layers,
  MapPin,
  HelpCircle,
  RotateCcw,
  LifeBuoy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PLATFORM_CONFIG } from '../../config/platform';
import { Store } from '../../services/store';
import { UserAvatar } from './UserAvatar';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: (initialMode?: 'LOGIN' | 'REGISTER_TENANT' | 'REGISTER_LANDLORD' | 'REGISTER_AGENT' | 'ADMIN_LOGIN') => void;
  onOpenAddProperty?: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAuth,
  onOpenAddProperty,
  onOpenNotifications,
  unreadNotificationsCount,
}) => {
  const { currentUser, currentRole, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header id="app-navbar" className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-stone-200">
      {/* Authenticated Platform Session Bar */}
      <div className="bg-stone-900 text-stone-200 text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-white">HOMEZA Secure Session</span>
          </div>
          <span className="hidden sm:inline text-stone-400">
            • {PLATFORM_CONFIG.defaultCity}, {PLATFORM_CONFIG.defaultState}
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {currentUser && (
            <div className="flex items-center space-x-2 bg-stone-800/80 px-2.5 py-1 rounded-lg border border-stone-700">
              <span className="text-stone-300 font-medium">{currentUser.fullName}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  currentRole === 'ADMIN'
                    ? 'bg-purple-950 text-purple-300 border border-purple-800'
                    : currentRole === 'LANDLORD'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : currentRole === 'AGENT'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-blue-950 text-blue-300 border border-blue-800'
                }`}
              >
                {currentRole}
              </span>
            </div>
          )}

          <button
            id="navbar-logout-btn"
            onClick={() => {
              logout();
            }}
            className="flex items-center gap-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/80 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Main Navbar Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              id="brand-logo-btn"
              onClick={() => {
                if (currentRole === 'LANDLORD') {
                  setActiveTab('landlord-dashboard');
                } else if (currentRole === 'ADMIN') {
                  setActiveTab('admin-dashboard');
                } else {
                  setActiveTab('explore');
                }
              }}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:bg-emerald-800 transition">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-stone-900 flex items-center gap-1.5">
                  {PLATFORM_CONFIG.appName}
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    Uyo
                  </span>
                </span>
                <span className="text-[11px] text-stone-500 block -mt-1 truncate max-w-[220px] sm:max-w-xs font-medium">
                  {PLATFORM_CONFIG.tagline}
                </span>
              </div>
            </button>

            {/* Role indicator pill */}
            {currentUser && (
              <span
                className={`hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${
                  currentRole === 'ADMIN'
                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                    : currentRole === 'LANDLORD'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : currentRole === 'AGENT'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}
              >
                {currentRole} PORTAL
              </span>
            )}
          </div>

          {/* Center Navigation Links based on Role */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {currentRole === 'AGENT' && (
              <>
                <button
                  id="nav-agent-dashboard"
                  type="button"
                  onClick={() => setActiveTab('agent-dashboard')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'agent-dashboard' || activeTab === 'overview'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <Home className="w-5 h-5" />
                  <span>Overview</span>
                </button>
                <button
                  id="nav-agent-clients"
                  type="button"
                  onClick={() => setActiveTab('agent-clients')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'agent-clients'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <UserIcon className="w-5 h-5" />
                  <span>Clients</span>
                </button>
                <button
                  id="nav-agent-assisted"
                  type="button"
                  onClick={() => setActiveTab('agent-assisted')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'agent-assisted'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <Layers className="w-5 h-5" />
                  <span>Assisted Properties</span>
                </button>
                <button
                  id="nav-agent-search"
                  type="button"
                  onClick={() => setActiveTab('agent-search')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'agent-search'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <Search className="w-5 h-5" />
                  <span>Search</span>
                </button>
                <button
                  id="nav-agent-applications"
                  type="button"
                  onClick={() => setActiveTab('agent-applications')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'agent-applications'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span>Applications</span>
                </button>
                <button
                  id="nav-agent-saved"
                  type="button"
                  onClick={() => setActiveTab('agent-saved')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'agent-saved'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <Bookmark className="w-5 h-5" />
                  <span>Saved</span>
                </button>
                <button
                  id="nav-agent-support"
                  type="button"
                  onClick={() => setActiveTab('agent-support')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'agent-support' || activeTab === 'support'
                      ? 'bg-purple-50 text-purple-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <LifeBuoy className="w-5 h-5" />
                  <span>Support</span>
                </button>
              </>
            )}

            {currentRole === 'TENANT' && (
              <>
                <button
                  id="nav-tenant-explore"
                  type="button"
                  onClick={() => setActiveTab('explore')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'explore'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <Home className="w-5 h-5" />
                  <span>Home</span>
                </button>
                <button
                  id="nav-tenant-search"
                  type="button"
                  onClick={() => setActiveTab('search')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'search'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <Search className="w-5 h-5" />
                  <span>Search</span>
                </button>
                <button
                  id="nav-tenant-saved"
                  type="button"
                  onClick={() => setActiveTab('saved')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'saved'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <Bookmark className="w-5 h-5" />
                  <span>Saved</span>
                </button>
                <button
                  id="nav-tenant-applications"
                  type="button"
                  onClick={() => setActiveTab('applications')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'applications'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span>Applications</span>
                </button>
                <button
                  id="nav-tenant-notifications"
                  type="button"
                  onClick={() => setActiveTab('notifications')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer relative ${
                    activeTab === 'notifications'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  <span>Notifications</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block -ml-1"></span>
                  )}
                </button>
                <button
                  id="nav-tenant-profile"
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <UserIcon className="w-5 h-5" />
                  <span>Profile</span>
                </button>
              </>
            )}

            {currentRole === 'LANDLORD' && (
              <>
                <button
                  id="nav-landlord-dashboard"
                  type="button"
                  onClick={() => setActiveTab('landlord-dashboard')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'landlord-dashboard'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <Layers className="w-5 h-5" />
                  <span>Dashboard</span>
                </button>
                <button
                  id="nav-landlord-properties"
                  type="button"
                  onClick={() => setActiveTab('landlord-properties')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'landlord-properties'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                  <span>My Properties</span>
                </button>
                <button
                  id="nav-landlord-add-property"
                  type="button"
                  onClick={() => setActiveTab('landlord-add-property')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'landlord-add-property'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>Add Listing</span>
                </button>
                <button
                  id="nav-landlord-applications"
                  type="button"
                  onClick={() => setActiveTab('landlord-applications')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'landlord-applications'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span>Applications</span>
                </button>
                <button
                  id="nav-landlord-notifications"
                  type="button"
                  onClick={() => setActiveTab('landlord-notifications')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer relative ${
                    activeTab === 'landlord-notifications'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  <span>Alerts</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block -ml-1"></span>
                  )}
                </button>
                <button
                  id="nav-landlord-profile"
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <UserIcon className="w-5 h-5" />
                  <span>Profile</span>
                </button>
                <button
                  id="nav-landlord-support"
                  type="button"
                  onClick={() => setActiveTab('landlord-support')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'landlord-support'
                      ? 'bg-purple-50 text-purple-900 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <LifeBuoy className="w-5 h-5" />
                  <span>Support</span>
                </button>
              </>
            )}

            {currentRole === 'ADMIN' && (
              <>
                <button
                  id="nav-admin-dashboard"
                  type="button"
                  onClick={() => setActiveTab('admin-dashboard')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'admin-dashboard'
                      ? 'bg-purple-50 text-purple-950 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <SlidersHorizontal className="w-5 h-5" />
                  <span>Admin Overview</span>
                </button>
                <button
                  id="nav-admin-properties"
                  type="button"
                  onClick={() => setActiveTab('admin-properties')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'admin-properties'
                      ? 'bg-purple-50 text-purple-950 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                  <span>Properties</span>
                </button>
                <button
                  id="nav-admin-landlords"
                  type="button"
                  onClick={() => setActiveTab('admin-landlords')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'admin-landlords'
                      ? 'bg-purple-50 text-purple-950 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>Landlords</span>
                </button>
                <button
                  id="nav-admin-tenants"
                  type="button"
                  onClick={() => setActiveTab('admin-tenants')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'admin-tenants'
                      ? 'bg-purple-50 text-purple-950 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <UserIcon className="w-5 h-5" />
                  <span>Tenants</span>
                </button>
                <button
                  id="nav-admin-support"
                  type="button"
                  onClick={() => setActiveTab('admin-support')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'admin-support'
                      ? 'bg-purple-50 text-purple-950 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <LifeBuoy className="w-5 h-5" />
                  <span>Help Desk</span>
                </button>
                <button
                  id="nav-admin-reports"
                  type="button"
                  onClick={() => setActiveTab('admin-reports')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'admin-reports'
                      ? 'bg-purple-50 text-purple-950 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <HelpCircle className="w-5 h-5" />
                  <span>Reports</span>
                </button>
                <button
                  id="nav-admin-locations"
                  type="button"
                  onClick={() => setActiveTab('admin-locations')}
                  className={`px-3.5 py-2.5 rounded-xl text-base font-medium transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'admin-locations'
                      ? 'bg-purple-50 text-purple-950 font-bold'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                  <span>Locations</span>
                </button>
              </>
            )}
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Add Property CTA Button for Landlord and Agent */}
            {(currentRole === 'LANDLORD' || currentRole === 'AGENT') && onOpenAddProperty && (
              <button
                id="btn-navbar-add-property"
                onClick={onOpenAddProperty}
                className="hidden sm:flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Property</span>
              </button>
            )}

            {/* Notification Bell */}
            {currentUser && (
              <button
                id="btn-notifications"
                onClick={onOpenNotifications}
                className="relative p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* User Profile / Auth State */}
            {currentUser ? (
              <div className="relative">
                <button
                  id="btn-user-avatar-menu"
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-stone-100 transition text-stone-800 cursor-pointer focus:outline-none"
                  aria-expanded={showUserMenu}
                  aria-label="User account menu"
                >
                  <UserAvatar user={currentUser} size="sm" />
                  <span className="hidden md:inline text-xs font-semibold max-w-[120px] truncate">
                    {currentUser.fullName.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                </button>

                {showUserMenu && (
                  <>
                    {/* Fixed invisible backdrop for reliable mobile touch and desktop outside click */}
                    <div
                      id="user-menu-backdrop"
                      className="fixed inset-0 z-40 bg-transparent"
                      onClick={() => setShowUserMenu(false)}
                      onTouchEnd={() => setShowUserMenu(false)}
                    />

                    <div
                      id="user-profile-dropdown"
                      className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-stone-200 py-2 z-50 text-sm overflow-hidden animate-fadeIn select-none"
                    >
                      <div className="px-4 py-2.5 border-b border-stone-100 bg-stone-50/70">
                        <p className="font-bold text-stone-900 text-sm truncate">{currentUser.fullName}</p>
                        <p className="text-xs text-stone-500 truncate">{currentUser.email}</p>
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-stone-200/80 text-stone-800">
                          {currentUser.role}
                        </span>
                      </div>

                      <div className="py-1">
                        <button
                          id="dropdown-menu-my-profile"
                          type="button"
                          onClick={() => {
                            if (currentRole === 'AGENT') setActiveTab('agent-profile');
                            else setActiveTab('profile');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                        >
                          <UserIcon className="w-4 h-4 text-stone-400" />
                          <span>My Profile</span>
                        </button>

                        <button
                          id="dropdown-menu-support-center"
                          type="button"
                          onClick={() => {
                            if (currentRole === 'ADMIN') setActiveTab('admin-support');
                            else if (currentRole === 'LANDLORD') setActiveTab('landlord-support');
                            else if (currentRole === 'AGENT') setActiveTab('agent-support');
                            else setActiveTab('support');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                        >
                          <LifeBuoy className="w-4 h-4 text-purple-600" />
                          <span>Support Center</span>
                        </button>

                        {currentRole === 'ADMIN' && (
                          <>
                            <button
                              id="dropdown-menu-admin-dashboard"
                              type="button"
                              onClick={() => {
                                setActiveTab('admin-dashboard');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-purple-50 hover:text-purple-950 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <SlidersHorizontal className="w-4 h-4 text-purple-700" />
                              <span>Admin Dashboard</span>
                            </button>
                            <button
                              id="dropdown-menu-admin-properties"
                              type="button"
                              onClick={() => {
                                setActiveTab('admin-properties');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-purple-50 hover:text-purple-950 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <Building2 className="w-4 h-4 text-purple-700" />
                              <span>Manage Properties</span>
                            </button>
                            <button
                              id="dropdown-menu-admin-landlords"
                              type="button"
                              onClick={() => {
                                setActiveTab('admin-landlords');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-purple-50 hover:text-purple-950 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <ShieldCheck className="w-4 h-4 text-purple-700" />
                              <span>Manage Landlords</span>
                            </button>
                            <button
                              id="dropdown-menu-admin-tenants"
                              type="button"
                              onClick={() => {
                                setActiveTab('admin-tenants');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-purple-50 hover:text-purple-950 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <UserIcon className="w-4 h-4 text-purple-700" />
                              <span>Manage Tenants</span>
                            </button>
                            <button
                              id="dropdown-menu-admin-agents"
                              type="button"
                              onClick={() => {
                                setActiveTab('admin-agents');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-purple-50 hover:text-purple-950 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <ShieldCheck className="w-4 h-4 text-purple-700" />
                              <span>Agent Approvals</span>
                            </button>
                            <button
                              id="dropdown-menu-admin-reports"
                              type="button"
                              onClick={() => {
                                setActiveTab('admin-reports');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-purple-50 hover:text-purple-950 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <FileText className="w-4 h-4 text-purple-700" />
                              <span>Financial Reports</span>
                            </button>
                          </>
                        )}

                        {currentRole === 'AGENT' && (
                          <>
                            <button
                              id="dropdown-menu-agent-overview"
                              type="button"
                              onClick={() => {
                                setActiveTab('agent-dashboard');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <Home className="w-4 h-4 text-emerald-700" />
                              <span>Agent Overview</span>
                            </button>
                            <button
                              id="dropdown-menu-agent-clients"
                              type="button"
                              onClick={() => {
                                setActiveTab('agent-clients');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <UserIcon className="w-4 h-4 text-emerald-700" />
                              <span>Manage Clients</span>
                            </button>
                            <button
                              id="dropdown-menu-agent-assisted"
                              type="button"
                              onClick={() => {
                                setActiveTab('agent-assisted');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <Layers className="w-4 h-4 text-emerald-700" />
                              <span>Assisted Properties</span>
                            </button>
                            <button
                              id="dropdown-menu-agent-applications"
                              type="button"
                              onClick={() => {
                                setActiveTab('agent-applications');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <FileText className="w-4 h-4 text-emerald-700" />
                              <span>Client Applications</span>
                            </button>
                            <button
                              id="dropdown-menu-agent-saved"
                              type="button"
                              onClick={() => {
                                setActiveTab('agent-saved');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <Bookmark className="w-4 h-4 text-emerald-700" />
                              <span>Saved Properties</span>
                            </button>
                          </>
                        )}

                        {currentRole === 'TENANT' && (
                          <>
                            <button
                              id="dropdown-menu-tenant-saved"
                              type="button"
                              onClick={() => {
                                setActiveTab('saved');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <Bookmark className="w-4 h-4 text-stone-400" />
                              <span>Saved Properties</span>
                            </button>
                            <button
                              id="dropdown-menu-tenant-applications"
                              type="button"
                              onClick={() => {
                                setActiveTab('applications');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <FileText className="w-4 h-4 text-stone-400" />
                              <span>My Applications</span>
                            </button>
                          </>
                        )}

                        {currentRole === 'LANDLORD' && (
                          <>
                            <button
                              id="dropdown-menu-landlord-dashboard"
                              type="button"
                              onClick={() => {
                                setActiveTab('landlord-dashboard');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <Layers className="w-4 h-4 text-stone-400" />
                              <span>Dashboard</span>
                            </button>
                            <button
                              id="dropdown-menu-landlord-properties"
                              type="button"
                              onClick={() => {
                                setActiveTab('landlord-properties');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <Building2 className="w-4 h-4 text-stone-400" />
                              <span>My Properties</span>
                            </button>
                            <button
                              id="dropdown-menu-landlord-add"
                              type="button"
                              onClick={() => {
                                setActiveTab('landlord-add-property');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <PlusCircle className="w-4 h-4 text-stone-400" />
                              <span>Add Property</span>
                            </button>
                            <button
                              id="dropdown-menu-landlord-applications"
                              type="button"
                              onClick={() => {
                                setActiveTab('landlord-applications');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <FileText className="w-4 h-4 text-stone-400" />
                              <span>Applications</span>
                            </button>
                            <button
                              id="dropdown-menu-landlord-notifications"
                              type="button"
                              onClick={() => {
                                setActiveTab('landlord-notifications');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 text-stone-700 font-medium transition cursor-pointer"
                            >
                              <Bell className="w-4 h-4 text-stone-400" />
                              <span>Notifications</span>
                            </button>
                          </>
                        )}
                      </div>

                      <div className="border-t border-stone-100 pt-1">
                        <button
                          id="dropdown-menu-signout"
                          type="button"
                          onClick={() => {
                            logout();
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 flex items-center gap-2.5 text-sm font-semibold transition cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="btn-nav-login"
                  onClick={() => onOpenAuth('LOGIN')}
                  className="text-stone-700 hover:text-stone-900 font-medium text-xs sm:text-sm px-3 py-2 rounded-lg hover:bg-stone-100 transition"
                >
                  Sign In
                </button>
                <button
                  id="btn-nav-register"
                  onClick={() => onOpenAuth('REGISTER_TENANT')}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs sm:text-sm px-3.5 py-2 rounded-lg transition shadow-sm"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
