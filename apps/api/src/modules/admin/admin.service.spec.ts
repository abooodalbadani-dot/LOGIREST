import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../database/prisma.service';
import { Role } from '@prisma/client';

describe('AdminService', () => {
  let service: AdminService;

  const mockPrismaService = {
    user: {
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  it('should compile and be defined', () => {
    expect(service).toBeDefined();
  });

  it('should successfully query user groups and map all roles with accurate user counts', async () => {
    const mockGroupResult = [
      { role: Role.ADMIN, _count: 2 },
      { role: Role.INV_MGR, _count: 5 },
    ];

    mockPrismaService.user.groupBy.mockResolvedValue(mockGroupResult);

    const result = await service.getRoles();

    // Verify all 10 roles are returned
    expect(result).toHaveLength(10);

    // Verify that ADMIN has count 2
    const adminRole = result.find(r => r.id === 'ADMIN');
    expect(adminRole).toBeDefined();
    expect(adminRole?.userCount).toBe(2);
    expect(adminRole?.displayName).toBe('Administrator');

    // Verify that INV_MGR has count 5
    const invMgrRole = result.find(r => r.id === 'INV_MGR');
    expect(invMgrRole).toBeDefined();
    expect(invMgrRole?.userCount).toBe(5);
    expect(invMgrRole?.description).toBe('Manages stock levels, adjustments and stocktake workflows');

    // Verify that WH_KEEPER has count 0 (empty roles edge case)
    const whKeeperRole = result.find(r => r.id === 'WH_KEEPER');
    expect(whKeeperRole).toBeDefined();
    expect(whKeeperRole?.userCount).toBe(0);
    expect(whKeeperRole?.displayName).toBe('Warehouse Keeper');

    expect(mockPrismaService.user.groupBy).toHaveBeenCalledWith({
      by: ['role'],
      _count: true,
      where: { isActive: true },
    });
  });
});
