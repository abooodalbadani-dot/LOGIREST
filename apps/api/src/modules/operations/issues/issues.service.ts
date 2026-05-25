import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { Role } from '@logirest/shared-types';
import { DocumentSequenceService } from '../../sequencing/document-sequence.service';
import { DocumentType } from '@prisma/client';

@Injectable()
export class IssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentSequenceService: DocumentSequenceService,
  ) {}

  async create(
    body: {
      departmentId: string;
      lines: Array<{ itemId: string; quantity: number }>;
    },
    userId: string,
    activeWarehouseId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const warehouse = await tx.warehouse.findUnique({
          where: { id: activeWarehouseId },
          select: { branchId: true },
        });
        if (!warehouse) {
          throw new NotFoundException(
            `Warehouse with ID ${activeWarehouseId} not found`,
          );
        }

        const issueNumber = await this.documentSequenceService.generateNext(
          tx,
          DocumentType.INVENTORY_ISSUE,
          warehouse.branchId,
        );

        return tx.inventoryIssue.create({
          data: {
            issueNumber,
            warehouseId: activeWarehouseId,
            departmentId: body.departmentId,
            status: 'DRAFT',
            lines: {
              create: body.lines.map((line) => ({
                itemId: line.itemId,
                quantity: line.quantity,
              })),
            },
          },
          include: {
            lines: {
              include: {
                item: true,
              },
            },
          },
        });
      },
      { timeout: 30000 },
    );
  }

  async findOne(id: string) {
    const issue = await this.prisma.inventoryIssue.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            item: true,
          },
        },
        department: true,
        warehouse: true,
      },
    });

    if (!issue) {
      throw new NotFoundException(`Inventory Issue with ID ${id} not found`);
    }

    return issue;
  }

  async submit(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'inventoryIssue',
      'SUBMIT',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }

  async cancel(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'inventoryIssue',
      'CANCEL',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }
}
