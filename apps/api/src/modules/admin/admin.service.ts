import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  UserRole,
  ROLE_METADATA,
  canRolePerformAction,
  RoleDescriptor,
  Permission,
} from '@logirest/shared-types';
import { encrypt, decrypt } from './crypto.util';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

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

  async getSettings(): Promise<{
    id: string;
    systemName: string;
    baseCurrency: string;
    branchId: string;
    timezone: string;
    localeDefault: string;
    senderName: string;
    replyToEmail: string;
    hasTransactions: boolean;
    mailProvider: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    smtpEncryption: string;
    version: number;
    updatedAt: string;
  }> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'system_settings' },
    });

    const grnCount = await this.prisma.goodsReceivedNote.count();
    const issueCount = await this.prisma.inventoryIssue.count();
    const hasTransactions = grnCount > 0 || issueCount > 0;

    const defaultSettings = {
      id: 'system_settings',
      systemName: 'LogiRest System',
      baseCurrency: process.env.BASE_CURRENCY_CODE || 'SAR',
      branchId: 'HQ',
      timezone: 'Asia/Riyadh',
      localeDefault: 'en',
      senderName: 'LogiRest Alerts',
      replyToEmail: 'alerts@logirest.app',
      hasTransactions,
      mailProvider: 'smtp',
      smtpHost: process.env.SMTP_HOST || '',
      smtpPort: Number(process.env.SMTP_PORT) || 587,
      smtpUser: process.env.SMTP_USER || '',
      smtpPassword: process.env.SMTP_PASS ? '********' : '',
      smtpEncryption: 'tls',
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    if (!setting) {
      return defaultSettings;
    }

    let saved: Record<string, unknown> = {};
    try {
      saved = JSON.parse(setting.value) as Record<string, unknown>;
    } catch (e: unknown) {
      this.logger.error(
        `Failed to parse system settings JSON from DB: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    // Stored blob may be in snake_case (legacy) – normalize to camelCase on read
    return {
      id: 'system_settings',
      systemName: (saved.systemName ??
        saved.system_name ??
        defaultSettings.systemName) as string,
      baseCurrency: (saved.baseCurrency ??
        saved.base_currency ??
        defaultSettings.baseCurrency) as string,
      branchId: (saved.branchId ??
        saved.branch_id ??
        defaultSettings.branchId) as string,
      timezone: (saved.timezone ?? defaultSettings.timezone) as string,
      localeDefault: (saved.localeDefault ??
        saved.locale_default ??
        defaultSettings.localeDefault) as string,
      senderName: (saved.senderName ??
        saved.sender_name ??
        defaultSettings.senderName) as string,
      replyToEmail: (saved.replyToEmail ??
        saved.reply_to_email ??
        defaultSettings.replyToEmail) as string,
      hasTransactions,
      mailProvider: (saved.mailProvider ??
        saved.mail_provider ??
        defaultSettings.mailProvider) as string,
      smtpHost: (saved.smtpHost ??
        saved.smtp_host ??
        defaultSettings.smtpHost) as string,
      smtpPort: Number(
        saved.smtpPort ?? saved.smtp_port ?? defaultSettings.smtpPort,
      ),
      smtpUser: (saved.smtpUser ??
        saved.smtp_user ??
        defaultSettings.smtpUser) as string,
      smtpPassword:
        (saved.smtpPassword ?? saved.smtp_password) ? '********' : '',
      smtpEncryption: (saved.smtpEncryption ??
        saved.smtp_encryption ??
        defaultSettings.smtpEncryption) as string,
      version: setting.version,
      updatedAt: setting.updatedAt.toISOString(),
    };
  }

  async updateSettings(
    dto: UpdateSettingsDto,
    userId: string,
  ): Promise<ReturnType<AdminService['getSettings']>> {
    const existing = await this.prisma.systemSetting.findUnique({
      where: { key: 'system_settings' },
    });

    let savedConfig: Record<string, unknown> = {};
    if (existing) {
      try {
        savedConfig = JSON.parse(existing.value) as Record<string, unknown>;
      } catch (e: unknown) {
        this.logger.error(
          `Failed to parse existing system settings JSON from DB: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    let password = dto.smtpPassword;
    if (password === '********') {
      const storedPass = savedConfig.smtpPassword ?? savedConfig.smtp_password;
      password = storedPass ? decrypt(storedPass as string) : '';
    }

    const encryptedPassword = password ? encrypt(password) : '';

    // Store internally in camelCase going forward
    const newConfig: Record<string, unknown> = {
      ...savedConfig,
      systemName: dto.systemName,
      baseCurrency: dto.baseCurrency,
      branchId: dto.branchId,
      timezone: dto.timezone,
      localeDefault: dto.localeDefault,
      senderName: dto.senderName,
      replyToEmail: dto.replyToEmail,
      mailProvider: dto.mailProvider || 'smtp',
      smtpHost: dto.smtpHost || '',
      smtpPort: dto.smtpPort || 587,
      smtpUser: dto.smtpUser || '',
      smtpPassword: encryptedPassword,
      smtpEncryption: dto.smtpEncryption || 'none',
      updatedBy: userId,
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
        pageSize: limit,
        totalPages: Math.ceil(total / limit) || 1,
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
