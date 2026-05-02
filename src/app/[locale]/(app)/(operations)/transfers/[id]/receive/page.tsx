import { TransferReceiveClient } from './TransferReceiveClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default async function TransferReceivePage({ 
 params 
}: { 
 params: Promise<{ id: string; locale: 'ar' | 'en' }> 
}) {
 const resolvedParams = await params;
 return (
 <ProtectedRoute requiredResource="transfer" requiredAction="edit">
 <TransferReceiveClient id={resolvedParams.id} locale={resolvedParams.locale} />
 </ProtectedRoute>
 );
}
