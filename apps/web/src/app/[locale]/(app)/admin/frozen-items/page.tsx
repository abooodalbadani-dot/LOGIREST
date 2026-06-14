import { FrozenItemsClient } from './FrozenItemsClient';

export const metadata = {
  title: 'Frozen Inventory Items | Otantik مطاعم',
  description: 'View and unfreeze inventory items locked during discrepancy reconciliation.',
};

export default function FrozenItemsPage() {
  return <FrozenItemsClient />;
}
