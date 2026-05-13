import { IssueScanClient } from "./issue-scan-client";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

export const metadata = { title: "وضع المسح — الصرف | LogiRest" };

export default function IssueScanPage() {
 return (
 <ProtectedRoute requiredResource="issue" requiredAction="create">
 <div className="flex-1 p-4 md:p-8 pt-6">
 <IssueScanClient />
 </div>
 </ProtectedRoute>
 );
}
