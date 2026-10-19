import React, { useState } from 'react';
import {
  ArrowLeft,
  Bath,
  Bed,
  Bookmark,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileCheck2,
  Flag,
  Home,
  Info,
  Lock,
  MapPin,
  MessageSquare,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { MediaCategory, Property } from '../../types';
import { formatNaira } from '../../config/platform';
import { useAuth } from '../../context/AuthContext';
import { ApproximateLocationMap } from '../common/ApproximateLocationMap';
import { RequestInspectionModal } from './RequestInspectionModal';
import { DirectMessagingModal } from '../common/DirectMessagingModal';

interface PropertyDetailsViewProps {
  property: Property;
  onBack: () => void;
  onApplyToRent: (property: Property) => void;
  onReportProperty: (property: Property) => void;
  onOpenAuth?: () => void;
}

export const PropertyDetailsView: React.FC<PropertyDetailsViewProps> = ({
  property,
  onBack,
  onApplyToRent,
  onReportProperty,
  onOpenAuth,
}) => {
  const { currentUser, isPropertySaved, toggleSavedProperty } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<MediaCategory | 'All'>('All');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showMessagingModal, setShowMessagingModal] = useState(false);

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

  const resolvedInspectionFee =
    (typeof property.inspectionFee === 'number' && property.inspectionFee >= 3000 && property.inspectionFee <= 5000)
      ? property.inspectionFee
      : (typeof property.pricing?.inspectionFee === 'number' && property.pricing.inspectionFee >= 3000 && property.pricing.inspectionFee <= 5000)
      ? property.pricing.inspectionFee
      : 3000;

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
    <div id="property-details-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Top Back and Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          id="btn-back-to-properties"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-stone-700 hover:text-emerald-700 bg-white px-4 py-2 rounded-xl border border-stone-200 shadow-xs transition hover:bg-stone-50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Properties</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Save Property Button */}
          <button
            id="btn-details-save-property"
            onClick={handleSaveToggle}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition border shadow-xs cursor-pointer ${
              isSaved
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current text-red-600' : ''}`} />
            <span>{isSaved ? 'Saved to Bookmarks' : 'Save Property'}</span>
          </button>

          {/* Report Listing */}
          <button
            id="btn-details-report-property"
            onClick={() => onReportProperty(property)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white text-stone-600 hover:text-red-600 border border-stone-200 hover:bg-red-50 transition shadow-xs cursor-pointer"
            title="Report inaccurate or scam listing"
          >
            <Flag className="w-4 h-4" />
            <span className="hidden sm:inline">Report Listing</span>
          </button>
        </div>
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden p-6 sm:p-8 space-y-8">
        {/* Title, Location & Price Header */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-stone-100">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-stone-100 text-stone-800">
                {property.propertyType}
              </span>
              <span
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                  property.status === 'AVAILABLE'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : property.status === 'RENTED'
                    ? 'bg-stone-200 text-stone-800'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {property.status === 'AVAILABLE'
                  ? '✓ Available for Rent'
                  : property.status === 'RENTED'
                  ? 'Rented Out'
                  : property.status.replace('_', ' ')}
              </span>
              {property.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Property
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 leading-tight">
              {property.title}
            </h1>

            <div className="flex items-center gap-2 text-sm text-stone-600">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-stone-800">{property.location.area}, Uyo</span>
              {property.location.landmark && (
                <>
                  <span className="text-stone-300">•</span>
                  <span>Landmark: {property.location.landmark}</span>
                </>
              )}
            </div>
          </div>

          {/* Pricing Box */}
          <div className="lg:text-right bg-stone-50 lg:bg-transparent p-4 lg:p-0 rounded-2xl border lg:border-0 border-stone-200">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              {property.pricing.monthlyRent
                ? `Rent (${property.pricing.paymentDurationMonths || 12} Months)`
                : 'Rent'}
            </div>
            <div className="text-3xl font-extrabold text-stone-900 mt-0.5">
              {formatNaira(property.pricing.rent)}
              <span className="text-sm font-medium text-stone-500 ml-1">
                / {property.pricing.rentalPeriod.toLowerCase()}
              </span>
            </div>
            {property.pricing.monthlyRent ? (
              <div className="text-xs text-stone-600 font-medium mt-0.5">
                {formatNaira(property.pricing.monthlyRent)}/month × {property.pricing.paymentDurationMonths || 12} mos
              </div>
            ) : null}
            {property.pricing.totalEstimatedFirstPayment && (
              <div className="mt-1 inline-block text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                Total Est. Move-in: {formatNaira(property.pricing.totalEstimatedFirstPayment)}
              </div>
            )}
          </div>
        </div>

        {/* Media Gallery Section */}
        <div className="space-y-3">
          {/* Category Tabs */}
          {categoriesAvailable.length > 2 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
              <span className="text-stone-400 font-medium shrink-0">Filter Photos:</span>
              {categoriesAvailable.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setActiveImageIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Main Hero Image Viewport */}
          <div className="relative aspect-16/9 sm:aspect-21/9 rounded-2xl overflow-hidden bg-stone-900 shadow-inner group">
            <img
              src={currentDisplayImage}
              alt={`${property.title} - ${filteredImages[activeImageIndex]?.category || 'View'}`}
              className="w-full h-full object-cover transition-transform duration-300"
            />

            {/* Image Overlay Badge */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="bg-stone-900/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full">
                {filteredImages[activeImageIndex]?.category || 'Exterior'}
              </span>
              <span className="bg-black/60 text-stone-200 text-xs px-2.5 py-1 rounded-full">
                {activeImageIndex + 1} / {filteredImages.length}
              </span>
            </div>

            {/* Navigation Arrows */}
            {filteredImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white flex items-center justify-center transition shadow-lg cursor-pointer"
                  title="Previous Photo"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white flex items-center justify-center transition shadow-lg cursor-pointer"
                  title="Next Photo"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails Row */}
          {filteredImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto py-1">
              {filteredImages.map((img, idx) => (
                <button
                  key={img.id || idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-emerald-600 ring-2 ring-emerald-600/30'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Property Specs Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 sm:p-6 bg-stone-50 rounded-2xl border border-stone-200 text-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-emerald-700 shadow-xs">
              <Bed className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-stone-500">Bedrooms</div>
              <div className="text-base font-bold text-stone-900">{property.bedrooms} Bedrooms</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-emerald-700 shadow-xs">
              <Bath className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-stone-500">Bathrooms</div>
              <div className="text-base font-bold text-stone-900">{property.bathrooms} Baths</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-emerald-700 shadow-xs">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-stone-500">Toilets</div>
              <div className="text-base font-bold text-stone-900">{property.toilets} Toilets</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-emerald-700 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-stone-500">Verification</div>
              <div className="text-base font-bold text-stone-900">
                {property.isVerified ? 'Verified Listing' : 'Pending'}
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Content Grid: Left (Description, Fees, Facilities, Approximate Location) & Right (Landlord & Actions) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div>
              <h3 className="text-lg font-bold text-stone-900 mb-3">About This Property</h3>
              <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line bg-stone-50/50 p-5 rounded-2xl border border-stone-100">
                {property.description}
              </p>
            </div>

            {/* Verified Facilities Checklist */}
            <div>
              <h3 className="text-lg font-bold text-stone-900 mb-3">Facilities & Amenities</h3>
              {(property.facilities || []).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(property.facilities || []).map((facility) => (
                    <div
                      key={facility}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200/70 text-xs font-semibold text-stone-800"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{facility}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-500 italic bg-stone-50 p-3 rounded-lg border border-stone-200">
                  Standard residential amenities included. Contact property representative for specific facility confirmations.
                </p>
              )}
            </div>

            {/* Fee Breakdown (Transparent Nigerian Model) */}
            <div>
              <h3 className="text-lg font-bold text-stone-900 mb-3">
                Nigerian Move-in Fee Breakdown
              </h3>
              <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="divide-y divide-stone-100 text-xs sm:text-sm">
                  <div className="px-5 py-3 grid grid-cols-2 bg-stone-50 font-semibold text-stone-700">
                    <span>Fee Component</span>
                    <span className="text-right">Amount (₦)</span>
                  </div>
                  <div className="px-5 py-3 grid grid-cols-2">
                    <span className="text-stone-600 font-medium">Base Rent</span>
                    <span className="text-right text-stone-900 font-bold">
                      {formatNaira(property.pricing.rent)}
                    </span>
                  </div>
                  {property.pricing.serviceCharge ? (
                    <div className="px-5 py-3 grid grid-cols-2">
                      <span className="text-stone-600">Service Charge</span>
                      <span className="text-right text-stone-800 font-medium">
                        {formatNaira(property.pricing.serviceCharge)}
                      </span>
                    </div>
                  ) : null}
                  {property.pricing.agreementFee ? (
                    <div className="px-5 py-3 grid grid-cols-2">
                      <span className="text-stone-600">Agreement Fee</span>
                      <span className="text-right text-stone-800 font-medium">
                        {formatNaira(property.pricing.agreementFee)}
                      </span>
                    </div>
                  ) : null}
                  {property.pricing.legalFee ? (
                    <div className="px-5 py-3 grid grid-cols-2">
                      <span className="text-stone-600">Legal / Documentation Fee</span>
                      <span className="text-right text-stone-800 font-medium">
                        {formatNaira(property.pricing.legalFee)}
                      </span>
                    </div>
                  ) : null}
                  {property.pricing.cautionDeposit ? (
                    <div className="px-5 py-3 grid grid-cols-2">
                      <span className="text-stone-600">Refundable Caution Deposit</span>
                      <span className="text-right text-stone-800 font-medium">
                        {formatNaira(property.pricing.cautionDeposit)}
                      </span>
                    </div>
                  ) : null}
                  {property.pricing.otherFees ? (
                    <div className="px-5 py-3 grid grid-cols-2">
                      <span className="text-stone-600">Other Miscellaneous Fees</span>
                      <span className="text-right text-stone-800 font-medium">
                        {formatNaira(property.pricing.otherFees)}
                      </span>
                    </div>
                  ) : null}
                  <div className="px-5 py-4 grid grid-cols-2 bg-emerald-50/90 font-bold text-emerald-950 text-sm sm:text-base border-t border-emerald-200">
                    <span>Total Estimated First Payment</span>
                    <span className="text-right text-emerald-900">
                      {formatNaira(property.pricing.totalEstimatedFirstPayment)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-stone-700">
                  <CreditCard className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span><strong>Physical Inspection Booking Fee:</strong> Set by host for this property</span>
                </div>
                <span className="font-extrabold text-stone-900 bg-white border border-stone-200 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                  {formatNaira(resolvedInspectionFee)}
                </span>
              </div>
            </div>

            {/* Approximate Neighborhood Location & Map */}
            <div>
              <h3 className="text-lg font-bold text-stone-900 mb-3">Location & Neighborhood</h3>
              <ApproximateLocationMap
                location={property.location}
                propertyTitle={property.title}
              />
            </div>
          </div>

          {/* Right Column (1/3): Landlord & Action Card */}
          <div className="space-y-6">
            {/* Listing Source Card */}
            {property.listingSource === 'AGENT' ? (
              <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6 space-y-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Listing Submitter
                  </h4>
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    Verified Agent Listing
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-800 text-white flex items-center justify-center text-xl font-bold shadow-md">
                    {(property.submittingAgentName || 'A').charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-bold text-stone-900 text-base">
                      {property.submittingAgentName || 'Professional Agent'}
                    </h5>
                    <p className="text-xs text-stone-600 font-medium">
                      {property.submittingAgentAgency || 'Licensed Intermediary'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Accredited Agent
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-stone-700 pt-3 border-t border-stone-200">
                  {currentUser?.role === 'ADMIN' && property.submittingAgentPhone && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 font-semibold">
                      <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
                      <span>Admin View (Agent Phone): {property.submittingAgentPhone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Agent managed • Represented landlord KYC verified</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-500">
                    <Lock className="w-4 h-4 text-stone-400 shrink-0" />
                    <span>In-app verified communication for tenant privacy</span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="space-y-3 pt-2 border-t border-stone-200">
                  {/* Message Agent */}
                  <button
                    id="btn-message-agent"
                    onClick={() => {
                      if (!currentUser && onOpenAuth) {
                        onOpenAuth();
                        return;
                      }
                      setShowMessagingModal(true);
                    }}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-white hover:bg-stone-100 text-stone-850 border border-stone-300 transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-700" />
                    <span>Message Agent Directly</span>
                  </button>

                  {/* Request Physical Inspection */}
                  <button
                    id="btn-request-inspection-agent"
                    onClick={() => {
                      if (!currentUser && onOpenAuth) {
                        onOpenAuth();
                        return;
                      }
                      setShowInspectionModal(true);
                    }}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-stone-900 hover:bg-stone-800 text-white transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>Schedule Physical Inspection ({formatNaira(resolvedInspectionFee)})</span>
                  </button>

                  {/* Apply to Rent */}
                  <button
                    id="btn-apply-to-rent-page"
                    onClick={() => onApplyToRent(property)}
                    disabled={property.status !== 'AVAILABLE'}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                      property.status === 'AVAILABLE'
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20'
                        : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>
                      {property.status === 'AVAILABLE' ? 'Apply for Tenancy' : 'Property Rented Out'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6 space-y-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Property Owner / Landlord
                  </h4>
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    Verified Landlord
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-xl font-bold shadow-md">
                    {property.landlordName.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-bold text-stone-900 text-base">{property.landlordName}</h5>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
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

                <div className="space-y-2 text-xs text-stone-700 pt-3 border-t border-stone-200">
                  {currentUser?.role === 'ADMIN' && property.landlordPhone && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 font-semibold">
                      <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
                      <span>Admin View (Landlord Phone): {property.landlordPhone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Direct landlord connection • Zero unauthorized middleman fees</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-500">
                    <Lock className="w-4 h-4 text-stone-400 shrink-0" />
                    <span>Contact details protected • Messaging inside platform</span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="space-y-3 pt-2 border-t border-stone-200">
                  {/* Message Landlord */}
                  <button
                    id="btn-message-landlord"
                    onClick={() => {
                      if (!currentUser && onOpenAuth) {
                        onOpenAuth();
                        return;
                      }
                      setShowMessagingModal(true);
                    }}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-white hover:bg-stone-100 text-stone-850 border border-stone-300 transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-700" />
                    <span>Message Landlord Directly</span>
                  </button>

                  {/* Request Physical Inspection */}
                  <button
                    id="btn-request-inspection-landlord"
                    onClick={() => {
                      if (!currentUser && onOpenAuth) {
                        onOpenAuth();
                        return;
                      }
                      setShowInspectionModal(true);
                    }}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-stone-900 hover:bg-stone-800 text-white transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>Schedule Physical Inspection ({formatNaira(resolvedInspectionFee)})</span>
                  </button>

                  {/* Apply to Rent */}
                  <button
                    id="btn-apply-to-rent-page"
                    onClick={() => onApplyToRent(property)}
                    disabled={property.status !== 'AVAILABLE'}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                      property.status === 'AVAILABLE'
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20'
                        : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>
                      {property.status === 'AVAILABLE' ? 'Apply for Tenancy' : 'Property Rented Out'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Safe Renting Notice in Uyo */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-5 text-xs text-emerald-950 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-emerald-900 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Verified Inspection Protocol</span>
              </div>
              <p className="text-emerald-800 leading-relaxed text-xs">
                Always inspect the apartment with the verified representative before signing tenancy agreements. Meeting instructions and exact address unlock upon inspection confirmation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Inspection Modal */}
      {showInspectionModal && (
        <RequestInspectionModal
          property={property}
          onClose={() => setShowInspectionModal(false)}
          onOpenAuth={onOpenAuth}
        />
      )}

      {/* Messaging Modal */}
      {showMessagingModal && (
        <DirectMessagingModal
          property={property}
          onClose={() => setShowMessagingModal(false)}
          onOpenAuth={onOpenAuth}
        />
      )}
    </div>
  );
};

