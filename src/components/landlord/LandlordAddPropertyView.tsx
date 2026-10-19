import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Image as ImageIcon,
  Info,
  MapPin,
  Minus,
  Plus,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import {
  AgentUser,
  FacilityName,
  LandlordUser,
  LocationArea,
  MediaCategory,
  Property,
  PropertyImage,
  PropertyType,
  RentalPeriod,
} from '../../types';
import {
  ALL_FACILITIES,
  ALL_PROPERTY_TYPES,
  MEDIA_CATEGORIES,
  STANDARD_UYO_AREAS,
  formatNaira,
} from '../../config/platform';
import { Store } from '../../services/store';
import { MonetaryInputField } from '../common/MonetaryInputField';
import { validateMonetaryAmount } from '../../utils/monetaryValidation';
import { PageBackHeader } from '../common/PageBackHeader';
import { validatePropertyPhotos } from '../../utils/formValidation';
import { DuplicatePropertyModal } from '../common/DuplicatePropertyModal';
import { checkPropertyDuplicates, DuplicateDetectionResult } from '../../utils/duplicateDetection';

interface LandlordAddPropertyViewProps {
  landlord?: LandlordUser;
  agent?: AgentUser;
  locations: LocationArea[];
  onSuccess: (newPropertyId: string) => void;
  onCancel: () => void;
}

