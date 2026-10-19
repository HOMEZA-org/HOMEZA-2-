import React from 'react';
import { filterMonetaryKeyDown, validateMonetaryAmount } from '../../utils/monetaryValidation';
import { formatNaira } from '../../config/platform';

interface MonetaryInputFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
  helperText?: string;
  showPreview?: boolean;
  className?: string;
  inputClassName?: string;
}

export const MonetaryInputField: React.FC<MonetaryInputFieldProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder = 'Leave empty if ₦0',
  required = false,
  error,
  helperText,
  showPreview = true,
  className = '',
  inputClassName = '',
}) => {
  const inputId = id || `monetary-input-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  // Live validation for preview
  const valResult = validateMonetaryAmount(value, {
    fieldName: label,
    isRequired: required,
  });

  const displayError = error || (!valResult.isValid && value !== '' ? valResult.error : null);

  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={inputId} className="block text-xs font-semibold text-stone-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs pointer-events-none">
          ₦
        </span>

        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={filterMonetaryKeyDown}
          placeholder={placeholder}
          className={`w-full pl-7 pr-3 py-2 text-xs font-semibold border rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 transition ${
            displayError
              ? 'border-red-500 focus:ring-red-500 bg-red-50/20'
              : 'border-stone-300 focus:ring-emerald-600'
          } ${inputClassName}`}
        />
      </div>

      {/* Field Error Message */}
      {displayError && (
        <p className="text-[11px] font-medium text-red-600 leading-tight animate-fadeIn">
          {displayError}
        </p>
      )}

      {/* Formatted Preview */}
      {!displayError && showPreview && valResult.isValid && valResult.numericValue > 0 && (
        <p className="text-[11px] font-bold text-emerald-700 font-mono">
          Preview: {formatNaira(valResult.numericValue)}
        </p>
      )}

      {/* Helper text if provided and no error */}
      {!displayError && helperText && (
        <p className="text-[10px] text-stone-400">{helperText}</p>
      )}
    </div>
  );
};
