import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, LogIn } from 'lucide-react';
import { PLATFORM_CONFIG } from '../../config/platform';

interface AccessDeniedProps {
  requiredRole?: string;
  onReturnHome: () => void;
  onOpenAuth: (mode?: any) => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  requiredRole = 'Administrator',
  onReturnHome,
  onOpenAuth,
}) => {
  return (
    <div
      id="access-denied-screen"
      className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6"
    >
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-200 p-6 sm:p-8 text-center space-y-5 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
            Access denied. You are not authorized to access this area.
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            This module is restricted to authorized {requiredRole} accounts only. Server-side role verification rejected this request.
          </p>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs text-stone-600 text-left space-y-1">
          <div className="font-semibold text-stone-800 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-stone-500" />
            <span>Role-Based Access Control (RBAC) Enforcement</span>
          </div>
          <p>
            Your current authenticated session does not possess the cryptographic authorization tokens required for this console.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            id="btn-access-denied-home"
            type="button"
            onClick={onReturnHome}
            className="flex-1 bg-stone-900 hover:bg-black text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Marketplace</span>
          </button>

          <button
            id="btn-access-denied-login"
            type="button"
            onClick={() => onOpenAuth('ADMIN_LOGIN')}
            className="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <LogIn className="w-4 h-4" />
            <span>Admin Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
