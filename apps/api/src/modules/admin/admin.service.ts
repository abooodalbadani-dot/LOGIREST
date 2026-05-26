import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  UserRole,
  ROLE_METADATA,
  canRolePerformAction,
  RoleDescriptor,
  Permission,
} from '@logirest/shared-types';
import { encrypt, decrypt } from './crypto.util';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private getPermissionsForRole(role: UserRole): Permission[] {
    const modules = [
      'Inventory',
      'Procurement',
      'Operations',
      'Admin',
      'Reports',
      'Communications',
    ];

    return modules.map((module) => {
      let view = false;
      let create = false;
      let edit = false;
      let approve = false;
      let post = false;

      if (role === 'ADMIN') {
        view = true;
        create = true;
        edit = true;
        approve = true;
        post = true;
      } else {
        switch (module) {
          case 'Inventory':
            view =
              canRolePerformAction('stocktake', 'view', role) ||
              canRolePerformAction('adjustment', 'view', role);
            create =
              canRolePerformAction('stocktake', 'create', role) ||
              canRolePerformAction('adjustment', 'create', role);
            edit =
              canRolePerformAction('stocktake', 'count', role) ||
              canRolePerformAction('adjustment', 'edit', role);
            approve =
              canRolePerformAction('stocktake', 'approve', role) ||
              canRolePerformAction('adjustment', 'approve', role);
            post =
              canRolePerformAction('stocktake', 'post', role) ||
              canRolePerformAction('adjustment', 'post', role);
            break;
          case 'Procurement':
            view =
              canRolePerformAction('pr', 'view', role) ||
              canRolePerformAction('po', 'view', role) ||
              canRolePerformAction('grn', 'view', role);
            create =
              canRolePerformAction('pr', 'create', role) ||
              canRolePerformAction('po', 'create', role) ||
              canRolePerformAction('grn', 'create', role);
            edit =
              canRolePerformAction('pr', 'submit', role) ||
              canRolePerformAction('po', 'submit', role) ||
              canRolePerformAction('grn', 'cancel', role);
            approve =
              canRolePerformAction('pr', 'approve', role) ||
              canRolePerformAction('po', 'approve', role);
            post = canRolePerformAction('grn', 'post', role);
            break;
          case 'Operations':
            view =
              canRolePerformAction('transfer', 'view', role) ||
              canRolePerformAction('issue', 'view', role) ||
              canRolePerformAction('kitchen_request', 'view', role);
            create =
              canRolePerformAction('transfer', 'create', role) ||
              canRolePerformAction('issue', 'create', role) ||
              canRolePerformAction('kitchen_request', 'create', role);
            edit =
              canRolePerformAction('transfer', 'ship', role) ||
              canRolePerformAction('issue', 'submit', role);
            approve =
              canRolePerformAction('kitchen_request', 'fulfill', role) ||
              canRolePerformAction('transfer', 'receive', role);
            post = canRolePerformAction('issue', 'post', role);
            break;
          case 'Reports':
            view = role !== 'WH_KEEPER' && role !== 'VIEWER';
            create = role === 'INV_MGR' || role === 'STORE_MGR';
            edit = false;
            approve = false;
            post = false;
            break;
          case 'Communications':
            view = role !== 'VIEWER';
            create = role === 'INV_MGR';
            edit = false;
            approve = false;
            post = false;
            break;
          default:
            break;
        }
      }

      return {
        module,
        actions: { view, create, edit, approve, post },
      };
    });
  }

  async getRoles(): Promise<RoleDescriptor[]> {
    // 1. Group active users by role on the database side
    const userGroups = await this.prisma.user.groupBy({
      by: ['role'],
      _count: true,
      where: {
        isActive: true,
      },
    });

    // Create a lookup map of active user counts: role -> count
    const countMap = new Map<string, number>();
    for (const group of userGroups) {
      countMap.set(group.role, group._count);
    }

    // 2. Map all system roles defined in ROLE_METADATA to return the complete descriptor list
    const rolesList: RoleDescriptor[] = Object.keys(ROLE_METADATA).map(
      (roleKey) => {
        const userRole = roleKey as UserRole;
        const metadata = ROLE_METADATA[userRole];
        const userCount = countMap.get(userRole) ?? 0;
        const permissions = this.getPermissionsForRole(userRole);

        return {
          id: userRole,
          displayName: metadata.displayName,
          description: metadata.description,
          userCount,
          permissions,
        };
      },
    );

    return rolesList;
  }

  async getSettings(): Promise<any> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'system_settings' },
    });

    const grnCount = await this.prisma.goodsReceivedNote.count();
    const issueCount = await this.prisma.inventoryIssue.count();
    const hasTransactions = grnCount > 0 || issueCount > 0;

    const defaultSettings = {
      id: 'system_settings',
      system_name: 'LogiRest System',
      base_currency: process.env.BASE_CURRENCY_CODE || 'SAR',
      branch_id: 'HQ',
      timezone: 'Asia/Riyadh',
      locale_default: 'en' as const,
      sender_name: 'LogiRest Alerts',
      reply_to_email: 'alerts@logirest.app',
      has_transactions: hasTransactions,
      mail_provider: 'smtp' as const,
      smtp_host: process.env.SMTP_HOST || '',
      smtp_port: Number(process.env.SMTP_PORT) || 587,
      smtp_user: process.env.SMTP_USER || '',
      smtp_password: process.env.SMTP_PASS ? '********' : '',
      smtp_encryption: 'tls' as const,
      version: 1,
      updated_at: new Date().toISOString(),
    };

    if (!setting) {
      return defaultSettings;
    }

    const saved = JSON.parse(setting.value);
    return {
      ...defaultSettings,
      ...saved,
      has_transactions: hasTransactions,
      smtp_password: saved.smtp_password ? '********' : '',
      version: setting.version,
      updated_at: setting.updatedAt.toISOString(),
    };
  }

  async updateSettings(dto: any, userId: string): Promise<any> {
    const existing = await this.prisma.systemSetting.findUnique({
      where: { key: 'system_settings' },
    });

    const savedConfig = existing ? JSON.parse(existing.value) : {};

    let password = dto.smtp_password;
    if (password === '********') {
      password = savedConfig.smtp_password
        ? decrypt(savedConfig.smtp_password)
        : '';
    }

    const encryptedPassword = password ? encrypt(password) : '';

    const newConfig = {
      ...savedConfig,
      system_name: dto.system_name,
      base_currency: dto.base_currency,
      branch_id: dto.branch_id,
      timezone: dto.timezone,
      locale_default: dto.locale_default,
      sender_name: dto.sender_name,
      reply_to_email: dto.reply_to_email,
      mail_provider: dto.mail_provider || 'smtp',
      smtp_host: dto.smtp_host || '',
      smtp_port: Number(dto.smtp_port) || 587,
      smtp_user: dto.smtp_user || '',
      smtp_password: encryptedPassword,
      smtp_encryption: dto.smtp_encryption || 'none',
      updated_by: userId,
    };

    await this.prisma.systemSetting.upsert({
      where: { key: 'system_settings' },
      update: {
        value: JSON.stringify(newConfig),
        version: { increment: 1 },
      },
      create: {
        key: 'system_settings',
        value: JSON.stringify(newConfig),
        version: 1,
      },
    });

    return this.getSettings();
  }

  async getFailedOutboxEvents(
    page: number = 1,
    limit: number = 50,
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const [total, events] = await Promise.all([
      this.prisma.outboxEvent.count({ where: { status: 'FAILED' } }),
      this.prisma.outboxEvent.findMany({
        where: { status: 'FAILED' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);
    return {
      data: events,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async retryOutboxEvent(id: string): Promise<any> {
    const event = await this.prisma.outboxEvent.findUnique({
      where: { id },
    });
    if (!event) {
      throw new Error(`Outbox event with ID ${id} not found.`);
    }
    return this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'PENDING',
        attempts: 0,
        lastError: null,
      },
    });
  }

  async getFrozenItems(): Promise<any> {
    return this.prisma.warehouseItem.findMany({
      where: { isFrozen: true },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });
  }

  async unfreezeItem(
    warehouseId: string,
    itemId: string,
    userId: string,
  ): Promise<any> {
    const item = await this.prisma.warehouseItem.findUnique({
      where: {
        warehouseId_itemId: { warehouseId, itemId },
      },
      include: {
        item: true,
      },
    });

    if (!item) {
      throw new Error('Warehouse item not found.');
    }

    if (!item.isFrozen) {
      return item;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const up = await tx.warehouseItem.update({
        where: {
          warehouseId_itemId: { warehouseId, itemId },
        },
        data: {
          isFrozen: false,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UNFREEZE_ITEM',
          targetTable: 'warehouse_items',
          targetId: `${warehouseId}_${itemId}`,
          beforeStateJson: JSON.stringify({ isFrozen: true }),
          afterStateJson: JSON.stringify({ isFrozen: false }),
        },
      });

      return up;
    });

    return updated;
  }
}
