import { IssuesClient } from "./issues-client";

export const metadata = {
  title: "Issues | LogiRest",
  description: "View and manage stock issue transactions.",
};

export default function IssuesPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <IssuesClient />
    </div>
  );
}
