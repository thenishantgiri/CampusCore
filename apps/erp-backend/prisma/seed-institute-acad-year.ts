import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const institution = await prisma.institution.create({
    data: {
      name: 'Sunrise Public School',
      type: 'School',
      address: 'Main Road, Jaipur',
    },
  });

  const academicYear = await prisma.academicYear.create({
    data: {
      label: '2025-2026',
      startDate: new Date('2025-04-01'),
      endDate: new Date('2026-03-31'),
    },
  });

  console.log('✅ Inserted:');
  console.log('Institution:', institution);
  console.log('Academic Year:', academicYear);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
