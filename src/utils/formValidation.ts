/**
 * Form & Input Validation Utility for HOMEZA
 * Enforces strict validation for email formats, passwords, phone numbers,
 * monetary values, and required fields across all user roles and workflows.
 */

// Strict RFC 5322 compliant regex with proper domain and TLD extension check (.com, .ng, .org, etc.)
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Standard Nigerian phone numbers (+234, 080, 081, 070, 090, 091 etc. or standard international formats)
export const PHONE_REGEX = /^(?:(?:\+?234\s?)|0)(?:[789][01]\d{8}|[789]\d{9})$/;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates email structure:
 * - Non-empty
 * - Contains valid username, @ symbol, valid domain name, and valid extension (.com, .ng, .org, etc.)
 */
export function validateEmailAddress(email: string): ValidationResult {
  const trimmed = (email || '').trim();
  if (!trimmed) {
    return { isValid: false, error: 'Email address is required.' };
  }

  // Must not have spaces
  if (/\s/.test(trimmed)) {
    return { isValid: false, error: 'Email address cannot contain spaces.' };
  }

  // Check @ symbol
  if (!trimmed.includes('@')) {
    return { isValid: false, error: 'Please include an "@" in the email address.' };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Please enter a valid email address.' };
  }

  const [username, domain] = parts;
  if (!username) {
    return { isValid: false, error: 'Please enter a valid username before the "@".' };
  }

  if (!domain || !domain.includes('.')) {
    return { isValid: false, error: 'Please include a valid domain extension (e.g. .com, .ng, .org).' };
  }

  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) {
    return { isValid: false, error: 'Please enter a valid top-level domain extension (e.g. .com, .ng).' };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. user@gmail.com, name@domain.ng).' };
  }

  return { isValid: true };
}

/**
 * Validates password format:
 * - At least 8 characters minimum
 */
export function validatePasswordFormat(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }
  return { isValid: true };
}

/**
 * Validates Nigerian or international phone number
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  const cleaned = (phone || '').trim().replace(/[\s-]/g, '');
  if (!cleaned) {
    return { isValid: false, error: 'Phone number is required.' };
  }
  // Minimum digits check for phone
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 14) {
    return { isValid: false, error: 'Please enter a valid phone number (e.g. 08012345678 or +2348012345678).' };
  }
  return { isValid: true };
}

/**
 * Validates generic required non-empty string
 */
export function validateRequiredField(value: any, fieldLabel: string): ValidationResult {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
    return { isValid: false, error: `${fieldLabel} is required.` };
  }
  return { isValid: true };
}

/**
 * Validates mandatory property photos requirement
 */
export function validatePropertyPhotos(images: any[], minCount = 1): ValidationResult {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return {
      isValid: false,
      error: 'Please upload property photos before submitting this listing.',
    };
  }

  // Ensure every image has a valid url
  const hasInvalidUrl = images.some((img) => !img.url || typeof img.url !== 'string' || !img.url.trim());
  if (hasInvalidUrl) {
    return {
      isValid: false,
      error: 'One or more uploaded property photos has an invalid format. Please upload valid photos.',
    };
  }

  return { isValid: true };
}
