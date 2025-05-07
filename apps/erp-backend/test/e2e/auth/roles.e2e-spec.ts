import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { Test } from '@nestjs/testing';

describe('Roles E2E (real DB)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let adminToken: string;
  let superToken: string;
  let createdRoleId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // clean up any roles we created
    if (createdRoleId) {
      await prisma.role.delete({ where: { id: createdRoleId } });
    }
    await app.close();
  });

  it('blocks non-admin from creating a role', async () => {
    // login as regular user
    const userRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'admintest' })
      .expect(201);
    userToken = userRes.body.accessToken;

    // attempt to create
    await request(app.getHttpServer())
      .post('/roles')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Test Role', permissions: [] })
      .expect(403);
  });

  it('allows admin to create, list and update roles', async () => {
    // login as admin
    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'admintest' })
      .expect(201);
    adminToken = adminRes.body.accessToken;

    // create new role
    const createRes = await request(app.getHttpServer())
      .post('/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'E2E Role', permissions: [] })
      .expect(201);
    createdRoleId = createRes.body.id;
    expect(createRes.body).toMatchObject({ name: 'E2E Role' });

    // list roles
    const listRes = await request(app.getHttpServer())
      .get('/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.find((r: any) => r.id === createdRoleId)).toBeDefined();

    // update the role
    const updateRes = await request(app.getHttpServer())
      .patch(`/roles/${createdRoleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'E2E Role Updated' })
      .expect(200);
    expect(updateRes.body).toMatchObject({
      id: createdRoleId,
      name: 'E2E Role Updated',
    });
  });

  it('allows super-admin to delete a role', async () => {
    // login as super-admin
    const superRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'super@test.com', password: 'admintest' })
      .expect(201);
    superToken = superRes.body.accessToken;

    // delete the role
    await request(app.getHttpServer())
      .delete(`/roles/${createdRoleId}`)
      .set('Authorization', `Bearer ${superToken}`)
      .expect(200);

    // flag so afterAll skip it
    createdRoleId = null!;
  });
});
