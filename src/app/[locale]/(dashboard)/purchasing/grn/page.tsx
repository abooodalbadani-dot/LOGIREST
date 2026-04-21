import { GoodsReceiptsClient } from "./grn-client";

export const metadata = {
  title: "Goods Receipt Notes | LogiRest",
  description: "Manage incoming goods receipts and stock posting.",
};

export default function GoodsReceiptsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <GoodsReceiptsClient />
    </div>
  );
}
