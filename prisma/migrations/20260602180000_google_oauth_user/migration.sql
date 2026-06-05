-- DropTable
DROP TABLE IF EXISTS "OtpCode";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;

ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "image" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
