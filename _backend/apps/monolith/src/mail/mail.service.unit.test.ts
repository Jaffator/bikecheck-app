import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { MailService } from './mail.service';

// The provider is mocked at its own boundary; everything above it is what is tested.
const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));

const LINK = 'https://app.example.com/verify-email?token=abc';

describe('MailService', () => {
  let service: MailService;
  const mockLogger = { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const user = { id: 7, email: 'rider@example.com', name: 'Jarda', language: 'en' };
  const env = { ...process.env };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = { ...env };
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;
    delete process.env.NODE_ENV;

    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService, { provide: getLoggerToken(MailService.name), useValue: mockLogger }],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  afterAll(() => {
    process.env = env;
  });

  // Mirrors push without Firebase: a warning once, then silence, never an error.
  describe('without RESEND_API_KEY', () => {
    it('warns at startup', () => {
      service.onModuleInit();

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    });

    it('sends nothing', async () => {
      service.onModuleInit();

      await service.sendVerificationEmail(user, LINK);
      await service.sendWelcomeEmail(user);

      expect(mockSend).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    // So a registration can be finished locally without a mailbox.
    it('logs the verification link at info level in development', async () => {
      process.env.NODE_ENV = 'development';
      service.onModuleInit();

      await service.sendVerificationEmail(user, LINK);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 7, link: LINK }),
        expect.any(String),
      );
    });

    it('keeps the link out of the log outside development', async () => {
      process.env.NODE_ENV = 'production';
      service.onModuleInit();

      await service.sendVerificationEmail(user, LINK);

      expect(mockLogger.info).not.toHaveBeenCalledWith(expect.objectContaining({ link: LINK }), expect.any(String));
    });
  });

  describe('with RESEND_API_KEY', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 're_test';
      process.env.MAIL_FROM = 'BikeCheck <hello@bikecheck.app>';
      mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
      service.onModuleInit();
    });

    it('does not warn at startup', () => {
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('sends the Verification Email from MAIL_FROM to the address with the rendered subject', async () => {
      await service.sendVerificationEmail(user, LINK);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'BikeCheck <hello@bikecheck.app>',
          to: 'rider@example.com',
          subject: 'Verify your email',
          text: expect.stringContaining(LINK),
          html: expect.stringContaining(LINK),
        }),
      );
    });

    it('sends the Welcome Email in the language of the account', async () => {
      await service.sendWelcomeEmail({ ...user, language: 'cs' });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'rider@example.com', subject: 'Vítej v BikeCheck' }),
      );
    });

    // The row is already written and "send it again" is the recovery, so a provider
    // hiccup is logged with who and what, and nothing is thrown.
    it('logs and swallows a thrown provider error', async () => {
      mockSend.mockRejectedValue(new Error('network down'));

      await expect(service.sendVerificationEmail(user, LINK)).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 7, kind: 'verification' }),
        expect.any(String),
      );
    });

    it('logs and swallows an error the provider answers with', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'invalid from', name: 'validation_error', statusCode: 422 },
      });

      await expect(service.sendWelcomeEmail(user)).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 7, kind: 'welcome' }),
        expect.any(String),
      );
    });
  });
});
