import { Test, TestingModule } from '@nestjs/testing';
import { StocktakeController } from './stocktake.controller';
import { StocktakeService } from './stocktake.service';
import { StocktakePostService } from './stocktake-post.service';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { ScopeValidationService } from '../../auth/scope-validation.service';

describe('StocktakeController', () => {
  const mockScopeValidationService = {
    validateWarehouse: jest.fn(),
    validateAtLeastOneWarehouse: jest.fn(),
  };
  let controller: StocktakeController;
  let service: StocktakeService;
  let postService: StocktakePostService;

  const mockStocktakeService = {
    create: jest.fn(),
    findOne: jest.fn(),
    start: jest.fn(),
    count: jest.fn(),
    submit: jest.fn(),
    approve: jest.fn(),
    cancel: jest.fn(),
  };

  const mockStocktakePostService = {
    post: jest.fn(),
  };

  const mockPrismaService: any = {
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
    stocktakeSession: {
      findUnique: jest.fn(),
    },
  };
  const mockWorkflowService = {};

  const mockRequest = {
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StocktakeController],
      providers: [
        { provide: StocktakeService, useValue: mockStocktakeService },
        { provide: StocktakePostService, useValue: mockStocktakePostService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WorkflowService, useValue: mockWorkflowService },
        {
          provide: ScopeValidationService,
          useValue: mockScopeValidationService,
        },
      ],
    }).compile();

    controller = module.get<StocktakeController>(StocktakeController);
    service = module.get<StocktakeService>(StocktakeService);
    postService = module.get<StocktakePostService>(StocktakePostService);

    jest.clearAllMocks();
    mockStocktakeService.findOne.mockResolvedValue({
      id: 'session-1',
      warehouseId: 'wh-1',
    });
    mockPrismaService.stocktakeSession.findUnique.mockResolvedValue({
      warehouseId: 'wh-1',
    });
  });

  it('should call create', async () => {
    mockStocktakeService.create.mockResolvedValue({ id: 'session-1' });

    const result = await controller.create(
      { warehouseId: 'wh-1' },
      'user-1',
      Role.ADMIN,
    );
    expect(result.id).toEqual('session-1');
    expect(mockStocktakeService.create).toHaveBeenCalledWith(
      { warehouseId: 'wh-1' },
      'user-1',
    );
  });

  it('should call findOne', async () => {
    mockStocktakeService.findOne.mockResolvedValue({
      id: 'session-1',
      warehouseId: 'wh-1',
    });

    const result = await controller.findOne('session-1', 'user-1', Role.ADMIN);
    expect(result.id).toEqual('session-1');
    expect(mockStocktakeService.findOne).toHaveBeenCalledWith('session-1');
  });

  it('should call start', async () => {
    mockStocktakeService.start.mockResolvedValue({
      id: 'session-1',
      status: 'STARTED',
    });

    const result = await controller.start(
      'session-1',
      'user-1',
      'WH_KEEPER',
      { comments: 'start count', version: 1 },
      mockRequest,
    );
    expect(result.id).toEqual('session-1');
    expect(result.status).toEqual('STARTED');
    expect(mockStocktakeService.start).toHaveBeenCalledWith(
      'session-1',
      'user-1',
      'WH_KEEPER',
      { comments: 'start count', version: 1, ipAddress: '127.0.0.1' },
    );
  });

  it('should call count', async () => {
    mockStocktakeService.count.mockResolvedValue({ success: true });
    const counts = [{ itemId: 'item-1', qtyCounted: 10 }];

    const result = await controller.count(
      'session-1',
      { counts },
      'user-1',
      'wh-1',
    );
    expect(result.id).toEqual('session-1');
    expect(mockStocktakeService.count).toHaveBeenCalledWith(
      'session-1',
      counts,
      'user-1',
    );
  });

  it('should call submit', async () => {
    mockStocktakeService.submit.mockResolvedValue({
      id: 'session-1',
      status: 'REVIEW',
    });

    const result = await controller.submit(
      'session-1',
      'user-1',
      'WH_KEEPER',
      { version: 1 },
      mockRequest,
    );
    expect(result.id).toEqual('session-1');
    expect(result.status).toEqual('REVIEW');
  });

  it('should call approve', async () => {
    mockStocktakeService.approve.mockResolvedValue({
      id: 'session-1',
      status: 'APPROVED',
    });

    const result = await controller.approve(
      'session-1',
      'user-1',
      'INV_MGR',
      { version: 2 },
      mockRequest,
    );
    expect(result.id).toEqual('session-1');
    expect(result.status).toEqual('APPROVED');
  });

  it('should call cancel', async () => {
    mockStocktakeService.cancel.mockResolvedValue({
      id: 'session-1',
      status: 'CANCELLED',
    });

    const result = await controller.cancel(
      'session-1',
      'user-1',
      'WH_KEEPER',
      { version: 2 },
      mockRequest,
    );
    expect(result.id).toEqual('session-1');
    expect(result.status).toEqual('CANCELLED');
  });

  it('should call post', async () => {
    mockStocktakePostService.post.mockResolvedValue({
      id: 'session-1',
      status: 'POSTED',
    });

    const result = await controller.post(
      'session-1',
      'user-1',
      'INV_MGR',
      { version: 2 },
      mockRequest,
    );
    expect(result.id).toEqual('session-1');
    expect(result.status).toEqual('POSTED');
    expect(mockStocktakePostService.post).toHaveBeenCalledWith(
      'session-1',
      'user-1',
      'INV_MGR',
      2,
      '127.0.0.1',
    );
  });
});
