-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "approval_events_documentId_documentType_idx" ON "approval_events"("documentId", "documentType");

-- CreateIndex
CREATE INDEX "audit_logs_targetTable_targetId_idx" ON "audit_logs"("targetTable", "targetId");
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt" DESC);
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "notification_logs_createdAt_idx" ON "notification_logs"("createdAt" DESC);
