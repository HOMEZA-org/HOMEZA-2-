import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bath,
  Bed,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Eye,
  FileCheck2,
  History,
  Home,
  Info,
  Layers,
  MapPin,
  Phone,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Tag,
  User,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import { MediaCategory, Property } from '../../types';
import { formatNaira } from '../../config/platform';
import { Store } from '../../services/store';

interface AdminPropertyReviewModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (propertyId: string, newStatus: string) => void;
}

export const AdminPropertyReviewModal: React.FC<AdminPropertyReviewModalProps> = ({
  property,
  isOpen,
  onClose,
  onStatusUpdated,
}) => {
  if (!isOpen || !property) return null;

  // Image Gallery State
  const [selectedCategory, setSelectedCategory] = useState<MediaCategory | 'All'>('All');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  // Workflow Confirmation / Decision Modals
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionNote, setCorrectionNote] = useState('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  // Success / Error Feedback State
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'APPROVE' | 'REJECT' | 'CORRECTION' | 'ERROR';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'APPROVE',
  });

  // Processing state to prevent duplicate actions
  const [isProcessing, setIsProcessing] = useState(false);

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

  const nextImage = () => {
    if (filteredImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev + 1) % filteredImages.length);
  };

  const prevImage = () => {
    if (filteredImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev - 1 + filteredImages.length) % filteredImages.length);
  };

  // Handle Approve Confirmation
  const handleConfirmApproval = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      Store.approveProperty(property.id);
      setIsProcessing(false);
      setShowApproveConfirm(false);

      if (onStatusUpdated) {
        onStatusUpdated(property.id, 'APPROVED');
      }

      setFeedback({
        isOpen: true,
        title: 'Property Approved Successfully',
        message: property.listingSource === 'AGENT'
          ? `The agent-submitted property is now verified and live for tenants.`
          : 'The property is now visible to tenants.',
        type: 'APPROVE',
      });
    } catch (err: any) {
      console.error('Error approving property:', err);
      setIsProcessing(false);
      setShowApproveConfirm(false);
      setFeedback({
        isOpen: true,
        title: 'Approval Failed',
        message: 'An unexpected error occurred while approving the property. Please try again.',
        type: 'ERROR',
      });
    }
  };

  // Handle Reject Confirmation
  const handleConfirmRejection = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    if (!rejectionReason.trim()) {
      setRejectionError('Please provide a reason for rejecting this property.');
      return;
    }

    setIsProcessing(true);
    setRejectionError(null);

    try {
      Store.rejectProperty(property.id, rejectionReason.trim());
      setIsProcessing(false);
      setShowRejectModal(false);
      setRejectionReason('');

      if (onStatusUpdated) {
        onStatusUpdated(property.id, 'REJECTED');
      }

      setFeedback({
        isOpen: true,
        title: 'Property Rejected',
        message: property.listingSource === 'AGENT'
          ? 'The submitting agent has been notified with the rejection reason.'
          : 'The landlord has been notified of the rejection.',
        type: 'REJECT',
      });
    } catch (err: any) {
      console.error('Error rejecting property:', err);
      setIsProcessing(false);
      setShowRejectModal(false);
      setFeedback({
        isOpen: true,
        title: 'Rejection Failed',
        message: 'An error occurred while rejecting the property. Please try again.',
        type: 'ERROR',
      });
    }
  };

  // Handle Request Correction Confirmation
  const handleConfirmCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    if (!correctionNote.trim()) {
      setCorrectionError('Please specify the corrections required.');
      return;
    }

    setIsProcessing(true);
    setCorrectionError(null);

    try {
      Store.requestPropertyCorrection(property.id, correctionNote.trim());
      setIsProcessing(false);
      setShowCorrectionModal(false);
      setCorrectionNote('');

      if (onStatusUpdated) {
        onStatusUpdated(property.id, 'CORRECTION_REQUIRED');
      }

      setFeedback({
        isOpen: true,
        title: 'Correction Requested',
        message: property.listingSource === 'AGENT'
          ? 'The submitting agent has been notified with correction instructions and can fix & resubmit.'
          : 'The landlord has been notified with your correction instructions and can fix & resubmit.',
        type: 'CORRECTION',
      });
    } catch (err: any) {
      console.error('Error requesting property correction:', err);
      setIsProcessing(false);
      setShowCorrectionModal(false);
      setFeedback({
        isOpen: true,
        title: 'Action Failed',
        message: 'An error occurred while requesting property correction. Please try again.',
        type: 'ERROR',
      });
    }
  };

  const handleCloseFeedback = () => {
    setFeedback({ ...feedback, isOpen: false });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn">
      <div
        id="admin-property-review-modal"
        className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[94vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-900/60 border border-purple-700/60 flex items-center justify-center text-purple-300">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Property Review & Verification</h2>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    property.status === 'PENDING_REVIEW'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : property.status === 'APPROVED' || property.status === 'AVAILABLE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : property.status === 'REJECTED'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'bg-stone-700 text-stone-300'
                  }`}
                >
                  {property.status === 'PENDING_REVIEW'
                    ? 'Pending Review'
                    : property.status === 'APPROVED' || property.status === 'AVAILABLE'
                    ? 'Approved'
                    : property.status === 'REJECTED'
                    ? 'Rejected'
                    : property.status}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Submitted by {property.landlordName} on{' '}
                {new Date(property.createdAt).toLocaleDateString('en-NG', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <button
            id="btn-close-admin-review-modal"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Top Alert Banner for Rejection or Status Note */}
          {property.status === 'REJECTED' && property.adminRejectionReason && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-900 text-xs sm:text-sm">Currently Rejected</h4>
                <p className="text-xs text-red-700 mt-0.5">
                  <span className="font-semibold">Reason provided:</span> {property.adminRejectionReason}
                </p>
              </div>
            </div>
          )}

          {property.status === 'CORRECTION_REQUIRED' && property.adminCorrectionNote && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-950 text-xs sm:text-sm">Correction Requested by Admin</h4>
                <p className="text-xs text-amber-900 mt-0.5">
                  <span className="font-semibold">Instructions sent to landlord:</span> {property.adminCorrectionNote}
                </p>
                <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                  Awaiting Landlord Edits & Resubmission
                </span>
              </div>
            </div>
          )}

          {property.status === 'PENDING_REVIEW' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900 text-xs sm:text-sm">Pending Verification</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  This property is currently hidden from tenants. Carefully review all specs, location accuracy, photos, and landlord info below before approving, requesting correction, or rejecting.
                </p>
              </div>
            </div>
          )}

          {/* Photo Gallery & Video Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <span>Submitted Property Photos ({property.images.length})</span>
                {property.videos && property.videos.length > 0 && (
                  <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    + Walkthrough Video
                  </span>
                )}
              </h3>

              {/* Photo categories filter */}
              <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
                {categoriesAvailable.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setActiveImageIndex(0);
                      setShowVideo(false);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat && !showVideo
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}

                {property.videos && property.videos.length > 0 && (
                  <button
                    onClick={() => setShowVideo(true)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                      showVideo
                        ? 'bg-purple-800 text-white'
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                    }`}
                  >
                    <Video className="w-3 h-3" />
                    <span>Watch Video</span>
                  </button>
                )}
              </div>
            </div>

            {/* Main Image Display / Video Frame */}
            <div className="relative aspect-16/9 bg-stone-900 rounded-2xl overflow-hidden shadow-inner border border-stone-200 flex items-center justify-center">
              {showVideo && property.videos && property.videos.length > 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-stone-950 text-white">
                  <Video className="w-12 h-12 text-purple-400 mb-2" />
                  <p className="font-semibold text-sm">Walkthrough Video Link</p>
                  <p className="text-xs text-stone-400 max-w-md truncate mt-1">
                    {property.videos[0].url}
                  </p>
                  <a
                    href={property.videos[0].url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Open Video in New Tab</span>
                  </a>
                </div>
              ) : (
                <>
                  <img
                    src={currentDisplayImage}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />

                  {filteredImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-stone-950/60 hover:bg-stone-950/80 text-white transition cursor-pointer"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-stone-950/60 hover:bg-stone-950/80 text-white transition cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {filteredImages[activeImageIndex] && (
                    <div className="absolute bottom-3 left-3 bg-stone-950/75 backdrop-blur-xs text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <span className="font-bold">
                        {filteredImages[activeImageIndex].category}
                      </span>
                      {filteredImages[activeImageIndex].caption && (
                        <>
                          <span>•</span>
                          <span className="text-stone-300">
                            {filteredImages[activeImageIndex].caption}
                          </span>
                        </>
                      )}
                      {filteredImages[activeImageIndex].isCover && (
                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          Cover Image
                        </span>
                      )}
                    </div>
                  )}

                  <div className="absolute bottom-3 right-3 bg-stone-950/75 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-lg font-mono">
                    {activeImageIndex + 1} / {filteredImages.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {!showVideo && filteredImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {filteredImages.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                      activeImageIndex === idx ? 'border-emerald-600 scale-105' : 'border-stone-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    {img.isCover && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full"></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Two-Column Property Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Column 1: Core Property Details & Location */}
            <div className="space-y-6">
              {/* Basic Specs */}
              <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-3">
                <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider text-stone-500">
                  Listing Overview & Configuration
                </h4>

                <div>
                  <h3 className="text-lg font-bold text-stone-900">{property.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-stone-200 text-stone-800">
                      {property.propertyType}
                    </span>
                    <span className="text-xs text-stone-500">
                      Status: <strong className="text-stone-800">{property.status}</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-200">
                  <div className="bg-white p-3 rounded-xl border border-stone-200 text-center">
                    <Bed className="w-4 h-4 text-emerald-700 mx-auto mb-1" />
                    <div className="text-xs text-stone-500 font-medium">Bedrooms</div>
                    <div className="font-bold text-stone-900 text-sm">{property.bedrooms}</div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-stone-200 text-center">
                    <Bath className="w-4 h-4 text-emerald-700 mx-auto mb-1" />
                    <div className="text-xs text-stone-500 font-medium">Bathrooms</div>
                    <div className="font-bold text-stone-900 text-sm">{property.bathrooms}</div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-stone-200 text-center">
                    <Layers className="w-4 h-4 text-emerald-700 mx-auto mb-1" />
                    <div className="text-xs text-stone-500 font-medium">Toilets</div>
                    <div className="font-bold text-stone-900 text-sm">{property.toilets}</div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-xs font-bold text-stone-700 mb-1">Description:</div>
                  <p className="text-xs text-stone-600 leading-relaxed bg-white p-3 rounded-xl border border-stone-200 whitespace-pre-line">
                    {property.description || 'No detailed description provided.'}
                  </p>
                </div>
              </div>

              {/* Exact Location & Landmarks */}
              <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-3">
                <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  <span>Property Location & Street Address</span>
                </h4>

                <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Area / Neighbourhood:</span>
                    <span className="font-bold text-stone-900">{property.location.area}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">City / State:</span>
                    <span className="font-bold text-stone-900">
                      {property.location.city || 'Uyo'}, {property.location.state || 'Akwa Ibom State'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Street Address:</span>
                    <span className="font-bold text-stone-900 text-right">
                      {property.location.street || 'Not provided'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-stone-500">Nearest Landmark:</span>
                    <span className="font-bold text-stone-900 text-right">
                      {property.location.landmark || 'None specified'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Financial Breakdown & Amenities & Landlord */}
            <div className="space-y-6">
              {/* Financial & Fee Schedule */}
              <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-3">
                <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                  <span>Financial & Rental Pricing Breakdown</span>
                </h4>

                <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-stone-100">
                    <span className="text-stone-600 font-medium">Rent:</span>
                    <span className="text-base font-bold text-emerald-800">
                      {formatNaira(property.pricing.rent)}{' '}
                      <span className="text-xs font-normal text-stone-500">
                        / {property.pricing.rentalPeriod}
                      </span>
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Service Charge:</span>
                    <span className="font-semibold text-stone-800">
                      {formatNaira(property.pricing.serviceCharge || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Caution Deposit:</span>
                    <span className="font-semibold text-stone-800">
                      {formatNaira(property.pricing.cautionDeposit || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Agreement Fee:</span>
                    <span className="font-semibold text-stone-800">
                      {formatNaira(property.pricing.agreementFee || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Legal / Stamp Fee:</span>
                    <span className="font-semibold text-stone-800">
                      {formatNaira(property.pricing.legalFee || 0)}
                    </span>
                  </div>

                  {property.pricing.otherFees ? (
                    <div className="flex justify-between py-1 border-b border-stone-100">
                      <span className="text-stone-500">Other Fees:</span>
                      <span className="font-semibold text-stone-800">
                        {formatNaira(property.pricing.otherFees)}
                      </span>
                    </div>
                  ) : null}

                  {/* Physical Inspection Fee */}
                  <div className="flex justify-between items-center py-2 border-b border-stone-100 bg-stone-50/80 -mx-1 px-2 rounded-lg">
                    <div>
                      <span className="text-stone-700 font-bold block">Inspection Booking Fee:</span>
                      <span className="text-[10px] text-stone-500">Charged to tenants per physical inspection booking (allowed: ₦3,000 – ₦5,000)</span>
                    </div>
                    {(() => {
                      const fee = property.inspectionFee ?? property.pricing?.inspectionFee;
                      const feeNum = Number(fee);
                      const isInvalid = fee === undefined || fee === null || isNaN(feeNum) || feeNum < 3000 || feeNum > 5000;
                      if (isInvalid) {
                        return (
                          <div className="text-right">
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-700" />
                              <span>Invalid Fee</span>
                            </span>
                            <div className="text-[10px] text-amber-800 font-semibold mt-0.5">
                              {fee !== undefined && fee !== null ? `${formatNaira(feeNum)}` : 'Not configured'}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-stone-900">{formatNaira(feeNum)}</span>
                          <span className="block text-[9px] font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-1.5 py-0.2 rounded mt-0.5">
                            Valid (₦3,000 – ₦5,000)
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex justify-between items-center pt-2 text-stone-900 font-bold bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                    <span>Total Est. Move-in Payment:</span>
                    <span className="text-sm text-emerald-900">
                      {formatNaira(property.pricing.totalEstimatedFirstPayment || property.pricing.rent)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amenities / Facilities */}
              <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-3">
                <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider text-stone-500">
                  Facilities & Amenities ({property.facilities.length})
                </h4>

                <div className="flex flex-wrap gap-1.5">
                  {property.facilities.map((fac) => (
                    <span
                      key={fac}
                      className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{fac}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Submitter & Landlord Profile Card */}
              {property.listingSource === 'AGENT' || property.submittingAgentId ? (
                <div className="space-y-4">
                  {/* Verified Agent Card */}
                  <div className="bg-purple-50/80 rounded-2xl p-5 border border-purple-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-purple-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-purple-700" />
                        <span>Submitting Real Estate Agent</span>
                      </h4>
                      <span className="bg-purple-200 text-purple-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        AGENT SUBMISSION
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-purple-100 space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-purple-50">
                        <span className="text-stone-500">Agent Full Name:</span>
                        <span className="font-bold text-stone-900">
                          {property.submittingAgentName || 'Registered Agent'}
                        </span>
                      </div>

                      {property.submittingAgentAgency && (
                        <div className="flex justify-between py-1 border-b border-purple-50">
                          <span className="text-stone-500">Agency / Firm:</span>
                          <span className="font-semibold text-purple-900">
                            {property.submittingAgentAgency}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between py-1 border-b border-purple-50">
                        <span className="text-stone-500">Agent Phone:</span>
                        <span className="font-semibold text-stone-900">
                          {property.submittingAgentPhone || property.landlordPhone}
                        </span>
                      </div>

                      <div className="flex justify-between py-1">
                        <span className="text-stone-500">Agent Verification Status:</span>
                        <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800">
                          {property.submittingAgentVerificationStatus || 'APPROVED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Represented Landlord / Property Owner */}
                  <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-3">
                    <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-emerald-700" />
                      <span>Represented Property Owner / Landlord</span>
                    </h4>

                    <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <span className="text-stone-500">Landlord / Owner Name:</span>
                        <span className="font-bold text-stone-900">{property.landlordName}</span>
                      </div>

                      <div className="flex justify-between py-1">
                        <span className="text-stone-500">Landlord Phone:</span>
                        <span className="font-semibold text-stone-900">{property.landlordPhone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Landlord Direct Submission */
                <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-emerald-700" />
                      <span>Landlord Profile & Information</span>
                    </h4>
                    <span className="bg-stone-200 text-stone-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      LANDLORD DIRECT
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-stone-100">
                      <span className="text-stone-500">Landlord Name:</span>
                      <span className="font-bold text-stone-900">{property.landlordName}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-stone-100">
                      <span className="text-stone-500">Phone Number:</span>
                      <span className="font-semibold text-stone-900">{property.landlordPhone}</span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-stone-500">Account KYC Status:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          property.landlordVerificationStatus === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : property.landlordVerificationStatus === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {property.landlordVerificationStatus || 'PENDING'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Verification & Moderation History */}
              <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-3">
                <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-purple-700" />
                  <span>Verification & Audit History</span>
                </h4>

                {property.verificationHistory && property.verificationHistory.length > 0 ? (
                  <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-stone-200">
                    {property.verificationHistory.map((h, idx) => (
                      <div
                        key={h.id || idx}
                        className="text-xs pb-2.5 border-b border-stone-100 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                              h.action === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : h.action === 'REJECTED'
                                ? 'bg-red-100 text-red-800'
                                : h.action === 'CORRECTION_REQUESTED'
                                ? 'bg-amber-100 text-amber-800'
                                : h.action === 'RESUBMITTED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {h.action.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            {new Date(h.timestamp).toLocaleString('en-NG', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        <div className="text-stone-500 text-[11px] mt-1">
                          By: <strong className="text-stone-700">{h.actorName}</strong> ({h.actorRole})
                        </div>
                        {(h.notes || (h as any).note) && (
                          <div className="mt-1 p-2 bg-stone-50 rounded-lg text-stone-700 text-[11px] italic border border-stone-100">
                            "{h.notes || (h as any).note}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-3.5 rounded-xl border border-stone-200 text-xs text-stone-500 text-center">
                    Listing submitted on {new Date(property.createdAt).toLocaleDateString('en-NG')}. Initial verification pending.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Decision Actions Footer */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-stone-500 text-center sm:text-left">
            <span>Property Status: </span>
            <strong className="text-stone-900">{property.status}</strong>
            {property.status === 'PENDING_REVIEW' && (
              <span className="text-amber-700 ml-1 font-semibold">• Action required to publish listing</span>
            )}
            {property.status === 'CORRECTION_REQUIRED' && (
              <span className="text-amber-800 ml-1 font-semibold">• Awaiting landlord changes</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Close
            </button>

            {/* Request Correction Button */}
            {property.status !== 'REJECTED' && (
              <button
                id="btn-admin-modal-request-correction"
                onClick={() => {
                  setCorrectionNote(property.adminCorrectionNote || '');
                  setCorrectionError(null);
                  setShowCorrectionModal(true);
                }}
                disabled={isProcessing}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4 text-amber-700" />
                <span>Request Correction</span>
              </button>
            )}

            {/* Reject Button */}
            {property.status !== 'REJECTED' && (
              <button
                id="btn-admin-modal-reject"
                onClick={() => {
                  setRejectionReason(property.adminRejectionReason || '');
                  setRejectionError(null);
                  setShowRejectModal(true);
                }}
                disabled={isProcessing}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Property</span>
              </button>
            )}

            {/* Approve Button */}
            {property.status !== 'APPROVED' && property.status !== 'AVAILABLE' && (
              <button
                id="btn-admin-modal-approve"
                onClick={() => setShowApproveConfirm(true)}
                disabled={isProcessing}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Property</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. APPROVAL CONFIRMATION MODAL */}
        {showApproveConfirm && (
          <div className="fixed inset-0 z-60 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-bold text-stone-900">Approve Property?</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Are you sure you want to approve this property? Once approved, it will become available to tenants.
                </p>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
                <div className="font-bold text-stone-900 truncate">{property.title}</div>
                <div className="text-stone-500">
                  {property.location.area}, Uyo • {formatNaira(property.pricing.rent)} / {property.pricing.rentalPeriod.toLowerCase()}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApproveConfirm(false)}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-approve-modal"
                  onClick={handleConfirmApproval}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span>Approving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Approval</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. REJECTION MODAL WITH REQUIRED REASON */}
        {showRejectModal && (
          <div className="fixed inset-0 z-60 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-200 bg-red-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-700" />
                  <h3 className="font-bold text-stone-900 text-base">Reject Property</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmRejection} className="p-6 space-y-4">
                <p className="text-xs text-stone-600 leading-relaxed">
                  Please provide a reason for rejecting this property.
                </p>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-900">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="input-rejection-reason"
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => {
                      setRejectionReason(e.target.value);
                      if (rejectionError) setRejectionError(null);
                    }}
                    placeholder="e.g., Photos are blurry or mismatched with street address; pricing breakdown contains undisclosed fees; duplicate listing."
                    className="w-full text-xs p-3 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 resize-none"
                  />
                  {rejectionError && (
                    <p className="text-xs text-red-600 font-semibold">{rejectionError}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(false)}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-confirm-reject-modal"
                    disabled={isProcessing || !rejectionReason.trim()}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <span>Rejecting...</span>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Reject Property</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. CORRECTION REQUEST MODAL */}
        {showCorrectionModal && (
          <div className="fixed inset-0 z-60 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-200 bg-amber-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-amber-700" />
                  <h3 className="font-bold text-stone-900 text-base">Request Property Correction</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmCorrection} className="p-6 space-y-4">
                <p className="text-xs text-stone-600 leading-relaxed">
                  Specify clearly what the landlord needs to adjust, clarify, or re-upload (e.g. clearer compound pictures, update pricing breakdown, verify meter type).
                </p>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-900">
                    Required Corrections / Instructions <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="input-correction-note"
                    rows={4}
                    value={correctionNote}
                    onChange={(e) => {
                      setCorrectionNote(e.target.value);
                      if (correctionError) setCorrectionError(null);
                    }}
                    placeholder="e.g. Please upload at least one clear photo of the master bedroom and verify the annual service charge breakdown."
                    className="w-full text-xs p-3 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600 resize-none"
                  />
                  {correctionError && (
                    <p className="text-xs text-red-600 font-semibold">{correctionError}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCorrectionModal(false)}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-confirm-correction-modal"
                    disabled={isProcessing || !correctionNote.trim()}
                    className="flex-1 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>Send Request to Landlord</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. SUCCESS / ERROR FEEDBACK DIALOG */}
        {feedback.isOpen && (
          <div className="fixed inset-0 z-70 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden p-6 space-y-4 text-center">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                  feedback.type === 'APPROVE'
                    ? 'bg-emerald-100 text-emerald-700'
                    : feedback.type === 'REJECT'
                    ? 'bg-red-100 text-red-700'
                    : feedback.type === 'CORRECTION'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-stone-100 text-stone-700'
                }`}
              >
                {feedback.type === 'APPROVE' ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : feedback.type === 'REJECT' ? (
                  <XCircle className="w-8 h-8" />
                ) : feedback.type === 'CORRECTION' ? (
                  <RotateCcw className="w-8 h-8 text-amber-700" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-stone-700" />
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-stone-900">{feedback.title}</h3>
                <p className="text-xs text-stone-600 leading-relaxed">{feedback.message}</p>
              </div>

              <button
                type="button"
                id="btn-feedback-modal-done"
                onClick={handleCloseFeedback}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
