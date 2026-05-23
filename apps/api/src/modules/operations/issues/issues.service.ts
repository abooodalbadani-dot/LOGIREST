import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { Role } from '@logirest/shared-types';

@Injectable()
export class IssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
  ) {}

  async create(
    body: {
      departmentId: string;
      lines: Array<{ itemId: string; quantity: number }>;
    },
    userId: string,
    activeWarehouseId: string,
  ) {
    const issueNumber = `ISS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.inventoryIssue.create({
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
