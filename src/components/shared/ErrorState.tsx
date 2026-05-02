"use client"

import React from 'react'
import { EmptyState } from './EmptyState'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ErrorStateProps {
 title?: string
 message?: string
 onRetry?: () => void
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
 const t = useTranslations('common')

 return (
 <EmptyState
 icon={AlertCircle}
 title={title || t('errors.title')}
 description={message || t('errors.generic')}
 action={
 onRetry && (
 <Button 
 variant="outline" 
 onClick={onRetry}
 className="gap-2 border-destructive/20 hover:border-destructive/40 hover:bg-destructive/5 text-destructive"
 >
 <RefreshCcw className="w-4 h-4" />
 {t('actions.retry')}
 </Button>
 )
 }
 className="bg-destructive/5 rounded-2xl border border-destructive/10"
 />
 )
}
