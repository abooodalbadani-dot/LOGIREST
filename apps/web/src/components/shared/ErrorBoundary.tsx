'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

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

 public render() {
 if (this.state.hasError) {
 if (this.props.fallback) return this.props.fallback;

 return (
 <div className="w-full max-w-3xl min-w-[280px] shrink-0 mx-auto flex flex-col items-center justify-center min-h-[400px] p-8 md:p-12 text-center bg-card border border-border shadow-sm/50 backdrop-blur-xl border border-status-error/10 rounded-2xl">
 <div className="w-16 h-16 bg-status-error/10 rounded-full flex items-center justify-center mb-6 border border-status-error/20">
 <AlertTriangle className="w-8 h-8 text-status-error" />
 </div>
 
 <h2 className="text-title-lg font-bold text-foreground uppercase mb-2 italic w-full text-center">
 System Fault Detected
 </h2>
 <p className="text-body-md text-muted-foreground/60 max-w-xl mx-auto mb-8 font-medium w-full text-center">
 An unexpected error occurred in the operational runtime. Diagnostic data has been logged.
 </p>
 
 <div className="flex gap-4 max-w-md w-full justify-center">
 <button 
 onClick={this.handleReset}
 className="flex items-center justify-center gap-2 h-11 px-8 bg-brand-gold hover:bg-brand-gold/90 text-black text-label-xs font-bold uppercase rounded-xl transition-all duration-200 active:scale-[0.98] border-none shadow-lg shadow-brand-gold/10 cursor-pointer"
 >
 <RefreshCcw className="w-4 h-4 animate-spin-hover" />
 <span>Reinitialize Module</span>
 </button>
 </div>

 <div className="mt-8 pt-8 border-t border-border/50 w-full max-w-md mx-auto">
 <p className="text-label-xxs font-mono text-muted-foreground/30 uppercase overflow-hidden text-ellipsis w-full text-center select-all">
 Error: {this.state.error?.message || 'Unknown Runtime Exception'}
 </p>
 </div>
 </div>
 );
 }

 return this.props.children;
 }
}
