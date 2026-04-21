"use client";

import { useIssue, usePostIssue } from "@/features/operations/api/useIssues";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusTimeline, TimelineStep } from "@/components/ui/status-timeline";
import { DocumentReadOnlyOverlay } from "@/components/ui/document-readonly-overlay";
import { PostConfirmDialog } from "@/components/ui/post-confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export function IssueDetailsClient({ id }: { id: string }) {
  const { data: issue, isLoading } = useIssue(id);
  const postIssue = usePostIssue();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-[300px]" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!issue) return <div>Issue not found</div>;

  const isPosted = issue.status === "POSTED";
  const hasCancelledStatus = issue.status === "CANCELLED";
  const isReadOnly = isPosted || hasCancelledStatus;

  const hasExpiredLots = issue.items.some((item) =>
    item.lots.some((l) => l.isExpired || new Date(l.expiryDate) < new Date())
  );

  const timelineSteps: TimelineStep[] = [
    {
      id: "draft",
      label: "مسودة",
      status: issue.status === "DRAFT" ? "current" : "completed",
    },
    {
      id: "posted",
      label: "مرحَّل للأستاذ",
      status: issue.status === "POSTED" ? "completed" : "pending",
    },
  ];

  const handlePost = () => {
    postIssue.mutate(id, {
      onSuccess: () => {
        setConfirmOpen(false);
        router.refresh();
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5 rtl:hidden" />
            <ArrowRight className="h-5 w-5 hidden rtl:block" />
          </Button>
          <Breadcrumb
            items={[
              { label: "العمليات", href: "/operations" },
              { label: "صرف المخزون", href: "/operations/issues" },
              { label: issue.issueNumber, href: "#" },
            ]}
          />
        </div>
        {!isReadOnly && (
          <Button
            className="bg-brand-primary hover:bg-brand-primary/90 text-white"
            onClick={() => setConfirmOpen(true)}
            disabled={postIssue.isPending}
          >
            {postIssue.isPending ? "جار الترحيل..." : "ترحيل للأستاذ"}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          {issue.issueNumber}
        </h2>
        <StatusBadge status={issue.status} />
      </div>

      {hasExpiredLots && (
        <div className="flex items-center gap-3 p-4 bg-neon-error/10 border border-neon-error/30 rounded-lg text-neon-error">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">
            يحتوي هذا الصرف على مواد منتهية الصلاحية تمت الموافقة على تجاوزها.
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-surface-1 border border-surface-2 p-6 rounded-lg shadow-sm">
        <StatusTimeline steps={timelineSteps} />
      </div>

      {/* Summary */}
      <Card>
        <CardHeader><CardTitle>تفاصيل الصرف</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-text-tertiary">المخزن</p>
            <p className="font-medium text-text-primary">{issue.warehouseId}</p>
          </div>
          <div>
            <p className="text-text-tertiary">القسم</p>
            <p className="font-medium text-text-primary">{issue.departmentId}</p>
          </div>
          <div>
            <p className="text-text-tertiary">طُلب بواسطة</p>
            <p className="font-medium text-text-primary">{issue.requestedBy}</p>
          </div>
          {isPosted && issue.postedAt && (
            <div>
              <p className="text-text-tertiary">تاريخ الترحيل</p>
              <p className="font-medium text-text-primary" dir="ltr">
                {new Date(issue.postedAt).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line items — wrapped in read-only overlay when posted */}
      <DocumentReadOnlyOverlay isLocked={isReadOnly} lockedMessage="هذا الصرف مرحَّل ولا يمكن تعديله.">
        <Card>
          <CardHeader><CardTitle>البنود الصادرة</CardTitle></CardHeader>
          <CardContent>
            <div className="border border-surface-2 rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-text-secondary">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">الصنف</th>
                    <th className="px-4 py-3 text-center font-medium">المطلوب</th>
                    <th className="px-4 py-3 text-center font-medium">المُخصَّص</th>
                    <th className="px-4 py-3 text-right font-medium">الدُّفعات (الرقم | الانتهاء | الكمية)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-2">
                  {issue.items.map((item) => (
                    <tr key={item.id} className="bg-surface-1 hover:bg-surface-2/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-text-primary">{item.itemId}</td>
                      <td className="px-4 py-3 text-center" dir="ltr">{item.requestedQuantity}</td>
                      <td className="px-4 py-3 text-center font-bold text-brand-primary" dir="ltr">{item.allocatedQuantity}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {item.lots.length === 0 ? (
                            <span className="text-text-tertiary text-xs">لم يتم التخصيص</span>
                          ) : (
                            item.lots.map((lot) => {
                              const expired = lot.isExpired || new Date(lot.expiryDate) < new Date();
                              return (
                                <span
                                  key={lot.lotNumber}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono ${
                                    expired ? "bg-neon-error/20 text-neon-error" : "bg-surface-2 text-text-secondary"
                                  }`}
                                  dir="ltr"
                                >
                                  {expired && <AlertTriangle className="w-3 h-3" />}
                                  {lot.lotNumber} | {lot.expiryDate} | ×{lot.allocatedQuantity}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </DocumentReadOnlyOverlay>

      <PostConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handlePost}
        title="ترحيل الصرف؟"
        description="سيتم تحديث أرصدة المخزون بصورة دائمة. هذا الإجراء لا يمكن التراجع عنه."
        confirmText="ترحيل"
      />
    </div>
  );
}
