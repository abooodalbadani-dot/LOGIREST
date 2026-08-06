import { Test, TestingModule } from '@nestjs/testing';
import { GrnService } from './grn.service';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { DocumentNumberService } from '../../sequencing/document-number.service';
import { BadRequestException } from '@nestjs/common';

describe('GrnService - Over-receiving Validation', () => {
  let service: GrnService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((cb) => cb(prisma)),
      purchaseOrder: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      goodsReceivedNote: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      warehouse: {
        findUnique: jest.fn().mockResolvedValue({ branchId: 'branch-1' }),
      },
      lot: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      approvalEvent: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrnService,
        { provide: PrismaService, useValue: prisma },
        { provide: WorkflowService, useValue: { verifyWarehouseLocks: jest.fn() } },
        { provide: DocumentNumberService, useValue: { next: jest.fn().mockResolvedValue('GRN-001') } },
      ],
    }).compile();

    service = module.get<GrnService>(GrnService);
  });

  it('should throw BadRequestException when trying to receive more quantity than remaining in PO', async () => {
    const mockPo = {
      id: 'po-1',
      status: 'APPROVED',
      lines: [
        {
          itemId: 'item-1',
          quantity: 10,
          uomId: 'uom-box',
          item: {
            id: 'item-1',
            sku: 'ITEM-001',
            name: 'Box Item',
            uomId: 'uom-box',
            uomConversions: [],
          },
        },
      ],
      currency: { isBase: true },
    };

    prisma.purchaseOrder.findUnique.mockResolvedValue(mockPo);
    prisma.purchaseOrder.findFirst.mockResolvedValue(mockPo);

    // Previously received 10 BOX in a previous GRN
    prisma.goodsReceivedNote.findMany.mockResolvedValue([
      {
        lines: [
          {
            itemId: 'item-1',
            quantityReceived: 10,
            uomId: 'uom-box',
          },
        ],
      },
    ]);

    await expect(
      service.create(
        {
          poId: 'po-1',
          warehouseId: 'wh-1',
          lines: [
            {
              itemId: 'item-1',
              quantity: 5, // Attempting to receive 5 more BOX
              unitPrice: 10,
              uomId: 'uom-box',
            },
          ],
        },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow receiving when quantity is within PO remaining limit', async () => {
    const mockPo = {
      id: 'po-1',
      status: 'APPROVED',
      lines: [
        {
          itemId: 'item-1',
          quantity: 10,
          uomId: 'uom-box',
          item: {
            id: 'item-1',
            sku: 'ITEM-001',
            name: 'Box Item',
            uomId: 'uom-box',
            uomConversions: [],
          },
        },
      ],
      currency: { isBase: true },
    };

    prisma.purchaseOrder.findUnique.mockResolvedValue(mockPo);
    prisma.purchaseOrder.findFirst.mockResolvedValue(mockPo);

    // Previously received 6 BOX
    prisma.goodsReceivedNote.findMany.mockResolvedValue([
      {
        lines: [
          {
            itemId: 'item-1',
            quantityReceived: 6,
            uomId: 'uom-box',
          },
        ],
      },
    ]);

    prisma.goodsReceivedNote.create.mockResolvedValue({ id: 'grn-2', grnNumber: 'GRN-002' });
    prisma.lot.findFirst.mockResolvedValue({ id: 'lot-1' });

    const result = await service.create(
      {
        poId: 'po-1',
        warehouseId: 'wh-1',
        lines: [
          {
            itemId: 'item-1',
            quantity: 4, // Exactly 4 remaining (10 - 6 = 4)
            unitPrice: 10,
            uomId: 'uom-box',
          },
        ],
      },
      'user-1',
    );

    expect(result).toBeDefined();
    expect(prisma.goodsReceivedNote.create).toHaveBeenCalled();
  });

  it('should allow creating a GRN against a PARTIAL status Purchase Order', async () => {
    const mockPartialPo = {
      id: 'po-1',
      status: 'PARTIAL',
      lines: [
        {
          itemId: 'item-1',
          quantity: 10,
          uomId: 'uom-box',
          item: {
            id: 'item-1',
            sku: 'ITEM-001',
            name: 'Box Item',
            uomId: 'uom-box',
            uomConversions: [],
          },
        },
      ],
      currency: { isBase: true },
    };

    prisma.purchaseOrder.findUnique.mockResolvedValue(mockPartialPo);
    prisma.purchaseOrder.findFirst.mockResolvedValue(mockPartialPo);
    prisma.goodsReceivedNote.findMany.mockResolvedValue([
      {
        lines: [
          {
            itemId: 'item-1',
            quantityReceived: 4,
            uomId: 'uom-box',
          },
        ],
      },
    ]);
    prisma.goodsReceivedNote.create.mockResolvedValue({ id: 'grn-3', grnNumber: 'GRN-003' });

    const result = await service.create(
      {
        poId: 'po-1',
        warehouseId: 'wh-1',
        lines: [
          {
            itemId: 'item-1',
            quantity: 6,
            unitPrice: 10,
            uomId: 'uom-box',
          },
        ],
      },
      'user-1',
    );

    expect(result).toBeDefined();
    expect(prisma.goodsReceivedNote.create).toHaveBeenCalled();
  });
});
