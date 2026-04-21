import { IssueScanClient } from "./issue-scan-client";

export const metadata = { title: "وضع المسح — الصرف | LogiRest" };

export default function IssueScanPage() {
  return (
    <div className="flex-1 p-4 md:p-8 pt-6">
      <IssueScanClient />
    </div>
  );
}
