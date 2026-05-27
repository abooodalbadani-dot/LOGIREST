import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

@Injectable()
export class RedisLockService {
  private readonly logger = new Logger(RedisLockService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Tries to acquire a lock for a given key and TTL (in seconds).
   * Returns true if lock was acquired successfully, false otherwise.
   */
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const lockKey = `lock:cron:${key}`;
    const result = await this.redis.set(
      lockKey,
      'locked',
      'EX',
      ttlSeconds,
      'NX',
    );
    const acquired = result === 'OK';
    if (acquired) {
      this.logger.log(
        `Acquired lock for key: ${lockKey} with TTL ${ttlSeconds}s`,
      );
    } else {
      this.logger.log(
        `Failed to acquire lock for key: ${lockKey} (already locked)`,
      );
    }
    return acquired;
  }

  /**
   * Releases a lock for a given key.
   */
  async releaseLock(key: string): Promise<void> {
    const lockKey = `lock:cron:${key}`;
    await this.redis.del(lockKey);
    this.logger.log(`Released lock for key: ${lockKey}`);
  }

  /**
   * Runs a callback function protected by a distributed Redis lock.
   */
  async runWithLock<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    const acquired = await this.acquireLock(key, ttlSeconds);
    if (!acquired) {
      this.logger.log(
        `Skipping job execution because lock for "${key}" is already held.`,
      );
      return null;
    }
    try {
      return await fn();
    } finally {
      await this.releaseLock(key);
    }
  }
}
