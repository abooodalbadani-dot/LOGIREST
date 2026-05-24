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
        if (prop in target) {
          return target[prop];
        }
        if (typeof prop === 'string') {
          return (...args) => Promise.resolve([]);
        }
        return undefined;
      },
    });
  }
  options = {};
  status = 'ready';
  multi() { return this; }
  exec() { return Promise.resolve([]); }
  ping() { return Promise.resolve('PONG'); }
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
  defineCommand(name, definition) {
    console.log('defineCommand called on MockRedis with', name);
  }
  info() {
    return Promise.resolve('# Server\r\nredis_version:7.2.4\r\n');
  }
}

const { createIORedisClient } = require('../node_modules/bullmq/dist/cjs/classes/ioredis-client.js');

const rawClient = new MockRedis();
const wrappedClient = createIORedisClient(rawClient);

console.log('Testing duplicate on wrapped client:');
const duplicatedWrapped = wrappedClient.duplicate();
console.log('typeof duplicatedWrapped.defineCommand:', typeof duplicatedWrapped.defineCommand);
duplicatedWrapped.defineCommand('someCommand', { keys: 1, content: 'return 1' });
