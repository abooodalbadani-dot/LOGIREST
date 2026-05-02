import React, { ReactNode, ElementType, isValidElement } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
 label: string;
 value: string | number;
 trend?: string | ReactNode;
 icon?: ElementType | ReactNode;
 color?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo';
 className?: string;
 dir?: 'ltr' | 'rtl';
}

const colorMap = {
 cyan: {
 text: 'text-status-success',
 glow: 'from-status-success/50',
 bg: 'bg-status-success/10',
 },
 emerald: {
 text: 'text-status-success',
 glow: 'from-status-success/50',
 bg: 'bg-status-success/10',
 },
 amber: {
 text: 'text-status-warning',
 glow: 'from-status-warning/50',
 bg: 'bg-status-warning/10',
 },
 rose: {
 text: 'text-status-error',
 glow: 'from-status-error/50',
 bg: 'bg-status-error/10',
 },
 indigo: {
 text: 'text-status-info',
 glow: 'from-status-info/50',
 bg: 'bg-status-info/10',
 }
};

export function MetricCard({ 
 label, 
 value, 
 trend, 
 icon: Icon, 
 color = 'cyan', 
 className,
 dir = 'ltr'
}: MetricCardProps) {
 const styles = colorMap[color as keyof typeof colorMap] || colorMap.cyan;

 return (
 <Card className={cn(
 "bg-surface-container-lowest border-none rounded-[2rem] overflow-hidden relative group transition-all hover:bg-surface-container-low/50 hover:ambient-shadow text-foreground",
 className
 )}>
 {/* Background Icon Decoration */}
 <div className="absolute top-0 end-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 duration-500">
 {Icon ? (isValidElement(Icon) ? Icon : React.createElement(Icon as ElementType, { className: "w-24 h-24" })) : null}
 </div>

 <CardHeader className="p-6 relative z-10">
 <div className="flex items-center justify-between mb-4">
 <div className={cn("p-2.5 rounded-xl transition-colors group-hover:bg-background", styles.bg)}>
 {Icon ? (isValidElement(Icon) ? Icon : React.createElement(Icon as ElementType, { className: cn("w-5 h-5", styles.text) })) : null}
 </div>
 {trend && (
 <span className="text-label-xs font-semibold uppercase opacity-40">
 {trend}
 </span>
 )}
 </div>

 <div className="space-y-1">
 <CardDescription className="text-label-xs font-semibold uppercase text-muted-foreground/60" dir="auto" style={{ unicodeBidi: 'isolate' }}>
 {label}
 </CardDescription>
 <CardTitle className={cn("text-headline-lg font-display font-bold", styles.text)} dir="auto" style={{ unicodeBidi: 'isolate' }}>
 <span dir="ltr">{value}</span>
 </CardTitle>
 </div>
 </CardHeader>

 </Card>
 );
}
