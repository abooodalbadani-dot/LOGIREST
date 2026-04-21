'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  accent: 'cyan' | 'amber' | 'red';
  description?: string;
}

export function KPICard({ title, value, icon: Icon, accent, description }: KPICardProps) {
  const accents = {
    cyan: 'border-[#3ABEFF] shadow-[#3ABEFF]/10 text-[#3ABEFF]',
    amber: 'border-[#FFB020] shadow-[#FFB020]/10 text-[#FFB020]',
    red: 'border-[#FFB4AB] shadow-[#FFB4AB]/10 text-[#FFB4AB]',
  };

  const bgAccents = {
    cyan: 'bg-[#3ABEFF]/5',
    amber: 'bg-[#FFB020]/5',
    red: 'bg-[#FFB4AB]/5',
  };

  return (
    <Card className={`relative overflow-hidden border bg-surface-1/50 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${accents[accent]} border-opacity-30 hover:border-opacity-100`}>
      {/* Ghost Border / Glow Effect */}
      <div className={`absolute top-0 left-0 w-full h-[2px] ${accent === 'cyan' ? 'bg-[#3ABEFF]' : accent === 'amber' ? 'bg-[#FFB020]' : 'bg-[#FFB4AB]'} opacity-50`} />
      
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <h3 className="text-3xl font-bold tracking-tight">
              <span dir="ltr" className="tabular-nums">
                {value}
              </span>
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${bgAccents[accent]} ${accents[accent]} border border-opacity-20`}>
            <Icon className="w-6 h-6 stroke-[1.5]" />
          </div>
        </div>
      </div>

      {/* Background Decorative Element */}
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-[40px] opacity-20 ${bgAccents[accent]}`} />
    </Card>
  );
}
