import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Upload,
  User,
  Building2,
  Phone,
  AlertTriangle,
  FileCheck,
  Camera,
  Info,
  Check,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Lock,
  Unlock,
  RotateCcw,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import {
  IdentityDocumentType,
  KYCApplication,
  KYCApplicationStatus,
  LandlordUser,
  AgentUser,
  User as AppUser,
  UserVerificationStatus,
} from '../../types';
import { Store, subscribeToStore } from '../../services/store';
import { useAuth } from '../../context/AuthContext';
import { PhoneVerificationModal } from './PhoneVerificationModal';

interface KYCVerificationViewProps {
  onSuccess?: () => void;
  onNavigateToAddProperty?: () => void;
}

export const KYCVerificationView: React.FC<KYCVerificationViewProps> = ({
  onSuccess,
  onNavigateToAddProperty,
}) => {
  const { currentUser, refreshSession } = useAuth();

  // Load existing application if any
  const [kycApp, setKycApp] = useState<KYCApplication | undefined>(undefined);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [verificationData, setVerificationData] = useState<UserVerificationStatus | null>(
    currentUser?.verification || null
  );
  const [verificationAudits, setVerificationAudits] = useState<any[]>([]);
  const [environmentMode, setEnvironmentMode] = useState<string>('LIVE');
  const [isResetting, setIsResetting] = useState(false);

  // Document Upload State (Mobile Gallery & Camera Capture)
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(
    currentUser?.verification?.documentUrl || null
  );
  const [docFileName, setDocFileName] = useState('');
  const [docFileSize, setDocFileSize] = useState('');
  const [docError, setDocError] = useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadedDocUrl, setUploadedDocUrl] = useState<string>(
    currentUser?.verification?.documentUrl || ''
  );
  const [uploadedDocId, setUploadedDocId] = useState<string>(
    currentUser?.verification?.documentId || ''
  );

  // Agent CAC Document Upload State
  const cacGalleryInputRef = useRef<HTMLInputElement>(null);
  const cacCameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedCacFile, setSelectedCacFile] = useState<File | null>(null);
  const [cacPreviewUrl, setCacPreviewUrl] = useState<string | null>(null);
  const [cacFileName, setCacFileName] = useState('');
  const [cacFileSize, setCacFileSize] = useState('');
  const [cacError, setCacError] = useState<string | null>(null);
  const [uploadedCacDocUrl, setUploadedCacDocUrl] = useState<string>('');

  // Form inputs
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [idCardType, setIdCardType] = useState<IdentityDocumentType>('NIN_SLIP');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [selfieWithIdUrl, setSelfieWithIdUrl] = useState('');

  // Agent Specific
  const [agencyName, setAgencyName] = useState(
    currentUser && 'agencyName' in currentUser ? (currentUser as AgentUser).agencyName || '' : ''
  );
  const [cacNumber, setCacNumber] = useState(
    currentUser && 'cacNumber' in currentUser ? (currentUser as AgentUser).cacNumber || '' : ''
  );
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseDocumentUrl, setLicenseDocumentUrl] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleDocFileSelect = (file: File) => {
    setDocError(null);
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const detected = (file.type || '').toLowerCase();
    if (!validMimes.includes(detected) && !detected.startsWith('image/')) {
      setDocError('Invalid format. Please select a clear JPG, PNG, or WebP photograph.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setDocError('File size exceeds 10MB limit. Please select a smaller photo or compress it.');
      return;
    }
    if (file.size < 2048) {
      setDocError('File appears empty or corrupted. Please select a valid photo.');
      return;
    }

    setSelectedDocFile(file);
    setDocFileName(file.name);
    setDocFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');
    const preview = URL.createObjectURL(file);
    setDocPreviewUrl(preview);
  };

  const handleRemoveDoc = () => {
    if (docPreviewUrl && docPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(docPreviewUrl);
    }
    setSelectedDocFile(null);
    setDocPreviewUrl(null);
    setDocFileName('');
    setDocFileSize('');
    setDocError(null);
    setUploadedDocUrl('');
    setUploadedDocId('');
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleCacFileSelect = (file: File) => {
    setCacError(null);
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    const detected = (file.type || '').toLowerCase();
    if (!validMimes.includes(detected) && !detected.startsWith('image/')) {
      setCacError('Invalid format. Please select a clear JPG, PNG, or WebP photo.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setCacError('File size exceeds 10MB limit.');
      return;
    }

    setSelectedCacFile(file);
    setCacFileName(file.name);
    setCacFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');
    const preview = URL.createObjectURL(file);
    setCacPreviewUrl(preview);
  };

  const handleRemoveCac = () => {
    if (cacPreviewUrl && cacPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(cacPreviewUrl);
    }
    setSelectedCacFile(null);
    setCacPreviewUrl(null);
    setCacFileName('');
    setCacFileSize('');
    setCacError(null);
    setUploadedCacDocUrl('');
    if (cacGalleryInputRef.current) cacGalleryInputRef.current.value = '';
    if (cacCameraInputRef.current) cacCameraInputRef.current.value = '';
  };

  const loadKYC = () => {
    if (currentUser) {
      const app = Store.getKYCApplicationByUserId(currentUser.id);
      setKycApp(app);
      if (app) {
        setFullName(app.fullName || currentUser.fullName);
        setPhoneNumber(app.phoneNumber || currentUser.phoneNumber);
        setResidentialAddress(app.residentialAddress || '');
        setIdCardType(app.idCardType || 'NIN_SLIP');
        setIdCardNumber(app.idCardNumber || '');
        if (app.idCardDocumentUrl) {
          setUploadedDocUrl(app.idCardDocumentUrl);
          if (!docPreviewUrl) setDocPreviewUrl(app.idCardDocumentUrl);
        }
        setSelfieWithIdUrl(app.selfieWithIdUrl || '');
        if (app.agencyName) setAgencyName(app.agencyName);
        if (app.cacNumber) setCacNumber(app.cacNumber);
        if (app.cacDocumentUrl) {
          setUploadedCacDocUrl(app.cacDocumentUrl);
          if (!cacPreviewUrl) setCacPreviewUrl(app.cacDocumentUrl);
        }
        if (app.licenseNumber) setLicenseNumber(app.licenseNumber);
        if (app.officeAddress) setOfficeAddress(app.officeAddress);
      }

      if (currentUser.verification) {
        setVerificationData(currentUser.verification);
        if (currentUser.verification.documentUrl && !uploadedDocUrl) {
          setUploadedDocUrl(currentUser.verification.documentUrl);
          if (!docPreviewUrl) setDocPreviewUrl(currentUser.verification.documentUrl);
        }
      }

      Store.getVerificationStatus(currentUser.id).then((res) => {
        if (res) {
          if (res.verification) {
            setVerificationData(res.verification);
            if (res.verification.documentUrl && !uploadedDocUrl) {
              setUploadedDocUrl(res.verification.documentUrl);
              if (!docPreviewUrl) setDocPreviewUrl(res.verification.documentUrl);
            }
          }
          if (res.audits) setVerificationAudits(res.audits);
          if (res.environment) setEnvironmentMode(res.environment);
        }
      });
    }
  };

  useEffect(() => {
    loadKYC();
    const unsub = subscribeToStore(loadKYC);
    return unsub;
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-stone-200">
        <p className="text-stone-600">Please log in to view verification credentials.</p>
      </div>
    );
  }

  const isAgent = currentUser.role === 'AGENT';
  const isLandlord = currentUser.role === 'LANDLORD';

  const isPhoneVerified =
    currentUser.isPhoneVerified ||
    verificationData?.phoneVerificationStatus === 'VERIFIED';

  const isIdVerified = verificationData?.identityVerificationStatus === 'VERIFIED';
  const isNameVerified = verificationData?.nameVerificationStatus === 'VERIFIED';

  const overallStatus =
    verificationData?.overallVerificationStatus ||
    (currentUser.verificationStatus === 'VERIFIED' ? 'VERIFIED' : 'NOT_STARTED');

  const isFullyVerified =
    overallStatus === 'VERIFIED' ||
    (isPhoneVerified && isIdVerified && isNameVerified);

  const handleResetVerification = async () => {
    if (!currentUser) return;
    setIsResetting(true);
    try {
      await Store.resetTestVerification(currentUser.id);
      refreshSession();
      loadKYC();
      setFeedback({
        type: 'success',
        text: 'Verification state reset to NOT_STARTED successfully.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to reset test verification.' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSubmitKYC = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setFeedback({ type: 'error', text: 'Please enter your full legal name as it appears on your government ID.' });
      return;
    }

    if (!idCardNumber.trim()) {
      setFeedback({ type: 'error', text: 'Please enter your 11-digit National Identification Number (NIN).' });
      return;
    }

    const cleanNin = idCardNumber.trim().replace(/[\s\-]/g, '');
    if ((idCardType === 'NIN_SLIP' || idCardType.includes('NIN')) && cleanNin.length !== 11) {
      setFeedback({ type: 'error', text: 'National Identification Number (NIN) must be an 11-digit numeric number.' });
      return;
    }

    if (!selectedDocFile && !uploadedDocUrl) {
      setFeedback({
        type: 'error',
        text: 'Please upload a clear photograph of your identity document using [Choose from Gallery] or [Take a Photo].',
      });
      return;
    }

    if (isAgent && !agencyName.trim()) {
      setFeedback({ type: 'error', text: 'Agents must provide their agency trading name.' });
      return;
    }

    if (isAgent && !cacNumber.trim()) {
      setFeedback({ type: 'error', text: 'Agents must provide their Corporate Affairs Commission (CAC) number.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    let docUrlToUse = uploadedDocUrl;
    let docIdToUse = uploadedDocId;

    // 1. Upload identity document to backend if new file selected
    if (selectedDocFile) {
      try {
        setIsUploadingDoc(true);
        const uploadRes = await Store.uploadVerificationDocument({
          userId: currentUser.id,
          file: selectedDocFile,
          documentType: idCardType,
        });
        docUrlToUse = uploadRes.documentUrl;
        docIdToUse = uploadRes.documentId;
        setUploadedDocUrl(uploadRes.documentUrl);
        setUploadedDocId(uploadRes.documentId);
      } catch (uploadErr: any) {
        setIsUploadingDoc(false);
        setIsSubmitting(false);
        setFeedback({
          type: 'error',
          text: uploadErr.message || 'Failed to upload identity document.',
        });
        return;
      } finally {
        setIsUploadingDoc(false);
      }
    }

    // 2. Upload CAC document if new CAC file selected
    let cacUrlToUse = uploadedCacDocUrl;
    if (selectedCacFile) {
      try {
        const cacRes = await Store.uploadVerificationDocument({
          userId: currentUser.id,
          file: selectedCacFile,
          documentType: 'CAC_CERTIFICATE',
        });
        cacUrlToUse = cacRes.documentUrl;
        setUploadedCacDocUrl(cacRes.documentUrl);
      } catch (cacErr) {
        console.warn('CAC document upload warning:', cacErr);
      }
    }

    try {
      // 3. Submit legacy KYC application for administration records
      Store.submitKYCApplication({
        userId: currentUser.id,
        userRole: currentUser.role as 'LANDLORD' | 'AGENT',
        fullName: fullName.trim(),
        email: currentUser.email,
        phoneNumber: phoneNumber.trim(),
        isPhoneVerified: Boolean(currentUser.isPhoneVerified),
        residentialAddress: residentialAddress.trim(),
        idCardType,
        idCardNumber: cleanNin,
        idCardDocumentUrl: docUrlToUse,
        agencyName: isAgent ? agencyName.trim() : undefined,
        cacNumber: isAgent ? cacNumber.trim() : undefined,
        cacDocumentUrl: cacUrlToUse || undefined,
        licenseNumber: isAgent && licenseNumber.trim() ? licenseNumber.trim() : undefined,
        officeAddress: isAgent ? officeAddress.trim() : undefined,
      });

      // 4. Authoritative Backend Identity & Name Verification Call
      const idResult = await Store.submitIdentityVerification({
        userId: currentUser.id,
        idType: idCardType === 'NIN_SLIP' ? 'National Identification Number (NIN)' : idCardType,
        idNumber: cleanNin,
        fullName: fullName.trim(),
        documentUrl: docUrlToUse,
        documentId: docIdToUse,
      });

      if (idResult?.verification) {
        setVerificationData(idResult.verification);
      }

      refreshSession();
      loadKYC();

      const overall = idResult?.verification?.overallVerificationStatus;
      const idStatus = idResult?.verification?.identityVerificationStatus;

      if (idStatus === 'VERIFIED') {
        if (overall === 'VERIFIED') {
          setFeedback({
            type: 'success',
            text: '✓ 3-Step Verification Complete! Phone, NIN, and Legal Name verified. You are now authorized to list properties on HOMEZA.',
          });
        } else {
          setFeedback({
            type: 'success',
            text: 'Identity verified with NIMC! Phone or Name match verification in progress.',
          });
        }
      } else if (idStatus === 'REVIEW' || overall === 'REVIEW') {
        setFeedback({
          type: 'info',
          text: 'Identity submitted for manual compliance review. Our verification officer will review your documents within 24 hours.',
        });
      } else if (idStatus === 'FAILED' || overall === 'FAILED') {
        setFeedback({
          type: 'error',
          text: idResult?.message || idResult?.verification?.failureReason || 'Identity verification failed. Please check your details and try again.',
        });
      } else {
        setFeedback({
          type: 'info',
          text: idResult?.message || 'Identity verification submitted.',
        });
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to submit verification.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-emerald-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-700 text-xs font-bold uppercase tracking-wider text-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>HOMEZA Trust & Identity Verification (Official 3-Step Pipeline)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Verify the Person. Verify the Property.
          </h2>
          <p className="text-emerald-100 text-sm leading-relaxed">
            All Landlords and Agents in Uyo must complete the 3 core security checks (Phone OTP, Government NIN, and Legal Name Match) before publishing property listings.
          </p>
        </div>
      </div>

      {/* 3 CORE SECURITY CHECKS STATUS DASHBOARD */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
          <div>
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Authoritative Security State
            </span>
            <div className="flex items-center gap-3 mt-1">
              <h3 className="text-xl font-black text-stone-900">
                3-Step Verification Pipeline
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 ${
                  isFullyVerified
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : overallStatus === 'REVIEW'
                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                    : overallStatus === 'FAILED'
                    ? 'bg-red-100 text-red-900 border-red-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                {isFullyVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                <span>{isFullyVerified ? '✓ FULLY VERIFIED' : overallStatus}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser?.role === 'ADMIN' && (
              <button
                type="button"
                onClick={handleResetVerification}
                disabled={isResetting}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Reset verification state (Admin Only)"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>Reset Verification</span>
              </button>
            )}
            {isFullyVerified && onNavigateToAddProperty && (
              <button
                type="button"
                onClick={onNavigateToAddProperty}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Add Property Listing</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 3 Verification Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Check 1: Phone OTP */}
          <div
            className={`p-4 rounded-2xl border transition ${
              isPhoneVerified
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 shadow-xs'
                : 'bg-stone-50 border-stone-200 text-stone-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Check 1
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase flex items-center gap-1 ${
                  isPhoneVerified
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {isPhoneVerified && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                <span>{isPhoneVerified ? 'PHONE NUMBER VERIFIED' : 'ACTION NEEDED'}</span>
              </span>
            </div>
            <h4 className="font-bold text-sm text-stone-900">Phone Ownership (OTP)</h4>
            <p className="text-xs text-stone-600 mt-1">
              {isPhoneVerified
                ? `Verified: ${verificationData?.phone || currentUser.phoneNumber || 'Nigerian Mobile SIM'}`
                : 'Verify your Nigerian mobile phone number via secure SMS OTP.'}
            </p>
            {!isPhoneVerified && (
              <button
                type="button"
                onClick={() => setShowPhoneModal(true)}
                className="mt-3 w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition cursor-pointer shadow-xs"
              >
                Verify Phone via OTP
              </button>
            )}
          </div>

          {/* Check 2: NIN / Identity */}
          <div
            className={`p-4 rounded-2xl border transition ${
              isIdVerified
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 shadow-xs'
                : verificationData?.identityVerificationStatus === 'FAILED'
                ? 'bg-red-50 border-red-200 text-red-950'
                : 'bg-stone-50 border-stone-200 text-stone-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Check 2
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase flex items-center gap-1 ${
                  isIdVerified
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : verificationData?.identityVerificationStatus === 'FAILED'
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : verificationData?.identityVerificationStatus === 'PROCESSING'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-stone-200 text-stone-700'
                }`}
              >
                {isIdVerified && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                <span>{isIdVerified ? 'NIN VERIFIED' : (verificationData?.identityVerificationStatus || 'NOT STARTED')}</span>
              </span>
            </div>
            <h4 className="font-bold text-sm text-stone-900">Government NIN / ID</h4>
            <p className="text-xs text-stone-600 mt-1">
              {verificationData?.maskedIdNumber
                ? `Official NIMC Record: ${verificationData.maskedIdNumber}`
                : 'Valid 11-digit National Identification Number (NIN).'}
            </p>
            {verificationData?.providerReference && (
              <p className="text-2xs font-mono text-stone-500 mt-1 truncate">
                Ref: {verificationData.providerReference}
              </p>
            )}
          </div>

          {/* Check 3: Legal Name Match */}
          <div
            className={`p-4 rounded-2xl border transition ${
              isNameVerified
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 shadow-xs'
                : verificationData?.nameVerificationStatus === 'MISMATCH'
                ? 'bg-red-50 border-red-200 text-red-950'
                : verificationData?.nameVerificationStatus === 'REVIEW'
                ? 'bg-blue-50 border-blue-200 text-blue-950'
                : 'bg-stone-50 border-stone-200 text-stone-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Check 3
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase flex items-center gap-1 ${
                  isNameVerified
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : verificationData?.nameVerificationStatus === 'MISMATCH'
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : verificationData?.nameVerificationStatus === 'REVIEW'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-stone-200 text-stone-700'
                }`}
              >
                {isNameVerified && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                <span>
                  {isNameVerified
                    ? 'LEGAL NAME MATCH VERIFIED'
                    : verificationData?.nameVerificationStatus === 'MISMATCH'
                    ? 'NAME MISMATCH'
                    : verificationData?.nameVerificationStatus === 'REVIEW'
                    ? 'MANUAL REVIEW'
                    : 'PENDING'}
                </span>
              </span>
            </div>
            <h4 className="font-bold text-sm text-stone-900">Legal Name Match</h4>
            <p className="text-xs text-stone-600 mt-1 truncate">
              {verificationData?.verifiedName
                ? `Verified: ${verificationData.verifiedName}`
                : 'Compares account name vs NIMC verified record.'}
            </p>
            {verificationData?.failureReason && (
              <p className="text-2xs text-red-700 font-semibold mt-1">
                {verificationData.failureReason}
              </p>
            )}
          </div>
        </div>

        {/* Listing Eligibility Gating Alert */}
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
            isFullyVerified
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          {isFullyVerified ? (
            <Unlock className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <h4 className="font-bold text-sm">
              {isFullyVerified
                ? 'Property Listing Publishing: AUTHORIZED'
                : 'Property Listing Publishing: RESTRICTED & BLOCKED'}
            </h4>
            <p className="leading-relaxed">
              {isFullyVerified
                ? 'All three security verification requirements are satisfied. Your published listings will receive the HOMEZA Verified Landlord / Agent Trust Badge.'
                : 'To protect Uyo tenants from rental scams, the backend strictly rejects property creation until Phone OTP, NIN, and Name Match are completely verified.'}
            </p>
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : feedback.type === 'info'
              ? 'bg-blue-50 text-blue-900 border-blue-300'
              : 'bg-red-50 text-red-900 border-red-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline hover:no-underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KYC FORM */}
      <form onSubmit={handleSubmitKYC} className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
        <div className="border-b border-stone-200 pb-4">
          <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-700" />
            <span>Personal Identity & Contact Verification</span>
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Enter your official legal credentials to complete your landlord/agent verification.
          </p>
        </div>

        {/* Section 1: Personal Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Full Legal Name (as on ID) *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Aniekan Okon Bassey"
              className="w-full text-sm font-medium border border-stone-300 rounded-xl p-3 focus:outline-emerald-700 text-stone-900 bg-white"
            />
            <p className="text-2xs text-stone-500 mt-1">
              Must match the name registered on your government NIN document.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Phone Number (OTP Verification Required) *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+234 803 000 0000"
                className="flex-1 text-sm font-medium border border-stone-300 rounded-xl p-3 focus:outline-emerald-700 text-stone-900 bg-white"
              />
              {isPhoneVerified ? (
                <span className="px-3 py-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(true)}
                  className="px-3 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                >
                  <Phone className="w-4 h-4" />
                  <span>Verify OTP</span>
                </button>
              )}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Residential / Operating Address in Akwa Ibom *
            </label>
            <input
              type="text"
              required
              value={residentialAddress}
              onChange={(e) => setResidentialAddress(e.target.value)}
              placeholder="e.g. 14 Shelter Afrique Estate, Uyo, Akwa Ibom State"
              className="w-full text-sm font-medium border border-stone-300 rounded-xl p-3 focus:outline-emerald-700 text-stone-900 bg-white"
            />
          </div>
        </div>

        {/* Section 2: Government Identity Document */}
        <div className="pt-4 border-t border-stone-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>Government Identity Document</span>
              </h4>
              <p className="text-xs text-stone-500">Select your valid government-issued ID card.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Document Type *
              </label>
              <select
                value={idCardType}
                onChange={(e) => setIdCardType(e.target.value as IdentityDocumentType)}
                className="w-full text-sm font-medium border border-stone-300 rounded-xl p-3 focus:outline-emerald-700 text-stone-900 bg-white"
              >
                <option value="NIN_SLIP">National Identification Number (NIN)</option>
                <option value="DRIVERS_LICENSE">FRSC Driver's License</option>
                <option value="INTERNATIONAL_PASSPORT">Nigerian International Passport</option>
                <option value="VOTERS_CARD">Permanent Voter's Card (INEC PVC)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                ID Document Number (11-Digit NIN) *
              </label>
              <input
                type="text"
                required
                value={idCardNumber}
                onChange={(e) => setIdCardNumber(e.target.value)}
                placeholder="e.g. 48291049281"
                className="w-full text-sm font-medium border border-stone-300 rounded-xl p-3 focus:outline-emerald-700 text-stone-900 bg-white font-mono"
              />
            </div>

            {/* Government Identity Document Upload Component */}
            <div className="sm:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Government Identity Document *
                  </label>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Upload a clear photograph of your identity document.
                  </p>
                </div>
                {docPreviewUrl && (
                  <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Photo Attached</span>
                  </span>
                )}
              </div>

              {/* Hidden File Inputs for Mobile Gallery & Native Camera Capture */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple={false}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleDocFileSelect(file);
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleDocFileSelect(file);
                }}
              />

              {/* Document Image Preview or Upload Prompt */}
              {docPreviewUrl ? (
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative shrink-0">
                    <img
                      src={docPreviewUrl}
                      alt="Government Identity Document"
                      className="w-40 h-28 object-cover rounded-xl border border-emerald-300 shadow-xs bg-white"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white p-1 rounded-full shadow-xs">
                      <Check className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-left space-y-1.5 w-full">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-2xs font-extrabold uppercase bg-emerald-100 text-emerald-800">
                        {selectedDocFile ? 'Ready to Upload' : 'Stored Document'}
                      </span>
                      {docFileSize && (
                        <span className="text-2xs text-stone-500 font-mono">{docFileSize}</span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-stone-900 truncate">
                      {docFileName || 'Government Identity Document Photo'}
                    </p>
                    <p className="text-2xs text-stone-600">
                      Clear photograph attached. Full legal name and 11-digit NIN will be verified.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 font-bold text-2xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Choose from Gallery</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 font-bold text-2xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Take a Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveDoc}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-2xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl p-6 bg-stone-50/70 text-center transition">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-3 shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h5 className="text-sm font-bold text-stone-800">
                    Upload a clear photograph of your identity document.
                  </h5>
                  <p className="text-2xs text-stone-500 mt-1 mb-4 max-w-md mx-auto">
                    Ensure your full legal name, photograph, and 11-digit NIN are sharply focused and legible. Accepted formats: JPG, PNG, WebP (Max 10MB).
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <ImageIcon className="w-4 h-4 text-emerald-700" />
                      <span>Choose from Gallery</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take a Photo</span>
                    </button>
                  </div>
                </div>
              )}

              {docError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{docError}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Agent Specific Fields */}
        {isAgent && (
          <div className="pt-4 border-t border-stone-200 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>Real Estate Agency & Business Registration (CAC)</span>
              </h4>
              <p className="text-xs text-stone-500">Required credentials for verified practicing agents in Uyo.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Agency / Business Trading Name *
                </label>
                <input
                  type="text"
                  required
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="e.g. Uyo Premier Realtors Ltd"
                  className="w-full text-sm font-medium border border-stone-300 rounded-xl p-3 focus:outline-emerald-700 text-stone-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  CAC Registration Number *
                </label>
                <input
                  type="text"
                  required
                  value={cacNumber}
                  onChange={(e) => setCacNumber(e.target.value)}
                  placeholder="e.g. RC-1928472 or BN-829104"
                  className="w-full text-sm font-medium border border-stone-300 rounded-xl p-3 focus:outline-emerald-700 text-stone-900 bg-white font-mono"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                      CAC Business Registration Certificate
                    </label>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Upload photograph or scan of your CAC certificate of business incorporation.
                    </p>
                  </div>
                  {cacPreviewUrl && (
                    <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Certificate Attached</span>
                    </span>
                  )}
                </div>

                {/* Hidden File Inputs for CAC Document */}
                <input
                  ref={cacGalleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  multiple={false}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCacFileSelect(file);
                  }}
                />
                <input
                  ref={cacCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCacFileSelect(file);
                  }}
                />

                {cacPreviewUrl ? (
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative shrink-0">
                      <img
                        src={cacPreviewUrl}
                        alt="CAC Document Preview"
                        className="w-36 h-24 object-cover rounded-xl border border-emerald-300 shadow-xs bg-white"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white p-1 rounded-full shadow-xs">
                        <Check className="w-3 h-3" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 text-left space-y-1.5 w-full">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-2xs font-extrabold uppercase bg-emerald-100 text-emerald-800">
                          {selectedCacFile ? 'Ready to Upload' : 'Stored Certificate'}
                        </span>
                        {cacFileSize && (
                          <span className="text-2xs text-stone-500 font-mono">{cacFileSize}</span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-stone-900 truncate">
                        {cacFileName || 'CAC Certificate'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => cacGalleryInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 font-bold text-2xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Choose from Gallery</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => cacCameraInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 font-bold text-2xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                        >
                          <Camera className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Take a Photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveCac}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-2xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/70 text-center">
                    <p className="text-xs text-stone-600 mb-3">
                      Upload photo or scan of your CAC Certificate of Incorporation.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => cacGalleryInputRef.current?.click()}
                        className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Choose from Gallery</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => cacCameraInputRef.current?.click()}
                        className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Take a Photo</span>
                      </button>
                    </div>
                  </div>
                )}

                {cacError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{cacError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Authoritative backend identity verification</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 text-sm"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isSubmitting ? 'Verifying Credentials...' : 'Submit for Identity Verification'}</span>
          </button>
        </div>
      </form>

      {/* Phone OTP Verification Modal */}
      {showPhoneModal && (
        <PhoneVerificationModal
          isOpen={showPhoneModal}
          onClose={() => setShowPhoneModal(false)}
          initialPhoneNumber={phoneNumber}
          onSuccess={() => {
            refreshSession();
            loadKYC();
            setFeedback({
              type: 'success',
              text: 'Phone number verified successfully! You may now submit your identity verification.',
            });
          }}
        />
      )}
    </div>
  );
};
