import type { RunWorkingMemoryPort, RunMemoryVersionResult } from '../RunWorkingMemoryPort';

export function createMockRunWorkingMemory(
  overrides: Partial<RunWorkingMemoryPort> = {}
): RunWorkingMemoryPort {
  const defaultVersionResult: RunMemoryVersionResult = { ok: true, version: 1 };
  return {
    get: jest.fn().mockResolvedValue(null),
    getWithVersion: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    merge: jest.fn().mockResolvedValue(undefined),
    appendToArray: jest.fn().mockResolvedValue(undefined),
    compareAndSet: jest.fn().mockResolvedValue(defaultVersionResult),
    mergeWithVersion: jest.fn().mockResolvedValue(defaultVersionResult),
    list: jest.fn().mockResolvedValue([]),
    buildPromptBlock: jest.fn().mockResolvedValue(''),
    buildMerchantPromptBlock: jest.fn().mockResolvedValue(''),
    buildSharedSnapshot: jest.fn().mockResolvedValue({}),
    purgeExpired: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}
