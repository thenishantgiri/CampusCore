import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';

describe('Permissions E2E (real DB)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let adminToken: string;
  let superToken: string;
  let createdPermId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // clean up: delete created permission if not already deleted
    if (createdPermId) {
      await prisma.permission
        .delete({ where: { id: createdPermId } })
        .catch(() => {});
    }
    await app.close();
  });

  it('blocks non-admin from creating a permission', async () => {
    // login as regular user
    const userRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'admintest' })
      .expect(201);
    userToken = userRes.body.accessToken;

    // attempt to create
    await request(app.getHttpServer())
      .post('/permissions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ key: 'foo:bar', label: 'Foo Bar' })
      .expect(403);
  });

  it('allows admin to create and list permissions, but not delete', async () => {
    // login as admin
    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'admintest' })
      .expect(201);
    adminToken = adminRes.body.accessToken;

    // create new permission
    const createRes = await request(app.getHttpServer())
      .post('/permissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ key: 'e2e:test', label: 'E2E Test' })
      .expect(201);
    createdPermId = createRes.body.id;
    expect(createRes.body).toMatchObject({
      key: 'e2e:test',
      label: 'E2E Test',
    });

    // list permissions
    const listRes = await request(app.getHttpServer())
      .get('/permissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.find((p: any) => p.id === createdPermId)).toBeDefined();

    // admin should not be allowed to delete
    await request(app.getHttpServer())
      .delete(`/permissions/${createdPermId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
  });

  it('allows super-admin to delete a permission', async () => {
    // login as super-admin
    const superRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'super@test.com', password: 'admintest' })
      .expect(201);
    superToken = superRes.body.accessToken;

    // delete the permission
    await request(app.getHttpServer())
      .delete(`/permissions/${createdPermId}`)
      .set('Authorization', `Bearer ${superToken}`)
      .expect(200);

    // flag so afterAll doesn't try again
    createdPermId = null!;
  });
});
