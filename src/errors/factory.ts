import type { AppError, ErrorCode } from "./types.js";

export function createError(
  code: ErrorCode,
  message: string,
  options?: {
    cause?: unknown;
    context?: Record<string, unknown>;
  },
): AppError {
  const error: AppError = {
    code,
    message,
  };
  if (options?.cause !== undefined) {
    error.cause = options.cause;
  }
  if (options?.context !== undefined) {
    error.context = options.context;
  }
  return error;
}

export const errors = {
  configNotFound: (directory: string) =>
    createError("CONFIG_NOT_FOUND", `No configuration found in ${directory}`, {
      context: { directory },
    }),

  configInvalid: (message: string, cause?: unknown) =>
    createError("CONFIG_INVALID", message, { cause }),

  personalityNotFound: (name: string) =>
    createError("PERSONALITY_NOT_FOUND", `Personality '${name}' not found`, {
      context: { name },
    }),

  personalityAlreadyExists: (name: string) =>
    createError("PERSONALITY_ALREADY_EXISTS", `Personality '${name}' already exists`, {
      context: { name },
    }),

  personalityInvalid: (name: string, message: string, cause?: unknown) =>
    createError("PERSONALITY_INVALID", `Invalid personality '${name}': ${message}`, {
      cause,
      context: { name },
    }),

  personalityLoadError: (name: string, message: string, cause?: unknown) =>
    createError("PERSONALITY_LOAD_ERROR", `Failed to load personality '${name}': ${message}`, {
      cause,
      context: { name },
    }),

  validationError: (message: string, field?: string) =>
    createError("VALIDATION_ERROR", message, {
      context: { field: field ?? undefined },
    }),

  fileSystemError: (operation: string, path: string, cause: unknown) =>
    createError("FILE_SYSTEM_ERROR", `Failed to ${operation} ${path}`, {
      cause,
      context: { operation, path },
    }),

  lockAcquisitionFailed: (resource: string, cause?: unknown) =>
    createError("LOCK_ACQUISITION_FAILED", `Failed to acquire lock for ${resource}`, {
      cause,
      context: { resource },
    }),

  migrationError: (message: string, cause?: unknown) =>
    createError("MIGRATION_ERROR", message, { cause }),

  unknownError: (message: string, cause?: unknown) =>
    createError("UNKNOWN_ERROR", message, { cause }),
};
