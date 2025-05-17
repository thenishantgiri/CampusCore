import { PrismaClient } from '../../generated/prisma';

export default async function globalTeardown() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_TEST } },
  });

  // Delete in the correct order to avoid constraint violations
  try {
    // First delete students (which reference users)
    await prisma.student.deleteMany();

    // Then delete users (which reference roles)
    await prisma.user.deleteMany();

    // Now roles can be deleted (which reference permissions through a join table)
    await prisma.role.deleteMany();

    // Finally delete permissions
    await prisma.permission.deleteMany();
  } catch (error) {
    console.error('Error during test teardown:', error);
  } finally {
    await prisma.$disconnect();
  }
}
