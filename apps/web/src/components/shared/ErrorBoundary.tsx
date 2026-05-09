'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
 <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-surface-container-low/50 backdrop-blur-xl border border-status-error/10 rounded-xl">
 <div className="w-16 h-16 bg-status-error/10 rounded-full flex items-center justify-center mb-6 border border-status-error/20">
 <AlertTriangle className="w-8 h-8 text-status-error" />
 </div>
 
 <h2 className="text-title-lg font-semibold text-foreground uppercase mb-2 italic">
 System Fault Detected
 </h2>
 <p className="text-body-md text-muted-foreground/60 max-w-sm mx-auto mb-8 font-medium">
 An unexpected error occurred in the operational runtime. Diagnostic data has been logged.
 </p>
 
 <div className="flex gap-4">
 <Button 
 onClick={this.handleReset}
 className="h-10 px-6 bg-surface-container-high hover:bg-surface-container-highest text-white text-label-xs font-semibold uppercase rounded-xl transition-all border border-border-muted"
 >
 <RefreshCcw className="w-3.5 h-3.5 me-2" />
 Reinitialize Module
 </Button>
 </div>

 <div className="mt-8 pt-8 border-t border-border-muted w-full max-w-md">
 <p className="text-label-xxs font-mono text-muted-foreground/30 uppercase overflow-hidden text-ellipsis">
 Error: {this.state.error?.message || 'Unknown Runtime Exception'}
 </p>
 </div>
 </div>
 );
 }

 return this.props.children;
 }
}
