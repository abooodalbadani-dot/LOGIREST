import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BcryptService } from '../../auth/bcrypt.service';
import { OutboxEvent, WarehouseItem } from '@prisma/client';

export interface FrozenItem {
  warehouseId: string;
  itemId: string;
  isFrozen: boolean;
  warehouse: {
    id: string;
    name: string | null;
    code: string;
  };
  item: {
    id: string;
    name: string;
    sku: string;
  };
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bcrypt: BcryptService,
  ) {}

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
    printSettings?: {
      defaultPaperSize: 'A4' | '80mm' | '58mm';
      thermalShowLogo: boolean;
      autoPrintOnFulfill: boolean;
    };
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
      baseCurrency: process.env.BASE_CURRENCY_CODE || 'USD',
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
      printSettings: {
        defaultPaperSize: 'A4' as const,
        thermalShowLogo: true,
        autoPrintOnFulfill: false,
      },
    };

    if (!setting) {
      return defaultSettings;
    }

    interface SystemPrintSettings {
      defaultPaperSize?: 'A4' | '80mm' | '58mm';
      default_paper_size?: 'A4' | '80mm' | '58mm';
      thermalShowLogo?: boolean;
      thermal_show_logo?: boolean;
      autoPrintOnFulfill?: boolean;
      auto_print_on_fulfill?: boolean;
    }

    interface SavedSystemSettings extends Record<string, unknown> {
      printSettings?: SystemPrintSettings;
      print_settings?: SystemPrintSettings;
    }

    let saved: SavedSystemSettings = {};
    try {
      saved = JSON.parse(setting.value) as SavedSystemSettings;
    } catch (e: unknown) {
      this.logger.error(
        `Failed to parse system settings JSON from DB: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    // Stored blob may be in snake_case (legacy) – normalize to camelCase on read
    const printSettingsData = saved.printSettings ?? saved.print_settings ?? {};
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
      printSettings: {
        defaultPaperSize:
          printSettingsData.defaultPaperSize ??
          printSettingsData.default_paper_size ??
          defaultSettings.printSettings.defaultPaperSize,
        thermalShowLogo: !!(
          printSettingsData.thermalShowLogo ??
          printSettingsData.thermal_show_logo ??
          defaultSettings.printSettings.thermalShowLogo
        ),
        autoPrintOnFulfill: !!(
          printSettingsData.autoPrintOnFulfill ??
          printSettingsData.auto_print_on_fulfill ??
          defaultSettings.printSettings.autoPrintOnFulfill
        ),
      },
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
      printSettings: dto.printSettings
        ? {
            defaultPaperSize: dto.printSettings.defaultPaperSize || 'A4',
            thermalShowLogo: dto.printSettings.thermalShowLogo ?? true,
            autoPrintOnFulfill: dto.printSettings.autoPrintOnFulfill ?? false,
          }
        : (savedConfig.printSettings ??
          savedConfig.print_settings ?? {
            defaultPaperSize: 'A4',
            thermalShowLogo: true,
            autoPrintOnFulfill: false,
          }),
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

  async getAllOutboxEvents(
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    data: OutboxEvent[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const [total, events] = await Promise.all([
      this.prisma.outboxEvent.count(),
      this.prisma.outboxEvent.findMany({
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

  async getFailedOutboxEvents(
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    data: OutboxEvent[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
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

  async retryOutboxEvent(id: string): Promise<OutboxEvent> {
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

  async getFrozenItems(): Promise<FrozenItem[]> {
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
  ): Promise<WarehouseItem> {
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

  async getUsers(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        include: {
          warehouseScopes: {
            include: {
              warehouse: {
                include: {
                  branch: true,
                },
              },
            },
          },
          departmentScopes: {
            include: {
              department: {
                include: {
                  branch: true,
                },
              },
            },
          },
          branchScopes: {
            include: {
              branch: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    const mappedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      scopes: [
        ...(user.warehouseScopes || []).map((s) => ({
          branchId: s.warehouse?.branchId ?? null,
          warehouseId: s.warehouseId,
          departmentId: null,
          warehouse: s.warehouse
            ? {
                id: s.warehouse.id,
                name: s.warehouse.name,
                branch: s.warehouse.branch
                  ? {
                      id: s.warehouse.branch.id,
                      name: s.warehouse.branch.name,
                    }
                  : null,
              }
            : null,
          department: null,
        })),
        ...(user.departmentScopes || []).map((s) => ({
          branchId: s.department?.branchId ?? null,
          warehouseId: null,
          departmentId: s.departmentId,
          warehouse: null,
          branch: s.department?.branch
            ? {
                id: s.department.branch.id,
                name: s.department.branch.name,
              }
            : null,
          department: s.department
            ? {
                id: s.department.id,
                name: s.department.name,
              }
            : null,
        })),
        ...(user.branchScopes || []).map((s) => ({
          branchId: s.branchId,
          warehouseId: null,
          departmentId: null,
          warehouse: null,
          department: null,
          branch: s.branch
            ? {
                id: s.branch.id,
                name: s.branch.name,
              }
            : null,
        })),
      ],
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      language: 'en',
      createdAt: user.createdAt.toISOString(),
    }));

    return {
      data: mappedUsers,
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        warehouseScopes: {
          include: {
            warehouse: {
              include: {
                branch: true,
              },
            },
          },
        },
        departmentScopes: {
          include: {
            department: {
              include: {
                branch: true,
              },
            },
          },
        },
        branchScopes: {
          include: {
            branch: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      scopes: [
        ...(user.warehouseScopes || []).map((s) => ({
          branchId: s.warehouse?.branchId ?? null,
          warehouseId: s.warehouseId,
          departmentId: null,
          warehouse: s.warehouse
            ? {
                id: s.warehouse.id,
                name: s.warehouse.name,
                branch: s.warehouse.branch
                  ? {
                      id: s.warehouse.branch.id,
                      name: s.warehouse.branch.name,
                    }
                  : null,
              }
            : null,
          department: null,
        })),
        ...(user.departmentScopes || []).map((s) => ({
          branchId: s.department?.branchId ?? null,
          warehouseId: null,
          departmentId: s.departmentId,
          warehouse: null,
          branch: s.department?.branch
            ? {
                id: s.department.branch.id,
                name: s.department.branch.name,
              }
            : null,
          department: s.department
            ? {
                id: s.department.id,
                name: s.department.name,
              }
            : null,
        })),
        ...(user.branchScopes || []).map((s) => ({
          branchId: s.branchId,
          warehouseId: null,
          departmentId: null,
          warehouse: null,
          department: null,
          branch: s.branch
            ? {
                id: s.branch.id,
                name: s.branch.name,
              }
            : null,
        })),
      ],
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      language: 'en',
      createdAt: user.createdAt.toISOString(),
    };
  }

  async createUser(dto: CreateUserDto, currentUserId: string) {
    const emailLower = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: emailLower },
    });
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const passwordHash = await this.bcrypt.hash('Password123!');

    const newUser = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: dto.name,
          email: emailLower,
          passwordHash,
          role: dto.role,
          isActive: dto.status === 'ACTIVE',
        },
      });

      if (dto.warehouseIds && dto.warehouseIds.length > 0) {
        const uniqueWarehouseIds = Array.from(new Set(dto.warehouseIds));
        await tx.userWarehouseScope.createMany({
          data: uniqueWarehouseIds.map((whId) => ({
            userId: created.id,
            warehouseId: whId,
          })),
        });
      }

      if (dto.branchIds && dto.branchIds.length > 0) {
        const uniqueBranchIds = Array.from(new Set(dto.branchIds));
        await tx.userBranchScope.createMany({
          data: uniqueBranchIds.map((branchId) => ({
            userId: created.id,
            branchId,
          })),
        });
      }

      if (dto.departmentIds && dto.departmentIds.length > 0) {
        const uniqueDeptIds = Array.from(new Set(dto.departmentIds));
        await tx.userDepartmentScope.createMany({
          data: uniqueDeptIds.map((deptId) => ({
            userId: created.id,
            departmentId: deptId,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          userId: currentUserId,
          action: 'CREATE_USER',
          targetTable: 'users',
          targetId: created.id,
          beforeStateJson: JSON.stringify({}),
          afterStateJson: JSON.stringify({
            name: created.name,
            email: created.email,
            role: created.role,
            isActive: created.isActive,
            warehouseIds: dto.warehouseIds || [],
            branchIds: dto.branchIds || [],
            departmentIds: dto.departmentIds || [],
          }),
        },
      });

      return created;
    });

    return this.getUser(newUser.id);
  }

  async updateUser(id: string, dto: UpdateUserDto, currentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        warehouseScopes: true,
        branchScopes: true,
        departmentScopes: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    const emailLower = dto.email.toLowerCase();
    if (emailLower !== user.email.toLowerCase()) {
      const existing = await this.prisma.user.findUnique({
        where: { email: emailLower },
      });
      if (existing) {
        throw new BadRequestException('Email already exists');
      }
    }

    if (currentUserId === id) {
      if (dto.role !== 'ADMIN' || dto.status === 'INACTIVE') {
        throw new BadRequestException('Cannot modify self');
      }
    }

    const isCurrentlyActiveAdmin = user.role === 'ADMIN' && user.isActive;
    const isDemotingOrDeactivating =
      dto.role !== 'ADMIN' || dto.status === 'INACTIVE';

    if (isCurrentlyActiveAdmin && isDemotingOrDeactivating) {
      const activeAdminsCount = await this.prisma.user.count({
        where: {
          role: 'ADMIN',
          isActive: true,
        },
      });

      if (activeAdminsCount <= 1) {
        throw new BadRequestException(
          'Cannot deactivate/demote the last active admin',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          name: dto.name,
          email: emailLower,
          role: dto.role,
          isActive: dto.status === 'ACTIVE',
          version: { increment: 1 },
        },
      });

      await tx.userWarehouseScope.deleteMany({
        where: { userId: id },
      });

      if (dto.warehouseIds && dto.warehouseIds.length > 0) {
        const uniqueWarehouseIds = Array.from(new Set(dto.warehouseIds));
        await tx.userWarehouseScope.createMany({
          data: uniqueWarehouseIds.map((whId) => ({
            userId: id,
            warehouseId: whId,
          })),
        });
      }

      await tx.userBranchScope.deleteMany({
        where: { userId: id },
      });

      if (dto.branchIds && dto.branchIds.length > 0) {
        const uniqueBranchIds = Array.from(new Set(dto.branchIds));
        await tx.userBranchScope.createMany({
          data: uniqueBranchIds.map((branchId) => ({
            userId: id,
            branchId,
          })),
        });
      }

      await tx.userDepartmentScope.deleteMany({
        where: { userId: id },
      });

      if (dto.departmentIds && dto.departmentIds.length > 0) {
        const uniqueDeptIds = Array.from(new Set(dto.departmentIds));
        await tx.userDepartmentScope.createMany({
          data: uniqueDeptIds.map((deptId) => ({
            userId: id,
            departmentId: deptId,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          userId: currentUserId,
          action: 'UPDATE_USER',
          targetTable: 'users',
          targetId: id,
          beforeStateJson: JSON.stringify({
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            warehouseIds: user.warehouseScopes.map((s) => s.warehouseId),
            branchIds: user.branchScopes.map((s) => s.branchId),
            departmentIds: user.departmentScopes.map((s) => s.departmentId),
          }),
          afterStateJson: JSON.stringify({
            name: dto.name,
            email: emailLower,
            role: dto.role,
            isActive: dto.status === 'ACTIVE',
            warehouseIds: dto.warehouseIds || [],
            branchIds: dto.branchIds || [],
            departmentIds: dto.departmentIds || [],
          }),
        },
      });
    });

    return this.getUser(id);
  }

  async getRestaurantProfile(): Promise<Record<string, unknown>> {
    const existing = await this.prisma.systemSetting.findUnique({
      where: { key: 'restaurant_profile' },
    });
    if (!existing) return {};
    try {
      return JSON.parse(existing.value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  async updateRestaurantProfile(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const existing = await this.getRestaurantProfile();
    const newProfile = { ...existing, ...data };

    await this.prisma.systemSetting.upsert({
      where: { key: 'restaurant_profile' },
      update: {
        value: JSON.stringify(newProfile),
        version: { increment: 1 },
      },
      create: {
        key: 'restaurant_profile',
        value: JSON.stringify(newProfile),
        version: 1,
      },
    });

    return newProfile;
  }
}
