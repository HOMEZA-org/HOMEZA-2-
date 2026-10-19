/**
 * HOMEZA Identity & Security Verification Service
 *
 * Implements the 3 Core Security Checks:
 * 1. NIN / Identity Verification
 * 2. Legal Name Verification (server-side authoritative fuzzy match)
 * 3. Phone OTP Verification (cryptographic hashing, cooldowns, attempt limits, expiry)
 *
 * Architecture supports switching between TEST and LIVE modes via environment variables
 * without rewriting business logic.
 */

import crypto from 'crypto';

// Configuration from Environment
export function getIdentifyOrgApiKey(): string {
  // Always prioritize the live key if configured
  const liveKey = process.env.IDENTIFYORG_LIVE_KEY?.trim();
  if (liveKey && liveKey.startsWith('io_live_')) {
    return liveKey;
  }
  return (
    process.env.IDENTIFYORG_LIVE_KEY?.trim() ||
    process.env.IDENTIFYORG_API_KEY?.trim() ||
    process.env.VERIFICATION_API_KEY?.trim() ||
    process.env.IDENTIFYORG_DEFAULT_TEST_KEY?.trim() ||
    ''
  );
}

export function isIdentifyOrgLiveKeyConfigured(): boolean {
  const key = process.env.IDENTIFYORG_LIVE_KEY?.trim();
  return !!(key && key.startsWith('io_live_'));
}

export const VERIFICATION_CONFIG = {
  get provider(): string {
    return process.env.VERIFICATION_PROVIDER || 'identifyorg';
  },
  get mode(): 'test' | 'live' {
    if (isIdentifyOrgLiveKeyConfigured()) return 'live';
    return (process.env.VERIFICATION_MODE?.toLowerCase() === 'live' ? 'live' : 'test') as 'test' | 'live';
  },
  get baseUrl(): string {
    return 'https://api.identifyorg.com/v1';
  },
  get apiKey(): string {
    return getIdentifyOrgApiKey();
  },
  get apiSecret(): string {
    return process.env.VERIFICATION_SECRET || '';
  },
  get phoneOtpApiKey(): string {
    return process.env.PHONE_OTP_API_KEY || '';
  },
};

// ============================================================================
// PHONE NUMBER NORMALIZATION & MASKING
// ============================================================================

export function normalizeNigerianPhoneNumber(raw: string): string {
  if (!raw) return '';
  let clean = raw.trim().replace(/[\s\-\(\)\.]/g, '');
  if (clean.startsWith('+234')) return clean;
  if (clean.startsWith('234')) return '+' + clean;
  if (clean.startsWith('0')) return '+234' + clean.slice(1);
  if (/^[789]\d{9}$/.test(clean)) return '+234' + clean;
  return clean;
}

export function maskPhoneNumber(phone: string): string {
  const norm = normalizeNigerianPhoneNumber(phone);
  if (norm.length < 8) return '****';
  return norm.slice(0, 7) + '***' + norm.slice(-2);
}

export function maskIdNumber(idNumber: string): string {
  if (!idNumber) return '';
  const clean = idNumber.trim();
  if (clean.length <= 4) return '****';
  return '*'.repeat(Math.max(4, clean.length - 4)) + clean.slice(-4);
}

// ============================================================================
// PHONE OTP VAULT & RATE LIMITING
// ============================================================================

interface OtpRecord {
  phoneNumber: string;
  userId?: string;
  identifyOrgVerificationId?: string;
  reference: string;
  hashedOtp?: string;
  salt?: string;
  expiresAt: number; // 5 minutes (enforced)
  attempts: number; // max 5
  resendTimestamps: number[];
  lockedUntil?: number;
  lastSentAt: number;
  provider: string;
}

// Authoritative in-memory OTP vault
const otpVault = new Map<string, OtpRecord>();

