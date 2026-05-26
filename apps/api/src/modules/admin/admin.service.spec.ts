import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../database/prisma.service';
import { Role } from '@prisma/client';
import { encrypt, decrypt } from './crypto.util';

describe('AdminService', () => {
  let service: AdminService;

  const mockSystemSettingFindUnique = jest.fn();
  const mockSystemSettingUpsert = jest.fn();
  const mockGrnCount = jest.fn();
  const mockIssueCount = jest.fn();

  const mockPrismaService = {
    user: {
      groupBy: jest.fn(),
    },
    systemSetting: {
      findUnique: mockSystemSettingFindUnique,
      upsert: mockSystemSettingUpsert,
    },
    goodsReceivedNote: {
      count: mockGrnCount,
    },
    inventoryIssue: {
      count: mockIssueCount,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  it('should compile and be defined', () => {
    expect(service).toBeDefined();
  });

  it('should successfully query user groups and map all roles with accurate user counts', async () => {
    const mockGroupResult = [
      { role: Role.ADMIN, _count: 2 },
      { role: Role.INV_MGR, _count: 5 },
    ];

    mockPrismaService.user.groupBy.mockResolvedValue(mockGroupResult);

    const result = await service.getRoles();

    // Verify all 10 roles are returned
    expect(result).toHaveLength(10);

    // Verify that ADMIN has count 2
    const adminRole = result.find((r) => r.id === 'ADMIN');
    expect(adminRole).toBeDefined();
    expect(adminRole?.userCount).toBe(2);
    expect(adminRole?.displayName).toBe('Administrator');

    // Verify that INV_MGR has count 5
    const invMgrRole = result.find((r) => r.id === 'INV_MGR');
    expect(invMgrRole).toBeDefined();
    expect(invMgrRole?.userCount).toBe(5);
    expect(invMgrRole?.description).toBe(
      'Manages stock levels, adjustments and stocktake workflows',
    );

    // Verify that WH_KEEPER has count 0 (empty roles edge case)
    const whKeeperRole = result.find((r) => r.id === 'WH_KEEPER');
    expect(whKeeperRole).toBeDefined();
    expect(whKeeperRole?.userCount).toBe(0);
    expect(whKeeperRole?.displayName).toBe('Warehouse Keeper');

    expect(mockPrismaService.user.groupBy).toHaveBeenCalledWith({
      by: ['role'],
      _count: true,
      where: { isActive: true },
    });
  });

  describe('System Settings', () => {
    it('should return default settings if none are saved in database', async () => {
      mockSystemSettingFindUnique.mockResolvedValue(null);
      mockGrnCount.mockResolvedValue(0);
      mockIssueCount.mockResolvedValue(0);

      const settings = await service.getSettings();
      expect(settings.system_name).toBe('LogiRest System');
      expect(settings.base_currency).toBe('SAR');
      expect(settings.smtp_password).toBe('');
    });

    it('should return saved settings with masked password', async () => {
      const encryptedPassword = encrypt('my-secret-password');
      const mockSavedSettings = {
        system_name: 'Custom Rest',
        base_currency: 'USD',
        smtp_password: encryptedPassword,
      };
      
      mockSystemSettingFindUnique.mockResolvedValue({
        value: JSON.stringify(mockSavedSettings),
        version: 1,
        updatedAt: new Date(),
      });
      mockGrnCount.mockResolvedValue(0);
      mockIssueCount.mockResolvedValue(0);

      const settings = await service.getSettings();
      expect(settings.system_name).toBe('Custom Rest');
      expect(settings.base_currency).toBe('USD');
      expect(settings.smtp_password).toBe('********');
    });

    it('should encrypt new password on update', async () => {
      mockSystemSettingFindUnique.mockResolvedValue(null);
      mockSystemSettingUpsert.mockResolvedValue({});

      const dto = {
        system_name: 'Resto',
        base_currency: 'SAR',
        smtp_password: 'supersecretpass',
      };

      await service.updateSettings(dto, 'user-admin');

      expect(mockSystemSettingUpsert).toHaveBeenCalled();
      const upsertArgs = mockSystemSettingUpsert.mock.calls[0][0];
      const savedConfig = JSON.parse(upsertArgs.create.value);
      
      expect(savedConfig.system_name).toBe('Resto');
      // Password must be encrypted (not plaintext)
      expect(savedConfig.smtp_password).not.toBe('supersecretpass');
      expect(savedConfig.smtp_password).toBeDefined();
    });

    it('should retain existing encrypted password if update request sends masking stars', async () => {
      const encryptedPassword = encrypt('my-secret-password');
      const mockSavedSettings = {
        system_name: 'Custom Rest',
        base_currency: 'USD',
        smtp_password: encryptedPassword,
      };

      mockSystemSettingFindUnique.mockResolvedValue({
        value: JSON.stringify(mockSavedSettings),
        version: 1,
        updatedAt: new Date(),
      });
      mockSystemSettingUpsert.mockResolvedValue({});

      const dto = {
        system_name: 'Custom Rest Updated',
        base_currency: 'USD',
        smtp_password: '********',
      };

      await service.updateSettings(dto, 'user-admin');

      expect(mockSystemSettingUpsert).toHaveBeenCalled();
      const upsertArgs = mockSystemSettingUpsert.mock.calls[0][0];
      const savedConfig = JSON.parse(upsertArgs.update.value);

      expect(savedConfig.system_name).toBe('Custom Rest Updated');
      expect(decrypt(savedConfig.smtp_password)).toBe('my-secret-password');
    });
  });
});
