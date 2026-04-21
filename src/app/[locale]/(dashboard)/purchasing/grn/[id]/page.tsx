import { GRNDetailsClient } from "./grn-details-client";

export const metadata = {
  title: "Goods Receipt Details | LogiRest",
  description: "View and manage Goods Receipt Notes.",
};

export default function GRNDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <GRNDetailsClient id={params.id} />
    </div>
  );
}
