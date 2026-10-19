import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export interface TouchSelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
}

interface TouchSelectProps {
  id: string;
  label?: string;
  value: string | number;
  onChange: (value: any) => void;
  options: TouchSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const TouchSelect: React.FC<TouchSelectProps> = ({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Select option',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find currently selected option
  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || {
    value: value,
    label: String(value),
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: string | number) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm sm:text-base font-semibold text-stone-800 mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Hidden standard select element for test runners and accessibility */}
      <select
        id={id}
        name={id}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-hidden="true"
        className="sr-only opacity-0 absolute pointer-events-none w-0 h-0"
        tabIndex={-1}
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Custom Touch-Friendly Trigger Button */}
      <button
        id={`${id}-trigger`}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full text-left flex items-center justify-between border rounded-xl px-4 py-3.5 bg-white font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 min-h-[48px] touch-manipulation cursor-pointer transition shadow-xs ${
          isOpen
            ? 'border-emerald-600 ring-2 ring-emerald-600/30'
            : 'border-stone-300 hover:border-stone-400'
        } ${disabled ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate text-sm sm:text-base font-semibold text-stone-900">
          {selectedOption.label || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-stone-500 shrink-0 ml-2 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-700' : ''
          }`}
        />
      </button>

      {/* Dropdown Options Container (Responsive: bottom sheet/modal style on small mobile, popover on desktop) */}
      {isOpen && (
        <>
          {/* Mobile backdrop to guarantee dismiss on tap anywhere outside */}
          <div
            className="fixed inset-0 z-60 bg-stone-950/50 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div
            id={`${id}-dropdown-options`}
            className="fixed sm:absolute bottom-0 left-0 right-0 sm:bottom-auto sm:top-full sm:left-0 sm:right-0 z-70 sm:z-50 mt-1 sm:mt-1.5 bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[75vh] sm:max-h-[320px] animate-fadeIn"
            role="listbox"
          >
            {/* Mobile Header on phones */}
            <div className="flex sm:hidden items-center justify-between px-5 py-3.5 bg-stone-100 border-b border-stone-200">
              <span className="font-bold text-stone-900 text-sm">
                {label || placeholder}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-stone-500 hover:bg-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Options List */}
            <div className="overflow-y-auto p-1.5 sm:p-2 space-y-1 divide-y sm:divide-y-0 divide-stone-100">
              {options.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    id={`${id}-option-${String(opt.value).replace(/\s+/g, '-').toLowerCase()}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-4 py-3 sm:py-2.5 rounded-xl flex items-center justify-between gap-3 text-sm sm:text-base font-medium transition cursor-pointer min-h-[46px] touch-manipulation ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200'
                        : 'text-stone-800 hover:bg-stone-100 active:bg-stone-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-xs text-stone-500 truncate font-normal mt-0.5">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
