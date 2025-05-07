// test/e2e/jest-e2e.setup.ts
import { execSync } from 'child_process';
import { PrismaClient } from '../../generated/prisma';
import * as bcrypt from 'bcrypt';

export default async function globalSetup() {
  // 1️⃣ Deploy migrations against the test database
  execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST },
    stdio: 'inherit',
  });

  // 2️⃣ Connect Prisma client
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_TEST } },
  });

  // 3️⃣ Hash test password
  const passwordHash = await bcrypt.hash('admintest', 10);

  // 4️⃣ Upsert all necessary permissions
  // Remove the duplicate 'users:create'
  const permKeys = [
    'users:create',
    'roles:create',
    'roles:read',
    'roles:update',
    'roles:delete',
    'permissions:create',
    'permissions:read',
    'permissions:delete',
    'users:read',
    'users:update',
    'users:delete',
    'users:assign-role',
  ] as const;

  // Create permissions one by one and store them in a map for later reference
  const permissionsMap = new Map();

  for (const key of permKeys) {
    const perm = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, label: key.replace(':', ' ').toUpperCase() },
    });
    permissionsMap.set(key, perm);
  }

  // 5️⃣ Upsert STATIC roles and attach perms
  const adminRole = await prisma.role.upsert({
    where: { id: 'role-admin' },
    update: {
      permissions: {
        connect: permKeys.map((key) => ({ id: permissionsMap.get(key).id })),
      },
    },
    create: {
      id: 'role-admin',
      name: 'Admin',
      type: 'STATIC',
      permissions: {
        connect: permKeys.map((key) => ({ id: permissionsMap.get(key).id })),
      },
    },
  });

  const userRole = await prisma.role.upsert({
    where: { id: 'role-user' },
    update: {},
    create: { id: 'role-user', name: 'User', type: 'STATIC' },
  });

  const superAdminRole = await prisma.role.upsert({
    where: { id: 'role-super-admin' },
    update: {
      permissions: {
        connect: permKeys.map((key) => ({ id: permissionsMap.get(key).id })),
      },
    },
    create: {
      id: 'role-super-admin',
      name: 'Super Admin',
      type: 'STATIC',
      permissions: {
        connect: permKeys.map((key) => ({ id: permissionsMap.get(key).id })),
      },
    },
  });

  // 6️⃣ Upsert users
  await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        name: 'Admin User',
        password: passwordHash,
        roleId: adminRole.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'user@test.com' },
      update: {},
      create: {
        email: 'user@test.com',
        name: 'Regular User',
        password: passwordHash,
        roleId: userRole.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'super@test.com' },
      update: {},
      create: {
        email: 'super@test.com',
        name: 'Super Admin',
        password: passwordHash,
        roleId: superAdminRole.id,
      },
    }),
  ]);

  await prisma.$disconnect();
}
