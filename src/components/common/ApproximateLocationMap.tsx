import React from 'react';
import { Info, Lock, MapPin, Navigation, Shield } from 'lucide-react';
import { PropertyLocation } from '../../types';

interface ApproximateLocationMapProps {
  location: PropertyLocation;
  propertyTitle?: string;
}

export const ApproximateLocationMap: React.FC<ApproximateLocationMapProps> = ({
  location,
}) => {
  return (
    <div id="approximate-location-map-container" className="bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
      {/* Map Header */}
      <div className="p-4 sm:p-5 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-700 shrink-0" />
            <h4 className="font-extrabold text-stone-950 text-base sm:text-lg">
              Approximate Location: {location.area}, Uyo
            </h4>
          </div>
          <p className="text-xs text-stone-600 mt-0.5">
            Akwa Ibom State, Nigeria {location.landmark ? `• Landmark: ${location.landmark}` : ''}
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs">
          <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>Exact Address Protected</span>
        </div>
      </div>

      {/* Stylized Map Viewport */}
      <div className="relative h-64 sm:h-72 w-full bg-stone-200 overflow-hidden flex items-center justify-center select-none">
        {/* SVG Grid / Road Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cbd5e1" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          {/* Simulated arterial roads */}
          <path d="M -50 120 Q 200 80 600 200" fill="none" stroke="#94a3b8" strokeWidth="8" />
          <path d="M 100 -50 Q 250 150 400 350" fill="none" stroke="#94a3b8" strokeWidth="6" />
          <path d="M 300 0 L 200 300" fill="none" stroke="#cbd5e1" strokeWidth="4" />
          <path d="M 0 220 L 500 100" fill="none" stroke="#e2e8f0" strokeWidth="4" />
        </svg>

        {/* Shaded Radius Circle representing approximate area */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-emerald-500/20 border-2 border-dashed border-emerald-600 flex items-center justify-center animate-pulse">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-600/30 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-lg ring-4 ring-white">
                <Navigation className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="mt-2 bg-stone-950/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg border border-stone-800 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Approximate Zone ({location.area})</span>
          </div>
        </div>

        {/* Uyo Reference Markers */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[11px] font-bold text-stone-800 shadow-sm border border-stone-300 pointer-events-none">
          📍 {location.area} District
        </div>

        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[11px] font-bold text-stone-800 shadow-sm border border-stone-300 pointer-events-none">
          Uyo, Akwa Ibom State
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 sm:p-5 bg-stone-100/90 border-t border-stone-200 flex items-start gap-3 text-xs sm:text-sm text-stone-700">
        <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-stone-950">Location Privacy Policy</div>
          <p className="text-stone-600 leading-relaxed text-xs">
            To prevent unsolicited walk-ins and protect resident safety, exact street coordinates and compound numbers are withheld from public view.
            <strong className="text-stone-900 font-semibold ml-1">
              Exact property address and meeting instructions are released exclusively to verified tenants shortly before their confirmed inspection.
            </strong>
          </p>
        </div>
      </div>
    </div>
  );
};
