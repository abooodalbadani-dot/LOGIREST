import { IssueForm } from "./issue-form";

export const metadata = { title: "صرف جديد | LogiRest" };

export default function CreateIssuePage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <IssueForm />
    </div>
  );
}