// Clean up expired OTP records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of otpVault.entries()) {
    if (now > record.expiresAt && (!record.lockedUntil || now > record.lockedUntil)) {
      otpVault.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export type SmsDeliveryStatus =
  | 'OTP_GENERATED'
  | 'SMS_ACCEPTED'
  | 'SMS_QUEUED'
  | 'SMS_DELIVERED'
  | 'SMS_SANDBOX_SIMULATED'
  | 'SMS_FAILED'
  | 'SMS_REJECTED';

export interface SmsDeliveryRecord {
  reference: string;
  phoneNumber: string;
  maskedPhone: string;
  provider: string;
  providerMessageId?: string;
  deliveryStatus: SmsDeliveryStatus;
  isTest: boolean;
  isTransactional: boolean;
  senderId: string;
  timestamp: string;
  deliveredAt?: string;
  errorDetails?: string;
  httpStatus?: number;
  cost?: number;
  currency?: string;
}

// In-memory audit vault for SMS delivery receipts and webhook callbacks
export const smsDeliveryTracker = new Map<string, SmsDeliveryRecord>();

/**
 * Checks if live credentials have been configured for any supported real SMS gateway.
 */
export function hasLiveSmsCredentials(): boolean {
  return !!(
    process.env.IDENTIFYORG_LIVE_KEY?.trim() ||
    process.env.TERMII_API_KEY?.trim() ||
    process.env.PHONE_OTP_API_KEY?.trim() ||
    (process.env.TWILIO_ACCOUNT_SID?.trim() && process.env.TWILIO_AUTH_TOKEN?.trim() && (process.env.TWILIO_FROM?.trim() || process.env.TWILIO_PHONE_NUMBER?.trim())) ||
    process.env.SMS_API_URL?.trim()
  );
}

/**
 * Dispatches a REAL SMS containing the 6-digit OTP to the user's physical phone number
 * using configured live production SMS gateways (IdentifyOrg live, Termii DND transactional, Twilio, or generic webhook).
 *
 * CRITICAL REQUIREMENTS:
 * - Does NOT use sandbox or test credentials for real verification delivery.
 * - Does NOT treat HTTP 200 from sandbox simulation as proof of cellular transmission.
 * - Ensures clean E.164 Nigerian phone format (+234...).
 * - Strictly executes server-side. OTP is NEVER exposed to client or logs.
 */
export async function dispatchRealSmsViaProvider(
  phoneNumber: string,
  otpCode: string,
  reference: string
): Promise<{
  success: boolean;
  deliveryStatus: SmsDeliveryStatus;
  provider: string;
  messageId?: string;
  isTest: boolean;
  error?: string;
  explanation: string;
}> {
  const message = `Your HOMEZA verification code is: ${otpCode}. Valid for 5 minutes. Never share this code with anyone.`;
  const cleanPhone = normalizeNigerianPhoneNumber(phoneNumber);
  const senderId = process.env.SMS_SENDER_ID || 'HOMEZA';

  // 1. Termii SMS Gateway (Premier Nigerian SMS Route for Transactional OTP)
  // Nigerian carrier DND bypass route sends directly to MTN, Airtel, Glo, 9mobile
  const termiiApiKey = process.env.TERMII_API_KEY?.trim() || process.env.PHONE_OTP_API_KEY?.trim();
  if (termiiApiKey && !termiiApiKey.startsWith('io_test_')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // Termii expects Nigerian phone format without '+' (e.g. 2349044753792)
      const termiiPhone = cleanPhone.replace(/^\+/, '');
      console.log(`[REAL SMS DISPATCH] Attempting Termii transactional dispatch to ${maskPhoneNumber(cleanPhone)}...`);

      const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: termiiPhone,
          from: senderId,
          sms: message,
          type: 'plain',
          // 'dnd' channel routes transactional OTPs across Nigerian NCC Do-Not-Disturb carrier filters
          channel: 'dnd',
          api_key: termiiApiKey,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: any = await response.json().catch(() => ({}));
        const messageId = data.message_id || data.id;
        const deliveryStatus: SmsDeliveryStatus = 'SMS_ACCEPTED';

        const record: SmsDeliveryRecord = {
          reference,
          phoneNumber: cleanPhone,
          maskedPhone: maskPhoneNumber(cleanPhone),
          provider: 'termii',
          providerMessageId: messageId,
          deliveryStatus,
          isTest: false,
          isTransactional: true,
          senderId,
          timestamp: new Date().toISOString(),
          httpStatus: response.status,
        };
        smsDeliveryTracker.set(reference, record);
        if (messageId) smsDeliveryTracker.set(messageId, record);

        console.log(`[REAL SMS DISPATCH] Termii accepted live cellular SMS to ${maskPhoneNumber(cleanPhone)}. MessageId: ${messageId}`);
        return {
          success: true,
          deliveryStatus,
          provider: 'termii',
          messageId,
          isTest: false,
          explanation: `Dispatched live via Termii transactional cellular route (Message ID: ${messageId}).`,
        };
      } else {
        const errText = await response.text().catch(() => 'Termii live SMS error');
        console.warn(`[REAL SMS GATEWAY] Termii returned status ${response.status}: ${errText.slice(0, 150)}`);
      }
    } catch (err: any) {
      console.warn(`[REAL SMS GATEWAY] Error contacting Termii API: ${err.message || err}`);
    }
  }

  // 2. IdentifyOrg LIVE Production SMS Gateway
  // Strictly requires funded production live key prefixed with io_live_
  const identifyOrgLiveKey = process.env.IDENTIFYORG_LIVE_KEY?.trim();
  if (identifyOrgLiveKey && identifyOrgLiveKey.startsWith('io_live_')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      console.log(`[REAL SMS DISPATCH] Attempting IdentifyOrg live cellular dispatch to ${maskPhoneNumber(cleanPhone)}...`);

      const response = await fetch('https://api.identifyorg.com/v1/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IdentifyOrg-Key': identifyOrgLiveKey,
        },
        body: JSON.stringify({
          to: cleanPhone,
          message,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: any = await response.json().catch(() => ({}));
        // Verify this is NOT a test/sandbox response
        if (data.is_test === true) {
          console.warn('[REAL SMS GATEWAY] IdentifyOrg returned is_test: true despite io_live_ key. Rejecting simulation.');
        } else {
          const messageId = data.message_id || data.id;
          const deliveryStatus: SmsDeliveryStatus = data.status === 'delivered' ? 'SMS_DELIVERED' : 'SMS_ACCEPTED';

          const record: SmsDeliveryRecord = {
            reference,
            phoneNumber: cleanPhone,
            maskedPhone: maskPhoneNumber(cleanPhone),
            provider: 'identifyorg',
            providerMessageId: messageId,
            deliveryStatus,
            isTest: false,
            isTransactional: true,
            senderId,
            timestamp: new Date().toISOString(),
            httpStatus: response.status,
            cost: data.cost,
            currency: data.currency || 'NGN',
          };
          smsDeliveryTracker.set(reference, record);
          if (messageId) smsDeliveryTracker.set(messageId, record);

          console.log(`[REAL SMS DISPATCH] IdentifyOrg accepted live cellular SMS to ${maskPhoneNumber(cleanPhone)}. MessageId: ${messageId}`);
          return {
            success: true,
            deliveryStatus,
            provider: 'identifyorg',
            messageId,
            isTest: false,
            explanation: `Dispatched live via IdentifyOrg cellular gateway (Message ID: ${messageId}).`,
          };
        }
      } else {
        const errText = await response.text().catch(() => 'IdentifyOrg live SMS error');
        console.warn(`[REAL SMS GATEWAY] IdentifyOrg returned status ${response.status}: ${errText.slice(0, 150)}`);
      }
    } catch (err: any) {
      console.warn(`[REAL SMS GATEWAY] Error contacting IdentifyOrg API: ${err.message || err}`);
    }
  }

  // 3. Twilio International Cellular Gateway
  const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const twilioToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const twilioFrom = (process.env.TWILIO_FROM || process.env.TWILIO_PHONE_NUMBER)?.trim();
  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const bodyParams = new URLSearchParams();
      bodyParams.append('To', cleanPhone);
      bodyParams.append('From', twilioFrom);
      bodyParams.append('Body', message);

      console.log(`[REAL SMS DISPATCH] Attempting Twilio live cellular dispatch to ${maskPhoneNumber(cleanPhone)}...`);

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: any = await response.json().catch(() => ({}));
        const messageId = data.sid;
        const deliveryStatus: SmsDeliveryStatus = data.status === 'delivered' ? 'SMS_DELIVERED' : 'SMS_QUEUED';

        const record: SmsDeliveryRecord = {
          reference,
          phoneNumber: cleanPhone,
          maskedPhone: maskPhoneNumber(cleanPhone),
          provider: 'twilio',
          providerMessageId: messageId,
          deliveryStatus,
          isTest: false,
          isTransactional: true,
          senderId: twilioFrom,
          timestamp: new Date().toISOString(),
          httpStatus: response.status,
        };
        smsDeliveryTracker.set(reference, record);
        if (messageId) smsDeliveryTracker.set(messageId, record);

        console.log(`[REAL SMS DISPATCH] Twilio accepted live cellular SMS to ${maskPhoneNumber(cleanPhone)}. SID: ${messageId}`);
        return {
          success: true,
          deliveryStatus,
          provider: 'twilio',
          messageId,
          isTest: false,
          explanation: `Dispatched live via Twilio carrier route (SID: ${messageId}).`,
        };
      } else {
        const errText = await response.text().catch(() => 'Twilio SMS error');
        console.warn(`[REAL SMS GATEWAY] Twilio returned status ${response.status}: ${errText.slice(0, 150)}`);
      }
    } catch (err: any) {
      console.warn(`[REAL SMS GATEWAY] Error contacting Twilio API: ${err.message || err}`);
    }
  }

  // 4. Custom Live SMS Webhook Gateway
  const genericSmsUrl = process.env.SMS_API_URL?.trim();
  if (genericSmsUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      console.log(`[REAL SMS DISPATCH] Attempting custom live webhook dispatch to ${maskPhoneNumber(cleanPhone)}...`);

      const response = await fetch(genericSmsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.PHONE_OTP_API_KEY ? { Authorization: `Bearer ${process.env.PHONE_OTP_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          to: cleanPhone,
          message,
          sender: senderId,
          isTransactional: true,
          reference,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: any = await response.json().catch(() => ({}));
        const messageId = data.id || data.messageId || data.reference || reference;
        const deliveryStatus: SmsDeliveryStatus = 'SMS_ACCEPTED';

        const record: SmsDeliveryRecord = {
          reference,
          phoneNumber: cleanPhone,
          maskedPhone: maskPhoneNumber(cleanPhone),
          provider: 'custom',
          providerMessageId: messageId,
          deliveryStatus,
          isTest: false,
          isTransactional: true,
          senderId,
          timestamp: new Date().toISOString(),
          httpStatus: response.status,
        };
        smsDeliveryTracker.set(reference, record);

        console.log(`[REAL SMS DISPATCH] Custom webhook accepted live cellular SMS to ${maskPhoneNumber(cleanPhone)}.`);
        return {
          success: true,
          deliveryStatus,
          provider: 'custom',
          messageId,
          isTest: false,
          explanation: `Dispatched live via custom SMS gateway (ID: ${messageId}).`,
        };
      } else {
        const errText = await response.text().catch(() => 'Custom SMS API error');
        console.warn(`[REAL SMS GATEWAY] Custom gateway returned status ${response.status}: ${errText.slice(0, 150)}`);
      }
    } catch (err: any) {
      console.warn(`[REAL SMS GATEWAY] Error contacting custom SMS API: ${err.message || err}`);
    }
  }

  // 5. NO LIVE GATEWAY ACCEPTED THE REQUEST
  // Record truthful failure - do NOT simulate or claim success!
  const hasLiveCreds = hasLiveSmsCredentials();
  const failRecord: SmsDeliveryRecord = {
    reference,
    phoneNumber: cleanPhone,
    maskedPhone: maskPhoneNumber(cleanPhone),
    provider: 'none',
    deliveryStatus: 'SMS_FAILED',
    isTest: false,
    isTransactional: true,
    senderId,
    timestamp: new Date().toISOString(),
    errorDetails: hasLiveCreds
      ? 'Live SMS provider rejected the cellular dispatch request. Check balance and provider error logs.'
      : 'No live SMS provider credentials configured. Cellular broadcast to physical phone cannot be executed with sandbox keys.',
  };
  smsDeliveryTracker.set(reference, failRecord);

  console.error(`[REAL SMS DISPATCH FAILED] Could not dispatch physical cellular SMS to ${maskPhoneNumber(cleanPhone)}. Live credentials configured: ${hasLiveCreds}`);

  return {
    success: false,
    deliveryStatus: 'SMS_FAILED',
    provider: 'none',
    isTest: false,
    error: hasLiveCreds ? 'SMS_GATEWAY_REJECTED' : 'LIVE_CREDENTIALS_REQUIRED',
    explanation: hasLiveCreds
      ? 'The live SMS provider rejected the request. Please check provider account balance or sender ID.'
      : 'Real SMS delivery requires live SMS gateway credentials (e.g. TERMII_API_KEY or IDENTIFYORG_LIVE_KEY). Cellular dispatch cannot be performed in sandbox mode.',
  };
}

export function updateSmsDeliveryReceipt(payload: any): SmsDeliveryRecord | null {
  const messageId = payload?.message_id || payload?.id || payload?.MessageSid || payload?.reference;
  if (!messageId) return null;

  const existing = smsDeliveryTracker.get(messageId);
  if (!existing) return null;

  const rawStatus = (payload?.status || payload?.MessageStatus || '').toLowerCase();
  if (rawStatus.includes('deliver') && !rawStatus.includes('undeliver')) {
    existing.deliveryStatus = 'SMS_DELIVERED';
    existing.deliveredAt = new Date().toISOString();
  } else if (rawStatus.includes('undeliver') || rawStatus.includes('fail') || rawStatus.includes('reject')) {
    existing.deliveryStatus = 'SMS_FAILED';
    existing.errorDetails = payload?.reason || payload?.error || 'Provider marked message as undelivered';
  } else if (rawStatus.includes('queue')) {
    existing.deliveryStatus = 'SMS_QUEUED';
  }

  smsDeliveryTracker.set(messageId, existing);
  smsDeliveryTracker.set(existing.reference, existing);
  return existing;
}

export async function sendPhoneOtpInternal(phoneNumber: string, userId?: string): Promise<{
  success: boolean;
  status: number;
  message: string;
  reference?: string;
  maskedPhone?: string;
  cooldownSeconds?: number;
  error?: string;
  deliveryStatus?: SmsDeliveryStatus;
  provider?: string;
  messageId?: string;
  isTest?: boolean;
  explanation?: string;
}> {
  const normalized = normalizeNigerianPhoneNumber(phoneNumber);
  if (!normalized || normalized.length < 11 || !/^\+234\d{10}$/.test(normalized)) {
    return {
      success: false,
      status: 400,
      error: 'INVALID_PHONE_NUMBER',
      message: 'Please provide a valid Nigerian mobile phone number (e.g., 08012345678, 09044753792, or +2349044753792).',
    };
  }

  const now = Date.now();
  const existing = otpVault.get(normalized);

  // 1. Check Lockout from too many failed attempts
  if (existing?.lockedUntil && now < existing.lockedUntil) {
    const minutesLeft = Math.ceil((existing.lockedUntil - now) / (60 * 1000));
    return {
      success: false,
      status: 429,
      error: 'TOO_MANY_ATTEMPTS',
      message: `Too many attempts. Account verification temporarily locked. Please wait ${minutesLeft} minute(s) before trying again.`,
    };
  }

  // 2. Check Cooldown (minimum 45 seconds between resends)
  if (existing && now - existing.lastSentAt < 45 * 1000) {
    const remainingSeconds = Math.ceil((45 * 1000 - (now - existing.lastSentAt)) / 1000);
    return {
      success: false,
      status: 429,
      error: 'RESEND_COOLDOWN',
      message: `Please wait ${remainingSeconds} seconds before requesting a new code.`,
      cooldownSeconds: remainingSeconds,
    };
  }

  // 3. Sliding window limit (max 5 resends in 15 minutes)
  const windowStart = now - 15 * 60 * 1000;
  const recentResends = (existing?.resendTimestamps || []).filter((t) => t > windowStart);
  if (recentResends.length >= 5) {
    return {
      success: false,
      status: 429,
      error: 'RATE_LIMITED',
      message: 'Too many OTP requests. Please wait 15 minutes before requesting again.',
    };
  }

  const reference = `HMZ-OTP-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  // 4b. IdentifyOrg Native Phone Verification Route
  if (isIdentifyOrgLiveKeyConfigured()) {
    const liveKey = getIdentifyOrgApiKey();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('https://api.identifyorg.com/v1/phone/verify/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IdentifyOrg-Key': liveKey,
        },
        body: JSON.stringify({
          phone: normalized,
          template: 'Your HOMEZA verification code is {code}. Valid for {minutes} minutes.',
          reference,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: any = await response.json().catch(() => ({}));
        const verifyId = data.id;
        const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : now + 5 * 60 * 1000;

        recentResends.push(now);
        otpVault.set(normalized, {
          phoneNumber: normalized,
          userId,
          identifyOrgVerificationId: verifyId,
          reference,
          expiresAt,
          attempts: 0,
          resendTimestamps: recentResends,
          lockedUntil: undefined,
          lastSentAt: now,
          provider: 'identifyorg',
        });

        const record: SmsDeliveryRecord = {
          reference,
          phoneNumber: normalized,
          maskedPhone: maskPhoneNumber(normalized),
          provider: 'identifyorg',
          providerMessageId: verifyId,
          deliveryStatus: 'SMS_ACCEPTED',
          isTest: data.is_test || false,
          isTransactional: true,
          senderId: 'HOMEZA',
          timestamp: new Date().toISOString(),
          httpStatus: response.status,
          cost: data.cost,
          currency: 'NGN',
        };
        smsDeliveryTracker.set(reference, record);
        if (verifyId) smsDeliveryTracker.set(verifyId, record);

        return {
          success: true,
          status: 200,
          message: 'OTP has been dispatched via IdentifyOrg SMS to your phone. Please check your messages.',
          reference,
          maskedPhone: maskPhoneNumber(normalized),
          cooldownSeconds: 45,
          deliveryStatus: 'SMS_ACCEPTED',
          provider: 'identifyorg',
          messageId: verifyId,
          isTest: data.is_test || false,
          explanation: 'Dispatched live via IdentifyOrg cellular gateway.',
        };
      }

      if (response.status === 401) {
        return {
          success: false,
          status: 401,
          error: 'INVALID_API_KEY',
          message: 'IdentifyOrg authentication failed. Invalid API key.',
          maskedPhone: maskPhoneNumber(normalized),
          deliveryStatus: 'SMS_FAILED',
          explanation: 'IdentifyOrg rejected the X-IdentifyOrg-Key.',
        };
      }
      if (response.status === 402) {
        return {
          success: false,
          status: 402,
          error: 'INSUFFICIENT_BALANCE',
          message: 'IdentifyOrg account balance is insufficient to dispatch verification SMS.',
          maskedPhone: maskPhoneNumber(normalized),
          deliveryStatus: 'SMS_FAILED',
          explanation: 'IdentifyOrg wallet requires funding.',
        };
      }
      if (response.status === 429) {
        return {
          success: false,
          status: 429,
          error: 'RATE_LIMITED',
          message: 'Verification rate limit reached. Please wait before requesting another OTP.',
          maskedPhone: maskPhoneNumber(normalized),
          deliveryStatus: 'SMS_FAILED',
          explanation: 'IdentifyOrg rate limit exceeded.',
        };
      }

      const errData: any = await response.json().catch(() => ({}));
      const isUnconfigured =
        errData.error?.code === 'verification_failed' ||
        errData.error?.code === 'provider_unavailable' ||
        (errData.error?.message && errData.error.message.includes('not configured'));

      if (isUnconfigured) {
        console.warn(
          `[PHONE VERIFICATION] IdentifyOrg phone verify returned ${response.status} (${errData.error?.message || 'unconfigured'}). Falling through to secondary SMS gateways.`
        );
      } else {
        return {
          success: false,
          status: response.status,
          error: errData.error?.code || 'VERIFICATION_FAILED',
          message: errData.error?.message || 'IdentifyOrg rejected the verification request.',
          maskedPhone: maskPhoneNumber(normalized),
          deliveryStatus: 'SMS_FAILED',
          explanation: `IdentifyOrg returned HTTP ${response.status}`,
        };
      }
    } catch (err: any) {
      console.warn(`[PHONE VERIFICATION] Could not reach IdentifyOrg: ${err.message}. Falling through to secondary gateways.`);
    }
  }

  // 5. Fallback: Local OTP Generation + Dispatch via Secondary Providers (Termii, Twilio)
  const rawCode = crypto.randomInt(100000, 1000000).toString();
  const salt = crypto.randomBytes(16).toString('hex');
  const hashedOtp = crypto.createHash('sha256').update(rawCode + salt).digest('hex');
  const expiresAt = now + 5 * 60 * 1000;

  recentResends.push(now);
  otpVault.set(normalized, {
    phoneNumber: normalized,
    userId,
    reference,
    hashedOtp,
    salt,
    expiresAt,
    attempts: 0,
    resendTimestamps: recentResends,
    lockedUntil: undefined,
    lastSentAt: now,
    provider: 'fallback',
  });

  const smsResult = await dispatchRealSmsViaProvider(normalized, rawCode, reference);

  if (!smsResult.success) {
    return {
      success: false,
      status: smsResult.error === 'LIVE_CREDENTIALS_REQUIRED' ? 422 : 502,
      error: smsResult.error || 'SMS_DELIVERY_FAILED',
      message:
        smsResult.error === 'LIVE_CREDENTIALS_REQUIRED'
          ? 'Live SMS delivery is unconfigured. Real cellular dispatch requires live SMS provider credentials (e.g. IDENTIFYORG_LIVE_KEY or TERMII_API_KEY).'
          : 'We could not send the OTP. Please check provider account balance or try again.',
      deliveryStatus: smsResult.deliveryStatus,
      explanation: smsResult.explanation,
      maskedPhone: maskPhoneNumber(normalized),
    };
  }

  return {
    success: true,
    status: 200,
    message: 'OTP has been dispatched via real SMS to your phone. Please check your messages.',
    reference,
    maskedPhone: maskPhoneNumber(normalized),
    cooldownSeconds: 45,
    deliveryStatus: smsResult.deliveryStatus,
    provider: smsResult.provider,
    messageId: smsResult.messageId,
    isTest: false,
    explanation: smsResult.explanation,
  };
}

export async function verifyPhoneOtpInternal(
  phoneNumber: string,
  enteredCode: string,
  userId?: string
): Promise<{
  success: boolean;
  status: number;
  message: string;
  error?: string;
  remainingAttempts?: number;
  reference?: string;
}> {
  const normalized = normalizeNigerianPhoneNumber(phoneNumber);
  const cleanCode = (enteredCode || '').trim();

  if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return {
      success: false,
      status: 400,
      error: 'INVALID_OTP_FORMAT',
      message: 'Invalid OTP. Please enter the 6-digit numeric code sent to your phone.',
    };
  }

  const record = otpVault.get(normalized);
  if (!record) {
    return {
      success: false,
      status: 400,
      error: 'SESSION_EXPIRED',
      message: 'This OTP has expired or was not requested. Please request a new code.',
    };
  }

  const now = Date.now();

  // Check Lockout
  if (record.lockedUntil && now < record.lockedUntil) {
    const minutesLeft = Math.ceil((record.lockedUntil - now) / (60 * 1000));
    return {
      success: false,
      status: 429,
      error: 'TOO_MANY_ATTEMPTS',
      message: `Too many attempts. Account verification temporarily locked. Please wait ${minutesLeft} minute(s) before trying again.`,
    };
  }

  // Check Expiration
  if (now > record.expiresAt) {
    otpVault.delete(normalized);
    return {
      success: false,
      status: 400,
      error: 'EXPIRED_OTP',
      message: 'This OTP has expired. Please request a new code.',
    };
  }

  // Route A: IdentifyOrg Native Check
  if (record.identifyOrgVerificationId && isIdentifyOrgLiveKeyConfigured()) {
    const liveKey = getIdentifyOrgApiKey();
    try {
      const response = await fetch('https://api.identifyorg.com/v1/phone/verify/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IdentifyOrg-Key': liveKey,
        },
        body: JSON.stringify({
          id: record.identifyOrgVerificationId,
          code: cleanCode,
        }),
      });

      if (response.ok) {
        const data: any = await response.json().catch(() => ({}));
        if (data.verified === true || data.status === 'verified') {
          const verifiedRef = record.reference;
          otpVault.delete(normalized);
          return {
            success: true,
            status: 200,
            message: 'Phone number verified successfully.',
            reference: verifiedRef,
          };
        } else {
          record.attempts += 1;
          const remaining = Math.max(0, 5 - record.attempts);
          return {
            success: false,
            status: 400,
            error: 'INVALID_OTP',
            message: `Invalid OTP. Please check the code and try again. (${remaining} attempt(s) remaining)`,
            remainingAttempts: remaining,
          };
        }
      }

      if (response.status === 401) {
        return { success: false, status: 401, error: 'INVALID_API_KEY', message: 'IdentifyOrg authentication failed.' };
      }
      if (response.status === 402) {
        return { success: false, status: 402, error: 'INSUFFICIENT_BALANCE', message: 'IdentifyOrg account balance insufficient.' };
      }
      if (response.status === 429) {
        return { success: false, status: 429, error: 'RATE_LIMITED', message: 'IdentifyOrg rate limit reached.' };
      }

      const errData: any = await response.json().catch(() => ({}));
      record.attempts += 1;
      const remaining = Math.max(0, 5 - record.attempts);
      return {
        success: false,
        status: 400,
        error: 'INVALID_OTP',
        message: errData.error?.message || `Invalid verification code. (${remaining} attempt(s) remaining)`,
        remainingAttempts: remaining,
      };
    } catch (err: any) {
      return {
        success: false,
        status: 502,
        error: 'PROVIDER_ERROR',
        message: `Error verifying code with IdentifyOrg: ${err.message || err}`,
      };
    }
  }

  // Route B: Local Salted Hash Comparison (Fallback)
  if (record.hashedOtp && record.salt) {
    const candidateHash = crypto.createHash('sha256').update(cleanCode + record.salt).digest('hex');
    const match = crypto.timingSafeEqual(
      Buffer.from(candidateHash, 'hex'),
      Buffer.from(record.hashedOtp, 'hex')
    );

    if (!match) {
      record.attempts += 1;
      const remaining = Math.max(0, 5 - record.attempts);

      if (record.attempts >= 5) {
        record.lockedUntil = now + 15 * 60 * 1000;
        return {
          success: false,
          status: 429,
          error: 'TOO_MANY_ATTEMPTS',
          message: 'Too many attempts. Please wait before trying again.',
        };
      }

      return {
        success: false,
        status: 400,
        error: 'INVALID_OTP',
        message: `Invalid OTP. Please check the code and try again. (${remaining} attempt(s) remaining)`,
        remainingAttempts: remaining,
      };
    }

    const verifiedRef = record.reference;
    otpVault.delete(normalized);
    return {
      success: true,
      status: 200,
      message: 'Phone number verified successfully.',
      reference: verifiedRef,
    };
  }

  return {
    success: false,
    status: 400,
    error: 'SESSION_INVALID',
    message: 'Could not find a valid verification session. Please request a new code.',
  };
}

