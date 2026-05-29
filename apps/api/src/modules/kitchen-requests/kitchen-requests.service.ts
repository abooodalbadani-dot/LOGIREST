import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { Role } from '@logirest/shared-types';

@Injectable()
export class KitchenRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
  ) {}

  async create(
    body: {
      departmentId: string;
      warehouseId: string;
      items: Array<{ itemId: string; quantityRequested: number }>;
    },
    userId: string,
  ) {
    const requestNumber = `KR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.kitchenRequest.create({
      data: {
        requestNumber,
        departmentId: body.departmentId,
        warehouseId: body.warehouseId,
        status: 'DRAFT',
        items: {
          create: body.items.map((item) => ({
            itemId: item.itemId,
            quantityRequested: item.quantityRequested,
            quantityFulfilled: 0,
          })),
        },
      },
      include: {
        items: {
          include: {
            item: {
              include: {
                unitOfMeasure: true,
              },
            },
          },
        },
        department: true,
        warehouse: true,
      },
    });
  }

  async findAll(
    params: { status?: string; search?: string; page?: number },
    warehouseId?: string,
  ) {
    const page = Number(params.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) {
      where.status = params.status;
    }
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }
    if (params.search) {
      where.OR = [
        { requestNumber: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.kitchenRequest.findMany({
        where,
        include: {
          items: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                },
              },
            },
          },
          department: true,
          warehouse: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.kitchenRequest.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const request = await this.prisma.kitchenRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: {
              include: {
                unitOfMeasure: true,
              },
            },
          },
        },
        department: true,
        warehouse: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`Kitchen Request with ID ${id} not found`);
    }

    return request;
  }

  async submit(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'kitchenRequest',
      'SUBMIT',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }

  async fulfill(
    id: string,
    userId: string,
    userRole: Role,
    body: {
      comments?: string;
      version?: number;
      ipAddress?: string;
      fulfillments?: Array<{ itemId: string; fulfilledQty: number }>;
    },
  ) {
    const kr = await this.prisma.kitchenRequest.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!kr) {
      throw new NotFoundException(`KitchenRequest with ID ${id} not found`);
    }

    if (kr.status !== 'SUBMITTED') {
      throw new BadRequestException(
        `KitchenRequest must be in SUBMITTED status to be fulfilled. (Current: ${kr.status})`,
      );
    }

    if (body.fulfillments) {
      for (const itemInput of body.fulfillments) {
        const dbItem = kr.items.find((i) => i.itemId === itemInput.itemId);
        if (!dbItem) {
          throw new BadRequestException(
            `Item with ID ${itemInput.itemId} is not part of this request`,
          );
        }
        await this.prisma.kitchenRequestItem.update({
          where: { id: dbItem.id },
          data: { quantityFulfilled: itemInput.fulfilledQty },
        });
      }
    } else {
      for (const dbItem of kr.items) {
        await this.prisma.kitchenRequestItem.update({
          where: { id: dbItem.id },
          data: { quantityFulfilled: dbItem.quantityRequested },
        });
      }
    }

    return this.workflowService.executeTransition(
      id,
      'kitchenRequest',
      'FULFILL',
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
      'kitchenRequest',
      'CANCEL',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }
}
