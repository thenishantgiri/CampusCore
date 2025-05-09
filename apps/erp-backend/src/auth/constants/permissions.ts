export const PERMISSIONS = {
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
  BOOKS: {
    READ: 'books:read',
    WRITE: 'books:write',
  },
  INSTITUTIONS: {
    READ: 'institutions:read',
    UPDATE: 'institutions:update',
  },
  AUTH: {
    REGISTER_USER: 'auth:register-user',
  },
  SYSTEM: {
    VIEW_LOGS: 'system:view-logs',
    CONFIGURE: 'system:configure',
  },
  AUDIT: {
    VIEW: 'audit:view',
    EXPORT: 'audit:export',
  },
  COURSES: {
    READ: 'courses:read',
    CREATE: 'courses:create',
    UPDATE: 'courses:update',
    DELETE: 'courses:delete',
    ASSIGN_TEACHER: 'courses:assign-teacher',
    ASSIGN_STUDENT: 'courses:assign-student',
  },
};