/**
 * Liveness Verification via IdentifyOrg LIVE API
 * Endpoint: POST /v1/verify/liveness
 * Header: X-IdentifyOrg-Key
 * Body: multipart/form-data (file: Buffer)
 */
export async function verifyLivenessInternal(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<{
  success: boolean;
  status: number;
  data?: any;
  error?: string;
  message?: string;
}> {
  const key = getIdentifyOrgApiKey();
  if (!key) {
    return {
      success: false,
      status: 401,
      error: 'LIVE_CREDENTIALS_REQUIRED',
      message: 'IdentifyOrg API key is not configured for liveness verification.',
    };
  }

  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: mimeType });
  formData.append('file', blob, 'selfie.jpg');

  try {
    const res = await fetch('https://api.identifyorg.com/v1/verify/liveness', {
      method: 'POST',
      headers: {
        'X-IdentifyOrg-Key': key,
      },
      body: formData,
    });

    const data: any = await res.json().catch(() => ({}));
    if (res.ok) {
      return {
        success: true,
        status: 200,
        data,
        message: 'Liveness verification completed successfully.',
      };
    }

    if (res.status === 401) {
      return { success: false, status: 401, error: 'INVALID_API_KEY', message: 'IdentifyOrg authentication failed.' };
    }
    if (res.status === 402) {
      return { success: false, status: 402, error: 'INSUFFICIENT_BALANCE', message: 'IdentifyOrg balance is insufficient for liveness verification.' };
    }
    if (res.status === 429) {
      return { success: false, status: 429, error: 'RATE_LIMITED', message: 'IdentifyOrg rate limit reached.' };
    }

    return {
      success: false,
      status: res.status,
      error: data.error?.code || 'LIVENESS_FAILED',
      message: data.error?.message || data.detail?.[0]?.msg || 'Liveness verification failed.',
    };
  } catch (err: any) {
    return {
      success: false,
      status: 502,
      error: 'PROVIDER_ERROR',
      message: `Failed to contact IdentifyOrg liveness service: ${err.message || err}`,
    };
  }
}

