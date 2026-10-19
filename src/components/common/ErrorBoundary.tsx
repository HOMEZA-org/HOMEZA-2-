import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home, Shield } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[HOMEZA ErrorBoundary] Caught an unhandled error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    window.location.href = window.location.origin + window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected error occurred.';
      const componentStack = this.state.errorInfo?.componentStack || '';

      return (
        <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans selection:bg-emerald-700 selection:text-white">
          <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Brand Header */}
            <div className="flex items-center space-x-3 pb-4 border-b border-stone-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-black tracking-tight text-white font-serif">HOMEZA</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    System Recovery
                  </span>
                </div>
                <p className="text-xs text-stone-400">Verified Metropolitan Real Estate</p>
              </div>
            </div>

            {/* Warning Message */}
            <div className="flex items-start space-x-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-200">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-amber-200">Application Notice</h3>
                <p className="text-xs text-amber-300/90 leading-relaxed">
                  The application encountered a temporary display issue. You can safely reload the page or reset the local session cache to restore full functionality.
                </p>
              </div>
            </div>

            {/* Error preview */}
            <div className="bg-stone-950/80 rounded-xl p-3 border border-stone-800/80 text-xs font-mono text-stone-400 break-words">
              <span className="text-rose-400 font-semibold">Error: </span>
              {errorMessage}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-950/50 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload HOMEZA</span>
              </button>
              <button
                onClick={this.handleResetCache}
                className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-medium text-sm border border-stone-700 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-stone-400" />
                <span>Reset Cache</span>
              </button>
            </div>

            {/* Collapsible Technical Details for debugging */}
            <div className="pt-2 border-t border-stone-800">
              <button
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="text-xs text-stone-500 hover:text-stone-400 font-medium transition-colors cursor-pointer flex items-center space-x-1"
              >
                <span>{this.state.showDetails ? 'Hide Diagnostics' : 'Show Technical Diagnostics'}</span>
              </button>
              {this.state.showDetails && (
                <div className="mt-3 p-3 bg-stone-950 rounded-lg border border-stone-800 text-[11px] font-mono text-stone-400 overflow-x-auto max-h-48 whitespace-pre-wrap">
                  <div className="text-rose-400 font-bold mb-1">{this.state.error?.toString()}</div>
                  <div className="text-stone-500">{componentStack || 'No component stack available.'}</div>
                </div>
              )}
            </div>

            {/* Security Guarantee */}
            <div className="flex items-center justify-center space-x-2 text-[11px] text-stone-500 pt-2">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>All user verification data and security rules remain intact.</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
