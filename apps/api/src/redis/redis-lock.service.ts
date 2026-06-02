import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { randomUUID } from 'crypto';

@Injectable()
export class RedisLockService {
  private readonly logger = new Logger(RedisLockService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Tries to acquire a lock for a given key and TTL (in seconds).
   * Returns token string if lock was acquired successfully, null otherwise.
   */
  async acquireLock(key: string, ttlSeconds: number): Promise<string | null> {
    const lockKey = `lock:cron:${key}`;
    const token = randomUUID();
    const result = await this.redis.set(lockKey, token, 'EX', ttlSeconds, 'NX');
    const acquired = result === 'OK';
    if (acquired) {
      this.logger.log(
        `Acquired lock for key: ${lockKey} with TTL ${ttlSeconds}s (token: ${token})`,
      );
      return token;
    } else {
      this.logger.log(
        `Failed to acquire lock for key: ${lockKey} (already locked)`,
      );
      return null;
    }
  }

  /**
   * Releases a lock for a given key, matching the unique token.
   */
  async releaseLock(key: string, token: string): Promise<boolean> {
    const lockKey = `lock:cron:${key}`;
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.redis.eval(luaScript, 1, lockKey, token);
    const released = result === 1;
    if (released) {
      this.logger.log(`Released lock for key: ${lockKey} (token: ${token})`);
    } else {
      this.logger.warn(
        `Failed to release lock for key: ${lockKey} (token mismatch or expired)`,
      );
    }
    return released;
  }

  /**
   * Runs a callback function protected by a distributed Redis lock.
   */
  async runWithLock<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    const token = await this.acquireLock(key, ttlSeconds);
    if (!token) {
      this.logger.log(
        `Skipping job execution because lock for "${key}" is already held.`,
      );
      return null;
    }
    try {
      return await fn();
    } finally {
      await this.releaseLock(key, token);
    }
  }
}
