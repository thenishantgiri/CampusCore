// test/e2e/student.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from 'src/auth/constants/roles.enum';
import { CreateStudentDto } from 'src/student/dto/create-student.dto';
import { UpdateStudentDto } from 'src/student/dto/update-student.dto';
import { PERMISSIONS } from 'src/auth/constants/permissions';

describe('StudentController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  // Test user IDs that will be set during test setup
  let adminUserId: string;
  let studentUserId: string;
  let teacherUserId: string;
  let superAdminUserId: string;

  // Student IDs for testing
  let studentId: string;
  let otherStudentId: string;

  // JWT tokens for authentication
  let adminToken: string;
  let studentToken: string;
  let teacherToken: string;
  let superAdminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same global pipes as in the main app
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    // Get service instances
    jwtService = moduleFixture.get<JwtService>(JwtService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // First log in to get valid tokens
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'admintest' })
      .expect(201);

    const superLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'super@test.com', password: 'admintest' })
      .expect(201);

    adminToken = adminLoginRes.body.accessToken;
    superAdminToken = superLoginRes.body.accessToken;

    // Get user IDs from the database
    const adminUser = await prismaService.user.findUnique({
      where: { email: 'admin@test.com' },
    });

    const superAdminUser = await prismaService.user.findUnique({
      where: { email: 'super@test.com' },
    });

    if (!adminUser || !superAdminUser) {
      throw new Error('Test users not found in database');
    }

    adminUserId = adminUser.id;
    superAdminUserId = superAdminUser.id;

    // Create teacher role with student:read permission
    const teacherRole = await prismaService.role.upsert({
      where: { id: 'role-teacher' },
      update: {},
      create: {
        id: 'role-teacher',
        name: 'Teacher',
        type: 'STATIC',
      },
    });

    // Create student role with limited permissions
    const studentRole = await prismaService.role.upsert({
      where: { id: 'role-student' },
      update: {},
      create: {
        id: 'role-student',
        name: 'Student',
        type: 'STATIC',
      },
    });

    // Create student permission
    const studentCreatePerm = await prismaService.permission.upsert({
      where: { key: PERMISSIONS.STUDENTS.CREATE },
      update: {},
      create: { key: PERMISSIONS.STUDENTS.CREATE, label: 'Create Students' },
    });

    const studentReadPerm = await prismaService.permission.upsert({
      where: { key: PERMISSIONS.STUDENTS.READ },
      update: {},
      create: { key: PERMISSIONS.STUDENTS.READ, label: 'Read Students' },
    });

    const studentUpdatePerm = await prismaService.permission.upsert({
      where: { key: PERMISSIONS.STUDENTS.UPDATE },
      update: {},
      create: { key: PERMISSIONS.STUDENTS.UPDATE, label: 'Update Students' },
    });

    const studentDeletePerm = await prismaService.permission.upsert({
      where: { key: PERMISSIONS.STUDENTS.DELETE },
      update: {},
      create: { key: PERMISSIONS.STUDENTS.DELETE, label: 'Delete Students' },
    });

    // Connect permissions to roles
    await prismaService.role.update({
      where: { id: 'role-teacher' },
      data: {
        permissions: {
          connect: [{ id: studentReadPerm.id }],
        },
      },
    });

    await prismaService.role.update({
      where: { id: 'role-student' },
      data: {
        permissions: {
          connect: [{ id: studentReadPerm.id }],
        },
      },
    });

    await prismaService.role.update({
      where: { id: 'role-admin' },
      data: {
        permissions: {
          connect: [
            { id: studentCreatePerm.id },
            { id: studentReadPerm.id },
            { id: studentUpdatePerm.id },
            { id: studentDeletePerm.id },
          ],
        },
      },
    });

    await prismaService.role.update({
      where: { id: 'role-super-admin' },
      data: {
        permissions: {
          connect: [
            { id: studentCreatePerm.id },
            { id: studentReadPerm.id },
            { id: studentUpdatePerm.id },
            { id: studentDeletePerm.id },
          ],
        },
      },
    });

    // Create teacher and student users
    const passwordHash = await prismaService.user
      .findFirst()
      .then((user) => user?.password);

    const teacherUser = await prismaService.user.upsert({
      where: { email: 'teacher@test.com' },
      update: {},
      create: {
        email: 'teacher@test.com',
        name: 'Teacher User',
        password: passwordHash!,
        roleId: teacherRole.id,
      },
    });

    const studentUser = await prismaService.user.upsert({
      where: { email: 'student@test.com' },
      update: {},
      create: {
        email: 'student@test.com',
        name: 'Student User',
        password: passwordHash!,
        roleId: studentRole.id,
      },
    });

    const otherStudentUser = await prismaService.user.upsert({
      where: { email: 'otherstudent@test.com' },
      update: {},
      create: {
        email: 'otherstudent@test.com',
        name: 'Other Student User',
        password: passwordHash!,
        roleId: studentRole.id,
      },
    });

    teacherUserId = teacherUser.id;
    studentUserId = studentUser.id;

    // Login as teacher and student
    const teacherLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'teacher@test.com', password: 'admintest' })
      .expect(201);

    const studentLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'student@test.com', password: 'admintest' })
      .expect(201);

    teacherToken = teacherLoginRes.body.accessToken;
    studentToken = studentLoginRes.body.accessToken;

    // Create a student profile for the student user
    const studentProfile = await prismaService.student.upsert({
      where: { userId: studentUser.id },
      update: {},
      create: {
        firstName: 'Student',
        lastName: 'Test',
        dateOfBirth: new Date('2005-01-01'),
        emergencyContacts: [
          { name: 'Parent Test', relation: 'Parent', phone: '123456789' },
        ],
        userId: studentUser.id,
      },
    });

    const otherStudentProfile = await prismaService.student.upsert({
      where: { userId: otherStudentUser.id },
      update: {},
      create: {
        firstName: 'Other',
        lastName: 'Student',
        dateOfBirth: new Date('2006-01-01'),
        emergencyContacts: [
          { name: 'Other Parent', relation: 'Parent', phone: '987654321' },
        ],
        userId: otherStudentUser.id,
      },
    });

    studentId = studentProfile.id;
    otherStudentId = otherStudentProfile.id;

    // Log token info for debugging
    console.log('Admin Token:', adminToken);
    console.log('Teacher Token:', teacherToken);
    console.log('Student Token:', studentToken);
    console.log('Super Admin Token:', superAdminToken);
  });

  afterAll(async () => {
    // Clean up students first (to avoid foreign key constraints)
    await prismaService.student.deleteMany({
      where: {
        userId: {
          in: [studentUserId],
        },
      },
    });

    await app.close();
  });

  describe('POST /students', () => {
    it('should create a student when authenticated as admin', async () => {
      // Create a test user to associate with the student
      const testUser = await prismaService.user.create({
        data: {
          email: `test-student-${Date.now()}@example.com`,
          name: 'Test Student User',
          password: 'password-hash',
          roleId: 'role-student',
        },
      });

      const createStudentDto: CreateStudentDto = {
        firstName: 'New',
        lastName: 'Student',
        dateOfBirth: '2007-05-15',
        photoUrl: 'https://example.com/photo.jpg',
        userId: testUser.id,
        emergencyContacts: [
          { name: 'Test Parent', relation: 'Parent', phone: '1234567890' },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createStudentDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('firstName', 'New');
      expect(response.body).toHaveProperty('lastName', 'Student');
      expect(response.body).toHaveProperty('userId', testUser.id);

      // Clean up
      await prismaService.student.delete({
        where: { id: response.body.id },
      });
      await prismaService.user.delete({
        where: { id: testUser.id },
      });
    });

    it('should return an error when trying to create a student for a user who already has a profile', async () => {
      const createStudentDto: CreateStudentDto = {
        firstName: 'Duplicate',
        lastName: 'Student',
        dateOfBirth: '2007-05-15',
        userId: studentUserId, // This user already has a student profile
        emergencyContacts: [
          { name: 'Test Parent', relation: 'Parent', phone: '1234567890' },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createStudentDto)
        .expect((res) => {
          console.log('Response status:', res.status);
          console.log('Response body:', JSON.stringify(res.body, null, 2));
          return true; // Continue with the test
        });

      // Expect either a 400 or 500 status code
      expect([400, 500]).toContain(response.status);

      // If the response is JSON, check for an error message
      if (response.body && typeof response.body === 'object') {
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should return a 403 error when authenticated as teacher', async () => {
      const createStudentDto: CreateStudentDto = {
        firstName: 'Not',
        lastName: 'Allowed',
        dateOfBirth: '2007-05-15',
        userId: 'some-uuid',
        emergencyContacts: [
          { name: 'Test Parent', relation: 'Parent', phone: '1234567890' },
        ],
      };

      return request(app.getHttpServer())
        .post('/students')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(createStudentDto)
        .expect(403);
    });

    it('should return a 401 error when not authenticated', async () => {
      const createStudentDto: CreateStudentDto = {
        firstName: 'Not',
        lastName: 'Authenticated',
        dateOfBirth: '2007-05-15',
        userId: 'some-uuid',
        emergencyContacts: [
          { name: 'Test Parent', relation: 'Parent', phone: '1234567890' },
        ],
      };

      return request(app.getHttpServer())
        .post('/students')
        .send(createStudentDto)
        .expect(401);
    });
  });

  describe('GET /students', () => {
    it('should return a list of students when authenticated as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return a list of students when authenticated as teacher', async () => {
      const response = await request(app.getHttpServer())
        .get('/students')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should apply search filter correctly', async () => {
      const searchTerm = 'Student'; // This should match our test student's last name
      const response = await request(app.getHttpServer())
        .get(`/students?search=${searchTerm}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(
        response.body.data.some(
          (student: any) =>
            student.firstName.includes(searchTerm) ||
            student.lastName.includes(searchTerm),
        ),
      ).toBe(true);
    });

    it('should apply userId filter correctly', async () => {
      const response = await request(app.getHttpServer())
        .get(`/students?userId=${studentUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].userId).toBe(studentUserId);
    });

    it('should apply pagination correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/students?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(1);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(1);
    });

    it('should return a 403 error when authenticated as student', async () => {
      return request(app.getHttpServer())
        .get('/students')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should return a 401 error when not authenticated', async () => {
      return request(app.getHttpServer()).get('/students').expect(401);
    });
  });

  describe('GET /students/:id', () => {
    it('should return a student by ID when authenticated as admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/students/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', studentId);
      expect(response.body).toHaveProperty('firstName');
      expect(response.body).toHaveProperty('lastName');
      expect(response.body).toHaveProperty('userId', studentUserId);
    });

    it('should return a student by ID when authenticated as teacher', async () => {
      const response = await request(app.getHttpServer())
        .get(`/students/${studentId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', studentId);
    });

    it('should return own student profile when authenticated as student', async () => {
      const response = await request(app.getHttpServer())
        .get(`/students/${studentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', studentId);
      expect(response.body).toHaveProperty('userId', studentUserId);
    });

    it('should return a 403 error when student tries to access another student profile', async () => {
      return request(app.getHttpServer())
        .get(`/students/${otherStudentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should return a 404 error for non-existent student', async () => {
      return request(app.getHttpServer())
        .get('/students/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return a 401 error when not authenticated', async () => {
      return request(app.getHttpServer())
        .get(`/students/${studentId}`)
        .expect(401);
    });
  });

  describe('PATCH /students/:id', () => {
    it('should update a student when authenticated as admin', async () => {
      const updateStudentDto: UpdateStudentDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const response = await request(app.getHttpServer())
        .patch(`/students/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateStudentDto)
        .expect(200);

      expect(response.body).toHaveProperty('id', studentId);
      expect(response.body).toHaveProperty('firstName', 'Updated');
      expect(response.body).toHaveProperty('lastName', 'Name');
    });

    it('should update emergency contacts correctly', async () => {
      const updateStudentDto: UpdateStudentDto = {
        emergencyContacts: [
          { name: 'Updated Parent', relation: 'Parent', phone: '9876543210' },
          {
            name: 'Another Contact',
            relation: 'Guardian',
            phone: '5555555555',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .patch(`/students/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateStudentDto)
        .expect(200);

      expect(response.body).toHaveProperty('emergencyContacts');
      expect(response.body.emergencyContacts).toHaveLength(2);
      expect(response.body.emergencyContacts[0].name).toBe('Updated Parent');
    });

    it('should return a 403 error when authenticated as teacher', async () => {
      const updateStudentDto: UpdateStudentDto = {
        firstName: 'Not',
        lastName: 'Allowed',
      };

      return request(app.getHttpServer())
        .patch(`/students/${studentId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateStudentDto)
        .expect(403);
    });

    it('should return a 403 error when authenticated as student', async () => {
      const updateStudentDto: UpdateStudentDto = {
        firstName: 'Not',
        lastName: 'Allowed',
      };

      return request(app.getHttpServer())
        .patch(`/students/${studentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateStudentDto)
        .expect(403);
    });

    it('should return a 404 error for non-existent student', async () => {
      const updateStudentDto: UpdateStudentDto = {
        firstName: 'Not',
        lastName: 'Found',
      };

      return request(app.getHttpServer())
        .patch('/students/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateStudentDto)
        .expect(404);
    });

    it('should return a 401 error when not authenticated', async () => {
      const updateStudentDto: UpdateStudentDto = {
        firstName: 'Not',
        lastName: 'Authenticated',
      };

      return request(app.getHttpServer())
        .patch(`/students/${studentId}`)
        .send(updateStudentDto)
        .expect(401);
    });
  });

  describe('DELETE /students/:id', () => {
    it('should return a 404 error for non-existent student', async () => {
      return request(app.getHttpServer())
        .delete('/students/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return a 403 error when authenticated as teacher', async () => {
      return request(app.getHttpServer())
        .delete(`/students/${studentId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403);
    });

    it('should return a 403 error when authenticated as student', async () => {
      return request(app.getHttpServer())
        .delete(`/students/${studentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should return a 401 error when not authenticated', async () => {
      return request(app.getHttpServer())
        .delete(`/students/${studentId}`)
        .expect(401);
    });

    // This test should be last as it deletes the student
    it('should delete a student when authenticated as admin', async () => {
      // Create a new student to delete
      const testUser = await prismaService.user.create({
        data: {
          email: `test-delete-${Date.now()}@example.com`,
          name: 'Test Delete Student',
          password: 'password-hash',
          roleId: 'role-student',
        },
      });

      const createRes = await request(app.getHttpServer())
        .post('/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Delete',
          lastName: 'Me',
          dateOfBirth: '2007-05-15',
          userId: testUser.id,
          emergencyContacts: [
            { name: 'Delete Parent', relation: 'Parent', phone: '1234567890' },
          ],
        })
        .expect(201);

      const deleteStudentId = createRes.body.id;

      // Now delete the student
      const response = await request(app.getHttpServer())
        .delete(`/students/${deleteStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', deleteStudentId);

      // Verify student was actually deleted
      const deletedStudent = await prismaService.student.findUnique({
        where: { id: deleteStudentId },
      });
      expect(deletedStudent).toBeNull();

      // Clean up user
      await prismaService.user.delete({
        where: { id: testUser.id },
      });
    });
  });
});
