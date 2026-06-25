'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
 children: ReactNode;
 fallback?: ReactNode;
 onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
 hasError: boolean;
 error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
 constructor(props: Props) {
  super(props);
  this.state = { hasError: false, error: null };
 }

 static getDerivedStateFromError(error: Error): State {
  return { hasError: true, error };
 }

 componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  console.error('[ErrorBoundary] Unhandled error:', error, errorInfo);
  this.props.onError?.(error, errorInfo);
 }

 handleReset = () => {
  this.setState({ hasError: false, error: null });
 };

 render() {
  if (this.state.hasError) {
   if (this.props.fallback) {
    return this.props.fallback;
   }

   return (
    <div className="min-h-screen bg-surface-container flex items-center justify-center p-8">
     <div className="max-w-md w-full bg-card border border-border shadow-sm rounded-[2rem] border border-outline-low p-10 text-center space-y-6 ambient-shadow">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
       <AlertTriangle className="w-8 h-8 text-red-500/70" />
      </div>

      <div className="space-y-2">
       <h2 className="text-title-md font-bold text-foreground">
        Unexpected Error
       </h2>
       <p className="text-body-sm text-muted-foreground">
        An unexpected error occurred. Our team has been notified.
       </p>
      </div>

      {this.state.error && (
       <div className="bg-surface-container-high rounded-sm p-4 text-left">
        <p className="text-label-xs font-mono text-muted-foreground break-all">
         {this.state.error.message}
        </p>
       </div>
      )}

      <div className="flex items-center justify-center gap-3">
       <button
        onClick={this.handleReset}
        className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
       >
        <RefreshCw className="w-4 h-4" />
        Try Again
       </button>
       <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-surface-container-high hover:bg-surface-container-highest transition-all text-label-sm font-semibold uppercase text-muted-foreground"
       >
        <Home className="w-4 h-4" />
        Home
       </Link>
      </div>
     </div>
    </div>
   );
  }

  return this.props.children;
 }
}
