import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseLockGuard } from './warehouse-lock.guard';
import { WorkflowService } from '../modules/workflow/workflow.service';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

describe('WarehouseLockGuard', () => {
  let guard: WarehouseLockGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockWorkflowService = {
    isWarehouseLocked: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseLockGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: WorkflowService, useValue: mockWorkflowService },
      ],
    }).compile();

    guard = module.get<WarehouseLockGuard>(WarehouseLockGuard);
    jest.clearAllMocks();
  });

  const mockExecutionContext = (
    method: string,
    body: any = {},
    params: any = {},
    query: any = {},
  ) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          body,
          params,
          query,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('should return true if bypass metadata is set', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = mockExecutionContext('POST');
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should return true for safe methods (GET, OPTIONS, HEAD)', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const context = mockExecutionContext('GET');
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should return true if no warehouse IDs are found in the request', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const context = mockExecutionContext('POST', {}, {}, {});
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should query isWarehouseLocked and throw LOCKED if warehouse is locked', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const context = mockExecutionContext('POST', { warehouseId: 'wh-1' });
    mockWorkflowService.isWarehouseLocked.mockResolvedValue(true);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new HttpException(
        'Warehouse is locked. Physical inventory mutations are blocked.',
        HttpStatus.LOCKED,
      ),
    );
    expect(mockWorkflowService.isWarehouseLocked).toHaveBeenCalledWith('wh-1');
  });

  it('should query isWarehouseLocked and return true if warehouse is not locked', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const context = mockExecutionContext('POST', {
      warehouseId: 'wh-1',
      fromWarehouseId: 'wh-2',
    });
    mockWorkflowService.isWarehouseLocked.mockResolvedValue(false);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockWorkflowService.isWarehouseLocked).toHaveBeenCalledWith('wh-1');
    expect(mockWorkflowService.isWarehouseLocked).toHaveBeenCalledWith('wh-2');
  });
});
