import { Test, TestingModule } from '@nestjs/testing';
import { InventoryValidationService } from '../inventory-validation.service';
import { PrismaService } from '../../../database/prisma.service';

describe('InventoryValidationService', () => {
  let service: InventoryValidationService;

  const mockWarehouseItemFindUnique = jest.fn();
  const mockWarehouseItemUpdate = jest.fn();
  const mockAuditLogCreate = jest.fn();
  const mockNotificationLogCreate = jest.fn();
  const mockOutboxEventCreate = jest.fn();
  const mockReconciliationRunCreate = jest.fn();
  const mockQueryRaw = jest.fn();

  const mockPrismaService: Record<string, unknown> = {
    $queryRaw: mockQueryRaw,
    $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
      cb(mockPrismaService),
    ),
    warehouseItem: {
      findUnique: mockWarehouseItemFindUnique,
      update: mockWarehouseItemUpdate,
    },
    auditLog: {
      create: mockAuditLogCreate,
    },
    notificationLog: {
      create: mockNotificationLogCreate,
    },
    outboxEvent: {
      create: mockOutboxEventCreate,
    },
    reconciliationRun: {
      create: mockReconciliationRunCreate,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryValidationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InventoryValidationService>(
      InventoryValidationService,
    );
    jest.clearAllMocks();
  });

  it('should compile and be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validate', () => {
    it('should return CONSISTENT when all equations are balanced', async () => {
      mockQueryRaw
        .mockResolvedValueOnce([{ count: 5 }])
        .mockResolvedValueOnce([{ count: 10 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.validate();

      expect(result.status).toBe('CONSISTENT');
      expect(result.success).toBe(true);
      expect(result.itemsAudited).toBe(5);
      expect(result.lotsAudited).toBe(10);
      expect(result.discrepanciesCount).toBe(0);
      expect(result.discrepancies).toEqual([]);
      expect(mockWarehouseItemUpdate).not.toHaveBeenCalled();
      expect(mockAuditLogCreate).not.toHaveBeenCalled();
      expect(mockNotificationLogCreate).not.toHaveBeenCalled();
      expect(mockOutboxEventCreate).not.toHaveBeenCalled();
      expect(mockReconciliationRunCreate).toHaveBeenCalledWith({
        data: {
          itemsChecked: 5,
          discrepanciesFound: 0,
          lotDiscrepanciesFound: 0,
          frozenItems: [],
          durationMs: expect.any(Number),
        },
      });
    });

    it('should return DISCREPANCY_DETECTED with discrepancy items when Item Ledger Parity fails', async () => {
      mockQueryRaw
        .mockResolvedValueOnce([{ count: 5 }])
        .mockResolvedValueOnce([{ count: 10 }])
        .mockResolvedValueOnce([
          {
            item_id: 'item-1',
            warehouse_id: 'wh-1',
            qty_on_hand: '100',
            ledger_sum: '80',
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockWarehouseItemFindUnique.mockResolvedValue({ isFrozen: false });
      mockWarehouseItemUpdate.mockResolvedValue({ isFrozen: true });
      mockNotificationLogCreate.mockResolvedValue({});
      mockOutboxEventCreate.mockResolvedValue({});
      mockReconciliationRunCreate.mockResolvedValue({});

      const result = await service.validate();

      expect(result.status).toBe('DISCREPANCY_DETECTED');
      expect(result.success).toBe(false);
      expect(result.discrepanciesCount).toBe(1);
      expect(result.discrepancies[0].type).toBe('ITEM_LEDGER_PARITY');
      expect(result.discrepancies[0].itemId).toBe('item-1');
      expect(result.discrepancies[0].warehouseId).toBe('wh-1');
      expect(result.discrepancies[0].physicalQty).toBe(100);
      expect(result.discrepancies[0].ledgerQty).toBe(80);
      expect(result.discrepancies[0].variance).toBe(20);
      expect(result.discrepancies[0].quarantined).toBe(true);

      expect(mockWarehouseItemUpdate).toHaveBeenCalled();
      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          action: 'AUTO_FREEZE',
          targetTable: 'warehouse_items',
          targetId: 'wh-1_item-1',
          beforeStateJson: JSON.stringify({ isFrozen: false }),
          afterStateJson: JSON.stringify({ isFrozen: true }),
        },
      });
      expect(mockNotificationLogCreate).toHaveBeenCalled();
      expect(mockOutboxEventCreate).toHaveBeenCalledTimes(2);
      expect(mockReconciliationRunCreate).toHaveBeenCalledWith({
        data: {
          itemsChecked: 5,
          discrepanciesFound: 1,
          lotDiscrepanciesFound: 0,
          frozenItems: ['wh-1_item-1'],
          durationMs: expect.any(Number),
        },
      });
    });

    it('should handle all three equation types with Lot Ledger Parity and Lot-to-Item discrepancies', async () => {
      mockQueryRaw
        .mockResolvedValueOnce([{ count: 3 }])
        .mockResolvedValueOnce([{ count: 6 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            lot_id: 'lot-1',
            item_id: 'item-1',
            warehouse_id: 'wh-1',
            qty_on_hand: '50',
            ledger_sum: '40',
          },
        ])
        .mockResolvedValueOnce([
          {
            item_id: 'item-2',
            warehouse_id: 'wh-2',
            qty_on_hand: '200',
            lot_sum: '180',
          },
        ]);

      mockWarehouseItemFindUnique
        .mockResolvedValueOnce({ isFrozen: false })
        .mockResolvedValueOnce({ isFrozen: false });
      mockWarehouseItemUpdate.mockResolvedValue({ isFrozen: true });
      mockNotificationLogCreate.mockResolvedValue({});
      mockOutboxEventCreate.mockResolvedValue({});
      mockReconciliationRunCreate.mockResolvedValue({});

      const result = await service.validate();

      expect(result.status).toBe('DISCREPANCY_DETECTED');
      expect(result.success).toBe(false);
      expect(result.discrepanciesCount).toBe(2);

      const lotDisc = result.discrepancies.find(
        (d) => d.type === 'LOT_LEDGER_PARITY',
      );
      expect(lotDisc).toBeDefined();
      expect(lotDisc!.lotId).toBe('lot-1');
      expect(lotDisc!.physicalQty).toBe(50);
      expect(lotDisc!.ledgerQty).toBe(40);

      const aggDisc = result.discrepancies.find(
        (d) => d.type === 'LOT_ITEM_AGGREGATION',
      );
      expect(aggDisc).toBeDefined();
      expect(aggDisc!.itemId).toBe('item-2');
      expect(aggDisc!.physicalQty).toBe(200);
      expect(aggDisc!.ledgerQty).toBe(180);

      expect(mockWarehouseItemUpdate).toHaveBeenCalledTimes(2);
      expect(mockAuditLogCreate).toHaveBeenCalledTimes(2);
    });

    it('should skip freeze if item is already frozen', async () => {
      mockQueryRaw
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([
          {
            item_id: 'item-1',
            warehouse_id: 'wh-1',
            qty_on_hand: '100',
            ledger_sum: '80',
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockWarehouseItemFindUnique.mockResolvedValue({ isFrozen: true });
      mockReconciliationRunCreate.mockResolvedValue({});

      const result = await service.validate();

      expect(result.status).toBe('DISCREPANCY_DETECTED');
      expect(mockWarehouseItemUpdate).not.toHaveBeenCalled();
      expect(mockAuditLogCreate).not.toHaveBeenCalled();
    });

    it('should not create notifications or outbox events when no discrepancies exist', async () => {
      mockQueryRaw
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockReconciliationRunCreate.mockResolvedValue({});

      const result = await service.validate();

      expect(result.status).toBe('CONSISTENT');
      expect(result.success).toBe(true);
      expect(mockNotificationLogCreate).not.toHaveBeenCalled();
      expect(mockOutboxEventCreate).not.toHaveBeenCalled();
    });
  });
});
