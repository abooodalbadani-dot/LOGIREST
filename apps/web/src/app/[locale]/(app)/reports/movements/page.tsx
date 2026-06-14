import ProtectedRoute from '@/components/shared/ProtectedRoute';
import StockMovementsClient from './StockMovementsClient';

export async function generateMetadata() {
 return {
 title: 'Stock Movements Report | Otantik مطاعم'
 };
}

export default function StockMovementsPage() {
 return (
 <ProtectedRoute requiredResource="reports" requiredAction="view">
 <StockMovementsClient />
 </ProtectedRoute>
 );
}
