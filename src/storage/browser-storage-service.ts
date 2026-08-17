import type { StorageService } from "./storage-service.interface.ts";
import { StorageError } from "./storage-errors.ts";

export class BrowserStorageService implements StorageService {
  private readonly storage: Storage;

  constructor(storage?: Storage) {
    try {
      this.storage = storage ?? window.localStorage;
    } catch (cause) {
      throw new StorageError(
        "STORAGE_UNAVAILABLE",
        "Browser storage is unavailable.",
        { cause },
      );
    }
  }

  read<T>(key: string): T | null {
    let value: string | null;
    try {
      value = this.storage.getItem(key);
    } catch (cause) {
      throw new StorageError("STORAGE_READ_FAILED", `Unable to read ${key}.`, {
        key,
        cause,
      });
    }
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch (cause) {
      throw new StorageError(
        "STORAGE_SERIALIZATION_FAILED",
        `Stored data for ${key} is not valid JSON.`,
        { key, cause },
      );
    }
  }

  write<T>(key: string, value: T): void {
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch (cause) {
      throw new StorageError(
        "STORAGE_SERIALIZATION_FAILED",
        `Unable to serialize data for ${key}.`,
        { key, cause },
      );
    }
    try {
      this.storage.setItem(key, serialized);
    } catch (cause) {
      throw new StorageError(
        "STORAGE_WRITE_FAILED",
        `Unable to write ${key}.`,
        {
          key,
          cause,
        },
      );
    }
  }

  remove(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch (cause) {
      throw new StorageError(
        "STORAGE_REMOVE_FAILED",
        `Unable to remove ${key}.`,
        { key, cause },
      );
    }
  }
}
