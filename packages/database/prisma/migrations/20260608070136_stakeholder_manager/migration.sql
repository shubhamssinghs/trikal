-- AlterTable
ALTER TABLE "stakeholders" ADD COLUMN     "managerId" TEXT;

-- AddForeignKey
ALTER TABLE "stakeholders" ADD CONSTRAINT "stakeholders_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "stakeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
