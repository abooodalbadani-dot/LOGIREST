"use client"

import React from 'react'
import { EmptyState } from './EmptyState'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCcw, ArrowLeft, FileQuestion } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void 
  onBack?: () => void
  error?: number | string
  type?: 'generic' | 'not_found' | 'server_error'
  description?: string
}

export function ErrorState({ title, message, description, onRetry, onBack, error, type = 'generic' }: ErrorStateProps) {
  const t = useTranslations('common')
  const router = useRouter()

  const isNotFound = type === 'not_found' || error === 404
  
  const config = {
    icon: isNotFound ? FileQuestion : AlertCircle,
    title: title || (isNotFound ? t('errors.not_found_title') : t('errors.title')),
    message: message || description || (isNotFound ? t('errors.not_found_message') : t('errors.generic')),
    retryLabel: isNotFound ? t('actions.back_to_list') : t('actions.retry'),
    retryIcon: isNotFound ? ArrowLeft : RefreshCcw,
    colorClass: isNotFound ? 'text-operational-cyan' : 'text-destructive',
    bgClass: isNotFound ? 'bg-operational-cyan/5' : 'bg-destructive/[0.02]',
    borderClass: isNotFound ? 'border-operational-cyan/20' : 'border-destructive/10',
    glowClass: isNotFound ? 'bg-operational-cyan/10' : 'bg-destructive/5'
  }

  return (
    <div className="relative group p-8">
      <EmptyState
        icon={config.icon}
        title={config.title}
        description={config.message}
        action={
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              variant="default" 
              onClick={onRetry || onBack}
              className={cn(
                "gap-3 px-10 py-7 rounded-2xl shadow-xl transition-all duration-300 active:scale-95 group/btn",
                isNotFound 
                  ? "bg-operational-cyan hover:bg-operational-cyan/90 text-white shadow-operational-cyan/20" 
                  : "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-destructive/20"
              )}
            >
              <config.retryIcon className={cn("w-5 h-5 transition-transform group-hover/btn:rotate-12", isNotFound && "rtl:rotate-180")} />
              <span className="font-bold uppercase tracking-wider">{config.retryLabel}</span>
            </Button>

            {!isNotFound && (
              <Button 
                variant="outline" 
                onClick={onBack || (() => router.back())}
                className="gap-3 px-10 py-7 rounded-2xl border-border-muted/20 hover:bg-surface-container-low text-muted-foreground transition-all duration-300 active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-bold uppercase tracking-wider">{t('actions.go_back')}</span>
              </Button>
            )}
          </div>
        }
        className={cn(config.bgClass, config.borderClass, "rounded-[2.5rem] backdrop-blur-sm p-16")}
      />
      
      {/* Decorative Glow */}
      <div className={cn(
        "absolute inset-0 blur-[120px] rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000",
        config.glowClass
      )} />
    </div>
  )
}
