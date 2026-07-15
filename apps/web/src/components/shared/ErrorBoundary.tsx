'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, ArrowLeft, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  private handleGoBack = () => {
    window.history.back();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-brand-black/95 p-4 overflow-y-auto select-none">
          <div className="w-full max-w-2xl min-w-[280px] flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white dark:bg-[#1A2234] border border-status-error/20 dark:border-status-error/30 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-status-error/10 rounded-full flex items-center justify-center mb-6 border border-status-error/20">
              <AlertTriangle className="w-8 h-8 text-status-error" />
            </div>

            <h2 className="text-title-lg font-bold text-foreground uppercase mb-2 italic w-full text-center">
              System Fault Detected
            </h2>
            <p className="text-body-md text-muted-foreground/60 max-w-2xl mx-auto mb-8 font-medium w-full text-center leading-relaxed">
              An unexpected error occurred in the operational runtime. Diagnostic data has been logged.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center max-w-lg">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 h-11 px-5 bg-brand-gold hover:bg-brand-gold/90 text-black text-label-xs font-bold uppercase rounded-xl transition-all duration-200 active:scale-[0.98] border-none shadow-lg shadow-brand-gold/10 cursor-pointer"
              >
                <RefreshCcw className="w-4 h-4 animate-spin-hover" />
                <span>Reinitialize Module</span>
              </button>
              <button
                onClick={this.handleGoBack}
                className="flex items-center justify-center gap-2 h-11 px-5 bg-transparent border border-muted-foreground/20 hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground text-label-xs font-bold uppercase rounded-xl transition-all duration-200 active:scale-[0.98] shadow-sm cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go Back</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 h-11 px-5 bg-transparent border border-muted-foreground/20 hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground text-label-xs font-bold uppercase rounded-xl transition-all duration-200 active:scale-[0.98] shadow-sm cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            </div>

            {this.state.error && (
              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800/50 w-full select-text">
                <p className="text-[10px] font-mono text-muted-foreground/35 uppercase overflow-hidden text-ellipsis w-full text-center leading-normal">
                  Error: {this.state.error.message}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
