import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { PrismaService } from '../../database/prisma.service';
import { AdminService } from './admin.service';
import { EmailService } from '../outbox/email.service';
import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UpdateSettingsDto } from './dto/update-settings.dto';

describe('AdminController', () => {
  let controller: AdminController;

  const mockPrismaService = {
    reconciliationRun: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockAdminService = {
    getRoles: jest.fn(),
    updateSettings: jest.fn(),
  };

  const mockEmailService = {
    isSmtpConfigured: true,
    testConnection: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AdminService, useValue: mockAdminService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    jest.clearAllMocks();
  });

  describe('getReconciliationRuns', () => {
    it('should return reconciliation runs', async () => {
      mockPrismaService.reconciliationRun.count.mockResolvedValue(1);
      mockPrismaService.reconciliationRun.findMany.mockResolvedValue([
        { id: 'run-1' },
      ]);

      const result = await controller.getReconciliationRuns('1', '10');
      expect(result.data).toEqual([{ id: 'run-1' }]);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getRoles', () => {
    it('should return roles list from AdminService', async () => {
      const mockRoles = [
        {
          id: 'ADMIN',
          displayName: 'Administrator',
          userCount: 2,
          permissions: [],
        },
      ];
      mockAdminService.getRoles.mockResolvedValue(mockRoles);

      const result = await controller.getRoles();

      expect(result).toEqual(mockRoles);
      expect(mockAdminService.getRoles).toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    let validationPipe: ValidationPipe;

    beforeEach(() => {
      validationPipe = new ValidationPipe({ whitelist: true, transform: true });
    });

    it('should call updateSettings on AdminService', async () => {
      const dto = {} as any;
      mockAdminService.updateSettings.mockResolvedValue({ success: true });

      const result = await controller.updateSettings('user-1', dto);
      expect(result).toEqual({ success: true });
      expect(mockAdminService.updateSettings).toHaveBeenCalledWith(
        dto,
        'user-1',
      );
    });

    it('should pass validation with a valid settings payload', async () => {
      const validDto = {
        system_name: 'LogiRest Test',
        base_currency: 'USD',
        branch_id: 'HQ',
        timezone: 'Asia/Riyadh',
        locale_default: 'en',
        sender_name: 'Alerts',
        reply_to_email: 'alerts@test.com',
        mail_provider: 'smtp',
        smtp_port: 587,
        smtp_encryption: 'tls',
      };

      const result = await validationPipe.transform(validDto, {
        type: 'body',
        metatype: UpdateSettingsDto,
      });

      expect(result).toBeDefined();
      expect(result.system_name).toBe('LogiRest Test');
    });

    it('should throw validation errors if payload is invalid', async () => {
      const invalidDto = {
        system_name: '', // Empty
        base_currency: 'USD',
        branch_id: 'HQ',
        timezone: 'Asia/Riyadh',
        locale_default: 'invalid_locale', // Invalid enum
        sender_name: 'Alerts',
        reply_to_email: 'not-an-email', // Invalid email
        smtp_port: 9999999, // Too high
      };

      await expect(
        validationPipe.transform(invalidDto, {
          type: 'body',
          metatype: UpdateSettingsDto,
        }),
      ).rejects.toThrow();
    });
  });
});
