import { FrozenItemsClient } from './FrozenItemsClient';

export const metadata = {
  title: 'Inventory Integrity & Frozen Items | Otantik مطاعم',
  description: 'Manage frozen inventory items and restore operational stock balance.',
};

export default function FrozenInventoryPage() {
  return <FrozenItemsClient />;
}