// ============================================================================
// NAME VERIFICATION & FUZZY COMPARISON
// ============================================================================

const TITLES_TO_STRIP = new Set([
  'mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'professor', 'chief',
  'barrister', 'barr', 'engr', 'engineer', 'pastor', 'rev', 'reverend',
  'alhaji', 'alhj', 'alhaja', 'hon', 'honorable', 'sir', 'lady'
]);

export function cleanNameTokens(name: string): string[] {
  if (!name) return [];
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !TITLES_TO_STRIP.has(t));
}

// Levenshtein distance for minor typographical errors
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

export function compareNames(
  submittedName: string,
  verifiedName: string
): {
  confidence: 'MATCH' | 'PARTIAL/REVIEW' | 'MISMATCH';
  score: number;
  reason?: string;
} {
  const tokensSub = cleanNameTokens(submittedName);
  const tokensVer = cleanNameTokens(verifiedName);

  if (tokensSub.length === 0 || tokensVer.length === 0) {
    return {
      confidence: 'MISMATCH',
      score: 0,
      reason: 'Name information is incomplete.',
    };
  }

  // 1. Exact Set Match (handles order transposition: "Bassey Effiong" vs "EFFIONG BASSEY")
  const setSub = new Set(tokensSub);
  const setVer = new Set(tokensVer);

  let exactMatches = 0;
  tokensSub.forEach((t) => {
    if (setVer.has(t)) exactMatches++;
  });

  // If all tokens of submitted match all tokens of verified
  if (exactMatches === tokensSub.length && exactMatches === tokensVer.length) {
    return {
      confidence: 'MATCH',
      score: 100,
      reason: 'Exact legal name match.',
    };
  }

  // 2. Subset Match (handles middle names present in one but omitted in another)
  // e.g. "Bassey Effiong" vs "Bassey Eyo Effiong"
  const isSubset =
    (tokensSub.length >= 2 && tokensSub.every((t) => setVer.has(t))) ||
    (tokensVer.length >= 2 && tokensVer.every((t) => setSub.has(t)));

  if (isSubset) {
    return {
      confidence: 'MATCH',
      score: 95,
      reason: 'Legal name matched with acceptable middle name variance.',
    };
  }

  // 3. String similarity / Levenshtein
  const strSub = tokensSub.sort().join(' ');
  const strVer = tokensVer.sort().join(' ');
  const maxLen = Math.max(strSub.length, strVer.length);
  const dist = levenshteinDistance(strSub, strVer);
  const similarity = Math.max(0, 1 - dist / maxLen);

  // Ambiguous or fuzzy matches MUST be sent for manual review rather than automatically approved
  if (similarity >= 0.75) {
    return {
      confidence: 'PARTIAL/REVIEW',
      score: Math.round(similarity * 100),
      reason: `Ambiguous typographical variance detected (${Math.round(similarity * 100)}% similarity). Manual administrative compliance review required.`,
    };
  }

  // 4. Partial / Review (at least 1 major token matched, but rest differed)
  if (exactMatches >= 1) {
    return {
      confidence: 'PARTIAL/REVIEW',
      score: 65,
      reason: 'Partial name match detected. Manual administrative compliance review required.',
    };
  }

  // 5. Mismatch
  return {
    confidence: 'MISMATCH',
    score: Math.round(similarity * 100),
    reason: 'The name provided does not match the verified identity information.',
  };
}

