import type React from 'react';

/**
 * HOMEZA — Centralized Strict Monetary Validation Utility
 *
 * Enforces positive whole numbers only (Nigerian Naira amounts).
 * Rule: Value must match ^[1-9][0-9]*$ (Strict positive integer).
 *
 * Rules:
 * - Empty string is valid ONLY for optional fee fields (interpreted as ₦0 / not applicable).
 * - For Rent: Required, cannot be empty, cannot be 0.
 * - For Optional Fees (Service Charge, Caution Deposit, Agreement, Legal, Other):
 *   Empty -> ACCEPT as ₦0.
 *   "0" -> REJECT (Must leave empty if ₦0).
 *   Any non-integer / decimals / hyphens / negatives / letters / symbols -> REJECT.
 */

export const POSITIVE_WHOLE_NUMBER_REGEX = /^[1-9][0-9]*$/;

export interface MonetaryValidationResult {
  isValid: boolean;
  numericValue: number;
  error: string | null;
}

/**
 * Validates a monetary input string against strict HOMEZA tariff rules.
 */
export function validateMonetaryAmount(
  input: string | number | undefined | null,
  options: {
    fieldName: string;
    isRequired?: boolean;
  }
): MonetaryValidationResult {
  const { fieldName, isRequired = false } = options;
  const str = input === undefined || input === null ? '' : String(input).trim();

  // If empty
  if (str === '') {
    if (isRequired) {
      return {
        isValid: false,
        numericValue: 0,
        error: `${fieldName} is required. Enter a valid whole-number amount greater than 0.`,
      };
    }
    // Optional fee left empty is ₦0
    return {
      isValid: true,
      numericValue: 0,
      error: null,
    };
  }

  // Explicit check for "0"
  if (str === '0') {
    if (isRequired) {
      return {
        isValid: false,
        numericValue: 0,
        error: `${fieldName} must be a positive whole number greater than 0.`,
      };
    }
    return {
      isValid: false,
      numericValue: 0,
      error: `${fieldName} cannot be 0. Leave field empty if not applicable (₦0), or enter a valid amount greater than 0.`,
    };
  }

  // Check for minus sign or negative numbers
  if (str.includes('-')) {
    return {
      isValid: false,
      numericValue: 0,
      error: `Minus signs and negative numbers are not allowed. Enter a positive whole number.`,
    };
  }

  // Check for decimal points
  if (str.includes('.')) {
    return {
      isValid: false,
      numericValue: 0,
      error: `Decimals are not allowed. Enter a whole Nigerian Naira amount.`,
    };
  }

  // Check for commas or symbols or letters
  if (/[a-zA-Z₦$, ]/.test(str)) {
    return {
      isValid: false,
      numericValue: 0,
      error: `Only whole digits (0-9) are allowed (no letters, commas, spaces, or currency symbols).`,
    };
  }

  // Check for leading zero with additional digits e.g. "0529"
  if (str.length > 1 && str.startsWith('0')) {
    return {
      isValid: false,
      numericValue: 0,
      error: `Invalid amount format. Numbers cannot have leading zeroes.`,
    };
  }

  // Check strict regex pattern ^[1-9][0-9]*$
  if (!POSITIVE_WHOLE_NUMBER_REGEX.test(str)) {
    return {
      isValid: false,
      numericValue: 0,
      error: `Enter a valid whole-number amount greater than 0 (no decimals, negatives, hyphens, or symbols).`,
    };
  }

  const parsed = parseInt(str, 10);
  if (isNaN(parsed) || parsed <= 0 || !Number.isSafeInteger(parsed)) {
    return {
      isValid: false,
      numericValue: 0,
      error: `Enter a valid whole-number amount greater than 0.`,
    };
  }

  return {
    isValid: true,
    numericValue: parsed,
    error: null,
  };
}

/**
 * KeyDown event handler to block invalid characters at keystroke time.
 * Allows navigation, editing keys, Ctrl/Cmd shortcuts, and digits 0-9.
 */
export function filterMonetaryKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  // Allow navigation and editing keys
  const allowedKeys = [
    'Backspace',
    'Tab',
    'Enter',
    'Escape',
    'Delete',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
  ];

  if (allowedKeys.includes(e.key)) {
    return;
  }

  // Allow copy / paste / select all / undo / redo
  if (e.ctrlKey || e.metaKey) {
    return;
  }

  // Strictly allow only digit characters 0-9
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
}
