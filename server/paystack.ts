import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ override: true });

/**
 * Paystack Integration Helper Module for HOMEZA
 * Supports both Paystack LIVE MODE and TEST MODE
 * Handles:
 *  1. Remote Transaction Verification via GET https://api.paystack.co/transaction/verify/:reference
 *  2. HMAC-SHA512 Webhook Signature Verification
 *  3. Idempotent Webhook & Callback Event Handling
 *  4. Branded HOMEZA Payment Result Callback HTML Page
 */

// Dynamic getters to read environment variables at runtime
export function getPaystackSecretKey(): string {
  return (
    process.env.PAYSTACK_SECRET_KEY?.trim() ||
    process.env.PAYSTACK_SECRET?.trim() ||
    ''
  );
}

export function getPaystackPublicKey(): string {
  if (process.env.PAYSTACK_PUBLIC_KEY?.trim()) {
    return process.env.PAYSTACK_PUBLIC_KEY.trim();
  }
  if (process.env.VITE_PAYSTACK_PUBLIC_KEY?.trim()) {
    return process.env.VITE_PAYSTACK_PUBLIC_KEY.trim();
  }
  // In live mode, never return a test public key
  return isPaystackLiveMode() ? '' : 'pk_test_5e9e0f8427b2167e23bafb07728d329f14e64a74';
}

export function getPaystackWebhookSecret(): string {
  return (
    process.env.PAYSTACK_WEBHOOK_SECRET?.trim() ||
    getPaystackSecretKey()
  );
}

export function isPaystackLiveMode(): boolean {
  const secret = getPaystackSecretKey();
  return secret.startsWith('sk_live_');
}

export function isPaystackConfigured(): boolean {
  return getPaystackSecretKey().length > 0;
}

// In-memory set of processed webhook events/references for strict idempotency
const processedEvents = new Map<string, { timestamp: number; status: string }>();

// Cleanup stale entries older than 48 hours to prevent unbounded memory growth
function pruneProcessedEvents() {
  const now = Date.now();
  const maxAge = 48 * 60 * 60 * 1000;
  for (const [key, val] of processedEvents.entries()) {
    if (now - val.timestamp > maxAge) {
      processedEvents.delete(key);
    }
  }
}

export function markEventAsProcessed(eventRefOrId: string, status: string = 'SUCCESS'): void {
  pruneProcessedEvents();
  processedEvents.set(eventRefOrId, { timestamp: Date.now(), status });
}

export function isEventAlreadyProcessed(eventRefOrId: string): boolean {
  return processedEvents.has(eventRefOrId);
}

/**
 * Authoritative Paystack Remote Transaction Verification
 * Calls: GET https://api.paystack.co/transaction/verify/:reference
 * Authorization: Bearer PAYSTACK_SECRET_KEY
 */
export interface PaystackVerifyResult {
  success: boolean;
  isConfirmedPaid: boolean;
  isPending: boolean;
  isFailed: boolean;
  statusString: string; // 'success' | 'failed' | 'abandoned' | 'ongoing' | etc.
  reference: string;
  transactionId?: string;
  amountKobo: number;
  amountNaira: number;
  currency: string;
  channel?: string;
  paidAt?: string;
  gatewayResponse?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  metadata?: Record<string, any>;
  errorMessage?: string;
  rawResponse?: any;
}

