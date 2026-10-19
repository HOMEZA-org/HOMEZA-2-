import React, { useState } from 'react';
import {
  Bath,
  Bed,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCheck2,
  Flag,
  Home,
  Info,
  MapPin,
  Phone,
  Play,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { MediaCategory, Property } from '../../types';
import { formatNaira } from '../../config/platform';
import { useAuth } from '../../context/AuthContext';

interface PropertyDetailModalProps {
  property: Property | null;
  onClose: () => void;
  onApplyToRent: (property: Property) => void;
  onReportProperty: (property: Property) => void;
  onOpenAuth?: () => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  onClose,
  onApplyToRent,
  onReportProperty,
  onOpenAuth,
}) => {
  if (!property) return null;

  const { currentUser, isPropertySaved, toggleSavedProperty } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<MediaCategory | 'All'>('All');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  const isSaved = isPropertySaved(property.id);

  // Filter images by selected category
  const filteredImages =
    selectedCategory === 'All'
      ? property.images
      : property.images.filter((img) => img.category === selectedCategory);

  const currentDisplayImage =
    filteredImages[activeImageIndex]?.url ||
    property.images[0]?.url ||
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80';

  const categoriesAvailable: (MediaCategory | 'All')[] = [
    'All',
    ...(Array.from(new Set(property.images.map((img) => img.category))) as MediaCategory[]),
  ];

  const handleSaveToggle = () => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    toggleSavedProperty(property.id);
  };

  const nextImage = () => {
    if (filteredImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev + 1) % filteredImages.length);
  };

  const prevImage = () => {
    if (filteredImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev - 1 + filteredImages.length) % filteredImages.length);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn">
      <div
        id="property-detail-dialog"
        className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Header Bar */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-stone-200 bg-stone-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-stone-200 text-stone-900">
              {property.propertyType}
            </span>
            <span
              className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider px-3 py-1 rounded-full ${
                property.status === 'AVAILABLE'
                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                  : property.status === 'RENTED'
                  ? 'bg-stone-200 text-stone-900'
                  : 'bg-amber-100 text-amber-950 border border-amber-300'
              }`}
            >
              {property.status === 'AVAILABLE'
                ? 'Available for Rent'
                : property.status === 'RENTED'
                ? 'Rented Out'
                : property.status.replace('_', ' ')}
            </span>
            {property.isVerified && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-emerald-950 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Verified Property
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-modal-save"
              onClick={handleSaveToggle}
              className={`px-3.5 py-2 rounded-xl border transition text-sm font-bold flex items-center gap-1.5 cursor-pointer ${
                isSaved
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-white text-stone-800 border-stone-300 hover:bg-stone-100'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save Property'}</span>
            </button>

            <button
              id="btn-modal-report"
              onClick={() => onReportProperty(property)}
              className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-red-50 text-stone-700 hover:text-red-700 transition text-sm font-bold flex items-center gap-1.5 cursor-pointer"
              title="Report issue with this listing"
            >
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline">Report</span>
            </button>

            <button
              id="btn-close-detail-modal"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition ml-1 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Top Title & Price Section */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug">
                {property.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600 mt-2">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-stone-800">
                  {property.location.area}, {property.location.city}
                </span>
                <span className="text-stone-400">•</span>
                <span className="text-stone-600">{property.location.street}</span>
                {property.location.landmark && (
                  <>
                    <span className="text-stone-400">•</span>
                    <span className="text-emerald-800 font-medium">
                      Landmark: {property.location.landmark}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Price Box */}
            <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-xl shrink-0 min-w-[240px]">
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Annual Rent
              </div>
              <div className="text-2xl font-extrabold text-stone-900 mt-0.5">
                {formatNaira(property.pricing.rent)}
              </div>
              <div className="text-xs text-stone-600">
                Payment Period: {property.pricing.rentalPeriod}
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-200/60 text-xs font-semibold text-emerald-900 flex justify-between">
                <span>Estimated Move-In Total:</span>
                <span>{formatNaira(property.pricing.totalEstimatedFirstPayment)}</span>
              </div>
            </div>
          </div>

          {/* Media Section: Image Gallery & Video Walkthrough */}
          <div>
            {/* Category Filter Tabs for Media */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 border-b border-stone-200 mb-3">
              <div className="flex items-center gap-1.5">
                {categoriesAvailable.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setActiveImageIndex(0);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {property.videos && property.videos.length > 0 && (
                <button
                  id="btn-toggle-video"
                  onClick={() => setShowVideoPlayer(!showVideoPlayer)}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 rounded-lg transition shrink-0"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>{showVideoPlayer ? 'Show Photos' : 'Watch Video Walkthrough'}</span>
                </button>
              )}
            </div>

            {/* Display Hero Image / Video */}
            {showVideoPlayer && property.videos && property.videos.length > 0 ? (
              <div className="aspect-16/9 bg-black rounded-xl overflow-hidden relative shadow-inner">
                <video
                  src={property.videos[0].url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              <div className="relative aspect-16/9 md:aspect-21/9 bg-stone-900 rounded-xl overflow-hidden shadow-inner group">
                <img
                  src={currentDisplayImage}
                  alt={property.title}
                  className="w-full h-full object-cover transition-transform duration-300"
                />

                {/* Left/Right controls */}
                {filteredImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition shadow-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition shadow-lg"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Image caption & counter */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg">
                  <span className="truncate">
                    {filteredImages[activeImageIndex]?.caption ||
                      `${filteredImages[activeImageIndex]?.category || 'Photo'} View`}
                  </span>
                  <span className="font-medium shrink-0 ml-2">
                    {activeImageIndex + 1} / {filteredImages.length}
                  </span>
                </div>
              </div>
            )}

            {/* Thumbnails Row */}
            {!showVideoPlayer && filteredImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pt-3 pb-1">
                {filteredImages.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                      activeImageIndex === idx ? 'border-emerald-600 scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Key Specs Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 border border-stone-200 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Bed className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-stone-500 font-medium">Bedrooms</div>
                <div className="text-sm font-bold text-stone-900">{property.bedrooms} Bedrooms</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                <Bath className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-stone-500 font-medium">Bathrooms</div>
                <div className="text-sm font-bold text-stone-900">{property.bathrooms} Bathrooms</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-stone-500 font-medium">Toilets</div>
                <div className="text-sm font-bold text-stone-900">{property.toilets} Toilets</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-stone-500 font-medium">Listing Views</div>
                <div className="text-sm font-bold text-stone-900">{property.viewsCount || 1} Views</div>
              </div>
            </div>
          </div>

          {/* Description & Detailed Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (2/3): Description & Facilities */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-base font-bold text-stone-900 mb-2">Property Description</h3>
                <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line bg-stone-50/50 p-4 rounded-xl border border-stone-100">
                  {property.description}
                </p>
              </div>

              {/* Facilities Checklist */}
              <div>
                <h3 className="text-base font-bold text-stone-900 mb-3">
                  Key Facilities & Amenities ({(property.facilities || []).length})
                </h3>
                {(property.facilities || []).length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {(property.facilities || []).map((fac) => (
                      <div
                        key={fac}
                        className="flex items-center gap-2 text-xs font-medium text-stone-800 bg-emerald-50/50 border border-emerald-100/80 px-3 py-2 rounded-lg"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{fac}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 italic bg-stone-50 p-3 rounded-lg border border-stone-200">
                    Standard residential amenities included. Contact property representative for specific facility confirmations.
                  </p>
                )}
              </div>

              {/* Estimated Move-in Cost Breakdown Table */}
              <div>
                <h3 className="text-base font-bold text-stone-900 mb-2 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-700" />
                  <span>Estimated Total Move-in Financial Breakdown</span>
                </h3>
                <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
                  <div className="bg-stone-50 px-4 py-2.5 font-semibold text-stone-700 grid grid-cols-2 border-b border-stone-200">
                    <span>Fee Item</span>
                    <span className="text-right">Estimated Amount (₦)</span>
                  </div>
                  <div className="divide-y divide-stone-100">
                    <div className="px-4 py-2.5 grid grid-cols-2">
                      <span className="text-stone-700 font-medium">Initial Annual Rent</span>
                      <span className="text-right font-bold text-stone-900">
                        {formatNaira(property.pricing.rent)}
                      </span>
                    </div>
                    {property.pricing.serviceCharge ? (
                      <div className="px-4 py-2 grid grid-cols-2">
                        <span className="text-stone-600">Service Charge (Compound/Security/Water)</span>
                        <span className="text-right text-stone-800 font-medium">
                          {formatNaira(property.pricing.serviceCharge)}
                        </span>
                      </div>
                    ) : null}
                    {property.pricing.agreementFee ? (
                      <div className="px-4 py-2 grid grid-cols-2">
                        <span className="text-stone-600">Agreement Fee</span>
                        <span className="text-right text-stone-800 font-medium">
                          {formatNaira(property.pricing.agreementFee)}
                        </span>
                      </div>
                    ) : null}
                    {property.pricing.legalFee ? (
                      <div className="px-4 py-2 grid grid-cols-2">
                        <span className="text-stone-600">Legal / Documentation Fee</span>
                        <span className="text-right text-stone-800 font-medium">
                          {formatNaira(property.pricing.legalFee)}
                        </span>
                      </div>
                    ) : null}
                    {property.pricing.cautionDeposit ? (
                      <div className="px-4 py-2 grid grid-cols-2">
                        <span className="text-stone-600">Refundable Caution Deposit</span>
                        <span className="text-right text-stone-800 font-medium">
                          {formatNaira(property.pricing.cautionDeposit)}
                        </span>
                      </div>
                    ) : null}
                    {property.pricing.otherFees ? (
                      <div className="px-4 py-2 grid grid-cols-2">
                        <span className="text-stone-600">Other Miscellaneous Fees</span>
                        <span className="text-right text-stone-800 font-medium">
                          {formatNaira(property.pricing.otherFees)}
                        </span>
                      </div>
                    ) : null}
                    <div className="px-4 py-3 grid grid-cols-2 bg-emerald-50/90 font-bold text-emerald-950">
                      <span>Total Estimated First Payment</span>
                      <span className="text-right text-sm">
                        {formatNaira(property.pricing.totalEstimatedFirstPayment)}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500 mt-1.5 italic">
                  * Note: In Phase 1, rental applications create a direct connection with the verified landlord without online escrow deductions.
                </p>
              </div>
            </div>

            {/* Right Column (1/3): Landlord Card & Application Action */}
            <div className="space-y-5">
              {/* Landlord Contact & Verification Card */}
              {property.listingSource === 'AGENT' ? (
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Listing Submitter
                    </h4>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      Verified Agent
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-800 text-white flex items-center justify-center text-lg font-bold">
                      {(property.submittingAgentName || 'A').charAt(0)}
                    </div>
                    <div>
                      <h5 className="font-bold text-stone-900 text-sm">
                        {property.submittingAgentName || 'Professional Agent'}
                      </h5>
                      <p className="text-xs text-stone-600 font-medium">
                        {property.submittingAgentAgency || 'Licensed Intermediary'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-stone-700 pt-2 border-t border-stone-200">
                    {currentUser?.role === 'ADMIN' && property.submittingAgentPhone ? (
                      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 font-semibold">
                        <Phone className="w-3.5 h-3.5 text-purple-700" />
                        <span>Admin Access: {property.submittingAgentPhone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-stone-500">
                        <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                        <span>In-app verified contact • Phone protected</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified agent representation</span>
                    </div>
                    <div className="pt-2 border-t border-stone-200 text-stone-600 text-[11px]">
                      <span className="text-stone-500 font-medium">Property Owner: </span>
                      <span className="font-semibold text-stone-800">{property.landlordName}</span>
                    </div>
                  </div>

                  {/* Primary CTA Button */}
                  <button
                    id="btn-apply-to-rent-main"
                    onClick={() => onApplyToRent(property)}
                    disabled={property.status !== 'AVAILABLE'}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                      property.status === 'AVAILABLE'
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>
                      {property.status === 'AVAILABLE' ? 'Apply to Rent via Agent' : 'Property Not Available'}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Listed By Property Owner / Manager
                  </h4>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-700 text-white flex items-center justify-center text-lg font-bold">
                      {property.landlordName.charAt(0)}
                    </div>
                    <div>
                      <h5 className="font-bold text-stone-900 text-sm">{property.landlordName}</h5>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            property.landlordVerificationStatus === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {property.landlordVerificationStatus === 'VERIFIED'
                            ? '✓ Verified Landlord'
                            : 'Pending KYC'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-stone-700 pt-2 border-t border-stone-200">
                    {currentUser?.role === 'ADMIN' && property.landlordPhone ? (
                      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 font-semibold">
                        <Phone className="w-3.5 h-3.5 text-purple-700" />
                        <span>Admin Access: {property.landlordPhone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-stone-500">
                        <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                        <span>In-app verified direct landlord • Phone protected</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Direct listing • No agent markup</span>
                    </div>
                  </div>

                  {/* Primary CTA Button */}
                  <button
                    id="btn-apply-to-rent-main"
                    onClick={() => onApplyToRent(property)}
                    disabled={property.status !== 'AVAILABLE'}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                      property.status === 'AVAILABLE'
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>
                      {property.status === 'AVAILABLE' ? 'Apply to Rent This Property' : 'Property Not Available'}
                    </span>
                  </button>
                </div>
              )}

              {/* Safety Tips Banner */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 text-xs text-blue-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                  <Info className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>Renting in Uyo Safely</span>
                </div>
                <p className="text-blue-800 leading-relaxed text-[11px]">
                  Submit your application to schedule a physical viewing. Always inspect the premises in person before paying legal and agreement fees.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Action Bar */}
        <div className="px-6 py-3.5 bg-stone-100 border-t border-stone-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-stone-500">
            Property ID: <span className="font-mono text-stone-700">{property.id}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200 rounded-lg transition"
            >
              Close
            </button>
            <button
              onClick={() => onApplyToRent(property)}
              disabled={property.status !== 'AVAILABLE'}
              className="px-5 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition shadow-sm disabled:opacity-50"
            >
              Apply to Rent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
