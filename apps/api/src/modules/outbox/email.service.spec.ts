import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { PrismaService } from '../../database/prisma.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let mockConfigService: {
    get: jest.Mock;
  };
  let mockTransporter: {
    sendMail: jest.Mock;
  };

  const mockPrisma = {
    systemSetting: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupService = async (env: Record<string, unknown>) => {
    mockConfigService = {
      get: jest
        .fn()
        .mockImplementation((key: string, defaultValue?: unknown) => {
          return env[key] !== undefined ? env[key] : defaultValue;
        }),
    };

    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: '123' }),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  };

  it('should skip transporter initialization if SMTP_HOST is not set', async () => {
    await setupService({});
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(service).toBeDefined();

    const result = await service.sendEmail(
      'test@example.com',
      'Test Subject',
      '<p>Test</p>',
    );
    expect(result).toEqual({ ok: false, reason: 'SMTP_UNCONFIGURED' });
    expect(mockTransporter.sendMail).not.toHaveBeenCalled();
  });

  it('should initialize transporter if SMTP_HOST is set', async () => {
    await setupService({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: 587,
      SMTP_USER: 'user',
      SMTP_PASS: 'pass',
      SMTP_FROM: 'noreply@logirest.app',
    });

    const result = await service.sendEmail(
      'test@example.com',
      'Test Subject',
      '<p>Test</p>',
    );
    expect(result).toEqual({ ok: true });
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { user: 'user', pass: 'pass' },
    });
    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@logirest.app',
        to: 'test@example.com',
        subject: 'Test Subject',
        html: expect.stringContaining('LogiRest Inventory Management'),
      }),
    );
  });

  it('should return SEND_FAILED on SMTP errors', async () => {
    await setupService({
      SMTP_HOST: 'smtp.example.com',
    });

    mockTransporter.sendMail.mockRejectedValueOnce(
      new Error('SMTP connection timed out'),
    );

    const result = await service.sendEmail(
      'test@example.com',
      'Test Subject',
      '<p>Test</p>',
    );
    expect(result).toEqual({
      ok: false,
      reason: 'SEND_FAILED',
      error: 'SMTP connection timed out',
    });
  });
});
