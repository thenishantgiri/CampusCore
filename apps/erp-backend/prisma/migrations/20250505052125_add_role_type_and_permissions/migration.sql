-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('STATIC', 'CUSTOM');

-- DropIndex
DROP INDEX "Role_name_key";

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "permissions" TEXT[],
ADD COLUMN     "type" "RoleType" NOT NULL DEFAULT 'CUSTOM';
