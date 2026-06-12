import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../database/prisma.service';
import { Role } from '@prisma/client';
import { encrypt, decrypt } from './crypto.util';
import { BcryptService } from '../../auth/bcrypt.service';
import { ROLE_METADATA } from '@logirest/shared-types';

process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-testing-32-chars';
process.env.BASE_CURRENCY_CODE = 'SAR';

describe('AdminService', () => {
  let service: AdminService;

  const mockSystemSettingFindUnique = jest.fn();
  const mockSystemSettingUpsert = jest.fn();
  const mockGrnCount = jest.fn();
  const mockIssueCount = jest.fn();
  const mockWarehouseItemFindMany = jest.fn();
  const mockWarehouseItemFindUnique = jest.fn();
  const mockWarehouseItemUpdate = jest.fn();
  const mockOutboxEventCount = jest.fn();
  const mockOutboxEventFindMany = jest.fn();
  const mockOutboxEventFindUnique = jest.fn();
  const mockOutboxEventUpdate = jest.fn();
  const mockAuditLogCreate = jest.fn();

  const mockUserGroupBy = jest.fn();

  const mockPrismaService = {
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
    user: {
      groupBy: mockUserGroupBy,
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
    warehouseItem: {
      findMany: mockWarehouseItemFindMany,
      findUnique: mockWarehouseItemFindUnique,
      update: mockWarehouseItemUpdate,
    },
    outboxEvent: {
      count: mockOutboxEventCount,
      findMany: mockOutboxEventFindMany,
      findUnique: mockOutboxEventFindUnique,
      update: mockOutboxEventUpdate,
    },
    auditLog: {
      create: mockAuditLogCreate,
    },
  } as unknown as PrismaService;

  const mockBcryptService = {
    hash: jest.fn().mockResolvedValue('mocked-hash'),
    compare: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BcryptService, useValue: mockBcryptService },
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

    mockUserGroupBy.mockResolvedValue(mockGroupResult);

    const result = await service.getRoles();

    // Verify all roles are returned
    expect(result).toHaveLength(Object.keys(ROLE_METADATA).length);

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

    expect(mockUserGroupBy).toHaveBeenCalledWith({
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
      expect(settings.systemName).toBe('LogiRest System');
      expect(settings.baseCurrency).toBe('SAR');
      expect(settings.smtpPassword).toBe('');
    });

    it('should return saved settings with masked password', async () => {
      const encryptedPassword = encrypt('my-secret-password');
      const mockSavedSettings = {
        systemName: 'Custom Rest',
        baseCurrency: 'USD',
        smtpPassword: encryptedPassword,
      };

      mockSystemSettingFindUnique.mockResolvedValue({
        value: JSON.stringify(mockSavedSettings),
        version: 1,
        updatedAt: new Date(),
      });
      mockGrnCount.mockResolvedValue(0);
      mockIssueCount.mockResolvedValue(0);

      const settings = await service.getSettings();
      expect(settings.systemName).toBe('Custom Rest');
      expect(settings.baseCurrency).toBe('USD');
      expect(settings.smtpPassword).toBe('********');
    });

    it('should encrypt new password on update', async () => {
      mockSystemSettingFindUnique.mockResolvedValue(null);
      mockSystemSettingUpsert.mockResolvedValue({});

      const dto = {
        systemName: 'Resto',
        baseCurrency: 'SAR',
        smtpPassword: 'supersecretpass',
      };

      await service.updateSettings(dto, 'user-admin');

      expect(mockSystemSettingUpsert).toHaveBeenCalled();
      const upsertArgs = mockSystemSettingUpsert.mock.calls[0][0];
      const savedConfig = JSON.parse(upsertArgs.create.value);

      expect(savedConfig.systemName).toBe('Resto');
      // Password must be encrypted (not plaintext)
      expect(savedConfig.smtpPassword).not.toBe('supersecretpass');
      expect(savedConfig.smtpPassword).toBeDefined();
    });

    it('should retain existing encrypted password if update request sends masking stars', async () => {
      const encryptedPassword = encrypt('my-secret-password');
      const mockSavedSettings = {
        systemName: 'Custom Rest',
        baseCurrency: 'USD',
        smtpPassword: encryptedPassword,
      };

      mockSystemSettingFindUnique.mockResolvedValue({
        value: JSON.stringify(mockSavedSettings),
        version: 1,
        updatedAt: new Date(),
      });
      mockSystemSettingUpsert.mockResolvedValue({});

      const dto = {
        systemName: 'Custom Rest Updated',
        baseCurrency: 'USD',
        smtpPassword: '********',
      };

      await service.updateSettings(dto, 'user-admin');

      expect(mockSystemSettingUpsert).toHaveBeenCalled();
      const upsertArgs = mockSystemSettingUpsert.mock.calls[0][0];
      const savedConfig = JSON.parse(upsertArgs.update.value);

      expect(savedConfig.systemName).toBe('Custom Rest Updated');
      expect(decrypt(savedConfig.smtpPassword)).toBe('my-secret-password');
    });
  });

  describe('Outbox and Frozen Inventory operations', () => {
    describe('getFailedOutboxEvents', () => {
      it('should query and return failed outbox events with pagination metadata', async () => {
        mockOutboxEventCount.mockResolvedValue(2);
        mockOutboxEventFindMany.mockResolvedValue([
          { id: '1', status: 'FAILED', eventName: 'test.event' },
          { id: '2', status: 'FAILED', eventName: 'another.event' },
        ]);

        const result = await service.getFailedOutboxEvents(1, 10);
        expect(result.data).toHaveLength(2);
        expect(result.meta.total).toBe(2);
        expect(result.meta.page).toBe(1);
        expect(result.meta.totalPages).toBe(1);
        expect(mockOutboxEventCount).toHaveBeenCalledWith({
          where: { status: 'FAILED' },
        });
        expect(mockOutboxEventFindMany).toHaveBeenCalledWith({
          where: { status: 'FAILED' },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 10,
        });
      });
    });

    describe('retryOutboxEvent', () => {
      it('should throw an error if the outbox event is not found', async () => {
        mockOutboxEventFindUnique.mockResolvedValue(null);

        await expect(service.retryOutboxEvent('nonexistent')).rejects.toThrow(
          'Outbox event with ID nonexistent not found.',
        );
      });

      it('should successfully update outbox event to PENDING status', async () => {
        const mockEvent = { id: 'evt-123', status: 'FAILED' };
        mockOutboxEventFindUnique.mockResolvedValue(mockEvent);
        mockOutboxEventUpdate.mockResolvedValue({
          ...mockEvent,
          status: 'PENDING',
        });

        const result = await service.retryOutboxEvent('evt-123');
        expect(result.status).toBe('PENDING');
        expect(mockOutboxEventUpdate).toHaveBeenCalledWith({
          where: { id: 'evt-123' },
          data: {
            status: 'PENDING',
            attempts: 0,
            lastError: null,
          },
        });
      });
    });

    describe('getFrozenItems', () => {
      it('should retrieve all frozen warehouse items', async () => {
        mockWarehouseItemFindMany.mockResolvedValue([
          { warehouseId: 'w-1', itemId: 'i-1', isFrozen: true },
        ]);

        const result = await service.getFrozenItems();
        expect(result).toHaveLength(1);
        expect(result[0].isFrozen).toBe(true);
        expect(mockWarehouseItemFindMany).toHaveBeenCalledWith({
          where: { isFrozen: true },
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
            item: { select: { id: true, name: true, sku: true } },
          },
        });
      });
    });

    describe('unfreezeItem', () => {
      it('should throw an error if warehouse item does not exist', async () => {
        mockWarehouseItemFindUnique.mockResolvedValue(null);

        await expect(
          service.unfreezeItem('w-1', 'i-1', 'user-1'),
        ).rejects.toThrow('Warehouse item not found.');
      });

      it('should return item immediately if it is already unfrozen', async () => {
        mockWarehouseItemFindUnique.mockResolvedValue({
          warehouseId: 'w-1',
          itemId: 'i-1',
          isFrozen: false,
        });

        const result = await service.unfreezeItem('w-1', 'i-1', 'user-1');
        expect(result.isFrozen).toBe(false);
        expect(mockWarehouseItemUpdate).not.toHaveBeenCalled();
      });

      it('should update item status and write audit log inside transaction if frozen', async () => {
        mockWarehouseItemFindUnique.mockResolvedValue({
          warehouseId: 'w-1',
          itemId: 'i-1',
          isFrozen: true,
          item: { sku: 'SKU-FROZEN' },
        });
        mockWarehouseItemUpdate.mockResolvedValue({
          warehouseId: 'w-1',
          itemId: 'i-1',
          isFrozen: false,
        });

        const result = await service.unfreezeItem('w-1', 'i-1', 'user-1');
        expect(result.isFrozen).toBe(false);
        expect(mockPrismaService.$transaction).toHaveBeenCalled();
        expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
          where: { warehouseId_itemId: { warehouseId: 'w-1', itemId: 'i-1' } },
          data: { isFrozen: false },
        });
        expect(mockAuditLogCreate).toHaveBeenCalledWith({
          data: {
            userId: 'user-1',
            action: 'UNFREEZE_ITEM',
            targetTable: 'warehouse_items',
            targetId: 'w-1_i-1',
            beforeStateJson: JSON.stringify({ isFrozen: true }),
            afterStateJson: JSON.stringify({ isFrozen: false }),
          },
        });
      });
    });
  });
});
