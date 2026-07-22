'use client';

import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function PreviewLoadingPage() {
    return (
        <LoadingSpinner 
            message="INITIALIZING_CORE_SYSTEMS" 
            subtitle="نظام حوكمة وإدارة التمويل والمطابخ" 
        />
    );
}
