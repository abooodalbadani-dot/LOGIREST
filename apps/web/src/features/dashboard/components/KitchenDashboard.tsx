'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { 
 ClipboardList, 
 AlertTriangle, 
 Utensils, 
 ArrowUpRight, 
 Clock, 
 CheckCircle2,
 PackageSearch,
 History,
 Plus
} from 'lucide-react';
import { KPICard } from './KPICard';
import { formatNumber } from '@/utils/currency';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';

export function KitchenDashboard() {
 const t = useTranslations('dashboard');
 const tc = useTranslations('common');
 const { locale } = useLocale();

 // Mock data for Kitchen Chief
 const stats = {
 pendingRequests: 4,
 itemsShortage: 3,
 todayConsumption: 124,
 stockHealth: 92,
 };

 return (
 <div className="space-y-10 animate-in fade-in duration-700">
 {/* Kitchen Chief Header */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
 <div className="space-y-1">
 <Badge className="bg-status-warning/10 text-status-warning border-status-warning/20 text-label-xs font-semibold uppercase mb-2">
 Kitchen Operations
 </Badge>
 <h2 className="text-headline-lg font-semibold uppercase italic text-foreground">
 Department <span className="text-status-warning">Overview</span>
 </h2>
 </div>
 <PermissionGate action="create" resource="operations_issues">
 <Link href="/issues/new" className="contents">
 <Button className="primary-gradient text-white font-semibold uppercase px-8 rounded-xl h-12">
 <Plus className="w-5 h-5 me-2" /> New Request
 </Button>
 </Link>
 </PermissionGate>
 </div>

 {/* KPI Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <KPICard
 title="Active Requests"
 value={formatNumber(stats.pendingRequests, locale as 'ar' | 'en')}
 icon={ClipboardList}
 accent="amber"
 description="Awaiting fulfillment"
 />
 <KPICard
 title="Critical Shortage"
 value={formatNumber(stats.itemsShortage, locale as 'ar' | 'en')}
 icon={AlertTriangle}
 accent="red"
 description="Immediate action required"
 />
 <KPICard
 title="Today's Consumption"
 value={formatNumber(stats.todayConsumption, locale as 'ar' | 'en')}
 icon={Utensils}
 accent="cyan"
 trend={{ value: '8%', isPositive: true }}
 description="Total items used today"
 />
 <KPICard
 title="Kitchen Stock Health"
 value={`${stats.stockHealth}%`}
 icon={CheckCircle2}
 accent="cyan"
 description="Overall availability"
 />
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Recent Requests List */}
 <Card className="lg:col-span-2 bg-surface-container-lowest border-none rounded-3xl relative overflow-hidden">
 <div className="absolute top-0 end-0 w-64 h-64 bg-status-warning/5 blur-[100px] rounded-full -me-32 -mt-32" />
 <CardHeader className="flex flex-row items-center justify-between">
 <div>
 <CardTitle className="text-title-lg font-semibold uppercase italic">Supply Requests</CardTitle>
 <CardDescription className="text-label-xs font-medium text-muted-foreground/60 uppercase">Tracking departmental flow</CardDescription>
 </div>
 <PermissionGate action="view" resource="operations_issues">
 <Link href="/issues">
 <Button variant="link" className="text-status-warning font-semibold uppercase text-label-xs">View History</Button>
 </Link>
 </PermissionGate>
 </CardHeader>
 <CardContent className="p-0">
 <div >
 {[
 { id: 'RQ-2024-081', items: 'Fresh Vegetables (12), Meat (4)', status: 'Pending', time: '1h ago', priority: 'High' },
 { id: 'RQ-2024-079', items: 'Dry Spices, Cooking Oil (20L)', status: 'Fulfilled', time: '4h ago', priority: 'Normal' },
 { id: 'RQ-2024-075', items: 'Frozen Seafood (8kg)', status: 'Rejected', time: '1d ago', priority: 'Urgent' },
 ].map((req, i) => (
 <div key={i} className="p-5 flex items-center justify-between hover:bg-white/[0.01] transition-colors group">
 <div className="flex items-start gap-4">
 <div className={`p-3 rounded-xl border-none ${ req.status === 'Pending' ? 'bg-status-warning/10' : req.status === 'Fulfilled' ? 'bg-status-success/10' : 'bg-status-error/10' }`}>
 <PackageSearch className={`w-5 h-5 ${ req.status === 'Pending' ? 'text-status-warning' : req.status === 'Fulfilled' ? 'text-status-success' : 'text-status-error' }`} />
 </div>
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <span className="text-body-md font-semibold text-foreground uppercase italic">{req.id}</span>
 <Badge variant="outline" className={`text-label-xxs font-semibold uppercase px-1.5 h-4 ${ req.priority === 'Urgent' ? 'text-status-error bg-status-error/5' : req.priority === 'High' ? 'text-status-warning bg-status-warning/5' : 'text-muted-foreground/40 border-none bg-surface-container-low' }`}>
 {req.priority}
 </Badge>
 </div>
 <p className="text-label-xs text-muted-foreground font-medium line-clamp-1">{req.items}</p>
 </div>
 </div>
 <div className="flex flex-col items-end gap-2">
 <span className="text-label-xxs font-semibold text-muted-foreground/40 uppercase flex items-center gap-1.5">
 <Clock className="w-3 h-3" /> {req.time}
 </span>
 <Badge className={`${
 req.status === 'Pending' ? 'bg-status-warning/10 text-status-warning' : 
 req.status === 'Fulfilled' ? 'bg-status-success/10 text-status-success' : 
 'bg-status-error/10 text-status-error'
 } text-label-xxs font-semibold uppercase border-none`}>
 {req.status}
 </Badge>
 </div>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>

 {/* Consumption Log Widget */}
 <Card className="bg-surface-container-lowest border-none rounded-3xl">
 <CardHeader>
 <span className="text-label-xs font-semibold uppercase text-operational-cyan mb-1 flex items-center gap-2">
 <History className="w-3 h-3" /> 
 Daily Activity
 </span>
 <CardTitle className="text-title-sm font-semibold uppercase">Consumption Log</CardTitle>
 </CardHeader>
 <CardContent className="space-y-6">
 {[
 { item: 'Olive Oil', qty: '2.5L', time: '14:20' },
 { item: 'Basmati Rice', qty: '15kg', time: '12:30' },
 { item: 'Frozen Chicken', qty: '24kg', time: '09:15' },
 { item: 'Flour (All Purpose)', qty: '5kg', time: '08:00' },
 ].map((log, i) => (
 <div key={i} className="flex items-center justify-between group">
 <div className="flex flex-col">
 <span className="text-label-xs font-bold text-foreground group-hover:text-cyan-500 transition-colors">{log.item}</span>
 <span className="text-label-xxs font-medium text-muted-foreground/40">{log.qty} recorded</span>
 </div>
 <span className="text-label-xs font-semibold text-muted-foreground/30 font-mono">{log.time}</span>
 </div>
 ))}
 <PermissionGate action="create" resource="operations_issues">
 <Link href="/issues/new" className="w-full">
 <Button variant="outline" className="w-full bg-surface-container-low border-none text-label-xs font-semibold uppercase h-10 hover:bg-operational-cyan/20 hover:text-operational-cyan transition-all">
 Quick Record Usage <ArrowUpRight className="w-3 h-3 ms-2" />
 </Button>
 </Link>
 </PermissionGate>
 </CardContent>
 </Card>
 </div>
 </div>
 );
}

