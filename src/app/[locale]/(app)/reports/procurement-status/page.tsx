import ProtectedRoute from '@/components/shared/ProtectedRoute';
import ProcurementStatusClient from './ProcurementStatusClient';

export async function generateMetadata() {
 return {
 title: 'Procurement Status Report | LogiRest'
 };
}

export default function ProcurementStatusPage() {
 return (
 <ProtectedRoute requiredResource="reports" requiredAction="view">
 <ProcurementStatusClient />
 </ProtectedRoute>
 );
}
