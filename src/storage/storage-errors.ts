export type StorageErrorCode =
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "STORAGE_REMOVE_FAILED"
  | "STORAGE_SERIALIZATION_FAILED"
  | "STORAGE_VALIDATION_FAILED"
  | "STORAGE_MIGRATION_FAILED"
  | "STORAGE_RECOVERY_FAILED"
  | "STORAGE_IMPORT_CONFLICT";

export class StorageError extends Error {
  readonly code: StorageErrorCode;
  readonly key?: string;

  constructor(
    code: StorageErrorCode,
    message: string,
    options: { key?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "StorageError";
    this.code = code;
    this.key = options.key;
  }
}

export class StorageValidationError extends StorageError {
  constructor(
    message: string,
    options: { key?: string; cause?: unknown } = {},
  ) {
    super("STORAGE_VALIDATION_FAILED", message, options);
    this.name = "StorageValidationError";
  }
}

export class StorageMigrationError extends StorageError {
  constructor(
    message: string,
    options: { key?: string; cause?: unknown } = {},
  ) {
    super("STORAGE_MIGRATION_FAILED", message, options);
    this.name = "StorageMigrationError";
  }
}

export class StorageRecoveryError extends StorageError {
  constructor(
    message: string,
    options: { key?: string; cause?: unknown } = {},
  ) {
    super("STORAGE_RECOVERY_FAILED", message, options);
    this.name = "StorageRecoveryError";
  }
}

export class StorageImportConflictError extends StorageError {
  constructor(
    message: string,
    options: { key?: string; cause?: unknown } = {},
  ) {
    super("STORAGE_IMPORT_CONFLICT", message, options);
    this.name = "StorageImportConflictError";
  }
}
