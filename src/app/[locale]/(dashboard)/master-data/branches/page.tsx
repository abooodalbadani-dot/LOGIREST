import { useTranslations } from "next-intl";
import { BranchesClient } from "./branches-client";

export const metadata = {
  title: "Branches | LogiRest",
  description: "Manage operating branches and locations.",
};

export default function BranchesPage() {
  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <BranchesClient />
      </div>
    </div>
  );
}
