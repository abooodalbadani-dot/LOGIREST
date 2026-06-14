import ProtectedRoute from '@/components/shared/ProtectedRoute';
import StocktakeVarianceClient from './StocktakeVarianceClient';

export async function generateMetadata() {
 return {
 title: 'Stocktake Variance Report | Otantik مطاعم'
 };
}

export default function StocktakeVariancePage() {
 return (
 <ProtectedRoute requiredResource="reports" requiredAction="view">
 <StocktakeVarianceClient />
 </ProtectedRoute>
 );
}
