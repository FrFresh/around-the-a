import type { InitializableManager } from "../foundation/manager.ts";
import type { StorageService } from "./storage-service.interface.ts";

export interface IStorageManager extends InitializableManager, StorageService {
  readonly isAvailable: boolean;
}
