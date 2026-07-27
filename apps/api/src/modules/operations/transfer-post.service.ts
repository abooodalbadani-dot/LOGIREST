import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AllocationService } from '../ledger/allocation.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { ScopeValidationService } from '../../auth/scope-validation.service';
import { Role, DocumentType, Prisma, Transfer } from '@prisma/client';
import { canPerformActionV2, DocumentStatus, toBaseQty } from '@logirest/shared-types';
import { MetricsService } from '../metrics/metrics.service';
import { OutboxService } from '../outbox/outbox.service';
import { WacService } from '../ledger/wac.service';

@Injectable()
export class TransferPostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly allocationService: AllocationService,
    private readonly lockService: LedgerLockService,
    private readonly metricsService: MetricsService,
    private readonly outboxService: OutboxService,
    private readonly wacService: WacService,
    private readonly scopeValidationService: ScopeValidationService,
  ) {}

  /**
   * Ships a transfer: deducts stock from source warehouse and puts status to IN_TRANSIT
   */
  async ship(
    transferId: string,
    userId: string,
    userRole: Role,
    clientVersion?: number,
    ipAddress?: string,
  ): Promise<Transfer> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Lock the document first using SELECT FOR UPDATE
          const lockedDoc = await this.lockService.lockDocument<Transfer>(
            tx,
            transferId,
            DocumentType.TRANSFER,
          );
          if (!lockedDoc) {
            throw new NotFoundException(
              `Transfer with ID ${transferId} not found`,
            );
          }

          // 1. Status Guard (Defense-in-depth)
          if (lockedDoc.status !== 'DRAFT') {
            throw new BadRequestException(
              `Transfer must be in DRAFT status to be shipped`,
            );
          }

          // 2. Centralized Role Check
          const hasRolePermission = canPerformActionV2(
            'TRANSFER',
            lockedDoc.status,
            'SHIP',
            userRole,
          );
          if (!hasRolePermission) {
            const errorMsg = `User with role ${userRole} is not authorized to perform action SHIP on TRANSFER in status ${lockedDoc.status}`;
            throw new ForbiddenException(errorMsg);
          }

          // 3. Strict Origin Warehouse Branch Scope Check
          const originScope = await tx.userWarehouseScope.findUnique({
            where: {
              userId_warehouseId: {
                userId,
                warehouseId: lockedDoc.fromWarehouseId,
              },
            },
          });
          if (!originScope) {
            const errorMsg = `User ${userId} with role ${userRole} is not authorized for the origin warehouse branch ${lockedDoc.fromWarehouseId}`;
            throw new ForbiddenException(errorMsg);
          }

          // Optimistic locking version check
          if (
            clientVersion !== undefined &&
            lockedDoc.version !== clientVersion
          ) {
            throw new BadRequestException('Version conflict detected');
          }

          // Fetch transfer details with lines and items
          const transfer = await tx.transfer.findUnique({
            where: { id: transferId },
            include: {
              lines: {
                include: {
                  item: {
                    include: {
                      uomConversions: { select: { fromUomId: true, toUomId: true, factor: true } },
                    },
                  },
                },
              },
            },
          });

          if (!transfer) {
            throw new NotFoundException(
              `Transfer with ID ${transferId} not found`,
            );
          }

          // 2. Process each line
          for (const line of transfer.lines) {
            const item = line.item;
            const lineUomId = line.uomId ?? item.uomId;
            const conversions = (item.uomConversions ?? []).map((c) => ({
              fromUomId: c.fromUomId,
              toUomId: c.toUomId,
              factor: Number(c.factor),
            }));
            const baseShippedQty = toBaseQty(
              Number(line.quantityShipped),
              lineUomId,
              item.uomId,
              conversions,
            );

            // Check if item is frozen in source warehouse
            await this.scopeValidationService.checkWarehouseItemQuarantine(
              transfer.fromWarehouseId,
              item.id,
              item.sku,
            );

            const sourceWhItem = await tx.warehouseItem.findUnique({
              where: {
                warehouseId_itemId: {
                  warehouseId: transfer.fromWarehouseId,
                  itemId: item.id,
                },
              },
            });
            const sourceWac = sourceWhItem
              ? sourceWhItem.wac
              : new Prisma.Decimal(0);

            // Record source WAC at shipment time
            await tx.transferLine.update({
              where: { id: line.id },
              data: {
                unitCost: sourceWac,
              },
            });

            // Perform progressive lot allocation (FEFO/FIFO) and decrement quantities in source warehouse
            const allocations = await this.allocationService.allocate(
              tx,
              transfer.fromWarehouseId,
              item.id,
              baseShippedQty,
            );

            if (item.isBatched || item.hasExpiry) {
              // Record LotAllocation for each allocated lot
              for (const alloc of allocations) {
                await tx.lotAllocation.create({
                  data: {
                    transferLineId: line.id,
                    lotId: alloc.lotId,
                    quantityAllocated: alloc.quantityAllocated,
                  },
                });

                // Insert StockLedger entry (negative for stock reduction at source warehouse)
                await tx.stockLedger.create({
                  data: {
                    warehouseId: transfer.fromWarehouseId,
                    itemId: item.id,
                    lotId: alloc.lotId,
                    quantity: -alloc.quantityAllocated,
                    documentId: transfer.id,
                    documentType: DocumentType.TRANSFER,
                    idempotencyKey: `${DocumentType.TRANSFER}:stock_ship:${transfer.id}:${item.id}:${alloc.lotId}:${line.id}`,
                  },
                });
              }
            } else {
              // Unbatched item: StockLedger entry with lotId null
              await tx.stockLedger.create({
                data: {
                  warehouseId: transfer.fromWarehouseId,
                  itemId: item.id,
                  lotId: null,
                  quantity: -baseShippedQty,
                  documentId: transfer.id,
                  documentType: DocumentType.TRANSFER,
                  idempotencyKey: `${DocumentType.TRANSFER}:stock_ship:${transfer.id}:${item.id}:${line.id}`,
                },
              });
            }
          }

          // 3. Update Transfer status to IN_TRANSIT with version check
          const updateResult = await tx.transfer.updateMany({
            where: { id: transferId, version: lockedDoc.version },
            data: {
              status: 'IN_TRANSIT',
              version: lockedDoc.version + 1,
            },
          });
          if (updateResult.count === 0) {
            throw new BadRequestException('Version conflict detected');
          }

          const updatedTransfer = await tx.transfer.findUnique({
            where: { id: transferId },
          });
          if (!updatedTransfer) {
            throw new NotFoundException(
              `Transfer with ID ${transferId} not found`,
            );
          }

          this.metricsService.postingOperationsCounter.inc({
            document_type: 'TRANSFER',
          });

          // 4. Record ApprovalEvent
          const stepNumber =
            (await tx.approvalEvent.count({
              where: {
                documentId: transfer.id,
                documentType: DocumentType.TRANSFER,
              },
            })) + 1;

          await tx.approvalEvent.create({
            data: {
              documentId: transfer.id,
              documentType: DocumentType.TRANSFER,
              fromStatus: 'DRAFT',
              toStatus: 'IN_TRANSIT',
              actionPerformed: 'SHIP',
              userId,
              userRole: userRole,
              stepNumber,
            },
          });

          // 5. Record AuditLog
          await tx.auditLog.create({
            data: {
              userId,
              action: 'WORKFLOW_SHIP_SUCCESS',
              targetTable: 'transfers',
              targetId: transfer.id,
              beforeStateJson: JSON.stringify({
                status: transfer.status,
                version: transfer.version,
              }),
              afterStateJson: JSON.stringify({
                status: 'IN_TRANSIT',
                version: transfer.version + 1,
              }),
              ipAddress: ipAddress || null,
            },
          });

          const fromWh = tx.warehouse
            ? await tx.warehouse.findUnique({
                where: { id: transfer.fromWarehouseId },
                select: { name: true },
              })
            : null;
          const user = tx.user
            ? await tx.user.findUnique({
                where: { id: userId },
                select: { name: true },
              })
            : null;

          await this.outboxService.writeEvent(tx, 'TRANSFER_SHIPPED', {
            id: transfer.id,
            documentNumber: transfer.transferNumber || transfer.id,
            warehouseId: transfer.toWarehouseId,
            toWarehouseId: transfer.toWarehouseId,
            fromWarehouseId: transfer.fromWarehouseId,
            warehouseName: fromWh?.name || 'N/A',
            userName: user?.name || 'N/A',
          });

          return updatedTransfer;
        },
        { timeout: 30000 },
      );
    } catch (error: unknown) {
      const logger = new Logger(TransferPostService.name);
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Transfer SHIP failed for user ${userId}: ${errorMsg}`);

      if (error instanceof ForbiddenException) {
        let action = 'WORKFLOW_SHIP_FAILED';
        if (
          errorMsg.includes('not authorized for the origin warehouse branch')
        ) {
          action = 'UNAUTHORIZED_TRANSFER_SHIP';
        }

        try {
          const transfer = await this.prisma.transfer.findUnique({
            where: { id: transferId },
            select: { status: true, version: true, fromWarehouseId: true },
          });

          await this.prisma.auditLog.create({
            data: {
              userId,
              action,
              targetTable: 'transfers',
              targetId: transferId,
              beforeStateJson: transfer
                ? JSON.stringify({
                    status: transfer.status,
                    version: transfer.version,
                  })
                : '{}',
              afterStateJson: JSON.stringify({
                error: errorMsg,
                userRole,
                warehouseId: transfer?.fromWarehouseId || null,
              }),
              ipAddress: ipAddress || null,
            },
          });
        } catch (auditError: unknown) {
          const auditErrorMsg =
            auditError instanceof Error
              ? auditError.message
              : String(auditError);
          logger.error(
            `Failed to write failed SHIP audit log: ${auditErrorMsg}`,
          );
        }
      }

      throw error;
    }
  }

  /**
   * Receives a transfer: adds stock to destination warehouse and updates status to RECEIVED.
   * Records quantity variance and varianceReason.
   */
  async receive(
    transferId: string,
    userId: string,
    userRole: Role,
    clientVersion?: number,
    ipAddress?: string,
    linesReceived?: Array<{
      lineId: string;
      quantityReceived: number;
      varianceReason?: string;
    }>,
  ): Promise<Transfer> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Lock the document first using SELECT FOR UPDATE
          const lockedDoc = await this.lockService.lockDocument<Transfer>(
            tx,
            transferId,
            DocumentType.TRANSFER,
          );
          if (!lockedDoc) {
            throw new NotFoundException(
              `Transfer with ID ${transferId} not found`,
            );
          }

          // 1. Centralized Role Check
          const hasRolePermission = canPerformActionV2(
            'TRANSFER',
            lockedDoc.status as DocumentStatus,
            'RECEIVE',
            userRole,
          );
          if (!hasRolePermission) {
            const errorMsg = `User with role ${userRole} is not authorized to perform action RECEIVE on TRANSFER in status ${lockedDoc.status}`;
            throw new ForbiddenException(errorMsg);
          }

          // 2. Strict Destination Warehouse Branch Scope Check
          const destinationScope = await tx.userWarehouseScope.findUnique({
            where: {
              userId_warehouseId: {
                userId,
                warehouseId: lockedDoc.toWarehouseId,
              },
            },
          });
          if (!destinationScope) {
            const errorMsg = `User ${userId} with role ${userRole} is not authorized for the destination warehouse branch ${lockedDoc.toWarehouseId}`;
            throw new ForbiddenException(errorMsg);
          }

          // 3. Status Guard (Defense-in-depth)
          if (lockedDoc.status !== 'IN_TRANSIT') {
            throw new BadRequestException(
              `Transfer must be in IN_TRANSIT status to be received`,
            );
          }

          // Optimistic locking version check
          if (
            clientVersion !== undefined &&
            lockedDoc.version !== clientVersion
          ) {
            throw new BadRequestException('Version conflict detected');
          }

          // Fetch transfer details with lines and items
          const transfer = await tx.transfer.findUnique({
            where: { id: transferId },
            include: {
              lines: {
                include: {
                  item: {
                    include: {
                      uomConversions: { select: { fromUomId: true, toUomId: true, factor: true } },
                    },
                  },
                },
              },
            },
          });

          if (!transfer) {
            throw new NotFoundException(
              `Transfer with ID ${transferId} not found`,
            );
          }

          // Map linesReceived for easy lookup
          const receivedMap = new Map<
            string,
            { quantityReceived: number; varianceReason?: string }
          >();
          if (linesReceived && Array.isArray(linesReceived)) {
            for (const input of linesReceived) {
              if (input && typeof input.lineId === 'string') {
                receivedMap.set(input.lineId, input);
              }
            }
          }

          // 2. Process each line
          for (const line of transfer.lines) {
            const item = line.item;

            // Historical posting guard (disabled to allow posting draft documents in current chronological ledger sequence)
            const input = receivedMap.get(line.id);
            const receivedQty =
              input && typeof input.quantityReceived === 'number'
                ? input.quantityReceived
                : Number(line.quantityShipped);
            const varianceReason = input ? input.varianceReason : undefined;
            const shippedQty = Number(line.quantityShipped);

            const lineUomId = line.uomId ?? item.uomId;
            const conversions = (item.uomConversions ?? []).map((c) => ({
              fromUomId: c.fromUomId,
              toUomId: c.toUomId,
              factor: Number(c.factor),
            }));
            const baseReceivedQty = toBaseQty(
              receivedQty,
              lineUomId,
              item.uomId,
              conversions,
            );
            const baseShippedQty = toBaseQty(
              shippedQty,
              lineUomId,
              item.uomId,
              conversions,
            );

            // Discrepancy checks: if receivedQty < shippedQty, must have non-empty varianceReason
            if (
              receivedQty < shippedQty &&
              (!varianceReason || varianceReason.trim() === '')
            ) {
              throw new BadRequestException(
                `Variance reason is required for discrepancies on line ${line.id}`,
              );
            }

            // Check if item is frozen in destination warehouse
            await this.scopeValidationService.checkWarehouseItemQuarantine(
              transfer.toWarehouseId,
              item.id,
              item.sku,
            );

            const sourceWac = line.unitCost
              ? new Prisma.Decimal(line.unitCost)
              : new Prisma.Decimal(0);

            // Update TransferLine
            await tx.transferLine.update({
              where: { id: line.id },
              data: {
                quantityReceived: receivedQty,
                varianceReason: varianceReason || null,
              },
            });

            // Ensure WarehouseItem exists in destination warehouse first to satisfy the FK on WarehouseItemLot
            await tx.warehouseItem.upsert({
              where: {
                warehouseId_itemId: {
                  warehouseId: transfer.toWarehouseId,
                  itemId: item.id,
                },
              },
              create: {
                warehouseId: transfer.toWarehouseId,
                itemId: item.id,
                qtyOnHand: 0,
                qtyAllocated: 0,
                wac: sourceWac,
              },
              update: {},
            });

            // Lock WarehouseItem first (destination warehouse)
            await this.lockService.lockItem(
              tx,
              transfer.toWarehouseId,
              item.id,
            );

            if (item.isBatched || item.hasExpiry) {
              // Retrieve LotAllocations to know which lots were shipped
              const allocations = await tx.lotAllocation.findMany({
                where: { transferLineId: line.id },
              });

              if (allocations.length === 0) {
                throw new BadRequestException(
                  `No lot allocations found from shipment phase for item ${item.sku}. Lot tracking is required.`,
                );
              }

              // Distribute baseReceivedQty progressively across the shipped lots
              let remainingReceived = baseReceivedQty;
              for (const alloc of allocations) {
                if (remainingReceived <= 0) break;

                const receivedForLot = Math.min(
                  Number(alloc.quantityAllocated),
                  remainingReceived,
                );

                if (receivedForLot > 0) {
                  // Lock lot in target warehouse
                  await this.lockService.lockLots(
                    tx,
                    transfer.toWarehouseId,
                    item.id,
                    [alloc.lotId],
                  );

                  // Upsert lot balance in target warehouse
                  await tx.warehouseItemLot.upsert({
                    where: {
                      warehouseId_itemId_lotId: {
                        warehouseId: transfer.toWarehouseId,
                        itemId: item.id,
                        lotId: alloc.lotId,
                      },
                    },
                    create: {
                      warehouseId: transfer.toWarehouseId,
                      itemId: item.id,
                      lotId: alloc.lotId,
                      qtyOnHand: receivedForLot,
                      qtyAllocated: 0,
                    },
                    update: {
                      qtyOnHand: { increment: receivedForLot },
                    },
                  });

                  // Create StockLedger entry for TRANSFER_IN at destination warehouse
                  await tx.stockLedger.create({
                    data: {
                      warehouseId: transfer.toWarehouseId,
                      itemId: item.id,
                      lotId: alloc.lotId,
                      quantity: receivedForLot,
                      documentId: transfer.id,
                      documentType: DocumentType.TRANSFER,
                      idempotencyKey: `${DocumentType.TRANSFER}:stock_receive:${transfer.id}:${item.id}:${alloc.lotId}:${line.id}`,
                    },
                  });

                  remainingReceived -= receivedForLot;
                }
              }
            } else {
              // Create StockLedger entry
              await tx.stockLedger.create({
                data: {
                  warehouseId: transfer.toWarehouseId,
                  itemId: item.id,
                  lotId: null,
                  quantity: baseReceivedQty,
                  documentId: transfer.id,
                  documentType: DocumentType.TRANSFER,
                  idempotencyKey: `${DocumentType.TRANSFER}:stock_receive:${transfer.id}:${item.id}:${line.id}`,
                },
              });
            }

            // Recalculate WAC and log cost ledger using central WacService
            const receiveCostIdempotencyKey = `${DocumentType.TRANSFER}:cost_receive:${transfer.id}:${item.id}:${line.id}`;
            await this.wacService.handleTransferReceipt(
              tx,
              transfer.toWarehouseId,
              item.id,
              baseReceivedQty,
              Number(sourceWac),
              transfer.id,
              receiveCostIdempotencyKey,
            );

            // Log Transit Loss if there is a discrepancy
            const discrepancy = baseShippedQty - baseReceivedQty;
            if (discrepancy > 0) {
              let transitLossWh = await tx.warehouse.findUnique({
                where: { code: 'TRANSIT_LOSS' },
              });
              if (!transitLossWh) {
                const toWh = await tx.warehouse.findUnique({
                  where: { id: transfer.toWarehouseId },
                  select: { branchId: true },
                });
                if (!toWh) {
                  throw new NotFoundException(
                    `Destination warehouse with ID ${transfer.toWarehouseId} not found`,
                  );
                }
                transitLossWh = await tx.warehouse.create({
                  data: {
                    code: 'TRANSIT_LOSS',
                    name: 'Transit Loss Expense Warehouse',
                    branchId: toWh.branchId,
                    isActive: false,
                  },
                });
              }

              const discrepancyDec = new Prisma.Decimal(discrepancy);

              await tx.warehouseItem.upsert({
                where: {
                  warehouseId_itemId: {
                    warehouseId: transitLossWh.id,
                    itemId: item.id,
                  },
                },
                create: {
                  warehouseId: transitLossWh.id,
                  itemId: item.id,
                  qtyOnHand: discrepancyDec,
                  qtyAllocated: 0,
                  wac: sourceWac,
                },
                update: {
                  qtyOnHand: { increment: discrepancyDec },
                },
              });

              const transitLossStockKey = `${DocumentType.TRANSFER}:stock_transit_loss:${transfer.id}:${item.id}:${line.id}`;
              await tx.stockLedger.create({
                data: {
                  warehouseId: transitLossWh.id,
                  itemId: item.id,
                  lotId: null,
                  quantity: discrepancyDec,
                  documentId: transfer.id,
                  documentType: DocumentType.TRANSFER,
                  idempotencyKey: transitLossStockKey,
                },
              });

              const transitLossCostKey = `${DocumentType.TRANSFER}:cost_transit_loss:${transfer.id}:${item.id}:${line.id}`;
              await tx.costLedger.create({
                data: {
                  warehouseId: transitLossWh.id,
                  itemId: item.id,
                  quantity: discrepancyDec,
                  unitPrice: sourceWac,
                  newWac: sourceWac,
                  documentId: transfer.id,
                  documentType: DocumentType.TRANSFER,
                  idempotencyKey: transitLossCostKey,
                },
              });
            }
          }

          // 3. Update Transfer status to RECEIVED with version check
          const updateResult = await tx.transfer.updateMany({
            where: { id: transferId, version: lockedDoc.version },
            data: {
              status: 'RECEIVED',
              version: lockedDoc.version + 1,
            },
          });
          if (updateResult.count === 0) {
            throw new BadRequestException('Version conflict detected');
          }

          const updatedTransfer = await tx.transfer.findUnique({
            where: { id: transferId },
          });
          if (!updatedTransfer) {
            throw new NotFoundException(
              `Transfer with ID ${transferId} not found`,
            );
          }

          this.metricsService.postingOperationsCounter.inc({
            document_type: 'TRANSFER',
          });

          // 4. Record ApprovalEvent
          const stepNumber =
            (await tx.approvalEvent.count({
              where: {
                documentId: transfer.id,
                documentType: DocumentType.TRANSFER,
              },
            })) + 1;

          await tx.approvalEvent.create({
            data: {
              documentId: transfer.id,
              documentType: DocumentType.TRANSFER,
              fromStatus: 'IN_TRANSIT',
              toStatus: 'RECEIVED',
              actionPerformed: 'RECEIVE',
              userId,
              userRole: userRole,
              stepNumber,
            },
          });

          // 5. Record AuditLog
          await tx.auditLog.create({
            data: {
              userId,
              action: 'WORKFLOW_RECEIVE_SUCCESS',
              targetTable: 'transfers',
              targetId: transfer.id,
              beforeStateJson: JSON.stringify({
                status: transfer.status,
                version: transfer.version,
              }),
              afterStateJson: JSON.stringify({
                status: 'RECEIVED',
                version: transfer.version + 1,
              }),
              ipAddress: ipAddress || null,
            },
          });

          const toWh = tx.warehouse
            ? await tx.warehouse.findUnique({
                where: { id: transfer.toWarehouseId },
                select: { name: true },
              })
            : null;
          const user = tx.user
            ? await tx.user.findUnique({
                where: { id: userId },
                select: { name: true },
              })
            : null;

          // Dispatch TRANSFER_RECEIVED outbox event
          await this.outboxService.writeEvent(tx, 'TRANSFER_RECEIVED', {
            id: transfer.id,
            documentNumber: transfer.transferNumber || transfer.id,
            fromWarehouseId: transfer.fromWarehouseId,
            toWarehouseId: transfer.toWarehouseId,
            warehouseName: toWh?.name || 'N/A',
            userName: user?.name || 'N/A',
          });

          // Notification log for source warehouse keeper
          await tx.notificationLog.create({
            data: {
              targetRole: Role.WH_KEEPER,
              warehouseId: transfer.fromWarehouseId,
              message: `Transfer ${transfer.transferNumber || transfer.id} has been received by destination warehouse.`,
              isRead: false,
              documentType: DocumentType.TRANSFER,
              documentId: transfer.id,
            },
          });

          // Notification log for destination warehouse keeper
          await tx.notificationLog.create({
            data: {
              targetRole: Role.WH_KEEPER,
              warehouseId: transfer.toWarehouseId,
              message: `Transfer ${transfer.transferNumber || transfer.id} has been successfully received and stocked.`,
              isRead: false,
              documentType: DocumentType.TRANSFER,
              documentId: transfer.id,
            },
          });

          // Notification log for inventory manager at destination warehouse
          await tx.notificationLog.create({
            data: {
              targetRole: Role.INV_MGR,
              warehouseId: transfer.toWarehouseId,
              message: `Transfer ${transfer.transferNumber || transfer.id} has been successfully received and stocked.`,
              isRead: false,
              documentType: DocumentType.TRANSFER,
              documentId: transfer.id,
            },
          });

          // Notification log for administrator at destination warehouse
          await tx.notificationLog.create({
            data: {
              targetRole: Role.ADMIN,
              warehouseId: transfer.toWarehouseId,
              message: `Transfer ${transfer.transferNumber || transfer.id} has been successfully received and stocked.`,
              isRead: false,
              documentType: DocumentType.TRANSFER,
              documentId: transfer.id,
            },
          });

          return updatedTransfer;
        },
        { timeout: 30000 },
      );
    } catch (error: unknown) {
      const logger = new Logger(TransferPostService.name);
      const errorMsg =
        error instanceof Error ? error.stack || error.message : String(error);
      logger.error(
        `Transfer RECEIVE failed for user ${userId}: ${errorMsg}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof ForbiddenException) {
        let action = 'WORKFLOW_RECEIVE_FAILED';
        if (
          errorMsg.includes(
            'not authorized for the destination warehouse branch',
          )
        ) {
          action = 'UNAUTHORIZED_TRANSFER_RECEIVE';
        }

        try {
          const transfer = await this.prisma.transfer.findUnique({
            where: { id: transferId },
            select: { status: true, version: true, toWarehouseId: true },
          });

          await this.prisma.auditLog.create({
            data: {
              userId,
              action,
              targetTable: 'transfers',
              targetId: transferId,
              beforeStateJson: transfer
                ? JSON.stringify({
                    status: transfer.status,
                    version: transfer.version,
                  })
                : '{}',
              afterStateJson: JSON.stringify({
                error: errorMsg,
                userRole,
                warehouseId: transfer?.toWarehouseId || null,
              }),
              ipAddress: ipAddress || null,
            },
          });
        } catch (auditError: unknown) {
          const auditErrorMsg =
            auditError instanceof Error
              ? auditError.message
              : String(auditError);
          logger.error(
            `Failed to write failed RECEIVE audit log: ${auditErrorMsg}`,
          );
        }
      }

      throw error;
    }
  }
}
