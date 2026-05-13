import { TransferShipClient } from './TransferShipClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default async function TransferShipPage({ 
 params 
}: { 
 params: Promise<{ id: string; locale: 'ar' | 'en' }> 
}) {
 const resolvedParams = await params;
 return (
 <ProtectedRoute requiredResource="transfer" requiredAction="edit">
 <TransferShipClient id={resolvedParams.id} locale={resolvedParams.locale} />
 </ProtectedRoute>
 );
}
