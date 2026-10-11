import { describe, expect, it } from 'vitest';
import { memoryPressure } from './memory-pressure';
describe('cgroup memory pressure', () => {
  it('reports percentage and MiB rounded without altering limits', () => {
    expect(memoryPressure(950 * 1048576, 1000 * 1048576)).toEqual({
      usedMB: 950, limitMB: 1000, percent: 95,
    });
  });
  it('handles invalid cgroup limits safely', () => {
    expect(memoryPressure(1000, 0)).toBeNull();
    expect(memoryPressure(1000, Infinity)).toBeNull();
  });
});
