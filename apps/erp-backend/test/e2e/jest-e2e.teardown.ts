import { PrismaClient } from '../../generated/prisma';

export default async function globalTeardown() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_TEST } },
  });

  // Delete all records (this will cascade through implicit join tables)
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();

  await prisma.$disconnect();
}
