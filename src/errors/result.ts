import type { AppResult, Failure, ResultOrFailure, AppError } from "./types.js";

export function success<T>(data: T): AppResult<T> {
  return { success: true, data };
}

export function failure(error: AppError): Failure {
  return { success: false, error };
}

export async function tryCatch<T>(
  fn: () => Promise<T>,
  mapError: (error: unknown) => AppError,
): Promise<ResultOrFailure<T>> {
  try {
    const data = await fn();
    return success(data);
  } catch (error) {
    return failure(mapError(error));
  }
}

export function tryCatchSync<T>(
  fn: () => T,
  mapError: (error: unknown) => AppError,
): ResultOrFailure<T> {
  try {
    const data = fn();
    return success(data);
  } catch (error) {
    return failure(mapError(error));
  }
}

export function mapResult<T, U>(
  result: ResultOrFailure<T>,
  fn: (data: T) => ResultOrFailure<U>,
): ResultOrFailure<U> {
  if (!result.success) return result;
  return fn(result.data);
}

export function unwrap<T>(result: ResultOrFailure<T>): T {
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data;
}

export function unwrapOr<T>(result: ResultOrFailure<T>, defaultValue: T): T {
  return result.success ? result.data : defaultValue;
}

export function fromPromise<T>(
  promise: Promise<T>,
  mapError: (error: unknown) => AppError,
): Promise<ResultOrFailure<T>> {
  return promise.then((data) => success(data)).catch((error) => failure(mapError(error)));
}
