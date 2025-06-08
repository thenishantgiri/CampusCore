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
    'TRUNCATE "Student", "Teacher", "AcademicYear", "Institution", "Section", "Class", "Permission", "Role", "User" RESTART IDENTITY CASCADE',
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

  console.log('🏫 Creating default institution');
  const institution = await prisma.institution.create({
    data: {
      name: 'Default Institution',
      type: 'School',
      address: '123 Main St',
    },
  });

  console.log('📅 Creating academic year');
  const academicYear = await prisma.academicYear.create({
    data: {
      label: '2024-25',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2025-03-31'),
    },
  });

  console.log('🏫 Creating class');
  const classObj = await prisma.class.create({
    data: {
      name: 'Grade 6',
      displayName: '6th Grade',
      institutionId: institution.id,
      academicYearId: academicYear.id,
    },
  });

  console.log('📘 Creating section');
  const section = await prisma.section.create({
    data: {
      name: 'A',
      classId: classObj.id,
    },
  });

  // Insert teacher and student users and link them to the section
  console.log('👩‍🏫 Creating teacher user');
  const teacherUser = await prisma.user.create({
    data: {
      email: 'teacher1@erp.local',
      password: passwordHash,
      name: 'John Teacher',
      roleId: 'role-teacher',
    },
  });

  console.log('👨‍🏫 Creating teacher profile');
  await prisma.teacher.create({
    data: {
      userId: teacherUser.id,
      institutionId: institution.id,
      academicYearId: academicYear.id,
      employeeCode: 'TCH001',
      designation: 'Math Teacher',
      departments: ['Mathematics'],
      subjects: ['Algebra', 'Geometry'],
    },
  });

  console.log('👩‍🎓 Creating student user');
  const studentUser = await prisma.user.create({
    data: {
      email: 'student1@erp.local',
      password: passwordHash,
      name: 'Alice Student',
      roleId: 'role-student',
    },
  });

  console.log('👩‍🎓 Creating student profile');
  await prisma.student.create({
    data: {
      userId: studentUser.id,
      firstName: 'Alice',
      lastName: 'Smith',
      dateOfBirth: new Date('2008-04-12'),
      photoUrl: null,
      emergencyContacts: {
        createMany: {
          data: [
            {
              name: 'Bob Smith',
              relation: 'Father',
              phone: '+1234567890',
            },
          ],
        },
      },
      sectionId: section.id,
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