// ============================================================================
// IDENTITY / NIN VERIFICATION PROVIDER (TEST & LIVE ABSTRACTION)
// ============================================================================

export interface IdentityVerificationRequest {
  idType: string;
  idNumber: string;
  fullName: string;
  dateOfBirth?: string;
  documentUrl?: string;
  userId?: string;
}

export interface IdentityVerificationResponse {
  success: boolean;
  status: 'VERIFIED' | 'FAILED' | 'REVIEW' | 'PROCESSING';
  reference: string;
  provider: string;
  environment: 'TEST' | 'LIVE';
  maskedIdNumber: string;
  verifiedName?: string;
  dateOfBirth?: string;
  failureReason?: string;
  reviewReason?: string;
  providerVerificationId?: string;
  httpStatus: number;
}

export async function verifyIdentityInternal(
  req: IdentityVerificationRequest
): Promise<IdentityVerificationResponse> {
  const cleanId = (req.idNumber || '').trim().replace(/[\s\-]/g, '');
  const cleanFullName = (req.fullName || '').trim();

  // Validate format (NIN must be 11 numeric digits)
  const isNin = !req.idType || req.idType.toUpperCase().includes('NIN') || req.idType.toUpperCase().includes('NATIONAL');
  if (isNin && (!cleanId || cleanId.length !== 11 || !/^\d{11}$/.test(cleanId))) {
    return {
      success: false,
      status: 'FAILED',
      reference: `HMZ-ERR-${Date.now()}`,
      provider: VERIFICATION_CONFIG.provider,
      environment: VERIFICATION_CONFIG.mode === 'live' ? 'LIVE' : 'TEST',
      maskedIdNumber: maskIdNumber(cleanId),
      failureReason: 'Invalid National Identification Number (NIN). NIN must be an 11-digit numeric number.',
      httpStatus: 400,
    };
  }

  const reference = `HMZ-NIN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  // --------------------------------------------------------------------------
  // TEST MODE IMPLEMENTATION
  // --------------------------------------------------------------------------
  if (VERIFICATION_CONFIG.mode === 'test') {
    // 1. Test Provider Downtime / Service Unavailable Trigger
    if (cleanId === '99999999999' || cleanId.startsWith('99999')) {
      return {
        success: false,
        status: 'FAILED',
        reference,
        provider: VERIFICATION_CONFIG.provider,
        environment: 'TEST',
        maskedIdNumber: maskIdNumber(cleanId),
        failureReason: 'Verification service is temporarily unavailable. Please try again later.',
        httpStatus: 503,
      };
    }

    // 2. Test Invalid / Unregistered NIN Trigger
    if (cleanId === '00000000000') {
      return {
        success: false,
        status: 'FAILED',
        reference,
        provider: VERIFICATION_CONFIG.provider,
        environment: 'TEST',
        maskedIdNumber: maskIdNumber(cleanId),
        failureReason: 'Identity record not found in the national identity database. Please verify your NIN.',
        httpStatus: 400,
      };
    }

    // 3. Test Name Mismatch Trigger (returns a completely different verified name)
    if (cleanId === '11111111111') {
      return {
        success: true,
        status: 'VERIFIED',
        reference,
        provider: VERIFICATION_CONFIG.provider,
        environment: 'TEST',
        maskedIdNumber: maskIdNumber(cleanId),
        verifiedName: 'CHUKWUEMEKA GODSWILL OBI',
        dateOfBirth: '1988-04-12',
        httpStatus: 200,
      };
    }

    // 4. Test Manual Review Required Trigger
    if (cleanId === '22222222222') {
      return {
        success: true,
        status: 'REVIEW',
        reference,
        provider: VERIFICATION_CONFIG.provider,
        environment: 'TEST',
        maskedIdNumber: maskIdNumber(cleanId),
        verifiedName: cleanFullName,
        reviewReason: 'Biometric quality threshold flagged for compliance manual check.',
        httpStatus: 200,
      };
    }

    // Standard Success Case in Test Mode
    return {
      success: true,
      status: 'VERIFIED',
      reference,
      provider: VERIFICATION_CONFIG.provider,
      environment: 'TEST',
      maskedIdNumber: maskIdNumber(cleanId),
      verifiedName: cleanFullName, // in normal test flow, verified identity returns the applicant's name
      dateOfBirth: req.dateOfBirth || '1992-07-15',
      httpStatus: 200,
    };
  }

  // --------------------------------------------------------------------------
  // LIVE MODE (Production Provider Adapter: IdentifyOrg Live)
  // --------------------------------------------------------------------------
  try {
    const liveKey = getIdentifyOrgApiKey();
    if (!liveKey) {
      return {
        success: false,
        status: 'FAILED',
        reference,
        provider: VERIFICATION_CONFIG.provider,
        environment: 'LIVE',
        maskedIdNumber: maskIdNumber(cleanId),
        failureReason: 'IdentifyOrg live API key is not configured in server environment.',
        httpStatus: 500,
      };
    }

    const isNinType =
      !req.idType ||
      req.idType.toUpperCase().includes('NIN') ||
      req.idType.toUpperCase().includes('NATIONAL') ||
      req.idType.toUpperCase() === 'NIN_SLIP';

    if (isNinType) {
      const nameParts = cleanFullName.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      const response = await fetch('https://api.identifyorg.com/v1/verify/nin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IdentifyOrg-Key': liveKey,
        },
        body: JSON.stringify({
          nin: cleanId,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (response.ok) {
        let resData: any = await response.json().catch(() => ({}));

        // If IdentifyOrg returns pending/processing, poll GET /v1/verify/{id} for completion
        if ((resData.status === 'pending' || resData.status === 'processing') && resData.id) {
          const checkId = resData.id;
          for (let attempt = 0; attempt < 3; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            try {
              const pollRes = await fetch(`https://api.identifyorg.com/v1/verify/${checkId}`, {
                method: 'GET',
                headers: { 'X-IdentifyOrg-Key': liveKey },
                signal: AbortSignal.timeout(4000),
              });
              if (pollRes.ok) {
                const polledData: any = await pollRes.json().catch(() => ({}));
                if (polledData && polledData.status && polledData.status !== 'pending' && polledData.status !== 'processing') {
                  resData = polledData;
                  break;
                }
              }
            } catch {
              // continue to next attempt or exit loop
            }
          }
        }

        // Handle specific IdentifyOrg registry statuses
        if (resData.status === 'not_found') {
          return {
            success: false,
            status: 'FAILED',
            reference,
            provider: 'identifyorg',
            environment: 'LIVE',
            maskedIdNumber: maskIdNumber(cleanId),
            failureReason: 'National Identification Number (NIN) not found in the official NIMC registry.',
            httpStatus: 200,
          };
        }

        if (resData.status === 'pending' || resData.status === 'processing') {
          return {
            success: false,
            status: 'PROCESSING',
            reference,
            providerVerificationId: resData.id,
            provider: 'identifyorg',
            environment: 'LIVE',
            maskedIdNumber: maskIdNumber(cleanId),
            failureReason: 'NIN verification is currently processing with national registry. Please check back shortly.',
            httpStatus: 200,
          };
        }

        if (resData.status === 'review' || resData.status === 'manual_review') {
          return {
            success: false,
            status: 'REVIEW',
            reference,
            provider: 'identifyorg',
            environment: 'LIVE',
            maskedIdNumber: maskIdNumber(cleanId),
            reviewReason: resData.review_reason || 'Biometric variance flagged for compliance review.',
            httpStatus: 200,
          };
        }

        const isVerifiedStatus =
          (resData.status === 'verified' || resData.status === 'matched' || resData.status === 'found' || resData.status === 'success') &&
          resData.data;

        if (!isVerifiedStatus) {
          return {
            success: false,
            status: 'FAILED',
            reference,
            provider: 'identifyorg',
            environment: 'LIVE',
            maskedIdNumber: maskIdNumber(cleanId),
            failureReason: resData.failure_reason || resData.error?.message || 'National Identity Number (NIN) could not be verified by registry.',
            httpStatus: 200,
          };
        }

        const record = resData.data || {};
        const verifiedName = [
          record.first_name || record.firstname,
          record.middle_name || record.middlename,
          record.last_name || record.lastname,
        ]
          .filter(Boolean)
          .join(' ')
          .trim() || record.full_name || record.name;

        if (!verifiedName) {
          return {
            success: false,
            status: 'FAILED',
            reference,
            provider: 'identifyorg',
            environment: 'LIVE',
            maskedIdNumber: maskIdNumber(cleanId),
            failureReason: 'Registry confirmed NIN record but did not return a verified legal name.',
            httpStatus: 200,
          };
        }

        const nameMatch = compareNames(cleanFullName, verifiedName);

        if (nameMatch.confidence === 'MISMATCH') {
          return {
            success: false,
            status: 'FAILED',
            reference,
            provider: 'identifyorg',
            environment: 'LIVE',
            maskedIdNumber: maskIdNumber(cleanId),
            verifiedName,
            failureReason: `Name mismatch: Submitted legal name '${cleanFullName}' does not match official registry name '${verifiedName}'.`,
            httpStatus: 200,
          };
        }

        return {
          success: true,
          status: nameMatch.confidence === 'PARTIAL/REVIEW' ? 'REVIEW' : 'VERIFIED',
          reference,
          provider: 'identifyorg',
          environment: 'LIVE',
          maskedIdNumber: maskIdNumber(cleanId),
          verifiedName,
          dateOfBirth: record.dateOfBirth || record.date_of_birth || req.dateOfBirth,
          reviewReason: nameMatch.confidence === 'PARTIAL/REVIEW' ? nameMatch.reason : undefined,
          httpStatus: 200,
        };
      }

      if (response.status === 401) {
        return {
          success: false,
          status: 'FAILED',
          reference,
          provider: 'identifyorg',
          environment: 'LIVE',
          maskedIdNumber: maskIdNumber(cleanId),
          failureReason: 'IdentifyOrg authentication failed. Invalid API key.',
          httpStatus: 401,
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          status: 'FAILED',
          reference,
          provider: 'identifyorg',
          environment: 'LIVE',
          maskedIdNumber: maskIdNumber(cleanId),
          failureReason: 'IdentifyOrg API key does not have permissions or service access for NIN verification.',
          httpStatus: 403,
        };
      }

      if (response.status === 402) {
        return {
          success: false,
          status: 'FAILED',
          reference,
          provider: 'identifyorg',
          environment: 'LIVE',
          maskedIdNumber: maskIdNumber(cleanId),
          failureReason: 'IdentifyOrg account balance insufficient to perform verification.',
          httpStatus: 402,
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          status: 'FAILED',
          reference,
          provider: 'identifyorg',
          environment: 'LIVE',
          maskedIdNumber: maskIdNumber(cleanId),
          failureReason: 'IdentifyOrg rate limit exceeded. Please retry shortly.',
          httpStatus: 429,
        };
      }

      const errData: any = await response.json().catch(() => ({}));
      return {
        success: false,
        status: 'FAILED',
        reference,
        provider: 'identifyorg',
        environment: 'LIVE',
        maskedIdNumber: maskIdNumber(cleanId),
        failureReason: errData.error?.message || 'National Identity Number (NIN) could not be verified by registry.',
        httpStatus: response.status,
      };
    }

    // Default response for non-NIN document types in live mode
    return {
      success: false,
      status: 'FAILED',
      reference,
      provider: 'identifyorg',
      environment: 'LIVE',
      maskedIdNumber: maskIdNumber(cleanId),
      failureReason: `Live automated verification for '${req.idType}' is not currently available. Please use NIN.`,
      httpStatus: 400,
    };
  } catch (err: any) {
    const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    return {
      success: false,
      status: 'FAILED',
      reference,
      provider: VERIFICATION_CONFIG.provider,
      environment: 'LIVE',
      maskedIdNumber: maskIdNumber(cleanId),
      failureReason: isTimeout
        ? 'Identity verification gateway timed out after 15 seconds. Please retry.'
        : `Identity verification gateway connection error: ${err.message || err}`,
      httpStatus: isTimeout ? 504 : 503,
    };
  }
}