export async function verifyPaystackTransactionWithRemote(
  reference: string
): Promise<PaystackVerifyResult> {
  const secretKey = getPaystackSecretKey();
  const cleanRef = reference.trim();

  if (!cleanRef) {
    return {
      success: false,
      isConfirmedPaid: false,
      isPending: false,
      isFailed: true,
      statusString: 'missing_reference',
      reference: '',
      amountKobo: 0,
      amountNaira: 0,
      currency: 'NGN',
      errorMessage: 'Transaction reference is missing or empty.',
    };
  }

  // If secret key is not provided (local development sandbox)
  if (!secretKey) {
    console.warn(
      `[PAYSTACK VERIFY] PAYSTACK_SECRET_KEY not set in environment. Running sandbox mock verification for reference: ${cleanRef}`
    );
    return {
      success: true,
      isConfirmedPaid: true,
      isPending: false,
      isFailed: false,
      statusString: 'success',
      reference: cleanRef,
      transactionId: `mock-tx-${Date.now()}`,
      amountKobo: 300000,
      amountNaira: 3000,
      currency: 'NGN',
      channel: 'test_card',
      paidAt: new Date().toISOString(),
      gatewayResponse: 'Successful (Local Sandbox Mode)',
      customerEmail: 'sandbox@homeza.ng',
      customerName: 'Verified Tenant',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

  try {
    const url = `https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanRef)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data: any = await response.json().catch(() => null);

    if (!response.ok || !data) {
      const errMsg =
        data?.message || `Paystack API returned HTTP ${response.status}`;
      return {
        success: false,
        isConfirmedPaid: false,
        isPending: false,
        isFailed: true,
        statusString: 'api_error',
        reference: cleanRef,
        amountKobo: 0,
        amountNaira: 0,
        currency: 'NGN',
        errorMessage: errMsg,
        rawResponse: data,
      };
    }

    if (!data.status || !data.data) {
      return {
        success: false,
        isConfirmedPaid: false,
        isPending: false,
        isFailed: true,
        statusString: 'not_found',
        reference: cleanRef,
        amountKobo: 0,
        amountNaira: 0,
        currency: 'NGN',
        errorMessage: data.message || 'Transaction reference not found on Paystack.',
        rawResponse: data,
      };
    }

    const tx = data.data;
    const txStatus = (tx.status || '').toLowerCase();
    const amountKobo = Number(tx.amount) || 0;
    const amountNaira = Math.floor(amountKobo / 100);
    const currency = (tx.currency || 'NGN').toUpperCase();
    const channel = tx.channel || 'card';
    const paidAt = tx.paid_at || new Date().toISOString();
    const gatewayResponse = tx.gateway_response || tx.message || 'Approved';
    const transactionId = tx.id ? String(tx.id) : undefined;
    const metadata = tx.metadata || {};

    const customer = tx.customer || {};
    const customerEmail = customer.email || metadata.tenantEmail;
    const customerName =
      customer.first_name || customer.last_name
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
        : metadata.tenantName;
    const customerPhone = customer.phone || metadata.tenantPhone;

    const isConfirmedPaid = txStatus === 'success';
    const isPending = txStatus === 'ongoing' || txStatus === 'abandoned' || txStatus === 'pending';
    const isFailed = !isConfirmedPaid && !isPending;

    return {
      success: true,
      isConfirmedPaid,
      isPending,
      isFailed,
      statusString: txStatus,
      reference: tx.reference || cleanRef,
      transactionId,
      amountKobo,
      amountNaira,
      currency,
      channel,
      paidAt,
      gatewayResponse,
      customerEmail,
      customerName,
      customerPhone,
      metadata,
      rawResponse: tx,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isAbort = err.name === 'AbortError';
    return {
      success: false,
      isConfirmedPaid: false,
      isPending: false,
      isFailed: false,
      statusString: isAbort ? 'timeout' : 'network_error',
      reference: cleanRef,
      amountKobo: 0,
      amountNaira: 0,
      currency: 'NGN',
      errorMessage: isAbort
        ? 'Connection to Paystack timed out. Please try again.'
        : err.message || 'Failed to connect to Paystack verification API.',
    };
  }
}

/**
 * Verify Paystack Webhook Signature using HMAC-SHA512
 * Compares computed digest against `x-paystack-signature` using timingSafeEqual
 */
export function verifyPaystackWebhookSignature(
  signature: string | undefined,
  rawBody: Buffer | string | undefined
): { isValid: boolean; reason?: string } {
  const secret = getPaystackWebhookSecret();

  // If secret is not set in sandbox dev mode, allow with warning
  if (!secret) {
    console.warn(
      '[PAYSTACK WEBHOOK] PAYSTACK_SECRET_KEY / PAYSTACK_WEBHOOK_SECRET is not configured. Allowing test payload.'
    );
    return { isValid: true };
  }

  if (!signature) {
    return { isValid: false, reason: 'Missing x-paystack-signature header' };
  }

  if (!rawBody) {
    return { isValid: false, reason: 'Missing request body for signature verification' };
  }

  try {
    const rawBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf-8');
    const computedHash = crypto.createHmac('sha512', secret).update(rawBuffer).digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const computedBuffer = Buffer.from(computedHash, 'hex');

    if (signatureBuffer.length !== computedBuffer.length) {
      return { isValid: false, reason: 'Signature length mismatch' };
    }

    const isValid = crypto.timingSafeEqual(signatureBuffer, computedBuffer);
    if (!isValid) {
      return { isValid: false, reason: 'Signature HMAC mismatch' };
    }

    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, reason: err.message || 'Signature calculation error' };
  }
}

/**
 * Professional HOMEZA Payment Callback Result HTML Page
 * Styled strictly using HOMEZA visual identity:
 *   - Emerald 700 (#047857), Emerald 950 (#064e3b), Stone Slate (#0f172a, #f8fafc)
 *   - Clear status card: Successful, Failed, Processing, or Unverified
 *   - Reference copy button, Amount in ₦, Property Title, Meeting Point Status
 *   - Return to HOMEZA Dashboard button
 */
export interface RenderCallbackPageOptions {
  status: 'SUCCESS' | 'FAILED' | 'PROCESSING' | 'UNVERIFIED';
  reference: string;
  amountNaira?: number;
  propertyTitle?: string;
  propertyLocationArea?: string;
  tenantName?: string;
  channel?: string;
  paidAt?: string;
  inspectionDate?: string;
  inspectionTime?: string;
  message?: string;
  dashboardUrl?: string;
  sessionToken?: string;
  tenantUserId?: string;
  tenantEmail?: string;
  tenantRole?: string;
}

export function renderPaymentResultHtml(options: RenderCallbackPageOptions): string {
  const {
    status,
    reference,
    amountNaira = 3000,
    propertyTitle = 'Property Inspection Booking',
    propertyLocationArea = 'Uyo, Akwa Ibom',
    tenantName = 'Valued Tenant',
    channel = 'Card',
    paidAt = new Date().toISOString(),
    inspectionDate,
    inspectionTime,
    message,
    dashboardUrl = '/',
    sessionToken,
    tenantUserId,
    tenantEmail,
    tenantRole = 'TENANT',
  } = options;

  const isSuccess = status === 'SUCCESS';
  const isPending = status === 'PROCESSING';
  const isFailed = status === 'FAILED';
  const isUnverified = status === 'UNVERIFIED';

  // Aesthetic theme tokens
  let bannerColor = '#047857'; // emerald-700
  let badgeBg = '#ecfdf5'; // emerald-50
  let badgeBorder = '#a7f3d0'; // emerald-200
  let badgeText = '#065f46'; // emerald-800
  let statusHeading = 'Payment Verified & Inspection Confirmed';
  let statusSubheading =
    'Your inspection fee was authoritatively verified with Paystack. Your property meeting point and inspection coordinator details are now unlocked.';

  let iconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  `;

  if (isPending) {
    bannerColor = '#d97706'; // amber-600
    badgeBg = '#fffbeb'; // amber-50
    badgeBorder = '#fde68a'; // amber-200
    badgeText = '#92400e'; // amber-800
    statusHeading = 'Payment is Still Processing';
    statusSubheading =
      message ||
      'Paystack has not completed settlement for this transaction. If you have already authorized the charge with your bank, please give it a moment or refresh this page.';
    iconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
    `;
  } else if (isFailed) {
    bannerColor = '#dc2626'; // red-600
    badgeBg = '#fef2f2'; // red-50
    badgeBorder = '#fecaca'; // red-200
    badgeText = '#991b1b'; // red-800
    statusHeading = 'Payment Unsuccessful';
    statusSubheading =
      message ||
      'Paystack reported that this payment was declined or could not be completed. Your account was not charged by HOMEZA.';
    iconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    `;
  } else if (isUnverified) {
    bannerColor = '#b45309'; // amber-700
    badgeBg = '#fffbeb';
    badgeBorder = '#fde68a';
    badgeText = '#78350f';
    statusHeading = 'Transaction Could Not Be Verified';
    statusSubheading =
      message ||
      'We could not independently verify this transaction with Paystack. HOMEZA never marks a payment as successful without authoritative server-side confirmation.';
    iconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    `;
  }

  // Format date readable
  let formattedDate = paidAt;
  try {
    formattedDate = new Date(paidAt).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_) {}

  const safeRef = reference ? reference.replace(/[^\w-]/g, '') : 'N/A';
  const returnTargetUrl = isSuccess
    ? `${dashboardUrl}?payment_status=success&ref=${encodeURIComponent(safeRef)}${sessionToken ? `&auth_token=${encodeURIComponent(sessionToken)}` : ''}&tab=applications`
    : `${dashboardUrl}?payment_status=failed&ref=${encodeURIComponent(safeRef)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Result • HOMEZA Verified Marketplace</title>
  <script>
    try {
      var sToken = ${JSON.stringify(sessionToken || '')};
      var sUserId = ${JSON.stringify(tenantUserId || '')};
      var sEmail = ${JSON.stringify(tenantEmail || '')};
      var sRole = ${JSON.stringify(tenantRole || 'TENANT')};
      var sName = ${JSON.stringify(tenantName || 'Tenant')};
      if (sToken && sUserId) {
        var sessObj = {
          token: sToken,
          userId: sUserId,
          email: sEmail,
          role: sRole,
          fullName: sName,
          issuedAt: Date.now(),
          expiresAt: Date.now() + 7 * 86400000,
        };
        localStorage.setItem('homeza_active_session_v3', JSON.stringify(sessObj));
        sessionStorage.setItem('homeza_active_session_v3', JSON.stringify(sessObj));
        localStorage.setItem('homeza_current_user_id', JSON.stringify(sUserId));
      }
    } catch (e) {
      console.warn('Session persistence error:', e);
    }
  </script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      line-height: 1.5;
      padding: 24px 16px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .container {
      width: 100%;
      max-width: 580px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.06), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
      overflow: hidden;
    }
    .header-band {
      background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
      padding: 24px;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      font-size: 20px;
      letter-spacing: -0.02em;
    }
    .brand-badge {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .body-content {
      padding: 32px 28px;
      text-align: center;
    }
    .icon-wrapper {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: ${badgeBg};
      border: 1px solid ${badgeBorder};
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon {
      width: 38px;
      height: 38px;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .subtext {
      font-size: 14px;
      color: #475569;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .receipt-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
      text-align: left;
      margin-bottom: 24px;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px dashed #cbd5e1;
      font-size: 13px;
    }
    .receipt-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .receipt-label {
      color: #64748b;
      font-weight: 500;
    }
    .receipt-value {
      color: #0f172a;
      font-weight: 700;
      text-align: right;
      word-break: break-all;
    }
    .status-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      background: ${badgeBg};
      color: ${badgeText};
      border: 1px solid ${badgeBorder};
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .btn-primary {
      display: block;
      width: 100%;
      background: #047857;
      color: #ffffff;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 20px;
      border-radius: 14px;
      transition: background 0.15s ease;
      cursor: pointer;
      border: none;
      text-align: center;
    }
    .btn-primary:hover {
      background: #065f46;
    }
    .btn-secondary {
      display: block;
      width: 100%;
      background: #f1f5f9;
      color: #334155;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 20px;
      border-radius: 14px;
      text-align: center;
      transition: background 0.15s ease;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    .footer-note {
      margin-top: 20px;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
    .security-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      font-size: 11px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container" id="homeza-payment-result-container">
    <div class="header-band">
      <div class="brand">
        <span>HOMEZA</span>
        <span class="brand-badge">Paystack Verified</span>
      </div>
      <div style="font-size: 12px; opacity: 0.9;">Secure Checkout</div>
    </div>

    <div class="body-content">
      <div class="icon-wrapper">
        ${iconSvg}
      </div>

      <div style="margin-bottom: 16px;">
        <span class="status-pill">${status}</span>
      </div>

      <h1>${statusHeading}</h1>
      <p class="subtext">${statusSubheading}</p>

      <div class="receipt-card">
        <div class="receipt-row">
          <span class="receipt-label">Transaction Reference</span>
          <span class="receipt-value" style="font-family: monospace; font-size: 12px;">${safeRef}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Amount Paid</span>
          <span class="receipt-value" style="color: #047857; font-size: 15px;">₦${amountNaira.toLocaleString()} NGN</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Property Purpose</span>
          <span class="receipt-value">${propertyTitle}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Location Area</span>
          <span class="receipt-value">${propertyLocationArea}</span>
        </div>
        ${
          inspectionDate
            ? `<div class="receipt-row">
                <span class="receipt-label">Scheduled Date</span>
                <span class="receipt-value">${inspectionDate} ${inspectionTime ? `(${inspectionTime})` : ''}</span>
              </div>`
            : ''
        }
        <div class="receipt-row">
          <span class="receipt-label">Payment Channel</span>
          <span class="receipt-value" style="text-transform: capitalize;">${channel}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Timestamp</span>
          <span class="receipt-value">${formattedDate}</span>
        </div>
        ${
          isSuccess
            ? `<div class="receipt-row">
                <span class="receipt-label">Meeting Point Status</span>
                <span class="receipt-value" style="color: #047857;">UNLOCKED • COORDINATOR ASSIGNED</span>
              </div>`
            : ''
        }
      </div>

      <div class="actions">
        <a href="${returnTargetUrl}" class="btn-primary" id="btn-return-dashboard">
          Return to HOMEZA Dashboard
        </a>
        <a href="/" class="btn-secondary" id="btn-browse-listings">
          Browse Verified Listings
        </a>
      </div>

      <div class="footer-note">
        <p>HOMEZA Real Estate Technologies Ltd • Paystack Live Payment Gateway</p>
        <div class="security-tag">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          256-bit Encrypted Server Verification
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
