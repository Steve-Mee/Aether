import { classifyRedisKey } from '../redisKeyClass';
import {
  RedisMemoryGovernor,
  getRedisPressureLevel,
  setRedisPressureLevelForTests,
} from '../RedisMemoryGovernor';
import { incrementFixedWindow, resetRateLimitMemoryForTests } from '../../security/rateLimit';

jest.mock('../createRedisClient', () => ({
  getRedisClient: jest.fn(),
}));

jest.mock('../RedisSpillStore', () => ({
  redisSpillStore: {
    upsert: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
    incrWindow: jest.fn().mockResolvedValue(1),
    purgeExpired: jest.fn().mockResolvedValue(0),
  },
}));

import { getRedisClient } from '../createRedisClient';
import { redisSpillStore } from '../RedisSpillStore';

describe('redisKeyClass', () => {
  it('classifies hot / spillable / ephemeral', () => {
    expect(classifyRedisKey('rl:tenant:1.2.3.4')).toBe('hot');
    expect(classifyRedisKey('rl:sf:1.2.3.4')).toBe('hot');
    expect(classifyRedisKey('aether:runmem:run:t:r:ns:k')).toBe('spillable');
    expect(classifyRedisKey('other:cache')).toBe('ephemeral');
  });
});

describe('incrementFixedWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimitMemoryForTests();
    setRedisPressureLevelForTests('normal');
    delete process.env.REDIS_URL;
  });

  it('uses process memory when Redis is unavailable', async () => {
    (getRedisClient as jest.Mock).mockResolvedValue(null);
    const r1 = await incrementFixedWindow('rl:test:a', { windowMs: 60_000, max: 2 });
    const r2 = await incrementFixedWindow('rl:test:a', { windowMs: 60_000, max: 2 });
    const r3 = await incrementFixedWindow('rl:test:a', { windowMs: 60_000, max: 2 });
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(false);
  });

  it('uses spill store under hard pressure', async () => {
    setRedisPressureLevelForTests('hard');
    (redisSpillStore.incrWindow as jest.Mock).mockResolvedValueOnce(1).mockResolvedValueOnce(5);
    const ok = await incrementFixedWindow('rl:sf:1.1.1.1', { windowMs: 60_000, max: 3 });
    const deny = await incrementFixedWindow('rl:sf:1.1.1.1', { windowMs: 60_000, max: 3 });
    expect(ok.allowed).toBe(true);
    expect(deny.allowed).toBe(false);
    expect(redisSpillStore.incrWindow).toHaveBeenCalled();
  });
});

describe('RedisMemoryGovernor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setRedisPressureLevelForTests('normal');
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.REDIS_SPILL_ENABLED = 'true';
  });

  afterEach(() => {
    delete process.env.REDIS_URL;
    delete process.env.REDIS_SPILL_ENABLED;
  });

  it('stays normal when maxmemory is unlimited', async () => {
    const client = {
      info: jest.fn().mockResolvedValue('used_memory:1000\r\nmaxmemory:0\r\n'),
      scan: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      ttl: jest.fn(),
    };
    (getRedisClient as jest.Mock).mockResolvedValue(client);
    const gov = new RedisMemoryGovernor();
    const result = await gov.tick();
    expect(result.level).toBe('normal');
    expect(getRedisPressureLevel()).toBe('normal');
  });

  it('soft-demotes spillable keys above soft ratio', async () => {
    const client = {
      info: jest.fn().mockResolvedValue('used_memory:80\r\nmaxmemory:100\r\n'),
      scan: jest
        .fn()
        .mockResolvedValue({ cursor: 0, keys: ['aether:runmem:run:t:r:ns:k'] }),
      get: jest.fn().mockResolvedValue(JSON.stringify({ value: 1, version: 1 })),
      del: jest.fn().mockResolvedValue(1),
      ttl: jest.fn(),
    };
    (getRedisClient as jest.Mock).mockResolvedValue(client);
    process.env.REDIS_MEMORY_SOFT_RATIO = '0.75';
    process.env.REDIS_MEMORY_HARD_RATIO = '0.95';
    const gov = new RedisMemoryGovernor();
    const result = await gov.tick();
    expect(result.level).toBe('soft');
    expect(result.demoted).toBe(1);
    expect(redisSpillStore.upsert).toHaveBeenCalled();
    expect(client.del).toHaveBeenCalledWith('aether:runmem:run:t:r:ns:k');
    delete process.env.REDIS_MEMORY_SOFT_RATIO;
    delete process.env.REDIS_MEMORY_HARD_RATIO;
  });

  it('hard-spills hot RL keys above hard ratio', async () => {
    const client = {
      info: jest.fn().mockResolvedValue('used_memory:95\r\nmaxmemory:100\r\n'),
      scan: jest
        .fn()
        .mockResolvedValueOnce({ cursor: 0, keys: ['rl:sf:1.2.3.4'] })
        .mockResolvedValueOnce({ cursor: 0, keys: [] }),
      get: jest.fn().mockResolvedValue('12'),
      del: jest.fn().mockResolvedValue(1),
      ttl: jest.fn().mockResolvedValue(40),
    };
    (getRedisClient as jest.Mock).mockResolvedValue(client);
    process.env.REDIS_MEMORY_SOFT_RATIO = '0.75';
    process.env.REDIS_MEMORY_HARD_RATIO = '0.90';
    const gov = new RedisMemoryGovernor();
    const result = await gov.tick();
    expect(result.level).toBe('hard');
    expect(result.spilled).toBe(1);
    expect(redisSpillStore.upsert).toHaveBeenCalledWith(
      'rl:sf:1.2.3.4',
      expect.stringContaining('"count":12'),
      'hot',
      expect.any(Date)
    );
    delete process.env.REDIS_MEMORY_SOFT_RATIO;
    delete process.env.REDIS_MEMORY_HARD_RATIO;
  });
});
