import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageBackHeaderProps {
  onBack: () => void;
  label?: string;
  title?: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  className?: string;
}

export const PageBackHeader: React.FC<PageBackHeaderProps> = ({
  onBack,
  label = 'Back',
  title,
  subtitle,
  rightElement,
  className = '',
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              onBack();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 hover:text-stone-900 font-semibold text-xs sm:text-sm transition-all shadow-2xs hover:shadow-xs cursor-pointer"
            aria-label={label}
          >
            <ArrowLeft className="w-4 h-4 text-stone-500 group-hover:text-stone-900 group-hover:-translate-x-0.5 transition-transform" />
            <span>{label}</span>
          </button>

          {title && (
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
              {title}
            </h1>
          )}
        </div>

        {rightElement && <div>{rightElement}</div>}
      </div>

      {subtitle && (
        <p className="text-xs sm:text-sm text-stone-500 mt-2 ml-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};
