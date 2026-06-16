'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { FormContainer, FormCard, FormHeader, FormFooter, FormGridArea } from '@/components/layouts/FormLayout';
import { type ResourceType, type ActionType } from '@/types/rbac';

interface Props {
    title: string;
    children: ReactNode;
    isSaving?: boolean;
    onSubmit?: () => void;
    onCancel?: () => void;
    resource?: ResourceType;
    saveAction?: ActionType;
    hideSave?: boolean;
    saveDisabled?: boolean;
    isDirty?: boolean;
    isValid?: boolean;
    backHref?: string;
    headerActions?: ReactNode;
}

export function MasterDataFormLayout({
    title,
    children,
    isSaving = false,
    onSubmit = () => { },
    onCancel = () => { },
    resource = 'master_data',
    saveAction = 'create',
    hideSave = false,
    saveDisabled = false,
    isDirty = true,
    isValid = true,
    headerActions,
    backHref
}: Props) {
    const t = useTranslations('master_data.common');
    const tc = useTranslations('common');

    return (
        <div className="min-w-0 gap-6 flex-1 fade-in max-w-full slide-in-from-bottom-4 duration-200 animate-in flex-col flex pb-32 w-full">
            <FormContainer className="w-full min-w-0 flex-1">
                <FormCard>
                    <FormHeader
                        title={title}
                        subtitle={t('asset_metadata')}
                        backHref={backHref}
                        actions={headerActions}
                    />

                    <div className="relative overflow-hidden">
                        {/* Subtle grid pattern background */}
                        <div className="absolute inset-0 opacity-[0.01] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

                        <FormGridArea className="relative z-10 space-y-0 w-full min-w-0">
                            {children}
                        </FormGridArea>
                    </div>

                    <div className="flex items-center justify-between px-6 py-4 bg-card border-t border-border">
                        <span className="text-label-xs text-muted-foreground/40 uppercase font-semibold">{t('confidential_data')}</span>
                        <div className="flex gap-4 items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-operational-cyan animate-pulse" />
                                <span className="text-label-xxs text-operational-cyan/60 font-semibold uppercase">{t('secure_connection')}</span>
                            </div>
                        </div>
                    </div>

                    {!hideSave && (
                        <PermissionGate action={saveAction} resource={resource}>
                            <FormFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onCancel}
                                    className="h-10 text-label-xs font-bold uppercase rounded-lg border-border px-6 hover:bg-muted dark:hover:bg-neutral-800/50"
                                >
                                    {tc('cancel')}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        console.log('2. [MasterDataFormLayout] onSubmit triggered!');
                                        onSubmit();
                                    }}
                                    disabled={saveDisabled || !isDirty || isSaving}
                                    className="h-10 text-label-xs font-bold uppercase rounded-lg bg-operational-cyan hover:bg-operational-cyan/90 text-white px-8 shadow-sm shadow-operational-cyan/20"
                                >
                                    {isSaving ? tc('saving') : tc('save')}
                                </Button>
                            </FormFooter>
                        </PermissionGate>
                    )}
                </FormCard>
            </FormContainer>
        </div>
    );
}
