'use client';

import dynamic from 'next/dynamic';

const LandedCostWizard = dynamic(
  () => import('./components/landed-cost-wizard').then((m) => m.LandedCostWizard),
  { ssr: false },
);

export function LandedCostClient() {
  return <LandedCostWizard />;
}
