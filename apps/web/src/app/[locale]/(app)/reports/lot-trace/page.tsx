import ProtectedRoute from '@/components/shared/ProtectedRoute';
import LotTraceReportClient from '@/features/reports/components/LotTraceReport';

export async function generateMetadata() {
 return {
  title: 'Lot Trace Report | Otantik مطاعم',
 };
}

export default function LotTracePage() {
 return (
  <ProtectedRoute requiredResource="reports" requiredAction="view">
   <LotTraceReportClient />
  </ProtectedRoute>
 );
}
