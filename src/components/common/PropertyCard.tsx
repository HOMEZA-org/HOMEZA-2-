import React from 'react';
import {
  Bath,
  Bed,
  Bookmark,
  CheckCircle2,
  Eye,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { Property } from '../../types';
import { formatNaira } from '../../config/platform';
import { useAuth } from '../../context/AuthContext';

interface PropertyCardProps {
  property: Property;
  onViewDetails: (property: Property) => void;
  onOpenAuth?: () => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = React.memo(({
  property,
  onViewDetails,
  onOpenAuth,
}) => {
  const { currentUser, isPropertySaved, toggleSavedProperty } = useAuth();
  const isSaved = isPropertySaved(property.id);

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    toggleSavedProperty(property.id);
  };

  const coverImage =
    property.images.find((img) => img.isCover)?.url ||
    property.images[0]?.url ||
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80';

  return (
    <div
      id={`property-card-${property.id}`}
      onClick={() => onViewDetails(property)}
      className="group bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-lg hover:border-emerald-500 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative aspect-16/10 w-full overflow-hidden bg-stone-100">
        <img
          src={coverImage}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          {/* Availability Status */}
          <span
            className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-extrabold tracking-wide uppercase shadow-md pointer-events-auto backdrop-blur-md ${
              property.status === 'AVAILABLE'
                ? 'bg-emerald-700 text-white'
                : property.status === 'RENTED'
                ? 'bg-stone-900 text-stone-200'
                : 'bg-amber-600 text-white'
            }`}
          >
            {property.status === 'AVAILABLE'
              ? 'Available'
              : property.status === 'RENTED'
              ? 'Rented'
              : property.status.replace('_', ' ')}
          </span>

          {/* Bookmark Button */}
          <button
            id={`btn-bookmark-${property.id}`}
            type="button"
            onClick={handleSaveClick}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition shadow-md pointer-events-auto backdrop-blur-md cursor-pointer ${
              isSaved
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-white/95 hover:bg-white text-stone-800 hover:text-red-600'
            }`}
            title={isSaved ? 'Remove from saved' : 'Save property'}
          >
            <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Bottom Tag over Image */}
        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2">
          <span className="bg-stone-950/90 backdrop-blur-md text-white text-xs sm:text-sm font-bold px-3 py-1 rounded-full shadow-md">
            {property.propertyType}
          </span>
          {property.isVerified && (
            <span className="bg-emerald-800/95 backdrop-blur-md text-white text-xs sm:text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Verified Listing</span>
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Price & Period */}
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2.5">
            <div>
              <span className="text-2xl sm:text-3xl font-black text-stone-950 tracking-tight">
                {formatNaira(property.pricing.rent)}
              </span>
              <span className="text-sm sm:text-base font-semibold text-stone-600 ml-1">
                / {property.pricing.rentalPeriod.toLowerCase()}
              </span>
            </div>
            {property.pricing.totalEstimatedFirstPayment && (
              <span className="text-xs sm:text-sm text-emerald-950 font-extrabold bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-lg">
                Est. Move-in: {formatNaira(property.pricing.totalEstimatedFirstPayment)}
              </span>
            )}
          </div>

          {/* Title - 20-24px font-bold */}
          <h3 className="font-extrabold text-stone-950 text-xl sm:text-2xl leading-snug line-clamp-2 mb-2.5 group-hover:text-emerald-800 transition-colors">
            {property.title}
          </h3>

          {/* Location & Landmark */}
          <div className="flex items-center gap-2 text-base text-stone-800 mb-3.5">
            <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-extrabold text-stone-950">{property.location.area}, Uyo</span>
            {property.location.landmark && (
              <>
                <span className="text-stone-400">•</span>
                <span className="truncate text-stone-700 font-medium">{property.location.landmark}</span>
              </>
            )}
          </div>

          {/* Specs: Bedrooms, Bathrooms, Toilets - visually prominent */}
          <div className="flex items-center gap-4 py-3 border-y border-stone-200 text-base text-stone-850 mb-4">
            <div className="flex items-center gap-2 font-bold text-stone-950">
              <Bed className="w-5 h-5 text-emerald-700" />
              <span>{property.bedrooms} {property.bedrooms === 1 ? 'Bed' : 'Beds'}</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-stone-950">
              <Bath className="w-5 h-5 text-emerald-700" />
              <span>{property.bathrooms} {property.bathrooms === 1 ? 'Bath' : 'Baths'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-700 font-semibold">
              <span>{property.toilets} Toilets</span>
            </div>
          </div>

          {/* Facilities preview chips */}
          {(property.facilities || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {(property.facilities || []).slice(0, 3).map((facility) => (
                <span
                  key={facility}
                  className="text-xs sm:text-sm bg-stone-100 text-stone-850 px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 border border-stone-200"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{facility}</span>
                </span>
              ))}
              {(property.facilities || []).length > 3 && (
                <span className="text-xs sm:text-sm font-bold text-stone-600 px-2.5 py-1 bg-stone-50 border border-stone-200 rounded-lg">
                  +{(property.facilities || []).length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-3.5 border-t border-stone-200 flex items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-stone-700 truncate">
            {property.listingSource === 'AGENT' ? (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-600"></span>
                <span className="text-stone-600">Listed by</span>{' '}
                <strong className="font-bold text-emerald-850">Verified Agent</strong>
                <span className="text-stone-500 hidden sm:inline">({property.submittingAgentName || 'Agent'})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-600"></span>
                <span className="text-stone-600">Listed by</span>{' '}
                <strong className="font-bold text-emerald-850">Verified Landlord</strong>
                <span className="text-stone-500 hidden sm:inline">({property.landlordName})</span>
              </span>
            )}
          </div>

          <button
            id={`btn-view-prop-${property.id}`}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onViewDetails(property);
            }}
            className="inline-flex items-center gap-2 bg-stone-950 hover:bg-emerald-700 active:bg-emerald-800 text-white text-base font-bold px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer select-none shrink-0"
          >
            <span>View Property</span>
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

