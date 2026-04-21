import { GRNPostClient } from "./grn-post-client";

export const metadata = {
  title: "Post Goods Receipt | LogiRest",
  description: "Post Goods Receipt Note to ledger.",
};

export default function GRNPostPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <GRNPostClient id={params.id} />
    </div>
  );
}
