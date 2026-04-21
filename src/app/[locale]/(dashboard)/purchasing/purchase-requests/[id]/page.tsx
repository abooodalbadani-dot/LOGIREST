import { PRDetailsClient } from "./pr-details-client";

export default function PurchaseRequestDetailsPage({ params }: { params: { id: string } }) {
  return <PRDetailsClient id={params.id} />;
}
