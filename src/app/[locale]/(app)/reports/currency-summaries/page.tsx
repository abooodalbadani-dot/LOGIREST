import ProtectedRoute from '@/components/shared/ProtectedRoute';
import CurrencySummariesClient from './CurrencySummariesClient';

export async function generateMetadata() {
 return {
 title: 'Currency Summaries Report | LogiRest'
 };
}

export default function CurrencySummariesPage() {
 return (
 <ProtectedRoute requiredResource="reports" requiredAction="view">
 <CurrencySummariesClient />
 </ProtectedRoute>
 );
}
