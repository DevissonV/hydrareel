import { describe, expect, it } from 'vitest';
import { HeavyWorkQueue } from '../src/features/jobs/application/heavy-work-queue';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
}

describe('HeavyWorkQueue', () => {
  it('nunca ejecuta dos trabajos pesados al mismo tiempo', async () => {
    const queue = new HeavyWorkQueue();
    const gate = deferred();
    let running = 0;
    let maxRunning = 0;
    const events: string[] = [];

    const first = queue.enqueue('job:1', async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      events.push('start-1');
      await gate.promise;
      events.push('end-1');
      running -= 1;
    }, { priority: 10 });

    const second = queue.enqueue('job:2', async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      events.push('start-2');
      running -= 1;
    }, { priority: 10 });

    await new Promise((resolve) => setImmediate(resolve));
    expect(events).toEqual(['start-1']);
    gate.resolve();
    await Promise.all([first, second]);

    expect(maxRunning).toBe(1);
    expect(events).toEqual(['start-1', 'end-1', 'start-2']);
  });

  it('ejecuta una edición manual antes del siguiente video pendiente', async () => {
    const queue = new HeavyWorkQueue();
    const gate = deferred();
    const events: string[] = [];

    const first = queue.enqueue('job:1', async () => {
      events.push('job-1');
      await gate.promise;
    }, { priority: 10 });

    const second = queue.enqueue('job:2', async () => {
      events.push('job-2');
    }, { priority: 10 });

    const manual = queue.enqueue('manual:clip', async () => {
      events.push('manual');
    }, { priority: 0 });

    await new Promise((resolve) => setImmediate(resolve));
    gate.resolve();
    await Promise.all([first, second, manual]);

    expect(events).toEqual(['job-1', 'manual', 'job-2']);
  });

  it('combina cambios pendientes del mismo clip y conserva el último', async () => {
    const queue = new HeavyWorkQueue();
    const gate = deferred();
    const events: string[] = [];

    const blocker = queue.enqueue('job:1', async () => {
      await gate.promise;
    }, { priority: 10 });

    const oldEdit = queue.enqueue('manual:clip', async () => {
      events.push('old');
      return 'old';
    }, { priority: 0, coalesce: true });

    const latestEdit = queue.enqueue('manual:clip', async () => {
      events.push('latest');
      return 'latest';
    }, { priority: 0, coalesce: true });

    await new Promise((resolve) => setImmediate(resolve));
    gate.resolve();

    const [, oldResult, latestResult] = await Promise.all([blocker, oldEdit, latestEdit]);
    expect(events).toEqual(['latest']);
    expect(oldResult).toBe('latest');
    expect(latestResult).toBe('latest');
  });
});
