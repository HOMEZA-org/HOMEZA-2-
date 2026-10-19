import React, { useState, useRef } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  DollarSign,
  Image as ImageIcon,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
  ALL_FACILITIES,
  ALL_PROPERTY_TYPES,
  formatNaira,
  MEDIA_CATEGORIES,
} from '../../config/platform';
import {
  AgentUser,
  FacilityName,
  LandlordUser,
  LocationArea,
  MediaCategory,
  Property,
  PropertyImage,
  PropertyStatus,
  PropertyType,
  RentalPeriod,
} from '../../types';
import { Store } from '../../services/store';
import { MonetaryInputField } from '../common/MonetaryInputField';
import { validateMonetaryAmount } from '../../utils/monetaryValidation';
import { validatePropertyPhotos } from '../../utils/formValidation';
import { DuplicatePropertyModal } from '../common/DuplicatePropertyModal';
import { checkPropertyDuplicates, DuplicateDetectionResult } from '../../utils/duplicateDetection';

interface AddEditPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  landlord?: LandlordUser;
  agent?: AgentUser;
  propertyToEdit?: Property | null;
  locations: LocationArea[];
  onSuccess?: () => void;
}

export const AddEditPropertyModal: React.FC<AddEditPropertyModalProps> = ({
  isOpen,
  onClose,
  landlord,
  agent,
  propertyToEdit,
  locations,
  onSuccess,
}) => {
  // Form State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Submitter details
  const isAgentSubmitter = Boolean(agent && (!landlord || agent.id === (propertyToEdit?.submittingAgentId || agent.id)));
  const [representedLandlordName, setRepresentedLandlordName] = useState(
    propertyToEdit?.landlordName || (isAgentSubmitter ? '' : landlord?.fullName || '')
  );
  const [representedLandlordPhone, setRepresentedLandlordPhone] = useState(
    propertyToEdit?.landlordPhone || (isAgentSubmitter ? '' : landlord?.phoneNumber || '')
  );

  // 1. Basic Info
  const [title, setTitle] = useState(propertyToEdit?.title || '');
  const [propertyType, setPropertyType] = useState<PropertyType>(
    propertyToEdit?.propertyType || '2-bedroom'
  );
  const [description, setDescription] = useState(propertyToEdit?.description || '');
  const [bedrooms, setBedrooms] = useState<number>(propertyToEdit?.bedrooms ?? 2);
  const [bathrooms, setBathrooms] = useState<number>(propertyToEdit?.bathrooms ?? 2);
  const [toilets, setToilets] = useState<number>(propertyToEdit?.toilets ?? 2);

  // 2. Location
  const [city, setCity] = useState(propertyToEdit?.location.city || 'Uyo');
  const [area, setArea] = useState(propertyToEdit?.location.area || 'Ewet Housing Estate');
  const [street, setStreet] = useState(propertyToEdit?.location.street || '');
  const [landmark, setLandmark] = useState(propertyToEdit?.location.landmark || '');

  // 3. Pricing State (stored as strings for non-lossy input & strict whole-number regex validation)
  const [rent, setRent] = useState<string>(
    propertyToEdit?.pricing.rent ? String(propertyToEdit.pricing.rent) : '1000000'
  );
  const [rentalPeriod, setRentalPeriod] = useState<RentalPeriod>(
    propertyToEdit?.pricing.rentalPeriod || 'Per Annum'
  );
  const [serviceCharge, setServiceCharge] = useState<string>(
    propertyToEdit?.pricing.serviceCharge ? String(propertyToEdit.pricing.serviceCharge) : ''
  );
  const [agreementFee, setAgreementFee] = useState<string>(
    propertyToEdit?.pricing.agreementFee ? String(propertyToEdit.pricing.agreementFee) : '100000'
  );
  const [legalFee, setLegalFee] = useState<string>(
    propertyToEdit?.pricing.legalFee ? String(propertyToEdit.pricing.legalFee) : '100000'
  );
  const [cautionDeposit, setCautionDeposit] = useState<string>(
    propertyToEdit?.pricing.cautionDeposit ? String(propertyToEdit.pricing.cautionDeposit) : '100000'
  );
  const [otherFees, setOtherFees] = useState<string>(
    propertyToEdit?.pricing.otherFees ? String(propertyToEdit.pricing.otherFees) : ''
  );
  const [inspectionFee, setInspectionFee] = useState<string>(
    propertyToEdit?.inspectionFee
      ? String(propertyToEdit.inspectionFee)
      : propertyToEdit?.pricing?.inspectionFee
      ? String(propertyToEdit.pricing.inspectionFee)
      : '3000'
  );

  // 4. Facilities & Media & Availability
  const [selectedFacilities, setSelectedFacilities] = useState<FacilityName[]>(
    propertyToEdit?.facilities || [
      'Tiled floor',
      'POP ceiling',
      'Borehole',
      'Water supply',
      'Electricity',
      'Prepaid meter',
      'Parking',
      'Fenced compound',
      'Security',
    ]
  );

  const [images, setImages] = useState<PropertyImage[]>(
    propertyToEdit?.images || []
  );

  const [videoUrl, setVideoUrl] = useState<string>(propertyToEdit?.videos?.[0]?.url || '');
  const [status, setStatus] = useState<PropertyStatus>(propertyToEdit?.status || 'AVAILABLE');
  const [error, setError] = useState<string | null>(null);
  const [resubmitMessage, setResubmitMessage] = useState('');
  const [submittedProperty, setSubmittedProperty] = useState<Property | null>(null);
  const [duplicateResult, setDuplicateResult] = useState<DuplicateDetectionResult | null>(null);
  const [pendingCandidate, setPendingCandidate] = useState<Property | null>(null);

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Image Add state
  const [newImgUrl, setNewImgUrl] = useState('');
  const [newImgCategory, setNewImgCategory] = useState<MediaCategory>('Living room');
  const [newImgCaption, setNewImgCaption] = useState('');

  if (!isOpen) return null;

  const isCorrectionMode = propertyToEdit?.status === 'CORRECTION_REQUIRED';

  // Photo validation
  const photoValidation = validatePropertyPhotos(images, 2);

  // Live Monetary Validations
  const rentValidation = validateMonetaryAmount(rent, { fieldName: 'Rent Amount', isRequired: true });
  const serviceChargeValidation = validateMonetaryAmount(serviceCharge, { fieldName: 'Service Charge', isRequired: false });
  const agreementFeeValidation = validateMonetaryAmount(agreementFee, { fieldName: 'Agreement Fee', isRequired: false });
  const legalFeeValidation = validateMonetaryAmount(legalFee, { fieldName: 'Legal Fee', isRequired: false });
  const cautionDepositValidation = validateMonetaryAmount(cautionDeposit, { fieldName: 'Caution Deposit', isRequired: false });
  const otherFeesValidation = validateMonetaryAmount(otherFees, { fieldName: 'Other Fees', isRequired: false });

  // Inspection Fee Validation (₦3,000 minimum, ₦5,000 maximum)
  const inspectionFeeTrimmed = inspectionFee.trim();
  const inspectionFeeNum = Number(inspectionFeeTrimmed);
  const isInspectionFeeValid =
    inspectionFeeTrimmed !== '' &&
    !isNaN(inspectionFeeNum) &&
    Number.isInteger(inspectionFeeNum) &&
    inspectionFeeNum >= 3000 &&
    inspectionFeeNum <= 5000;

  const inspectionFeeError = !inspectionFeeTrimmed
    ? 'Inspection fee is required'
    : isNaN(inspectionFeeNum) || !Number.isInteger(inspectionFeeNum)
    ? 'Enter a valid whole-number amount'
    : inspectionFeeNum < 3000
    ? 'Inspection fee must be at least ₦3,000 (minimum allowed)'
    : inspectionFeeNum > 5000
    ? 'Inspection fee cannot exceed ₦5,000 (maximum allowed)'
    : null;

  const isAllPricingValid =
    rentValidation.isValid &&
    serviceChargeValidation.isValid &&
    agreementFeeValidation.isValid &&
    legalFeeValidation.isValid &&
    cautionDepositValidation.isValid &&
    otherFeesValidation.isValid &&
    isInspectionFeeValid;

  // Calculate total moving package ONLY if all pricing inputs are strictly valid
  const totalEstimatedCost = isAllPricingValid
    ? rentValidation.numericValue +
      serviceChargeValidation.numericValue +
      agreementFeeValidation.numericValue +
      legalFeeValidation.numericValue +
      cautionDepositValidation.numericValue +
      otherFeesValidation.numericValue
    : 0;

  const toggleFacility = (facility: FacilityName) => {
    if (selectedFacilities.includes(facility)) {
      setSelectedFacilities(selectedFacilities.filter((f) => f !== facility));
    } else {
      setSelectedFacilities([...selectedFacilities, facility]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files) as File[];
    fileList.forEach((file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = event.target?.result as string;
        if (resultUrl) {
          setImages((prev) => [
            ...prev,
            {
              id: 'img-upload-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              url: resultUrl,
              category: newImgCategory,
              caption: `${newImgCategory} Photo`,
              isCover: prev.length === 0,
            },
          ]);
          setError(null);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddCustomImage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newImgUrl.trim()) return;
    setImages((prev) => [
      ...prev,
      {
        id: 'img-' + Date.now(),
        url: newImgUrl.trim(),
        category: newImgCategory,
        caption: newImgCaption.trim() || `${newImgCategory} View`,
        isCover: prev.length === 0,
      },
    ]);
    setNewImgUrl('');
    setNewImgCaption('');
    setError(null);
  };

  const handleRemoveImage = (imgId: string) => {
    setImages(images.filter((img) => img.id !== imgId));
  };

  const handleSetCoverImage = (imgId: string) => {
    setImages(images.map((img) => ({ ...img, isCover: img.id === imgId })));
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      if (!title.trim()) {
        setError('Please provide a property title.');
        return;
      }
      if (isAgentSubmitter && !representedLandlordName.trim()) {
        setError('Please provide the property owner or landlord full name.');
        return;
      }
    }
    if (step === 2) {
      if (!street.trim()) {
        setError('Please provide a street location in Uyo.');
        return;
      }
    }
    if (step === 3) {
      if (!rentValidation.isValid) {
        setError(rentValidation.error || 'Enter a valid whole-number rent amount greater than 0.');
        return;
      }
      if (!serviceChargeValidation.isValid) {
        setError(serviceChargeValidation.error || 'Invalid Service Charge. Leave empty if ₦0.');
        return;
      }
      if (!agreementFeeValidation.isValid) {
        setError(agreementFeeValidation.error || 'Invalid Agreement Fee. Leave empty if ₦0.');
        return;
      }
      if (!legalFeeValidation.isValid) {
        setError(legalFeeValidation.error || 'Invalid Legal Fee. Leave empty if ₦0.');
        return;
      }
      if (!cautionDepositValidation.isValid) {
        setError(cautionDepositValidation.error || 'Invalid Caution Deposit. Leave empty if ₦0.');
        return;
      }
      if (!otherFeesValidation.isValid) {
        setError(otherFeesValidation.error || 'Invalid Other Fees. Leave empty if ₦0.');
        return;
      }
      if (!isInspectionFeeValid) {
        setError(inspectionFeeError || 'Inspection fee must be between ₦3,000 and ₦5,000.');
        return;
      }
    }
    setStep((step + 1) as any);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !street.trim()) {
      setError('Please provide a property title and street location.');
      return;
    }

    if (!rentValidation.isValid) {
      setError(rentValidation.error || 'Rent amount must be a positive whole number greater than 0.');
      return;
    }

    if (!isInspectionFeeValid) {
      setError(inspectionFeeError || 'Inspection fee must be between ₦3,000 and ₦5,000.');
      return;
    }

    if (!serviceChargeValidation.isValid) {
      setError(serviceChargeValidation.error || 'Service Charge must be a positive whole number or left empty.');
      return;
    }

    if (!agreementFeeValidation.isValid) {
      setError(agreementFeeValidation.error || 'Agreement Fee must be a positive whole number or left empty.');
      return;
    }

    if (!legalFeeValidation.isValid) {
      setError(legalFeeValidation.error || 'Legal Fee must be a positive whole number or left empty.');
      return;
    }

    if (!cautionDepositValidation.isValid) {
      setError(cautionDepositValidation.error || 'Caution Deposit must be a positive whole number or left empty.');
      return;
    }

    if (!otherFeesValidation.isValid) {
      setError(otherFeesValidation.error || 'Other Fees must be a positive whole number or left empty.');
      return;
    }

    if (!photoValidation.isValid) {
      setError(
        photoValidation.error ||
          'Please upload at least 2 real property photos before submitting this listing.'
      );
      return;
    }

    if (isAgentSubmitter && !representedLandlordName.trim()) {
      setError('Please provide the property owner or landlord name.');
      return;
    }

    const landlordId = landlord?.id || propertyToEdit?.landlordId || ('landlord-rep-' + Date.now());
    const landlordName = representedLandlordName.trim() || landlord?.fullName || agent?.fullName || 'Property Owner';
    const landlordPhone = representedLandlordPhone.trim() || landlord?.phoneNumber || agent?.phoneNumber || '08000000000';
    const landlordVerificationStatus = landlord?.verificationStatus || propertyToEdit?.landlordVerificationStatus || 'VERIFIED';

    const newProperty: Property = {
      id: propertyToEdit?.id || 'prop-' + Date.now(),
      landlordId,
      landlordName,
      landlordPhone,
      landlordVerificationStatus,
      // Agent-specific fields if submitted by agent
      listingSource: isAgentSubmitter ? 'AGENT' : 'LANDLORD',
      submittingAgentId: isAgentSubmitter && agent ? agent.id : propertyToEdit?.submittingAgentId,
      submittingAgentName: isAgentSubmitter && agent ? agent.fullName : propertyToEdit?.submittingAgentName,
      submittingAgentAgency: isAgentSubmitter && agent ? agent.agencyName : propertyToEdit?.submittingAgentAgency,
      submittingAgentPhone: isAgentSubmitter && agent ? agent.phoneNumber : propertyToEdit?.submittingAgentPhone,
      submittingAgentVerificationStatus: isAgentSubmitter && agent ? agent.verificationStatus : propertyToEdit?.submittingAgentVerificationStatus,
      title: title.trim(),
      propertyType,
      description: description.trim() || `${bedrooms} bedroom ${propertyType} located in ${area}, Uyo.`,
      bedrooms,
      bathrooms,
      toilets,
      location: {
        state: 'Akwa Ibom State',
        city,
        area,
        street: street.trim(),
        landmark: landmark.trim(),
      },
      pricing: {
        rent: rentValidation.numericValue,
        rentalPeriod,
        serviceCharge: serviceChargeValidation.numericValue,
        agreementFee: agreementFeeValidation.numericValue,
        legalFee: legalFeeValidation.numericValue,
        cautionDeposit: cautionDepositValidation.numericValue,
        otherFees: otherFeesValidation.numericValue,
        inspectionFee: inspectionFeeNum,
        totalEstimatedFirstPayment: totalEstimatedCost,
      },
      inspectionFee: inspectionFeeNum,
      facilities: selectedFacilities,
      images,
      videos: videoUrl ? [{ id: 'vid-1', url: videoUrl.trim(), title: 'Walkthrough Video' }] : [],
      status: isCorrectionMode
        ? 'PENDING_REVIEW'
        : propertyToEdit
        ? status
        : 'PENDING_REVIEW',
      isVerified: isCorrectionMode ? false : propertyToEdit ? propertyToEdit.isVerified : false,
      adminCorrectionNote: isCorrectionMode ? undefined : propertyToEdit?.adminCorrectionNote,
      adminRejectionReason: propertyToEdit?.adminRejectionReason,
      verificationHistory: propertyToEdit?.verificationHistory,
      viewsCount: propertyToEdit?.viewsCount || 0,
      createdAt: propertyToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isCorrectionMode) {
      Store.resubmitProperty(
        newProperty,
        resubmitMessage.trim() || `${isAgentSubmitter ? 'Agent' : 'Landlord'} updated corrections and resubmitted listing for admin verification.`
      );
      setSubmittedProperty(newProperty);
    } else if (propertyToEdit) {
      Store.updateProperty(newProperty);
      setSubmittedProperty(newProperty);
    } else {
      // Check for duplicate listings before adding
      const duplicateCheck = checkPropertyDuplicates(newProperty, Store.getProperties());
      if (duplicateCheck.isDuplicate) {
        setDuplicateResult(duplicateCheck);
        setPendingCandidate(newProperty);
        return;
      }
      Store.addProperty(newProperty);
      setSubmittedProperty(newProperty);
    }
  };

  const handleConfirmProceedDuplicate = () => {
    if (!pendingCandidate) return;
    try {
      Store.addProperty(pendingCandidate);
      setSubmittedProperty(pendingCandidate);
      setDuplicateResult(null);
      setPendingCandidate(null);
    } catch (err: any) {
      setDuplicateResult(null);
      setError(err.message || 'Property creation was blocked.');
    }
  };

  const handleFinish = () => {
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div
        id="add-edit-property-modal"
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center ${isAgentSubmitter ? 'bg-purple-700' : 'bg-emerald-700'}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                {propertyToEdit ? 'Edit Property Listing' : isAgentSubmitter ? 'Submit Property Listing (Verified Agent)' : 'List a New Property for Rent'}
              </h2>
              <p className="text-xs text-stone-500">
                {isAgentSubmitter ? (
                  <span>
                    Submitting Agent: <strong className="text-purple-900">{agent?.fullName}</strong> ({agent?.agencyName || 'Registered Agency'})
                  </span>
                ) : (
                  <span>
                    {landlord?.fullName || 'Property Landlord'} • {landlord?.businessName || 'Property Owner'}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex border-b border-stone-200 bg-white text-xs font-semibold shrink-0">
          {[
            { num: 1, label: '1. Basic Info' },
            { num: 2, label: '2. Location' },
            { num: 3, label: '3. Pricing & Fees' },
            { num: 4, label: '4. Facilities & Media' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setStep(s.num as any)}
              className={`flex-1 py-3 text-center transition border-b-2 ${
                step === s.num
                  ? 'border-emerald-700 text-emerald-800 bg-emerald-50/40'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Admin Correction Banner */}
          {isCorrectionMode && propertyToEdit?.adminCorrectionNote && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <span>⚠️ Admin Requested Adjustments</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                {propertyToEdit.adminCorrectionNote}
              </p>
              <p className="text-[11px] text-amber-700 font-medium pt-1">
                Please edit the details requested below and submit. Your listing will return to Pending Review for admin verification.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl">
              {error}
            </div>
          )}

          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              {/* If submitted by agent, ask for the represented property owner */}
              {isAgentSubmitter && (
                <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-950">
                    <Building2 className="w-4 h-4 text-purple-700" />
                    <span>Represented Landlord / Property Owner Details</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Landlord / Owner Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="agent-prop-owner-name"
                        type="text"
                        value={representedLandlordName}
                        onChange={(e) => setRepresentedLandlordName(e.target.value)}
                        placeholder="e.g. Chief Bassey Okon"
                        required
                        className="w-full text-xs border border-stone-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Landlord Phone Number (Optional)
                      </label>
                      <input
                        id="agent-prop-owner-phone"
                        type="tel"
                        value={representedLandlordPhone}
                        onChange={(e) => setRepresentedLandlordPhone(e.target.value)}
                        placeholder="e.g. 0802 345 6789"
                        className="w-full text-xs border border-stone-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Property Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="prop-input-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Spacious 2-Bedroom Flat in Shelter Afrique Estate"
                  required
                  className="w-full text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className={`grid grid-cols-1 ${!isAgentSubmitter ? 'sm:grid-cols-2' : ''} gap-4`}>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Property Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="prop-input-type"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                    className="w-full text-base sm:text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[44px] cursor-pointer"
                  >
                    {ALL_PROPERTY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {!isAgentSubmitter && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Availability Status
                    </label>
                    <select
                      id="prop-input-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as PropertyStatus)}
                      className="w-full text-base sm:text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[44px] cursor-pointer"
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="RENTED">Rented</option>
                      <option value="UNAVAILABLE">Unavailable</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Bedrooms</label>
                  <input
                    id="prop-input-bedrooms"
                    type="number"
                    min={0}
                    max={20}
                    value={bedrooms}
                    onChange={(e) => setBedrooms(Number(e.target.value))}
                    className="w-full text-sm border border-stone-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Bathrooms</label>
                  <input
                    id="prop-input-bathrooms"
                    type="number"
                    min={0}
                    max={20}
                    value={bathrooms}
                    onChange={(e) => setBathrooms(Number(e.target.value))}
                    className="w-full text-sm border border-stone-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Toilets</label>
                  <input
                    id="prop-input-toilets"
                    type="number"
                    min={0}
                    max={20}
                    value={toilets}
                    onChange={(e) => setToilets(Number(e.target.value))}
                    className="w-full text-sm border border-stone-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Detailed Property Description
                </label>
                <textarea
                  id="prop-input-description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the finishing, security, water supply, compound features, accessibility, and neighborhood atmosphere..."
                  className="w-full text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Location */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">City / Town</label>
                  <select
                    id="prop-input-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-base sm:text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[44px] cursor-pointer"
                  >
                    <option value="Uyo">Uyo (Capital)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Area / Neighbourhood <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="prop-input-area"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full text-base sm:text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[44px] cursor-pointer"
                  >
                    {locations
                      .filter((l) => l.isActive)
                      .map((loc) => (
                        <option key={loc.id} value={loc.name}>
                          {loc.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="prop-input-street"
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="e.g. 15 Grace Bill Avenue, Off Brooks Street"
                  required
                  className="w-full text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nearby Landmark / Reference Point
                </label>
                <input
                  id="prop-input-landmark"
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near Ibom Tropicana Mall / Opposite Zenith Bank"
                  className="w-full text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  Clear street names and recognizable landmarks in Uyo help prospective tenants locate your property effortlessly for scheduled inspections.
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Pricing & Fees */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MonetaryInputField
                  id="prop-input-rent"
                  label="Rent Amount (₦)"
                  value={rent}
                  onChange={(val) => {
                    setRent(val);
                    setError(null);
                  }}
                  placeholder="e.g. 1500000"
                  required
                  helperText="Required: Must be a positive whole number greater than ₦0 (no decimals or negative values)."
                  inputClassName="text-sm font-bold text-emerald-950 py-2.5"
                />

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Rental Period <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="prop-input-period"
                    value={rentalPeriod}
                    onChange={(e) => setRentalPeriod(e.target.value as RentalPeriod)}
                    className="w-full text-base sm:text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[44px] cursor-pointer"
                  >
                    <option value="Per Annum">Per Annum (1 Year / Yearly Rent)</option>
                    <option value="1 Year">1 Year</option>
                    <option value="1 Year 6 Months">1 Year 6 Months (18 Months)</option>
                    <option value="2 Years">2 Years (Biennial Lease)</option>
                    <option value="Bi-Annual">Bi-Annual (6 Months)</option>
                    <option value="6 Months">6 Months</option>
                    <option value="Per Month">Per Month (Monthly Rent / 1 Month)</option>
                  </select>
                  <p className="text-[10px] text-stone-400 mt-1">
                    Standard Uyo residential rentals are typically Per Annum (yearly).
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="block text-xs font-bold text-stone-700">
                    Additional Moving-in Fees (Leave empty if not applicable / ₦0):
                  </span>
                  <span className="text-[10px] text-stone-400">Whole numbers only</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <MonetaryInputField
                    id="prop-input-service-charge"
                    label="Service Charge (₦)"
                    value={serviceCharge}
                    onChange={(val) => {
                      setServiceCharge(val);
                      setError(null);
                    }}
                    placeholder="Leave empty if ₦0"
                    helperText="Facility maintenance, security, pumping, etc."
                  />

                  <MonetaryInputField
                    id="prop-input-agreement-fee"
                    label="Agreement Fee (₦)"
                    value={agreementFee}
                    onChange={(val) => {
                      setAgreementFee(val);
                      setError(null);
                    }}
                    placeholder="Leave empty if ₦0"
                    helperText="Tenancy contract & documentation."
                  />

                  <MonetaryInputField
                    id="prop-input-legal-fee"
                    label="Legal / Stamp Fee (₦)"
                    value={legalFee}
                    onChange={(val) => {
                      setLegalFee(val);
                      setError(null);
                    }}
                    placeholder="Leave empty if ₦0"
                    helperText="Legal vetting & stamp duties."
                  />

                  <MonetaryInputField
                    id="prop-input-caution-deposit"
                    label="Caution Deposit (₦)"
                    value={cautionDeposit}
                    onChange={(val) => {
                      setCautionDeposit(val);
                      setError(null);
                    }}
                    placeholder="Leave empty if ₦0"
                    helperText="Refundable damage & utility buffer."
                  />

                  <MonetaryInputField
                    id="prop-input-other-fees"
                    label="Other Agency / Ancillary Fees (₦)"
                    value={otherFees}
                    onChange={(val) => {
                      setOtherFees(val);
                      setError(null);
                    }}
                    placeholder="Leave empty if ₦0"
                    helperText="Any additional one-time fees."
                  />
                </div>
              </div>

              {/* Inspection Fee Field (Required: ₦3,000 - ₦5,000) */}
              <div className="pt-2 border-t border-stone-200">
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider">
                      Inspection Fee (₦) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2.5 py-0.5 rounded-full w-fit">
                      Range: ₦3,000 minimum — ₦5,000 maximum
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mb-3">
                    Enter the exact inspection fee charged for this individual property (paid by prospective tenants before an inspection appointment). Allowed values range from ₦3,000 to ₦5,000.
                  </p>
                  <div className="max-w-xs">
                    <MonetaryInputField
                      id="prop-input-inspection-fee"
                      label="Inspection Fee"
                      value={inspectionFee}
                      onChange={(val) => {
                        setInspectionFee(val);
                        setError(null);
                      }}
                      placeholder="e.g. 3000, 3500, 4000, 5000"
                      required
                      helperText="Must be a whole amount between ₦3,000 and ₦5,000."
                      inputClassName={`text-base font-bold py-2.5 ${
                        inspectionFeeError ? 'border-red-400 bg-red-50/50' : 'text-emerald-950'
                      }`}
                    />
                  </div>
                  {inspectionFeeError && (
                    <div className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                      <span>{inspectionFeeError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Calculated Box */}
              <div
                className={`rounded-xl p-4 border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isAllPricingValid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                <div>
                  <div
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isAllPricingValid ? 'text-emerald-800' : 'text-amber-800'
                    }`}
                  >
                    Total Estimated Move-in Package
                  </div>
                  <div
                    className={`text-xs mt-0.5 ${
                      isAllPricingValid ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {isAllPricingValid
                      ? 'Calculated automatically from rent, legal, agreement, caution & service charges.'
                      : 'Calculation paused: Enter valid positive whole numbers in all fee fields (or leave optional fees empty).'}
                  </div>
                </div>
                <div
                  className={`text-xl sm:text-2xl font-extrabold ${
                    isAllPricingValid ? 'text-emerald-900 font-mono' : 'text-amber-700 text-base'
                  }`}
                >
                  {isAllPricingValid ? formatNaira(totalEstimatedCost) : '⚠️ Invalid Values'}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Facilities & Media */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Facilities Checklist */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-2 uppercase tracking-wider">
                  Select Property Facilities & Amenities ({selectedFacilities.length})
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_FACILITIES.map((facility) => {
                    const isSelected = selectedFacilities.includes(facility);
                    return (
                      <button
                        type="button"
                        key={facility}
                        onClick={() => toggleFacility(facility)}
                        className={`p-2.5 rounded-xl border text-xs font-medium text-left flex items-center gap-2 transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                            : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                            isSelected ? 'bg-emerald-700 text-white' : 'border border-stone-300'
                          }`}
                        >
                          {isSelected && '✓'}
                        </span>
                        <span>{facility}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Photos & Categorized Media */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-stone-200 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider">
                      Mandatory Real Property Photos ({images.length} Attached) *
                    </label>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Upload actual photos of the property. Stock placeholders are strictly not permitted.
                    </p>
                  </div>

                  {photoValidation.isValid ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{images.length} Photos Attached</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      <span>{images.length}/2 Photos (Min 2 Required)</span>
                    </span>
                  )}
                </div>

                {/* Device Upload Section */}
                <div className="bg-stone-50 border-2 border-dashed border-stone-300 rounded-2xl p-4 text-center space-y-2.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="modal-file-upload-input"
                  />
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-stone-900">
                    Upload Property Photos from Phone / Computer
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-stone-600">
                      <span>Room:</span>
                      <select
                        value={newImgCategory}
                        onChange={(e) => setNewImgCategory(e.target.value as MediaCategory)}
                        className="text-xs border border-stone-300 rounded-lg px-2 py-1 bg-white text-stone-900"
                      >
                        {MEDIA_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Browse Files</span>
                    </button>
                  </div>
                </div>

                {/* Image List Preview */}
                {images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className={`relative rounded-xl overflow-hidden border-2 aspect-4/3 group ${
                          img.isCover ? 'border-emerald-600 ring-2 ring-emerald-300' : 'border-stone-200'
                        }`}
                      >
                        <img src={img.url} alt="prop" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded">
                              {img.category}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(img.id)}
                              className="p-1 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSetCoverImage(img.id)}
                            className={`text-[10px] font-bold py-1 px-1.5 rounded text-center transition cursor-pointer ${
                              img.isCover
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white/80 hover:bg-white text-stone-800'
                            }`}
                          >
                            {img.isCover ? 'Cover Photo ★' : 'Set as Cover'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-stone-50 border border-stone-200 rounded-xl">
                    <Camera className="w-8 h-8 text-stone-400 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-stone-700">No photos uploaded yet</p>
                    <p className="text-[11px] text-stone-400">At least 2 real photos required to publish</p>
                  </div>
                )}

                {/* Add Custom Image Form */}
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2">
                  <div className="text-xs font-semibold text-stone-700">Or Add Photo by Web URL</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="url"
                      value={newImgUrl}
                      onChange={(e) => setNewImgUrl(e.target.value)}
                      placeholder="Image URL (https://...)"
                      className="sm:col-span-2 text-xs border border-stone-300 rounded-lg px-3 py-2 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCustomImage()}
                      disabled={!newImgUrl.trim()}
                      className="bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      + Add URL Photo
                    </button>
                  </div>
                </div>
              </div>

              {/* Video Walkthrough URL */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1 uppercase tracking-wider">
                  Video Walkthrough Link (Optional)
                </label>
                <div className="relative">
                  <Video className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="e.g. YouTube video link or hosted video"
                    className="w-full text-xs border border-stone-300 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between shrink-0">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200 rounded-xl transition cursor-pointer"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-5 py-2 rounded-xl transition cursor-pointer"
              >
                Continue Next
              </button>
            ) : (
              <button
                id="btn-submit-property-form"
                type="button"
                onClick={handleSubmit}
                disabled={!photoValidation.isValid}
                className={`font-bold text-xs px-6 py-2 rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50 ${
                  isCorrectionMode
                    ? 'bg-amber-700 hover:bg-amber-800 text-white'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
              >
                {isCorrectionMode
                  ? 'Resubmit for Admin Verification'
                  : propertyToEdit
                  ? 'Save Property Changes'
                  : 'Publish Property Listing'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PROMINENT SUCCESS CONFIRMATION MODAL */}
      {submittedProperty && (
        <div
          id="modal-add-property-success"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-6 animate-scaleUp relative">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3
                  id="success-modal-title"
                  className="text-xl font-extrabold text-stone-900 tracking-tight"
                >
                  Property Listing Submitted Successfully!
                </h3>
                <p
                  id="success-modal-description"
                  className="text-xs text-stone-600 mt-2 leading-relaxed max-w-md mx-auto"
                >
                  {isAgentSubmitter
                    ? 'Your agent property listing has been submitted and is currently Pending Review. The HOMEZA admin team will verify it before it becomes live in the tenant marketplace.'
                    : 'Your property listing has been submitted and is currently Pending Review. An administrator will verify the listing before it becomes visible to tenants.'}
                </p>
              </div>
            </div>

            {/* Submitted Property Card Summary */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-stone-900 leading-snug">
                    {submittedProperty.title}
                  </div>
                  <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                    <span>
                      {submittedProperty.propertyType} • {submittedProperty.location.area}, Uyo
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                  <Clock className="w-3 h-3 text-amber-700" />
                  <span>Pending Review</span>
                </span>
              </div>

              <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between text-xs">
                <span className="text-stone-500 font-medium">Rent Price:</span>
                <span className="font-bold text-emerald-800">
                  {formatNaira(submittedProperty.pricing.rent)}{' '}
                  <span className="text-[11px] font-normal text-stone-500">
                    / {submittedProperty.pricing.rentalPeriod === 'Per Annum' ? 'year' : submittedProperty.pricing.rentalPeriod === '2 Years' ? '2 years' : submittedProperty.pricing.rentalPeriod === 'Bi-Annual' ? '6 months' : 'month'}
                  </span>
                </span>
              </div>
            </div>

            {/* Verification Notice */}
            <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold text-amber-950">Next Step: Admin Moderation & Verification</span>
                <p className="text-amber-800 mt-0.5">
                  Our admin team verifies details within 24 hours. The listing will remain non-public until approved.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                id="btn-modal-finish-submission"
                onClick={handleFinish}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Return to Portfolio & View Status</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Property Warning Modal */}
      {duplicateResult && (
        <DuplicatePropertyModal
          isOpen={Boolean(duplicateResult)}
          onClose={() => {
            setDuplicateResult(null);
            setPendingCandidate(null);
          }}
          result={duplicateResult}
          onConfirmProceedAnyway={handleConfirmProceedDuplicate}
        />
      )}
    </div>
  );
};
