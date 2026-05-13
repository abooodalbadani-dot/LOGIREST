import ProtectedRoute from '@/components/shared/ProtectedRoute';
import ExpiryReportClient from './ExpiryReportClient';

export async function generateMetadata() {
 return {
 title: 'Expiry Report | LogiRest'
 };
}

export default function ExpiryReportPage() {
 return (
 <ProtectedRoute requiredResource="reports" requiredAction="view">
 <ExpiryReportClient />
 </ProtectedRoute>
 );
}
