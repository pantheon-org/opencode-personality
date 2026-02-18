import { describe, it, expect } from 'bun:test';
import {
  success,
  failure,
  tryCatch,
  tryCatchSync,
  mapResult,
  unwrap,
  unwrapOr,
} from './result.js';
import { isSuccess, isFailure } from './types.js';
import { createError, errors } from './factory.js';
import { formatErrorForUser, formatErrorForLogging, formatErrorForCli } from './formatters.js';

describe('errors/result', () => {
  describe('success', () => {
    it('returns a success result with data', () => {
      const result = success(42);
      expect(result.success).toBe(true);
      expect(result.data).toBe(42);
    });
  });

  describe('failure', () => {
    it('returns a failure result with error', () => {
      const error = createError('UNKNOWN_ERROR', 'Something went wrong');
      const result = failure(error);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('tryCatch', () => {
    it('returns success on successful async operation', async () => {
      const result = await tryCatch(
        async () => 'success',
        (e) => createError('UNKNOWN_ERROR', String(e)),
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('success');
      }
    });

    it('returns failure on async error', async () => {
      const result = await tryCatch(
        async () => {
          throw new Error('boom');
        },
        (e) => createError('UNKNOWN_ERROR', String(e)),
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN_ERROR');
        expect(result.error.message).toContain('boom');
      }
    });
  });

  describe('tryCatchSync', () => {
    it('returns success on successful sync operation', () => {
      const result = tryCatchSync(
        () => 42,
        (e) => createError('UNKNOWN_ERROR', String(e)),
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    it('returns failure on sync error', () => {
      const result = tryCatchSync(
        () => {
          throw new Error('boom');
        },
        (e) => createError('UNKNOWN_ERROR', String(e)),
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN_ERROR');
      }
    });
  });

  describe('mapResult', () => {
    it('transforms success value', () => {
      const result = mapResult(success(5), (n) => success(n * 2));
      expect(unwrap(result)).toBe(10);
    });

    it('passes through failure', () => {
      const error = createError('TEST_ERROR', 'test');
      const result = mapResult(failure(error), (_n) => success(10));
      expect(result.success).toBe(false);
    });

    it('can transform failure to success', () => {
      const error = createError('TEST_ERROR', 'test');
      const result = mapResult(failure(error), () => success(10));
      expect(result.success).toBe(false);
    });
  });

  describe('unwrap', () => {
    it('returns data on success', () => {
      expect(unwrap(success(42))).toBe(42);
    });

    it('throws on failure', () => {
      const error = createError('TEST_ERROR', 'test');
      expect(() => unwrap(failure(error))).toThrow('test');
    });
  });

  describe('unwrapOr', () => {
    it('returns data on success', () => {
      expect(unwrapOr(success(42), 0)).toBe(42);
    });

    it('returns default on failure', () => {
      const error = createError('TEST_ERROR', 'test');
      expect(unwrapOr(failure(error), 0)).toBe(0);
    });
  });

  describe('isSuccess', () => {
    it('returns true for success result', () => {
      expect(isSuccess(success(42))).toBe(true);
    });

    it('returns false for failure result', () => {
      const error = createError('TEST_ERROR', 'test');
      expect(isSuccess(failure(error))).toBe(false);
    });
  });

  describe('isFailure', () => {
    it('returns false for success result', () => {
      const error = createError('TEST_ERROR', 'test');
      expect(isFailure(success(42))).toBe(false);
    });

    it('returns true for failure result', () => {
      const error = createError('TEST_ERROR', 'test');
      expect(isFailure(failure(error))).toBe(true);
    });
  });
});

describe('errors/factory', () => {
  describe('createError', () => {
    it('creates error with code and message', () => {
      const error = createError('UNKNOWN_ERROR', 'test message');
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.message).toBe('test message');
    });

    it('includes cause when provided', () => {
      const cause = new Error('original error');
      const error = createError('UNKNOWN_ERROR', 'test', { cause });
      expect(error.cause).toBe(cause);
    });

    it('includes context when provided', () => {
      const error = createError('CONFIG_NOT_FOUND', 'not found', {
        context: { directory: '/test' },
      });
      expect(error.context).toEqual({ directory: '/test' });
    });

    it('omits optional fields when not provided', () => {
      const error = createError('UNKNOWN_ERROR', 'test');
      expect(error.cause).toBeUndefined();
      expect(error.context).toBeUndefined();
    });
  });

  describe('errors factory', () => {
    it('creates configNotFound error', () => {
      const error = errors.configNotFound('/test/dir');
      expect(error.code).toBe('CONFIG_NOT_FOUND');
      expect(error.message).toContain('/test/dir');
      expect(error.context?.directory).toBe('/test/dir');
    });

    it('creates personalityNotFound error', () => {
      const error = errors.personalityNotFound('rick');
      expect(error.code).toBe('PERSONALITY_NOT_FOUND');
      expect(error.message).toContain('rick');
    });

    it('creates personalityAlreadyExists error', () => {
      const error = errors.personalityAlreadyExists('rick');
      expect(error.code).toBe('PERSONALITY_ALREADY_EXISTS');
    });

    it('creates validationError with field', () => {
      const error = errors.validationError('Invalid value', 'name');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.context?.field).toBe('name');
    });

    it('creates fileSystemError', () => {
      const error = errors.fileSystemError('read', '/test/path', new Error('enoent'));
      expect(error.code).toBe('FILE_SYSTEM_ERROR');
      expect(error.context?.operation).toBe('read');
      expect(error.context?.path).toBe('/test/path');
    });
  });
});

describe('errors/formatters', () => {
  describe('formatErrorForUser', () => {
    it('adds help text for CONFIG_NOT_FOUND', () => {
      const error = errors.configNotFound('/test');
      const formatted = formatErrorForUser(error);
      expect(formatted).toContain('/install');
    });

    it('adds help text for PERSONALITY_NOT_FOUND', () => {
      const error = errors.personalityNotFound('rick');
      const formatted = formatErrorForUser(error);
      expect(formatted).toContain('/personality list');
    });

    it('adds help text for PERSONALITY_ALREADY_EXISTS', () => {
      const error = errors.personalityAlreadyExists('rick');
      const formatted = formatErrorForUser(error);
      expect(formatted).toContain('different name');
    });

    it('includes field for VALIDATION_ERROR', () => {
      const error = errors.validationError('Invalid', 'email');
      const formatted = formatErrorForUser(error);
      expect(formatted).toContain('email');
    });
  });

  describe('formatErrorForLogging', () => {
    it('includes error code and message', () => {
      const error = createError('TEST_CODE', 'test message');
      const formatted = formatErrorForLogging(error);
      expect(formatted).toContain('[TEST_CODE]');
      expect(formatted).toContain('test message');
    });

    it('includes context when present', () => {
      const error = createError('TEST', 'msg', { context: { key: 'value' } });
      const formatted = formatErrorForLogging(error);
      expect(formatted).toContain('key');
    });

    it('includes cause when present', () => {
      const error = createError('TEST', 'msg', { cause: new Error('original') });
      const formatted = formatErrorForLogging(error);
      expect(formatted).toContain('original');
    });
  });

  describe('formatErrorForCli', () => {
    it('includes error message', () => {
      const error = createError('TEST', 'test message');
      const formatted = formatErrorForCli(error);
      expect(formatted).toContain('test message');
    });

    it('excludes code for UNKNOWN_ERROR', () => {
      const error = createError('UNKNOWN_ERROR', 'test');
      const formatted = formatErrorForCli(error);
      expect(formatted).not.toContain('Code:');
    });

    it('includes code for other errors', () => {
      const error = createError('CONFIG_NOT_FOUND', 'test');
      const formatted = formatErrorForCli(error);
      expect(formatted).toContain('Code:');
    });
  });
});
