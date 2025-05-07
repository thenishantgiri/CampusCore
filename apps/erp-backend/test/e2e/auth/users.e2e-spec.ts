import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from 'src/auth/constants/roles.enum';
import { UpdateUserRoleDto } from 'src/users/dto/update-user-role.dto';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  // Test user IDs that will be set during test setup
  let adminUserId: string;
  let regularUserId: string;
  let superAdminUserId: string;

  // JWT tokens for authentication
  let adminToken: string;
  let regularToken: string;
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

    const regularLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'admintest' })
      .expect(201);

    const superLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'super@test.com', password: 'admintest' })
      .expect(201);

    adminToken = adminLoginRes.body.accessToken;
    regularToken = regularLoginRes.body.accessToken;
    superAdminToken = superLoginRes.body.accessToken;

    // Get user IDs from the database
    const adminUser = await prismaService.user.findUnique({
      where: { email: 'admin@test.com' },
    });

    const regularUser = await prismaService.user.findUnique({
      where: { email: 'user@test.com' },
    });

    const superAdminUser = await prismaService.user.findUnique({
      where: { email: 'super@test.com' },
    });

    if (!adminUser || !regularUser || !superAdminUser) {
      throw new Error('Test users not found in database');
    }

    adminUserId = adminUser.id;
    regularUserId = regularUser.id;
    superAdminUserId = superAdminUser.id;

    // Log token info for debugging
    console.log('Admin Token:', adminToken);
    console.log('Regular Token:', regularToken);
    console.log('Super Admin Token:', superAdminToken);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users', () => {
    it('should return a list of users when authenticated as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return a 403 error when authenticated as regular user', async () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should return a 401 error when not authenticated', async () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by ID when authenticated as admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', adminUserId);
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('name');
    });

    it('should return a 404 error for non-existent user', async () => {
      return request(app.getHttpServer())
        .get('/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('DELETE /users/:id', () => {
    let testUserId: string;

    beforeEach(async () => {
      // Create a test user to delete
      const testUser = await prismaService.user.create({
        data: {
          email: `test-delete-${Date.now()}@example.com`,
          name: 'Test Delete User',
          password: 'password-hash',
          roleId: 'role-user',
        },
      });
      testUserId = testUser.id;
    });

    it('should delete a user when authenticated as admin', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testUserId);

      // Verify user was actually deleted
      const deletedUser = await prismaService.user.findUnique({
        where: { id: testUserId },
      });
      expect(deletedUser).toBeNull();
    });

    it('should return a 403 error when trying to delete own account', async () => {
      return request(app.getHttpServer())
        .delete(`/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });
});
