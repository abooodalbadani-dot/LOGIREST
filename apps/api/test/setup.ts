/* eslint-disable */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Global stub for ioredis connection so BullMQ/Redis connections connect instantly and exit instantly
jest.mock('ioredis', () => {
  const EventEmitter = require('events');
  class MockRedis extends EventEmitter {
    constructor() {
      super();
      process.nextTick(() => {
        this.emit('connect');
        this.emit('ready');
      });
      return new Proxy(this, {
        get: (target, prop) => {
          if (prop === 'then') {
            return undefined;
          }
          if (prop in target) {
            return (target as any)[prop];
          }
          if (typeof prop === 'string') {
            return (...args: any[]) => Promise.resolve([]);
          }
          return undefined;
        },
      });
    }
    options = {};
    status = 'ready';
    multi() {
      return this;
    }
    exec() {
      return Promise.resolve([]);
    }
    ping() {
      return Promise.resolve('PONG');
    }
    quit() {
      process.nextTick(() => {
        this.emit('end');
        this.emit('close');
      });
      return Promise.resolve('OK');
    }
    disconnect() {
      process.nextTick(() => {
        this.emit('end');
        this.emit('close');
      });
    }
    duplicate() {
      return new MockRedis();
    }
    defineCommand(name: string, definition: any) {
      // No-op. The Proxy handles invocations of dynamically defined commands.
    }
    info() {
      return Promise.resolve('# Server\r\nredis_version:7.2.4\r\n');
    }
  }
  // Assign ES default and named exports to the constructor itself so both CJS and ESM imports work
  (MockRedis as any).default = MockRedis;
  (MockRedis as any).Redis = MockRedis;
  return MockRedis;
});
