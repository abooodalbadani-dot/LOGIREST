-- AlterTable
ALTER TABLE "users" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'ar',
ADD COLUMN     "notification_preferences" JSONB,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "theme_preferences" TEXT NOT NULL DEFAULT 'light';
