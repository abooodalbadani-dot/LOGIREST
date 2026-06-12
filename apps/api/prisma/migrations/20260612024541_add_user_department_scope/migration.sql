-- CreateTable
CREATE TABLE "user_department_scopes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "user_department_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_department_scopes_user_id_department_id_key" ON "user_department_scopes"("user_id", "department_id");

-- AddForeignKey
ALTER TABLE "user_department_scopes" ADD CONSTRAINT "user_department_scopes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_department_scopes" ADD CONSTRAINT "user_department_scopes_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