/**
 * Checks IdentifyOrg account balance and status without consuming lookup credits.
 */
export async function getIdentifyOrgBalance(): Promise<{
  configured: boolean;
  balance?: number;
  currency?: string;
  lowBalance?: boolean;
  error?: string;
}> {
  const liveKey = getIdentifyOrgApiKey();
  if (!liveKey) {
    return { configured: false, error: 'IdentifyOrg live key not configured.' };
  }

  try {
    const res = await fetch('https://api.identifyorg.com/v1/balance', {
      method: 'GET',
      headers: {
        'X-IdentifyOrg-Key': liveKey,
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return { configured: true, error: `Balance endpoint returned HTTP ${res.status}` };
    }

    const data: any = await res.json().catch(() => ({}));
    return {
      configured: true,
      balance: data.balance,
      currency: data.currency || 'NGN',
      lowBalance: Boolean(data.low_balance || (data.balance !== undefined && data.balance < 100)),
    };
  } catch (err: any) {
    return { configured: true, error: `Failed to retrieve balance: ${err.message || err}` };
  }
}

export interface VerificationEvaluation {
  isFullyVerified: boolean;
  phoneVerified: boolean;
  idVerified: boolean;
  nameVerified: boolean;
  adminApproved: boolean;
  overallStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'VERIFIED' | 'FAILED' | 'REVIEW';
  missingSteps: string[];
  incompleteCheckLabels: string[];
  kycState: 'NOT_STARTED' | 'PENDING' | 'REJECTED' | 'CORRECTION_REQUIRED' | 'APPROVED';
}

/**
 * Authoritative Canonical 3-Step Verification Evaluator (Backend).
 */
export function evaluateUserVerification(user: any): VerificationEvaluation {
  if (!user) {
    return {
      isFullyVerified: false,
      phoneVerified: false,
      idVerified: false,
      nameVerified: false,
      adminApproved: false,
      overallStatus: 'NOT_STARTED',
      missingSteps: ['Phone OTP Verification', 'Government NIN Verification', 'Legal Name Match'],
      incompleteCheckLabels: ['Phone Number', 'Government NIN', 'Legal Name Match'],
      kycState: 'NOT_STARTED',
    };
  }

  // Administrators always have full platform authority
  if (user.role === 'ADMIN') {
    return {
      isFullyVerified: true,
      phoneVerified: true,
      idVerified: true,
      nameVerified: true,
      adminApproved: true,
      overallStatus: 'VERIFIED',
      missingSteps: [],
      incompleteCheckLabels: [],
      kycState: 'APPROVED',
    };
  }

  const v = user.verification;

  // 1. Phone OTP Verification
  const phoneVerified = Boolean(
    user.isPhoneVerified ||
    v?.phoneVerificationStatus === 'VERIFIED'
  );

  // 2. Government identity / NIN Verification
  const idVerified = Boolean(
    v?.identityVerificationStatus === 'VERIFIED'
  );

  // 3. Legal Name Match Verification
  const nameVerified = Boolean(
    v?.nameVerificationStatus === 'VERIFIED'
  );

  // 4. Admin manual approval override
  const adminApproved = Boolean(
    v?.adminApprovalStatus === 'APPROVED' && v?.adminReviewedBy
  );

  // Authoritative qualification: ALL 3 required checks passed, OR explicit admin approval
  const isFullyVerified = (phoneVerified && idVerified && nameVerified) || adminApproved;

  const missingSteps: string[] = [];
  const incompleteCheckLabels: string[] = [];
  if (!phoneVerified) {
    missingSteps.push('Phone OTP Verification');
    incompleteCheckLabels.push('Phone Number');
  }
  if (!idVerified) {
    missingSteps.push('Government NIN Verification');
    incompleteCheckLabels.push('Government NIN');
  }
  if (!nameVerified) {
    missingSteps.push('Legal Name Match');
    incompleteCheckLabels.push('Legal Name Match');
  }

  let overallStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'VERIFIED' | 'FAILED' | 'REVIEW';
  let kycState: 'NOT_STARTED' | 'PENDING' | 'REJECTED' | 'CORRECTION_REQUIRED' | 'APPROVED';

  if (isFullyVerified) {
    overallStatus = 'VERIFIED';
    kycState = 'APPROVED';
  } else if (
    v?.identityVerificationStatus === 'FAILED' ||
    v?.nameVerificationStatus === 'MISMATCH' ||
    v?.overallVerificationStatus === 'FAILED' ||
    user.verificationStatus === 'REJECTED' ||
    v?.adminApprovalStatus === 'REJECTED'
  ) {
    overallStatus = 'FAILED';
    kycState = 'REJECTED';
  } else if (
    v?.identityVerificationStatus === 'REVIEW' ||
    v?.nameVerificationStatus === 'REVIEW' ||
    v?.overallVerificationStatus === 'REVIEW' ||
    user.verificationStatus === 'CORRECTION_REQUIRED' ||
    user.verificationStatus === 'AGENT_CORRECTION_REQUIRED' ||
    v?.adminApprovalStatus === 'CORRECTION_REQUIRED'
  ) {
    overallStatus = 'REVIEW';
    kycState = 'CORRECTION_REQUIRED';
  } else if (
    phoneVerified ||
    v?.identityVerificationStatus === 'PROCESSING' ||
    v?.identityVerificationStatus === 'PENDING' ||
    v?.overallVerificationStatus === 'IN_PROGRESS' ||
    user.verificationStatus === 'PENDING' ||
    user.verificationStatus === 'PENDING_AGENT_APPROVAL' ||
    user.verificationStatus === 'UNDER_REVIEW'
  ) {
    overallStatus = 'IN_PROGRESS';
    kycState = 'PENDING';
  } else {
    overallStatus = 'NOT_STARTED';
    kycState = 'NOT_STARTED';
  }

  return {
    isFullyVerified,
    phoneVerified,
    idVerified,
    nameVerified,
    adminApproved,
    overallStatus,
    missingSteps,
    incompleteCheckLabels,
    kycState,
  };
}

/**
 * Reconciles user record fields on the server so that `verification`, `isPhoneVerified`, and
 * `verificationStatus` remain strictly consistent with the 3-step evaluation.
 */
export function reconcileUserVerification(user: any): any {
  if (!user) return user;
  const evalResult = evaluateUserVerification(user);

  if (evalResult.isFullyVerified) {
    user.isPhoneVerified = true;
    if (!user.verification) {
      user.verification = {
        identityVerificationStatus: 'VERIFIED',
        nameVerificationStatus: 'VERIFIED',
        phoneVerificationStatus: 'VERIFIED',
        overallVerificationStatus: 'VERIFIED',
        environment: 'LIVE',
        updatedAt: new Date().toISOString(),
      };
    } else {
      user.verification.phoneVerificationStatus = 'VERIFIED';
      user.verification.overallVerificationStatus = 'VERIFIED';
      if (evalResult.adminApproved) {
        user.verification.identityVerificationStatus = 'VERIFIED';
        user.verification.nameVerificationStatus = 'VERIFIED';
      }
    }
    user.verificationStatus = 'VERIFIED';
  } else {
    if (user.isPhoneVerified && user.verification) {
      user.verification.phoneVerificationStatus = 'VERIFIED';
    } else if (user.verification?.phoneVerificationStatus === 'VERIFIED') {
      user.isPhoneVerified = true;
    }

    if (user.verification) {
      user.verification.overallVerificationStatus = evalResult.overallStatus;
    }

    if (evalResult.kycState === 'REJECTED') {
      user.verificationStatus = 'REJECTED';
    } else if (evalResult.kycState === 'CORRECTION_REQUIRED') {
      user.verificationStatus = 'CORRECTION_REQUIRED';
    } else if (evalResult.kycState === 'PENDING') {
      if (!user.verificationStatus || user.verificationStatus === 'NOT_SUBMITTED') {
        user.verificationStatus = 'PENDING';
      }
    }
  }

  return user;
}

