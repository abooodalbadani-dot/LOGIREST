import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { 
  UserRole, 
  ROLE_METADATA, 
  canRolePerformAction,
  RoleDescriptor,
  Permission
} from '@logirest/shared-types';

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
      'Communications'
    ];

    return modules.map(module => {
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
            view = canRolePerformAction('stocktake', 'view', role) || canRolePerformAction('adjustment', 'view', role);
            create = canRolePerformAction('stocktake', 'create', role) || canRolePerformAction('adjustment', 'create', role);
            edit = canRolePerformAction('stocktake', 'count', role) || canRolePerformAction('adjustment', 'edit', role);
            approve = canRolePerformAction('stocktake', 'approve', role) || canRolePerformAction('adjustment', 'approve', role);
            post = canRolePerformAction('stocktake', 'post', role) || canRolePerformAction('adjustment', 'post', role);
            break;
          case 'Procurement':
            view = canRolePerformAction('pr', 'view', role) || canRolePerformAction('po', 'view', role) || canRolePerformAction('grn', 'view', role);
            create = canRolePerformAction('pr', 'create', role) || canRolePerformAction('po', 'create', role) || canRolePerformAction('grn', 'create', role);
            edit = canRolePerformAction('pr', 'submit', role) || canRolePerformAction('po', 'submit', role) || canRolePerformAction('grn', 'cancel', role);
            approve = canRolePerformAction('pr', 'approve', role) || canRolePerformAction('po', 'approve', role);
            post = canRolePerformAction('grn', 'post', role);
            break;
          case 'Operations':
            view = canRolePerformAction('transfer', 'view', role) || canRolePerformAction('issue', 'view', role) || canRolePerformAction('kitchen_request', 'view', role);
            create = canRolePerformAction('transfer', 'create', role) || canRolePerformAction('issue', 'create', role) || canRolePerformAction('kitchen_request', 'create', role);
            edit = canRolePerformAction('transfer', 'ship', role) || canRolePerformAction('issue', 'submit', role);
            approve = canRolePerformAction('kitchen_request', 'fulfill', role) || canRolePerformAction('transfer', 'receive', role);
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
        actions: { view, create, edit, approve, post }
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
    const rolesList: RoleDescriptor[] = Object.keys(ROLE_METADATA).map(roleKey => {
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
    });

    return rolesList;
  }
}
