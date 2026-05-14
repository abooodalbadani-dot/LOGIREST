'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

const DefaultErrorFallback = () => {
  const t = useTranslations('common');
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-center">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-destructive">{t('errors.something_went_wrong')}</h1>
        <p className="text-muted-foreground">{t('errors.unexpected_error')}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          {t('actions.reload_page')}
        </button>
      </div>
    </div>
  );
};

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback />;
    }

    return this.props.children;
  }
}
