import ProtectedRoute from '@/components/shared/ProtectedRoute';
import AvailableInventoryClient from './AvailableInventoryClient';

export async function generateMetadata() {
 return {
 title: 'Available Inventory Report | LogiRest'
 };
}

export default function AvailableInventoryPage() {
 return (
 <ProtectedRoute requiredResource="reports" requiredAction="view">
 <AvailableInventoryClient />
 </ProtectedRoute>
 );
}
