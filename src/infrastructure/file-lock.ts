export interface Lock {
  release(): Promise<void>;
}

export interface LockProvider {
  acquire(lockPath: string): Promise<Lock>;
}

export class AsyncFileLockProvider implements LockProvider {
  private locks = new Map<string, Promise<void>>();
  private releaseFns = new Map<string, () => void>();

  async acquire(lockPath: string): Promise<Lock> {
    while (this.locks.has(lockPath)) {
      await this.locks.get(lockPath);
    }

    let releaseFn: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseFn = resolve;
    });

    this.locks.set(lockPath, lockPromise);
    this.releaseFns.set(lockPath, releaseFn!);

    return {
      release: async () => {
        const release = this.releaseFns.get(lockPath);
        if (release) {
          release();
        }
        this.locks.delete(lockPath);
        this.releaseFns.delete(lockPath);
      },
    };
  }
}

export const defaultLockProvider = new AsyncFileLockProvider();
