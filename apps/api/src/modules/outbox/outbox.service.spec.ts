import { Test, TestingModule } from '@nestjs/testing';
import { OutboxService } from './outbox.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('OutboxService', () => {
  let service: OutboxService;
  let mockQueue: {
    add: jest.Mock;
  };

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxService,
        {
          provide: getQueueToken('outbox'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should insert event and enqueue BullMQ job', async () => {
    const mockTx = {
      outboxEvent: {
        create: jest.fn().mockResolvedValue({
          id: 'event-1',
          eventType: 'PR_SUBMITTED',
          payload: { id: 'pr-1' },
          status: 'PENDING',
          attempts: 0,
        }),
      },
    } as unknown as Parameters<OutboxService['writeEvent']>[0];

    const event = await service.writeEvent(mockTx, 'PR_SUBMITTED', {
      id: 'pr-1',
    });

    // Cast mockTx back for jest matching checks safely
    const mockTxSpy = mockTx as unknown as {
      outboxEvent: { create: jest.Mock };
    };

    expect(mockTxSpy.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'PR_SUBMITTED',
        payload: { id: 'pr-1' },
        status: 'PENDING',
        attempts: 0,
      }),
    });

    expect(mockQueue.add).toHaveBeenCalledWith(
      'process-event',
      { eventId: 'event-1' },
      expect.objectContaining({
        delay: 500,
        attempts: 3,
      }),
    );

    expect(event.id).toBe('event-1');
  });
});
