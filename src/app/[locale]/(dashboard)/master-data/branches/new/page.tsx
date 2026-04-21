import { BranchForm } from "@/features/branches/components/branch-form";

export const metadata = {
  title: "New Branch | LogiRest",
  description: "Create a new branch location.",
};

export default function NewBranchPage() {
  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Create New Branch
          </h2>
          <p className="text-muted-foreground mt-2">
            Configure a new operational location for your organization.
          </p>
        </div>
        <BranchForm />
      </div>
    </div>
  );
}
