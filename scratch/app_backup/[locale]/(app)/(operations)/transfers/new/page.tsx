import { Metadata } from 'next';
import { TransferNewClient } from './TransferNewClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export const metadata: Metadata = {
 title: 'New Stock Transfer | LogiRest',
 description: 'Create a new warehouse-to-warehouse stock transfer voucher.',
};

export default async function NewTransferPage(props: { params: Promise<{ locale: string }> }) {
 await props.params;
 
 return (
 <ProtectedRoute requiredAction="create" requiredResource="transfer">
 <TransferNewClient />
 </ProtectedRoute>
 );
}
