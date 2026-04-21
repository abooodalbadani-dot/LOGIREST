import { IssueDetailsClient } from "./issue-details-client";

export const metadata = {
  title: "Issue Details | LogiRest",
};

export default function IssueDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <IssueDetailsClient id={params.id} />
    </div>
  );
}