export const LandlordAddPropertyView: React.FC<LandlordAddPropertyViewProps> = ({
  landlord,
  agent,
  locations,
  onSuccess,
  onCancel,
}) => {
  const formTopRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unified Uyo areas: merge standard platform areas with any dynamic location objects
  const availableAreaNames = Array.from(
    new Set([
      ...STANDARD_UYO_AREAS,
      ...locations.map((l) => l.name),
    ])
  );

  const isAgentSubmitter = Boolean(agent && !landlord);
  const [representedLandlordName, setRepresentedLandlordName] = useState('');
  const [representedLandlordPhone, setRepresentedLandlordPhone] = useState('');

  // 1. Basic Info State
  const [title, setTitle] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('2-bedroom');
  const [area, setArea] = useState<string>(availableAreaNames[0] || STANDARD_UYO_AREAS[0]);
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Uyo');
  const [description, setDescription] = useState('');
  const [authorityType, setAuthorityType] = useState('Deed of Assignment');
  const [authorityDocUrl, setAuthorityDocUrl] = useState('');

  // 2. Pricing State (stored as strings for strict whole-number regex validation)
  const [monthlyRent, setMonthlyRent] = useState<string>('');
  const [paymentDurationMonths, setPaymentDurationMonths] = useState<number>(12);
  const [rentalPeriod, setRentalPeriod] = useState<RentalPeriod>('Per Annum');
  const [serviceCharge, setServiceCharge] = useState<string>('');
  const [agreementFee, setAgreementFee] = useState<string>('');
  const [legalFee, setLegalFee] = useState<string>('');
  const [cautionDeposit, setCautionDeposit] = useState<string>('');
  const [otherFees, setOtherFees] = useState<string>('');
  const [inspectionFee, setInspectionFee] = useState<string>('3000');

  // 3. Room & Spec State
  const [bedrooms, setBedrooms] = useState<number>(2);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [toilets, setToilets] = useState<number>(2);

  // 4. Facilities State
  const [selectedFacilities, setSelectedFacilities] = useState<FacilityName[]>([
    'Tiled floor',
    'POP ceiling',
    'Borehole',
    'Water supply',
    'Electricity',
    'Prepaid meter',
    'Fenced compound',
    'Security',
  ]);

  // 5. Media State (Mandatory Real Photos - starts empty)
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [uploadCategory, setUploadCategory] = useState<MediaCategory>('Living room');
  const [uploadCaption, setUploadCaption] = useState('');
  const [videoUrl, setVideoUrl] = useState<string>('');

  // Custom Image URL Input State
  const [customImgUrl, setCustomImgUrl] = useState('');
  const [customImgCategory, setCustomImgCategory] = useState<MediaCategory>('Living room');
  const [customImgCaption, setCustomImgCaption] = useState('');

  // UI Feedback & Modal States
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [duplicateResult, setDuplicateResult] = useState<DuplicateDetectionResult | null>(null);
  const [pendingPropertyCandidate, setPendingPropertyCandidate] = useState<Property | null>(null);
  const [submittedProperty, setSubmittedProperty] = useState<{
    id: string;
    title: string;
    propertyType: PropertyType;
    area: string;
    rent: number;
    rentalPeriod: RentalPeriod;
  } | null>(null);
  const [submissionError, setSubmissionError] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // Live Monetary Validations
  const monthlyRentValidation = validateMonetaryAmount(monthlyRent, { fieldName: 'Monthly Rent', isRequired: true });
  const validDuration = Math.max(1, Number(paymentDurationMonths) || 1);
  const expectedRentPayment = monthlyRentValidation.isValid
    ? monthlyRentValidation.numericValue * validDuration
    : 0;

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

  // Photo Validation Status (Mandatory Minimum 2 Photos)
  const photoValidation = validatePropertyPhotos(images, 2);

  const isAllPricingValid =
    monthlyRentValidation.isValid &&
    validDuration >= 1 &&
    serviceChargeValidation.isValid &&
    agreementFeeValidation.isValid &&
    legalFeeValidation.isValid &&
    cautionDepositValidation.isValid &&
    otherFeesValidation.isValid &&
    isInspectionFeeValid;

  const otherFeesTotal =
    serviceChargeValidation.numericValue +
    agreementFeeValidation.numericValue +
    legalFeeValidation.numericValue +
    cautionDepositValidation.numericValue +
    otherFeesValidation.numericValue;

  // Total Estimated First Moving Cost (Base Rent + Other Moving-in Fees)
  const totalEstimatedCost = isAllPricingValid ? expectedRentPayment + otherFeesTotal : 0;

  // Facilities Handlers
  const toggleFacility = (facility: FacilityName) => {
    setSelectedFacilities((prev) =>
      prev.includes(facility) ? prev.filter((f) => f !== facility) : [...prev, facility]
    );
  };

  const handleSelectAllCommonFacilities = () => {
    setSelectedFacilities([
      'Tiled floor',
      'POP ceiling',
      'Borehole',
      'Water supply',
      'Electricity',
      'Prepaid meter',
      'Dedicated transformer',
      'Parking',
      'Fenced compound',
      'Security',
      'Kitchen cabinets',
      'Wardrobe',
      'Water heater',
      'Paved compound',
    ]);
  };

  const handleClearFacilities = () => {
    setSelectedFacilities([]);
  };

  // Direct File Upload from Device
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    (Array.from(files) as File[]).forEach((file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const newImg: PropertyImage = {
            id: 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            url: dataUrl,
            category: uploadCategory,
            caption: uploadCaption.trim() || `${uploadCategory} Photo`,
            isCover: images.length === 0,
          };
          setImages((prev) => [...prev, newImg]);
          if (errorField === 'images') {
            setError(null);
            setErrorField(null);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddCustomImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customImgUrl.trim()) return;

    const newImg: PropertyImage = {
      id: 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      url: customImgUrl.trim(),
      category: customImgCategory,
      caption: customImgCaption.trim() || `${customImgCategory} View`,
      isCover: images.length === 0,
    };
    setImages((prev) => [...prev, newImg]);
    setCustomImgUrl('');
    setCustomImgCaption('');
    if (errorField === 'images') {
      setError(null);
      setErrorField(null);
    }
  };

  const handleRemoveImage = (imgId: string) => {
    setImages((prev) => {
      const next = prev.filter((img) => img.id !== imgId);
      if (next.length > 0 && !next.some((img) => img.isCover)) {
        next[0].isCover = true;
      }
      return next;
    });
  };

  const handleSetCoverImage = (imgId: string) => {
    setImages((prev) => prev.map((img) => ({ ...img, isCover: img.id === imgId })));
  };

  // Auto-fill Sample Description Helper
  const handleGenerateSampleDescription = () => {
    const desc = `Executive ${bedrooms}-bedroom ${propertyType.toLowerCase()} situated in a serene, highly secured neighbourhood at ${street ? street + ', ' : ''}${area}, Uyo. Features state-of-the-art POP ceiling, fully tiled interior, dedicated borehole water supply with constant pumping, separate prepaid meter, and a spacious paved interlocked compound with 24/7 security.`;
    setDescription(desc);
    if (errorField === 'description') {
      setError(null);
      setErrorField(null);
    }
  };

  // Reset all form fields to initial clean defaults for "Add Another Property"
  const handleResetForm = () => {
    setTitle('');
    setPropertyType('2-bedroom');
    setArea(availableAreaNames[0] || STANDARD_UYO_AREAS[0]);
    setStreet('');
    setLandmark('');
    setCity('Uyo');
    setDescription('');
    setMonthlyRent('');
    setPaymentDurationMonths(12);
    setRentalPeriod('Per Annum');
    setServiceCharge('');
    setAgreementFee('');
    setLegalFee('');
    setCautionDeposit('');
    setOtherFees('');
    setBedrooms(2);
    setBathrooms(2);
    setToilets(2);
    setSelectedFacilities([
      'Tiled floor',
      'POP ceiling',
      'Borehole',
      'Water supply',
      'Electricity',
      'Prepaid meter',
      'Fenced compound',
      'Security',
    ]);
    setImages([]);
    setVideoUrl('');
    setCustomImgUrl('');
    setCustomImgCategory('Living room');
    setCustomImgCaption('');
    setError(null);
    setErrorField(null);
    setSubmissionError(null);
    setShowSuccessModal(false);
    setSubmittedProperty(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancellation with safety check
  const handleCancelClick = () => {
    if (title.trim() || street.trim() || monthlyRent !== '' || images.length > 0) {
      if (window.confirm('Discard unsaved property details and return to dashboard?')) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  // Main Submit Handler with Detailed Validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setError(null);
    setErrorField(null);
    setSubmissionError(null);

    // 1. Validate Title
    if (!title.trim()) {
      setError('Please complete: Property Title');
      setErrorField('title');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Agent representation check
    if (isAgentSubmitter && !representedLandlordName.trim()) {
      setError('Please provide the property owner or landlord full name.');
      setErrorField('representedLandlordName');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 2. Validate Property Type
    if (!propertyType) {
      setError('Please select: Property Type');
      setErrorField('propertyType');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 3. Validate Area
    if (!area.trim()) {
      setError('Please select: Area / Neighbourhood');
      setErrorField('area');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 4. Validate Street
    if (!street.trim()) {
      setError('Please complete: Street Address / Location');
      setErrorField('street');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 5. Validate Rooms (Bedrooms, Bathrooms, Toilets)
    if (bedrooms === undefined || bedrooms === null || isNaN(Number(bedrooms)) || Number(bedrooms) < 0) {
      setError('Please specify: Number of Bedrooms');
      setErrorField('bedrooms');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (bathrooms === undefined || bathrooms === null || isNaN(Number(bathrooms)) || Number(bathrooms) < 0) {
      setError('Please specify: Number of Bathrooms');
      setErrorField('bathrooms');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (toilets === undefined || toilets === null || isNaN(Number(toilets)) || Number(toilets) < 0) {
      setError('Please specify: Number of Toilets');
      setErrorField('toilets');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 6. Validate Monetary Pricing Fields
    if (!monthlyRentValidation.isValid) {
      setError(monthlyRentValidation.error || 'Please enter a valid positive whole-number Monthly Rent greater than ₦0.');
      setErrorField('monthlyRent');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (validDuration < 1) {
      setError('Payment Duration must be at least 1 month.');
      setErrorField('paymentDurationMonths');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!serviceChargeValidation.isValid) {
      setError(serviceChargeValidation.error || 'Service Charge must be a positive whole number or left empty.');
      setErrorField('serviceCharge');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!cautionDepositValidation.isValid) {
      setError(cautionDepositValidation.error || 'Caution Deposit must be a positive whole number or left empty.');
      setErrorField('cautionDeposit');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!agreementFeeValidation.isValid) {
      setError(agreementFeeValidation.error || 'Agreement Fee must be a positive whole number or left empty.');
      setErrorField('agreementFee');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!legalFeeValidation.isValid) {
      setError(legalFeeValidation.error || 'Legal Fee must be a positive whole number or left empty.');
      setErrorField('legalFee');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!otherFeesValidation.isValid) {
      setError(otherFeesValidation.error || 'Other Fees must be a positive whole number or left empty.');
      setErrorField('otherFees');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validate Inspection Fee (₦3,000 - ₦5,000)
    if (!isInspectionFeeValid) {
      setError(inspectionFeeError || 'Inspection fee must be between ₦3,000 and ₦5,000.');
      setErrorField('inspectionFee');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 7. Validate Description
    if (!description.trim()) {
      setError('Please complete: Property Description');
      setErrorField('description');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 8. Validate Mandatory Real Property Photos
    if (!photoValidation.isValid) {
      setError(photoValidation.error || 'Please upload property photos before submitting this listing.');
      setErrorField('images');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      const newPropertyId = 'prop-' + Date.now();

      // Ensure cover image is established
      const finalizedImages = images.map((img, idx) => ({
        ...img,
        isCover: images.some((i) => i.isCover) ? img.isCover : idx === 0,
      }));

      const landlordId = landlord?.id || ('landlord-rep-' + Date.now());
      const landlordName = representedLandlordName.trim() || landlord?.fullName || agent?.fullName || 'Property Owner';
      const landlordPhone = representedLandlordPhone.trim() || landlord?.phoneNumber || agent?.phoneNumber || '08000000000';
      const landlordVerificationStatus = landlord?.verificationStatus || 'VERIFIED';

      const newProperty: Property = {
        id: newPropertyId,
        landlordId,
        landlordName,
        landlordPhone,
        landlordVerificationStatus,
        listingSource: isAgentSubmitter ? 'AGENT' : 'LANDLORD',
        submittingAgentId: isAgentSubmitter && agent ? agent.id : undefined,
        submittingAgentName: isAgentSubmitter && agent ? agent.fullName : undefined,
        submittingAgentAgency: isAgentSubmitter && agent ? agent.agencyName : undefined,
        submittingAgentPhone: isAgentSubmitter && agent ? agent.phoneNumber : undefined,
        title: title.trim(),
        propertyType,
        description: description.trim(),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        toilets: Number(toilets),
        location: {
          state: 'Akwa Ibom State',
          city: city.trim() || 'Uyo',
          area: area.trim(),
          street: street.trim(),
          landmark: landmark.trim(),
        },
        pricing: {
          monthlyRent: monthlyRentValidation.numericValue,
          paymentDurationMonths: validDuration,
          rent: expectedRentPayment,
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
        images: finalizedImages,
        videos: videoUrl.trim()
          ? [
              {
                id: 'vid-' + Date.now(),
                url: videoUrl.trim(),
                title: 'Property Walkthrough Video',
              },
            ]
          : [],
        status: 'PENDING_REVIEW', // Mandatory PENDING_REVIEW on submission
        isVerified: false,
        viewsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        verificationHistory: [
          {
            id: 'vh-' + Date.now(),
            action: 'SUBMITTED',
            status: 'PENDING_REVIEW',
            timestamp: new Date().toISOString(),
            actorName: isAgentSubmitter ? (agent?.fullName || 'Agent') : landlordName,
            actorRole: isAgentSubmitter ? 'AGENT' : 'LANDLORD',
            notes: isAgentSubmitter
              ? `Listing submitted by verified agent ${agent?.fullName || ''} on behalf of ${landlordName}. Title proof provided: ${authorityType}.`
              : `Initial submission with mandatory photos and ${authorityType} documentation proof. Awaiting administrative review.`,
          },
        ],
      };

      // Check for duplicate listings before adding
      const duplicateCheck = checkPropertyDuplicates(newProperty, Store.getProperties());
      if (duplicateCheck.isDuplicate) {
        setDuplicateResult(duplicateCheck);
        setPendingPropertyCandidate(newProperty);
        setIsSubmitting(false);
        return;
      }

      // Add to store
      Store.addProperty(newProperty);

      setIsSubmitting(false);
      setSubmittedProperty({
        id: newPropertyId,
        title: newProperty.title,
        propertyType: newProperty.propertyType,
        area: newProperty.location.area,
        rent: newProperty.pricing.rent,
        rentalPeriod: newProperty.pricing.rentalPeriod,
      });
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Error submitting property:', err);
      setIsSubmitting(false);
      setSubmissionError({
        title: 'Submission Failed',
        message: err.message || 'An unexpected error occurred while saving your property listing. Please try again.',
      });
    }
  };

  const handleProceedDuplicateCandidate = () => {
    if (!pendingPropertyCandidate) return;
    try {
      Store.addProperty(pendingPropertyCandidate);
      const savedId = pendingPropertyCandidate.id;
      const savedTitle = pendingPropertyCandidate.title;
      const savedType = pendingPropertyCandidate.propertyType;
      const savedArea = pendingPropertyCandidate.location.area;
      const savedRent = pendingPropertyCandidate.pricing.rent;
      const savedPeriod = pendingPropertyCandidate.pricing.rentalPeriod;

      setDuplicateResult(null);
      setPendingPropertyCandidate(null);
      setSubmittedProperty({
        id: savedId,
        title: savedTitle,
        propertyType: savedType,
        area: savedArea,
        rent: savedRent,
        rentalPeriod: savedPeriod,
      });
      setShowSuccessModal(true);
    } catch (err: any) {
      setDuplicateResult(null);
      setSubmissionError({
        title: 'Submission Blocked',
        message: err.message || 'Could not save property listing.',
      });
    }
  };

  return (
    <div id="add-property-form" ref={formTopRef} className="space-y-6 max-w-4xl mx-auto pb-12 animate-fadeIn scroll-mt-20">
      {/* Top Back Navigation */}
      <PageBackHeader
        label="Back to Dashboard"
        onBack={handleCancelClick}
        title="Add New Property Listing"
        subtitle="Publish a verified residential apartment, flat, or duplex in Uyo to receive direct tenant applications."
      />

      {/* Prominent Error Banner */}
      {error && (
        <div
          id="add-property-error-banner"
          className="bg-red-50 border-2 border-red-300 text-red-900 text-xs font-semibold p-4 rounded-2xl flex items-center gap-3 shadow-sm animate-fadeIn"
        >
          <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-red-800">Please check the required field:</div>
            <div className="text-red-700 mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* KYC Identity Verification Notice */}
      {((landlord && landlord.verificationStatus !== 'VERIFIED') || (agent && agent.verificationStatus !== 'VERIFIED')) && (
        <div
          id="add-property-kyc-notice-banner"
          className="bg-amber-50/90 border border-amber-300 text-amber-950 p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 shadow-xs animate-fadeIn"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-extrabold text-amber-950">
              Identity Verification Pending (HOMEZA Phase 1 Trust Rule)
            </div>
            <div className="text-xs text-amber-900 mt-0.5 leading-relaxed">
              You may draft and submit this property listing now, but it will remain in <strong>PENDING REVIEW</strong> and cannot be published or approved until your Landlord/Agent identity verification documents and phone OTP are approved by an administrator.
            </div>
          </div>
        </div>
      )}

      {/* The Property Form with noValidate to enable precise custom state validation */}
      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: BASIC PROPERTY DETAILS */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>Basic Property Information</span>
            </h3>
            <span className="text-[11px] text-stone-400 font-medium">* Required fields</span>
          </div>

          {/* Property Title */}
          <div>
            <label
              htmlFor="property-title"
              className="block text-xs font-semibold text-stone-700 mb-1.5"
            >
              Property Title *
            </label>
            <input
              id="property-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errorField === 'title') {
                  setError(null);
                  setErrorField(null);
                }
              }}
              placeholder="e.g. Modern 2-Bedroom Flat with POP in Shelter Afrique Estate"
              className={`w-full text-sm border rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white transition ${
                errorField === 'title' ? 'border-red-500 bg-red-50/20' : 'border-stone-300'
              }`}
            />
            <p className="text-[11px] text-stone-400 mt-1">
              Give a clear, attractive title highlighting the apartment size, finishes, and area.
            </p>
          </div>

          {/* Property Type & Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="property-type"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                Property Type *
              </label>
              <select
                id="property-type"
                value={propertyType}
                onChange={(e) => {
                  setPropertyType(e.target.value as PropertyType);
                  if (errorField === 'propertyType') {
                    setError(null);
                    setErrorField(null);
                  }
                }}
                className={`w-full text-base sm:text-sm border rounded-xl px-3.5 py-2.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[44px] cursor-pointer transition ${
                  errorField === 'propertyType' ? 'border-red-500 bg-red-50/20' : 'border-stone-300'
                }`}
              >
                {ALL_PROPERTY_TYPES.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="property-area"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                Area / Neighbourhood in Uyo *
              </label>
              <select
                id="property-area"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  if (errorField === 'area') {
                    setError(null);
                    setErrorField(null);
                  }
                }}
                className={`w-full text-base sm:text-sm border rounded-xl px-3.5 py-2.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[44px] cursor-pointer transition ${
                  errorField === 'area' ? 'border-red-500 bg-red-50/20' : 'border-stone-300'
                }`}
              >
                {availableAreaNames.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Street Address & Landmark */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="property-street"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                Street Address / Location *
              </label>
              <input
                id="property-street"
                type="text"
                value={street}
                onChange={(e) => {
                  setStreet(e.target.value);
                  if (errorField === 'street') {
                    setError(null);
                    setErrorField(null);
                  }
                }}
                placeholder="e.g. 14 Grace Bill Road, Off Brooks Avenue"
                className={`w-full text-sm border rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white transition ${
                  errorField === 'street' ? 'border-red-500 bg-red-50/20' : 'border-stone-300'
                }`}
              />
            </div>

            <div>
              <label
                htmlFor="property-landmark"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                Prominent Landmark (Optional)
              </label>
              <input
                id="property-landmark"
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Topfaith School or Ewet Housing Club"
                className="w-full text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              />
            </div>
          </div>

          {/* Bedrooms, Bathrooms, Toilets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            {/* Bedrooms */}
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
              <label
                htmlFor="property-bedrooms"
                className="block text-xs font-bold text-stone-700 mb-1.5"
              >
                Bedrooms *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBedrooms(Math.max(0, bedrooms - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  id="property-bedrooms"
                  type="number"
                  min={0}
                  max={20}
                  value={bedrooms}
                  onChange={(e) => setBedrooms(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full text-center text-sm font-bold border border-stone-300 rounded-lg py-1.5 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setBedrooms(bedrooms + 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bathrooms */}
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
              <label
                htmlFor="property-bathrooms"
                className="block text-xs font-bold text-stone-700 mb-1.5"
              >
                Bathrooms *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBathrooms(Math.max(0, bathrooms - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  id="property-bathrooms"
                  type="number"
                  min={0}
                  max={20}
                  value={bathrooms}
                  onChange={(e) => setBathrooms(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full text-center text-sm font-bold border border-stone-300 rounded-lg py-1.5 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setBathrooms(bathrooms + 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Toilets */}
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
              <label
                htmlFor="property-toilets"
                className="block text-xs font-bold text-stone-700 mb-1.5"
              >
                Toilets *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setToilets(Math.max(0, toilets - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  id="property-toilets"
                  type="number"
                  min={0}
                  max={20}
                  value={toilets}
                  onChange={(e) => setToilets(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full text-center text-sm font-bold border border-stone-300 rounded-lg py-1.5 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setToilets(toilets + 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Property Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="property-description"
                className="block text-xs font-semibold text-stone-700"
              >
                Detailed Property Description *
              </label>
              <button
                type="button"
                id="btn-auto-fill-description"
                onClick={handleGenerateSampleDescription}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 px-2 py-0.5 rounded-md"
              >
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Auto-fill Template</span>
              </button>
            </div>
            <textarea
              id="property-description"
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errorField === 'description') {
                  setError(null);
                  setErrorField(null);
                }
              }}
              placeholder="Describe the finishing, compound layout, water situation, power availability, security guard schedule, proximity to main road..."
              className={`w-full text-sm border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white transition ${
                errorField === 'description' ? 'border-red-500 bg-red-50/20' : 'border-stone-300'
              }`}
            />
          </div>
        </div>

        {/* SECTION 2: PRICING & FEES */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                2
              </span>
              <span>Transparent Pricing & Fees Breakdown</span>
            </h3>
            <span className="text-xs text-stone-500 font-semibold">Nigerian Naira (₦)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Monthly Rent */}
            <MonetaryInputField
              id="property-monthly-rent"
              label="Monthly Rent (₦) *"
              value={monthlyRent}
              onChange={(val) => {
                setMonthlyRent(val);
                if (errorField === 'monthlyRent') {
                  setError(null);
                  setErrorField(null);
                }
              }}
              placeholder="e.g. 125000"
              required
              helperText="Required: Monthly rental rate. Must be a positive whole number greater than ₦0."
              inputClassName="text-base font-bold text-emerald-950 py-2.5"
            />

            {/* Payment Duration */}
            <div>
              <label
                htmlFor="property-payment-duration"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                Payment Duration (Months) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="property-payment-duration"
                  type="number"
                  min={1}
                  step={1}
                  value={paymentDurationMonths}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    const val = isNaN(parsed) || parsed < 1 ? 1 : parsed;
                    setPaymentDurationMonths(val);
                    if (val === 12) setRentalPeriod('Per Annum');
                    else if (val === 6) setRentalPeriod('Bi-Annual');
                    else if (val === 24) setRentalPeriod('2 Years');
                    else if (val === 1) setRentalPeriod('Per Month');
                    else if (val === 18) setRentalPeriod('1 Year 6 Months');
                    if (errorField === 'paymentDurationMonths') {
                      setError(null);
                      setErrorField(null);
                    }
                  }}
                  className="w-full text-base sm:text-sm font-bold border border-stone-300 rounded-xl px-3.5 py-2.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[44px]"
                />
                <span className="text-xs font-semibold text-stone-600 whitespace-nowrap">Months</span>
              </div>
              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentDurationMonths(12);
                    setRentalPeriod('Per Annum');
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                    paymentDurationMonths === 12
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  12 Mos (1 Year)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentDurationMonths(6);
                    setRentalPeriod('Bi-Annual');
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                    paymentDurationMonths === 6
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  6 Months
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentDurationMonths(24);
                    setRentalPeriod('2 Years');
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                    paymentDurationMonths === 24
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  24 Mos (2 Years)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentDurationMonths(1);
                    setRentalPeriod('Per Month');
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                    paymentDurationMonths === 1
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  1 Month
                </button>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Minimum duration is 1 month. Uyo standard is 12 months (1 Year).
              </p>
            </div>
          </div>

          {/* Expected Base Rent Live Calculation Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-emerald-950 block">
                Expected Base Rent Payment (Monthly Rent × Duration):
              </span>
              <span className="text-[11px] text-emerald-800">
                {monthlyRentValidation.isValid
                  ? `${formatNaira(monthlyRentValidation.numericValue)}/month × ${validDuration} month${validDuration > 1 ? 's' : ''}`
                  : 'Enter a valid monthly rent to calculate total base rent'}
              </span>
            </div>
            <strong className="text-base font-mono font-bold text-emerald-900">
              {monthlyRentValidation.isValid ? formatNaira(expectedRentPayment) : '₦0'}
            </strong>
          </div>

          {/* Additional Moving-in Fees */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="block text-xs font-bold text-stone-700">
                Additional Moving-in Fees (Separate from base rent, leave empty if ₦0):
              </span>
              <span className="text-[10px] text-stone-400">Positive whole numbers only</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Service Charge */}
              <MonetaryInputField
                id="property-service-charge"
                label="Service Charge (₦)"
                value={serviceCharge}
                onChange={(val) => {
                  setServiceCharge(val);
                  if (errorField === 'serviceCharge') {
                    setError(null);
                    setErrorField(null);
                  }
                }}
                placeholder="Leave empty if ₦0"
                helperText="Maintenance, generator, security, pumping, etc."
              />

              {/* Caution Deposit */}
              <MonetaryInputField
                id="property-caution-deposit"
                label="Caution Deposit (₦)"
                value={cautionDeposit}
                onChange={(val) => {
                  setCautionDeposit(val);
                  if (errorField === 'cautionDeposit') {
                    setError(null);
                    setErrorField(null);
                  }
                }}
                placeholder="Leave empty if ₦0"
                helperText="Refundable damage & utility deposit."
              />

              {/* Agreement Fee */}
              <MonetaryInputField
                id="property-agreement-fee"
                label="Agreement Fee (₦)"
                value={agreementFee}
                onChange={(val) => {
                  setAgreementFee(val);
                  if (errorField === 'agreementFee') {
                    setError(null);
                    setErrorField(null);
                  }
                }}
                placeholder="Leave empty if ₦0"
                helperText="Tenancy contract & documentation."
              />

              {/* Legal Fee */}
              <MonetaryInputField
                id="property-legal-fee"
                label="Legal / Stamp Fee (₦)"
                value={legalFee}
                onChange={(val) => {
                  setLegalFee(val);
                  if (errorField === 'legalFee') {
                    setError(null);
                    setErrorField(null);
                  }
                }}
                placeholder="Leave empty if ₦0"
                helperText="Legal vetting & stamp duties."
              />

              {/* Other Fees */}
              <MonetaryInputField
                id="property-other-fees"
                label="Other Agency / Ancillary Fees (₦)"
                value={otherFees}
                onChange={(val) => {
                  setOtherFees(val);
                  if (errorField === 'otherFees') {
                    setError(null);
                    setErrorField(null);
                  }
                }}
                placeholder="Leave empty if ₦0"
                helperText="Any additional one-time fees."
              />
            </div>
          </div>

          {/* Inspection Fee Section (Required: ₦3,000 - ₦5,000) */}
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
                Specify the exact inspection fee prospective tenants must pay to book an inspection for this property. Minimum allowed is ₦3,000 and maximum is ₦5,000.
              </p>
              <div className="max-w-xs">
                <MonetaryInputField
                  id="property-inspection-fee"
                  label="Inspection Fee"
                  value={inspectionFee}
                  onChange={(val) => {
                    setInspectionFee(val);
                    if (errorField === 'inspectionFee') {
                      setError(null);
                      setErrorField(null);
                    }
                  }}
                  placeholder="e.g. 3000, 3500, 4000, 5000"
                  required
                  helperText="Must be a whole amount between ₦3,000 and ₦5,000."
                  inputClassName={`text-base font-bold py-2.5 ${
                    errorField === 'inspectionFee' || (!isInspectionFeeValid && inspectionFee.trim() !== '')
                      ? 'border-red-400 bg-red-50/50'
                      : 'text-emerald-950'
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

          {/* First Moving Payment Summary Banner */}
          <div
            className={`rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border transition ${
              isAllPricingValid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}
          >
            <div>
              <span
                className={`text-xs font-bold block ${
                  isAllPricingValid ? 'text-emerald-950' : 'text-amber-900'
                }`}
              >
                Total Estimated Initial Moving Package:
              </span>
              <span
                className={`text-[11px] ${
                  isAllPricingValid ? 'text-emerald-800' : 'text-amber-800'
                }`}
              >
                {isAllPricingValid
                  ? `Base Rent (${formatNaira(expectedRentPayment)}) + Other Moving-in Fees (${formatNaira(otherFeesTotal)})`
                  : 'Calculation paused: Enter valid positive whole numbers in all fee fields (or leave optional fees empty).'}
              </span>
            </div>
            <strong
              className={`text-base sm:text-lg font-bold font-mono ${
                isAllPricingValid ? 'text-emerald-900' : 'text-amber-700'
              }`}
            >
              {isAllPricingValid ? formatNaira(totalEstimatedCost) : '⚠️ Invalid Values'}
            </strong>
          </div>
        </div>

        {/* SECTION 3: FACILITIES & AMENITIES */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                  3
                </span>
                <span>Facilities & Amenities in Uyo Property ({selectedFacilities.length} selected)</span>
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Select every verified amenity available to tenants in this apartment.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-select-common-facilities"
                onClick={handleSelectAllCommonFacilities}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                Select Common
              </button>
              <button
                type="button"
                id="btn-clear-facilities"
                onClick={handleClearFacilities}
                className="text-[11px] font-semibold text-stone-600 hover:text-stone-800 bg-stone-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {ALL_FACILITIES.map((facility) => {
              const isSelected = selectedFacilities.includes(facility);
              const elementId = `facility-btn-${facility.toLowerCase().replace(/\s+/g, '-')}`;
              return (
                <button
                  key={facility}
                  id={elementId}
                  type="button"
                  onClick={() => toggleFacility(facility)}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <span className="truncate">{facility}</span>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'border border-stone-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: PHOTOS & MEDIA */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                  4
                </span>
                <span>Mandatory Real Property Photos ({images.length} Attached) *</span>
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Real photos are strictly mandatory. Upload photos of the exterior, living room, bedrooms, kitchen, and bathrooms.
              </p>
            </div>

            {/* Validation Badge */}
            {photoValidation.isValid ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Photos Requirement Met ({images.length} uploaded)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>{images.length}/2 Photos Attached (Min 2 Required)</span>
              </span>
            )}
          </div>

          {/* Mandatory Photo Policy Notice */}
          <div
            className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
              photoValidation.isValid
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}
          >
            <Camera className={`w-5 h-5 shrink-0 mt-0.5 ${photoValidation.isValid ? 'text-emerald-700' : 'text-amber-700'}`} />
            <div>
              <div className="font-bold">
                {photoValidation.isValid
                  ? 'Real Property Photos Verified'
                  : 'Mandatory Real Property Photos Requirement'}
              </div>
              <p className="mt-0.5 text-stone-700">
                Every listing on HOMEZA requires actual photos of the property. Stock images, generic placeholders, or watermarked external renderings are not accepted and will cause rejection during admin verification.
              </p>
            </div>
          </div>

          {/* Direct Device File Upload Box */}
          <div className="bg-stone-50 rounded-2xl p-5 border-2 border-dashed border-stone-300 hover:border-emerald-500 transition text-center space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="property-file-upload-input"
            />
            
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-stone-900">
                Upload Real Property Photos from Device
              </div>
              <p className="text-xs text-stone-500 mt-1 max-w-sm">
                Select one or multiple photos from your phone gallery or computer. JPG, PNG, or WEBP supported.
              </p>
            </div>

            {/* Room Category tag for incoming uploads */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-stone-700">
                <span className="font-semibold">Tag Room:</span>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as MediaCategory)}
                  className="text-xs border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white text-stone-900"
                >
                  {MEDIA_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                id="btn-trigger-file-upload"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Browse & Upload Photos</span>
              </button>
            </div>
          </div>

          {/* Custom Photo URL Input */}
          <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 space-y-3">
            <span className="text-xs font-bold text-stone-800 block">
              Or Add Custom Image by Web URL:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2">
                <input
                  id="custom-img-url"
                  type="url"
                  value={customImgUrl}
                  onChange={(e) => setCustomImgUrl(e.target.value)}
                  placeholder="Paste Image URL (https://...)"
                  className="w-full text-xs border border-stone-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div>
                <select
                  id="custom-img-category"
                  value={customImgCategory}
                  onChange={(e) => setCustomImgCategory(e.target.value as MediaCategory)}
                  className="w-full text-base sm:text-xs border border-stone-300 rounded-xl px-2.5 py-2 bg-white text-stone-900 min-h-[44px] sm:min-h-[38px] cursor-pointer"
                >
                  {MEDIA_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  id="btn-add-custom-photo"
                  onClick={handleAddCustomImage}
                  disabled={!customImgUrl.trim()}
                  className="w-full text-xs font-bold bg-stone-800 hover:bg-stone-900 disabled:opacity-40 text-white rounded-xl py-2 transition cursor-pointer"
                >
                  + Add URL Photo
                </button>
              </div>
            </div>
          </div>

          {/* Attached Images Gallery */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">
                Attached Real Photos ({images.length}):
              </span>
              {images.length > 0 && (
                <span className="text-[11px] text-stone-400">
                  Click "Set Cover" to change main thumbnail
                </span>
              )}
            </div>

            {images.length === 0 ? (
              <div
                className={`text-center py-10 rounded-2xl border-2 border-dashed ${
                  errorField === 'images' ? 'border-red-400 bg-red-50/30' : 'border-stone-200 bg-stone-50'
                }`}
              >
                <Camera className="w-10 h-10 mx-auto mb-2 text-stone-400" />
                <p className="text-sm font-bold text-stone-800">No property photos uploaded yet</p>
                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                  Uploading real property photos is mandatory before submitting. Click <strong>"Browse & Upload Photos"</strong> above to upload from your device.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className={`relative rounded-2xl overflow-hidden border-2 aspect-4/3 group shadow-xs ${
                      img.isCover
                        ? 'border-emerald-600 ring-2 ring-emerald-300'
                        : 'border-stone-200'
                    }`}
                  >
                    <img src={img.url} alt={img.caption} className="w-full h-full object-cover" />

                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      {img.isCover ? (
                        <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                          ★ Cover Photo
                        </span>
                      ) : (
                        <span className="bg-stone-900/80 text-white text-[9px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs">
                          {img.category}
                        </span>
                      )}
                    </div>

                    {/* Hover controls */}
                    <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 p-2">
                      {!img.isCover && (
                        <button
                          type="button"
                          onClick={() => handleSetCoverImage(img.id)}
                          className="text-[10px] bg-white hover:bg-emerald-50 text-stone-900 font-bold px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer"
                        >
                          Set Cover
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition cursor-pointer shadow-sm"
                        title="Remove image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Walkthrough Video URL */}
          <div className="pt-2">
            <label
              htmlFor="property-video-url"
              className="block text-xs font-semibold text-stone-700 mb-1.5"
            >
              Virtual Video Walkthrough URL (Optional MP4 / YouTube)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                <Video className="w-4 h-4" />
              </span>
              <input
                id="property-video-url"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://... (e.g. YouTube walkthrough link or hosted video)"
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-stone-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: PROPERTY OWNERSHIP & AUTHORITY VERIFICATION (PHASE 1 SECURITY) */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                6
              </span>
              <span>Ownership & Authority Verification</span>
            </h3>
            <span className="text-[11px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Anti-Scam Verified
            </span>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed">
            In accordance with HOMEZA Phase 1 trust rules, landlords and agents declare ownership rights or authority to lease this property before listing.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Authority / Ownership Document Type
              </label>
              <select
                value={authorityType}
                onChange={(e) => setAuthorityType(e.target.value)}
                className="w-full text-xs border border-stone-300 rounded-xl px-3 py-2.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="Deed of Assignment">Deed of Assignment</option>
                <option value="Certificate of Occupancy (C of O)">Certificate of Occupancy (C of O)</option>
                <option value="Governor's Consent">Governor's Consent</option>
                <option value="Land Purchase Agreement / Receipt">Land Purchase Agreement / Receipt</option>
                <option value="Power of Attorney">Power of Attorney</option>
                <option value="Letter of Authority from Landlord">Letter of Authority from Landlord</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Document Reference Number / Proof URL (Optional)
              </label>
              <input
                type="text"
                value={authorityDocUrl}
                onChange={(e) => setAuthorityDocUrl(e.target.value)}
                placeholder="e.g. Vol 42, Page 12 or scan link"
                className="w-full text-xs border border-stone-300 rounded-xl px-3 py-2.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* SUBMIT ACTIONS & STATUS NOTICE */}
        <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <p className="text-xs text-stone-500 max-w-lg">
              Once submitted, your listing will enter <strong>PENDING REVIEW</strong> status and be
              safely stored in your landlord portfolio. It will become publicly visible to verified
              tenants upon administrator verification.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <button
              type="button"
              id="btn-cancel-bottom"
              onClick={handleCancelClick}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-300 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              id="btn-submit-add-property"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Listing...</span>
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  <span>Submit Property Listing</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* PROMINENT SUCCESS MODAL / DIALOG */}
      {showSuccessModal && submittedProperty && (
        <div
          id="modal-add-property-success"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-6 animate-scaleUp relative">
            {/* Top Icon and Heading */}
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
                  Your property has been submitted successfully and is now{' '}
                  <span className="font-semibold text-amber-800">Pending Review</span>. An
                  administrator will verify the listing before it becomes visible to tenants.
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
                      {submittedProperty.propertyType} • {submittedProperty.area}, Uyo
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
                  {formatNaira(submittedProperty.rent)}{' '}
                  <span className="text-[11px] font-normal text-stone-500">
                    / {submittedProperty.rentalPeriod === 'Per Annum' ? 'year' : submittedProperty.rentalPeriod === '2 Years' ? '2 years' : submittedProperty.rentalPeriod === 'Bi-Annual' ? '6 months' : 'month'}
                  </span>
                </span>
              </div>
            </div>

            {/* Verification Process Notice */}
            <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold text-amber-950">Next Step: Verification Audit</span>
                <p className="text-amber-800 mt-0.5">
                  Our HOMEZA administrative team validates ownership & photos within 24 hours to
                  protect renters. You can track review progress anytime in your portfolio.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="btn-modal-add-another"
                onClick={handleResetForm}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Another Property</span>
              </button>

              <button
                type="button"
                id="btn-modal-view-properties"
                onClick={() => {
                  setShowSuccessModal(false);
                  onSuccess(submittedProperty.id);
                }}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>View My Properties</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ERROR MODAL / DIALOG */}
      {submissionError && (
        <div
          id="modal-add-property-error"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white rounded-2xl border border-red-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scaleUp">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-100 text-red-700 rounded-2xl mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-stone-900">{submissionError.title}</h3>
              <p className="text-xs text-stone-600 leading-relaxed">{submissionError.message}</p>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-[11px] text-stone-500">
              Your entered property information has been preserved in the form so you do not have to
              start over.
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                id="btn-modal-error-dismiss"
                onClick={() => setSubmissionError(null)}
                className="w-full py-2.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-xl shadow-sm transition cursor-pointer"
              >
                Return to Form & Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE PROPERTY DETECTION MODAL */}
      {duplicateResult && (
        <DuplicatePropertyModal
          isOpen={Boolean(duplicateResult)}
          onClose={() => {
            setDuplicateResult(null);
            setPendingPropertyCandidate(null);
          }}
          result={duplicateResult}
          onConfirmProceedAnyway={handleProceedDuplicateCandidate}
        />
      )}
    </div>
  );
};
