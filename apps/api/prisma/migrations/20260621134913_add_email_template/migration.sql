-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subject_ar" TEXT,
    "subject_en" TEXT,
    "body_ar" TEXT,
    "body_en" TEXT,
    "trigger_event" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "allowed_parameters" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_code_key" ON "email_templates"("code");
