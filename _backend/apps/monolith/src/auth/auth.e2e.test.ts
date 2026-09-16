/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../app.module';
import { UserResponseDto } from '../user/dto/user.dtos';
import { RegisterResponseDto, VerifyEmailResponseDto } from './dto/auth.dtos';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './token.service';
import setCookie from 'set-cookie-parser';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;
  const testexample = 'example@example.com';
  let access_token: string | undefined;
  let refresh_token: string | undefined;
  // The link the mailer would carry, minted the same way once the row exists.
  let verificationToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    tokenService = moduleFixture.get<TokenService>(TokenService);
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should ok /auth/test (GET)', () => {
    return request(app.getHttpServer()).get('/api/auth/test').expect(200).expect({ message: 'Refresh token done' });
  });

  // Registration ends on "check your inbox" (ADR 0031): the address comes back, no
  // profile and no cookies.
  it('should ok /auth/register (POST)', async () => {
    // ACT
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Jarda', email: testexample, password: 'abcd1234' })
      .expect(201);

    // ASSERT
    const body: RegisterResponseDto = res.body;
    expect(body).toEqual({ email: testexample });
    expect(res.header['set-cookie']).toBeUndefined();
  });

  // An Unverified Account is a placeholder: registering again replaces it, same answer.
  it('should ok /auth/register again over the Unverified Account (POST)', async () => {
    // ACT
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Jarda', email: testexample, password: 'abcd1234' })
      .expect(201);
  });

  // The right password on an Unverified Account is refused at the door, and told why.
  it('should nok /auth/login before verification (POST)', async () => {
    // ACT
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testexample, password: 'abcd1234' })
      .expect(403);

    // ASSERT
    expect(res.body.message).toBe('EMAIL_NOT_VERIFIED');
    expect(res.header['set-cookie']).toBeUndefined();
  });

  // "Send it again" on an Unverified Account: a fresh email goes out, nothing comes back.
  it('should ok /auth/verification/resend for the Unverified Account (POST)', async () => {
    // ACT
    const res = await request(app.getHttpServer())
      .post('/api/auth/verification/resend')
      .send({ email: testexample })
      .expect(204);

    // ASSERT
    expect(res.body).toEqual({});
    expect(res.header['set-cookie']).toBeUndefined();
  });

  // The same answer for an address nobody registered, so the endpoint enumerates nothing.
  it('should ok /auth/verification/resend for an unknown address (POST)', async () => {
    // ACT
    await request(app.getHttpServer())
      .post('/api/auth/verification/resend')
      .send({ email: 'nobody@example.com' })
      .expect(204);
  });

  // A link that is not one - garbage, another secret, an access token - is the one code.
  it('should nok /auth/verification/verify with a token that is not a verification token (POST)', async () => {
    // ACT
    const res = await request(app.getHttpServer())
      .post('/api/auth/verification/verify')
      .send({ token: 'not-a-token' })
      .expect(400);

    // ASSERT
    expect(res.body.message).toBe('VERIFICATION_TOKEN_INVALID');
  });

  // The link verifies: minted through TokenService as the mailer's would be, it flips the
  // row and answers with the address. No cookies - the token proves an address, not a
  // password.
  it('should ok /auth/verification/verify (POST)', async () => {
    // ARRANGE
    const placeholder = await prisma.users.findUniqueOrThrow({ where: { email: testexample } });
    expect(placeholder.email_verified_at).toBeNull();
    verificationToken = tokenService.mintVerificationToken(placeholder);

    // ACT
    const res = await request(app.getHttpServer())
      .post('/api/auth/verification/verify')
      .send({ token: verificationToken })
      .expect(200);

    // ASSERT
    const body: VerifyEmailResponseDto = res.body;
    expect(body).toEqual({ email: testexample });
    expect(res.header['set-cookie']).toBeUndefined();
    const verified = await prisma.users.findUniqueOrThrow({ where: { email: testexample } });
    expect(verified.email_verified_at).not.toBeNull();
  });

  // A link tapped twice reads as success both times, and the row keeps its first stamp.
  it('should ok /auth/verification/verify again with the same link (POST)', async () => {
    // ARRANGE
    const before = await prisma.users.findUniqueOrThrow({ where: { email: testexample } });

    // ACT
    const res = await request(app.getHttpServer())
      .post('/api/auth/verification/verify')
      .send({ token: verificationToken })
      .expect(200);

    // ASSERT
    expect(res.body).toEqual({ email: testexample });
    const after = await prisma.users.findUniqueOrThrow({ where: { email: testexample } });
    expect(after.email_verified_at).toEqual(before.email_verified_at);
  });

  // The same answer once the address is verified: nothing to send, nothing to tell.
  it('should ok /auth/verification/resend for the Verified Email (POST)', async () => {
    // ACT
    await request(app.getHttpServer()).post('/api/auth/verification/resend').send({ email: testexample }).expect(204);
  });

  // Only a Verified Email takes the address, and the 409 is the answer.
  it('should nok /auth/register over a Verified Email (POST)', async () => {
    // ACT
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Jarda', email: testexample, password: 'abcd1234' })
      .expect(409);
  });

  it('should ok /auth/login (POST)', async () => {
    // ACT
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testexample, password: 'abcd1234' })
      .expect(200);

    const setCookieArray = setCookie.parse(res.header['set-cookie']);
    refresh_token = setCookieArray.find((item) => item.name === 'refresh_token')?.value;
    access_token = setCookieArray.find((item) => item.name === 'access_token')?.value;

    // ASSERT
    const user: UserResponseDto = res.body;
    expect(user.name).toBe('Jarda');
    expect(user.email).toBe(testexample);
    expect(user.id).toBeGreaterThan(0);
    expect(access_token).toBeDefined();
    expect(refresh_token).toBeDefined();
  });

  it('should ok /users/:id (GET)', async () => {
    // ACT
    const res = await request(app.getHttpServer())
      .get('/api/users/2')
      .set('Authorization', `Bearer ${access_token}`)
      .set('Cookie', [`refresh_token=${refresh_token}`])
      .expect(200);
    // ASSERT
    const user: UserResponseDto = res.body;
    expect(user.name).toBe('Jarda');
    expect(user.email).toBe(testexample);
    expect(user.id).toBe(2);
  });
});
