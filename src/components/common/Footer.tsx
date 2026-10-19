import React from 'react';
import { Building2, Heart, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { PLATFORM_CONFIG } from '../../config/platform';

interface FooterProps {
  onSelectArea?: (area: string) => void;
  onSelectLocation?: (area: string) => void;
  onOpenAuth?: (role: 'LOGIN' | 'REGISTER_TENANT' | 'REGISTER_LANDLORD' | 'REGISTER_AGENT' | 'ADMIN_LOGIN') => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectArea, onSelectLocation, onOpenAuth }) => {
  const handleAreaClick = (area: string) => {
    if (onSelectLocation) onSelectLocation(area);
    else if (onSelectArea) onSelectArea(area);
  };

  const popularAreas = [
    'Ewet Housing Estate',
    'Shelter Afrique Estate',
    'Osongama Estate',
    'Oron Road',
    'Udo Udoma Avenue',
    'Wellington Bassey Way',
    'Ikpa Road',
    'Ikot Ekpene Road',
    'Itam & Surrounding Areas',
    'Ibom Plaza Area',
  ];

  return (
    <footer id="app-footer" className="bg-stone-900 text-stone-300 pt-12 pb-8 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-stone-800">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                {PLATFORM_CONFIG.appName}
              </span>
            </div>
            <p className="text-xs text-emerald-400 font-medium">
              {PLATFORM_CONFIG.tagline}
            </p>
            <p className="text-sm text-stone-400 leading-relaxed">
              HOMEZA is a trusted rental marketplace that connects tenants with verified properties and trusted landlords and property agents, making it easier to discover, communicate, and arrange property inspections — all in one place.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Verified Properties • Trusted Property Providers • Secure Inspections</span>
            </div>
          </div>

          {/* Popular Areas in Uyo */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Top Uyo Neighbourhoods
            </h4>
            <ul className="space-y-2 text-sm">
              {popularAreas.slice(0, 6).map((area) => (
                <li key={area}>
                  <button
                    onClick={() => handleAreaClick(area)}
                    className="text-stone-400 hover:text-emerald-400 transition text-left cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                    {area}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Portals */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Platform Portals
            </h4>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>
                <button
                  onClick={() => onOpenAuth && onOpenAuth('REGISTER_TENANT')}
                  className="hover:text-white transition"
                >
                  Tenant Search & Applications
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenAuth && onOpenAuth('REGISTER_LANDLORD')}
                  className="hover:text-white transition"
                >
                  Landlord Property Management
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenAuth && onOpenAuth('LOGIN')}
                  className="hover:text-white transition"
                >
                  Landlord Account Verification (KYC)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenAuth && onOpenAuth('ADMIN_LOGIN')}
                  className="hover:text-purple-400 transition flex items-center gap-1"
                >
                  <span>Administrator Review Console</span>
                  <span className="text-[10px] text-purple-400 font-mono">↗</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Local Support (Uyo)
            </h4>
            <div className="space-y-3 text-sm text-stone-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{PLATFORM_CONFIG.address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{PLATFORM_CONFIG.supportPhone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{PLATFORM_CONFIG.supportEmail}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-3">
          <p>
            © {new Date().getFullYear()} {PLATFORM_CONFIG.appName} Ltd. All rights reserved. Built for Uyo & Akwa Ibom State.
          </p>
          <p className="flex items-center gap-1">
            <span>Designed for transparent, safe housing in Akwa Ibom</span>
            <Heart className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
          </p>
        </div>
      </div>
    </footer>
  );
};
