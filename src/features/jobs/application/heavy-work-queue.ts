import { Injectable } from '@nestjs/common';

type WorkPriority = 0 | 10;

interface QueueItem {
  key: string;
  priority: WorkPriority;
  enqueuedAt: number;
  run: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

@Injectable()
export class HeavyWorkQueue {
  private runningKey?: string;
  private draining = false;
  private readonly pending: QueueItem[] = [];

  get busy(): boolean {
    return Boolean(this.runningKey);
  }

  get activeKey(): string | undefined {
    return this.runningKey;
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  enqueue<T>(
    key: string,
    run: () => Promise<T>,
    options: { priority?: WorkPriority; coalesce?: boolean } = {},
  ): Promise<T> {
    const priority = options.priority ?? 10;

    if (options.coalesce) {
      const existingIndex = this.pending.findIndex((item) => item.key === key);
      if (existingIndex >= 0) {
        const existing = this.pending[existingIndex];
        existing.run = run as () => Promise<unknown>;
        existing.priority = priority;
        existing.enqueuedAt = Date.now();
        this.sortPending();
        return new Promise<T>((resolve, reject) => {
          const originalResolve = existing.resolve;
          const originalReject = existing.reject;
          existing.resolve = (value) => {
            originalResolve(value);
            resolve(value as T);
          };
          existing.reject = (error) => {
            originalReject(error);
            reject(error);
          };
        });
      }
    }

    const promise = new Promise<T>((resolve, reject) => {
      this.pending.push({
        key,
        priority,
        enqueuedAt: Date.now(),
        run: run as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.sortPending();
    });

    this.kick();
    return promise;
  }

  private sortPending(): void {
    this.pending.sort(
      (a, b) => a.priority - b.priority || a.enqueuedAt - b.enqueuedAt,
    );
  }

  private kick(): void {
    if (this.draining) return;
    this.draining = true;
    setImmediate(() => void this.drain());
  }

  private async drain(): Promise<void> {
    try {
      while (!this.runningKey && this.pending.length) {
        const item = this.pending.shift()!;
        this.runningKey = item.key;
        try {
          const result = await item.run();
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        } finally {
          this.runningKey = undefined;
        }
      }
    } finally {
      this.draining = false;
      if (this.pending.length) this.kick();
    }
  }
}
