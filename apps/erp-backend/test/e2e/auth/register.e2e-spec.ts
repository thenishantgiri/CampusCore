import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from '../../../src/auth/auth.module';

describe('Registration E2E (real DB)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks non-admin from registering', async () => {
    // log in as regular user
    const loginUser = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'admintest' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .set('Authorization', `Bearer ${loginUser.body.accessToken}`)
      .send({
        email: 'new@user.com',
        password: 'newpass123',
        name: 'Newbie',
        roleId: 'role-user',
      })
      .expect(403);
  });

  it('allows admin to register', async () => {
    // log in as admin
    const loginAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'admintest' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .set('Authorization', `Bearer ${loginAdmin.body.accessToken}`)
      .send({
        email: 'new@user.com',
        password: 'newpass123',
        name: 'Newbie',
        roleId: 'role-user',
      })
      .expect(201);

    expect(res.body).toMatchObject({ email: 'new@user.com', name: 'Newbie' });
  });
});
