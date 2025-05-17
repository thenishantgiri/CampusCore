import { PrismaClient, RoleType } from '../generated/prisma';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

// Full permissions schema
type PermMap = Record<string, Record<string, string>>;
const PERMISSIONS: PermMap = {
  USERS: {
    READ: 'users:read',
    CREATE: 'users:create',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
    ASSIGN_ROLE: 'users:assign-role',
  },
  ROLES: {
    READ: 'roles:read',
    CREATE: 'roles:create',
    UPDATE: 'roles:update',
    DELETE: 'roles:delete',
  },
  PERMISSIONS: {
    READ: 'permissions:read',
    CREATE: 'permissions:create',
    UPDATE: 'permissions:update',
    DELETE: 'permissions:delete',
  },
  STUDENTS: {
    READ: 'students:read',
    CREATE: 'students:create',
    UPDATE: 'students:update',
    DELETE: 'students:delete',
  },
  FEES: {
    READ: 'fees:read',
    CREATE: 'fees:create',
    UPDATE: 'fees:update',
    DELETE: 'fees:delete',
    PAY: 'fees:pay',
    REFUND: 'fees:refund',
    GENERATE_RECEIPT: 'fees:generate-receipt',
  },
  TEACHERS: {
    READ: 'teachers:read',
    CREATE: 'teachers:create',
    UPDATE: 'teachers:update',
    DELETE: 'teachers:delete',
  },
  BOOKS: { READ: 'books:read', WRITE: 'books:write' },
  INSTITUTIONS: { READ: 'institutions:read', UPDATE: 'institutions:update' },
  AUTH: { REGISTER_USER: 'auth:register-user' },
  SYSTEM: { VIEW_LOGS: 'system:view-logs', CONFIGURE: 'system:configure' },
  AUDIT: { VIEW: 'audit:view', EXPORT: 'audit:export' },
  COURSES: {
    READ: 'courses:read',
    CREATE: 'courses:create',
    UPDATE: 'courses:update',
    DELETE: 'courses:delete',
    ASSIGN_TEACHER: 'courses:assign-teacher',
    ASSIGN_STUDENT: 'courses:assign-student',
  },
};

// Flatten permissions into array of strings
const flatPerms: string[] = Object.values(PERMISSIONS).flatMap((group) =>
  Object.values(group),
);

// Static role definitions
const ROLES = [
  { id: 'role-super-admin', name: 'Super Admin', type: RoleType.STATIC },
  { id: 'role-admin', name: 'Admin', type: RoleType.STATIC },
  { id: 'role-teacher', name: 'Teacher', type: RoleType.STATIC },
  { id: 'role-student', name: 'Student', type: RoleType.STATIC },
  { id: 'role-parent', name: 'Parent', type: RoleType.STATIC },
  {
    id: 'role-finance-officer',
    name: 'Finance Officer',
    type: RoleType.STATIC,
  },
  { id: 'role-librarian', name: 'Librarian', type: RoleType.STATIC },
  {
    id: 'role-course-coordinator',
    name: 'Course Coordinator',
    type: RoleType.STATIC,
  },
  { id: 'role-registrar', name: 'Registrar', type: RoleType.STATIC },
  { id: 'role-guest', name: 'Guest', type: RoleType.STATIC },
];

async function main() {
  console.log('🗑  Clearing tables');
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Permission", "Role", "User" RESTART IDENTITY CASCADE',
  );

  console.log('🌱 Seeding roles');
  for (const role of ROLES) {
    await prisma.role.create({ data: role });
  }

  console.log('🌱 Seeding permissions');
  for (const key of flatPerms) {
    await prisma.permission.create({ data: { key, label: key } });
  }

  console.log('🔗 Linking permissions to roles');
  // Super Admin: all perms
  await prisma.role.update({
    where: { id: 'role-super-admin' },
    data: { permissions: { connect: flatPerms.map((key) => ({ key })) } },
  });

  // Admin: exclude system & audit
  const adminPerms = flatPerms.filter(
    (k) => !k.startsWith('system:') && !k.startsWith('audit:'),
  );
  await prisma.role.update({
    where: { id: 'role-admin' },
    data: { permissions: { connect: adminPerms.map((key) => ({ key })) } },
  });

  console.log('👤 Creating default users');
  const passwordHash = await hash('password123', 10);

  await prisma.user.create({
    data: {
      email: 'superadmin@erp.local',
      password: passwordHash,
      name: 'Super Admin',
      roleId: 'role-super-admin',
    },
  });

  await prisma.user.create({
    data: {
      email: 'admin@erp.local',
      password: passwordHash,
      name: 'Admin User',
      roleId: 'role-admin',
    },
  });

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
