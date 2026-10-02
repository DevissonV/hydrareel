import { Injectable } from '@nestjs/common';

@Injectable()
export class RenderGate {
  private owner?: string;
  private waiters: Array<() => void> = [];

  get busy(): boolean {
    return Boolean(this.owner);
  }

  async acquire(owner: string): Promise<() => void> {
    if (this.owner) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    this.owner = owner;
    return () => this.release(owner);
  }

  tryAcquire(owner: string): (() => void) | undefined {
    if (this.owner) return undefined;
    this.owner = owner;
    return () => this.release(owner);
  }

  private release(owner: string): void {
    if (this.owner !== owner) return;
    this.owner = undefined;
    const next = this.waiters.shift();
    if (next) next();
  }
}
