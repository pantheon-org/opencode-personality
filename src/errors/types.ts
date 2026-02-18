export type ErrorCode =
  | "CONFIG_NOT_FOUND"
  | "CONFIG_INVALID"
  | "PERSONALITY_NOT_FOUND"
  | "PERSONALITY_ALREADY_EXISTS"
  | "PERSONALITY_INVALID"
  | "PERSONALITY_LOAD_ERROR"
  | "PERSONALITY_MIGRATION_FAILED"
  | "MOOD_STATE_CORRUPTED"
  | "FILE_SYSTEM_ERROR"
  | "VALIDATION_ERROR"
  | "LOCK_ACQUISITION_FAILED"
  | "MIGRATION_ERROR"
  | "HOOK_ERROR"
  | "TOOL_ERROR"
  | "COMMAND_NOT_FOUND"
  | "UNKNOWN_ERROR"
  | "TEST_ERROR"
  | "TEST_CODE"
  | "TEST";

export interface AppError {
  code: ErrorCode;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}

export interface AppResult<T> {
  success: true;
  data: T;
}

export interface Failure {
  success: false;
  error: AppError;
}

export type ResultOrFailure<T> = AppResult<T> | Failure;

export function isSuccess<T>(result: ResultOrFailure<T>): result is AppResult<T> {
  return result.success === true;
}

export function isFailure<T>(result: ResultOrFailure<T>): result is Failure {
  return result.success === false;
}
