import { BaseManager } from "../foundation/manager.ts";
import type { IStorageManager } from "./storage-manager.interface.ts";
import type { StorageService } from "./storage-service.interface.ts";
import { StorageError } from "./storage-errors.ts";

export class StorageManager extends BaseManager implements IStorageManager {
  private readonly adapter?: StorageService;

  constructor(adapter?: StorageService) {
    super();
    this.adapter = adapter;
  }

  read<T>(key: string): T | null {
    return this.requireAdapter().read<T>(key);
  }

  write<T>(key: string, value: T): void {
    this.requireAdapter().write(key, value);
  }

  remove(key: string): void {
    this.requireAdapter().remove(key);
  }

  private requireAdapter(): StorageService {
    if (!this.adapter) {
      throw new StorageError(
        "STORAGE_UNAVAILABLE",
        "StorageManager has no persistence adapter in this runtime.",
      );
    }
    return this.adapter;
  }
}
