"use client"

import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export function LoadingSkeleton() {
 return (
 <div className="space-y-6 animate-in fade-in duration-200">
 <div className="flex justify-between items-center">
 <div className="space-y-2">
 <Skeleton className="h-8 w-64" />
 <Skeleton className="h-4 w-96" />
 </div>
 <Skeleton className="h-10 w-32" />
 </div>

 <div className="grid gap-6 md:grid-cols-3">
 <Card className="p-6 space-y-4">
 <Skeleton className="h-4 w-24" />
 <Skeleton className="h-8 w-32" />
 </Card>
 <Card className="p-6 space-y-4">
 <Skeleton className="h-4 w-24" />
 <Skeleton className="h-8 w-32" />
 </Card>
 <Card className="p-6 space-y-4">
 <Skeleton className="h-4 w-24" />
 <Skeleton className="h-8 w-32" />
 </Card>
 </div>

 <Card className="p-6 space-y-4">
 <div className="space-y-2">
 <Skeleton className="h-4 w-full" />
 <Skeleton className="h-4 w-full" />
 <Skeleton className="h-4 w-full" />
 <Skeleton className="h-4 w-3/4" />
 </div>
 </Card>
 </div>
 )
}
