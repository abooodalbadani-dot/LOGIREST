import { FrozenItemsClient } from './FrozenItemsClient';

export const metadata = {
  title: 'Frozen Inventory Items | LogiRest',
  description: 'View and unfreeze inventory items locked during discrepancy reconciliation.',
};

export default function FrozenItemsPage() {
  return <FrozenItemsClient />;
}
