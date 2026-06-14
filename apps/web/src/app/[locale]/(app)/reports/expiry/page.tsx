import ProtectedRoute from '@/components/shared/ProtectedRoute';
import ExpiryReportClient from './ExpiryReportClient';

export async function generateMetadata() {
 return {
 title: 'Expiry Report | Otantik مطاعم'
 };
}

export default function ExpiryReportPage() {
 return (
 <ProtectedRoute requiredResource="reports" requiredAction="view">
 <ExpiryReportClient />
 </ProtectedRoute>
 );
}
