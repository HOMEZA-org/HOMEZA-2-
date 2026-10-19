/**
 * HOMEZA In-App Contact Protection & Anti-Bypass Filter
 * 
 * Protects users from scams, off-platform fraud, and unauthorized fee solicitations
 * by preventing the sharing of phone numbers, email addresses, WhatsApp prompts,
 * and direct bank payment instructions in direct in-app messaging until official
 * verification or tenancy execution is completed.
 */

export interface ContactDetectionResult {
  isBlocked: boolean;
  reason?: string;
  matchType?: 'PHONE' | 'EMAIL' | 'WHATSAPP' | 'OFF_PLATFORM_PAYMENT' | 'SOCIAL_MEDIA';
  matchedSnippet?: string;
}

// Regex patterns for Nigerian phone numbers:
// 080..., 081..., 070..., 090..., 091..., +234..., 234..., with spaces, dashes, dots, or words
const NIGERIAN_PHONE_REGEX = /(?:\+?234|0)[ -]?[789][01]\d[ -]?\d{3}[ -]?\d{4}/gi;
const DIGIT_SEQUENCE_REGEX = /\b(?:\d[\s.-]?){10,13}\b/;
const SPELLED_OUT_DIGITS_REGEX = /(zero|one|two|three|four|five|six|seven|eight|nine)[\s,.-]+(zero|one|two|three|four|five|six|seven|eight|nine)[\s,.-]+(zero|one|two|three|four|five|six|seven|eight|nine)/i;

// Email pattern
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

// WhatsApp & Off-Platform Messaging bypass keywords
const WHATSAPP_KEYWORDS = [
  /whats?app/i,
  /wa\.me/i,
  /\bwa\b[\s:]+\d+/i,
  /dm\s+me\s+on\s+wa/i,
  /chat\s+(?:on|via)\s+whatsapp/i,
  /message\s+me\s+on\s+whatsapp/i,
  /text\s+me\s+on\s+whatsapp/i,
  /reach\s+me\s+on\s+(?:whatsapp|telegram|instagram|ig|fb|facebook)/i,
  /\bt\.me\//i,
  /\btelegram\b/i,
  /\bcall\s+me\s+(?:at|on|via)\b/i,
  /\bring\s+me\s+(?:at|on)\b/i,
  /\bmy\s+(?:number|line|digits|cell|phone|contact)\s+is\b/i,
  /\bsend\s+(?:me\s+)?your\s+(?:number|line|digits|phone|whatsapp)\b/i,
  /\bgive\s+me\s+your\s+(?:number|digits|whatsapp)\b/i,
];

// Off-Platform direct payment solicitation patterns
const OFF_PLATFORM_PAYMENT_KEYWORDS = [
  /\btransfer\s+(?:directly\s+)?to\s+my\s+account\b/i,
  /\bpay\s+(?:cash\s+)?to\s+my\s+account\b/i,
  /\baccount\s+number\s+is\b/i,
  /\bacct\s+no\b/i,
  /\binspection\s+fee\s+is\s+₦?\d+/i,
  /\bpay\s+inspection\s+fee\b/i,
  /\bpay\s+(?:me\s+)?before\s+inspection\b/i,
];

/**
 * Validates a message against in-app contact protection and fraud safety rules.
 */
export function checkMessageContactSafety(text: string): ContactDetectionResult {
  if (!text || typeof text !== 'string') {
    return { isBlocked: false };
  }

  const normalized = text.trim();

  // 1. Check for Nigerian Phone numbers or raw digit streams (10-13 digits)
  const phoneMatch = normalized.match(NIGERIAN_PHONE_REGEX);
  if (phoneMatch && phoneMatch.length > 0) {
    return {
      isBlocked: true,
      reason: 'Sharing direct phone numbers is restricted. Please coordinate inspections and communications through the secure HOMEZA platform.',
      matchType: 'PHONE',
      matchedSnippet: phoneMatch[0],
    };
  }

  const digitSequenceMatch = normalized.match(DIGIT_SEQUENCE_REGEX);
  if (digitSequenceMatch && digitSequenceMatch.length > 0) {
    // Exclude basic years (e.g. 2026) or 4-digit prices
    const digitsOnly = digitSequenceMatch[0].replace(/\D/g, '');
    if (digitsOnly.length >= 10 && digitsOnly.length <= 13) {
      return {
        isBlocked: true,
        reason: 'Detected phone number or account digit sequence. For tenant and landlord safety, direct contact sharing is restricted.',
        matchType: 'PHONE',
        matchedSnippet: digitSequenceMatch[0],
      };
    }
  }

  if (SPELLED_OUT_DIGITS_REGEX.test(normalized)) {
    return {
      isBlocked: true,
      reason: 'Sharing phone numbers (including spelled-out digits) is restricted by HOMEZA contact protection policies.',
      matchType: 'PHONE',
    };
  }

  // 2. Check for Email Addresses
  const emailMatch = normalized.match(EMAIL_REGEX);
  if (emailMatch && emailMatch.length > 0) {
    return {
      isBlocked: true,
      reason: 'Sharing personal email addresses in direct chat is restricted for fraud prevention. All official documents are routed securely via HOMEZA.',
      matchType: 'EMAIL',
      matchedSnippet: emailMatch[0],
    };
  }

  // 3. Check for WhatsApp & Off-Platform redirect prompts
  for (const kw of WHATSAPP_KEYWORDS) {
    const match = normalized.match(kw);
    if (match) {
      return {
        isBlocked: true,
        reason: 'Off-platform redirect attempts (such as WhatsApp, Telegram, or phone calling) are blocked to protect you against rental scams and unauthorized agents.',
        matchType: 'WHATSAPP',
        matchedSnippet: match[0],
      };
    }
  }

  // 4. Check for off-platform upfront payment solicitations
  for (const payKw of OFF_PLATFORM_PAYMENT_KEYWORDS) {
    const match = normalized.match(payKw);
    if (match) {
      return {
        isBlocked: true,
        reason: 'Direct off-platform payment or unverified inspection fee requests are strictly prohibited on HOMEZA.',
        matchType: 'OFF_PLATFORM_PAYMENT',
        matchedSnippet: match[0],
      };
    }
  }

  return { isBlocked: false };
}

/**
 * Redacts/masks detected phone numbers or emails in a text string for preview display.
 */
export function sanitizeProtectedText(text: string): string {
  if (!text) return text;
  let sanitized = text.replace(NIGERIAN_PHONE_REGEX, '[CONTACT RESTRICTED]');
  sanitized = sanitized.replace(EMAIL_REGEX, '[EMAIL RESTRICTED]');
  return sanitized;
}
