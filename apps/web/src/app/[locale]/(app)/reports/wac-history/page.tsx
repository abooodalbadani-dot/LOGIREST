import ProtectedRoute from '@/components/shared/ProtectedRoute';
import WacHistoryReportClient from '@/features/reports/components/WacHistoryReport';

export async function generateMetadata() {
  return {
    title: 'WAC History Report | LogiRest',
  };
}

export default function WacHistoryPage() {
  return (
    <ProtectedRoute requiredResource="reports" requiredAction="view">
      <WacHistoryReportClient />
    </ProtectedRoute>
  );
}
