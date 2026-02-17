import { validatePersonalityFile as schemaValidate, formatValidationErrors } from '../schema.js';
import type { PersonalityFile } from '../types.js';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export function validatePersonality(config: PersonalityFile): ValidationResult {
  const result = schemaValidate(config);
  
  if (result.valid) {
    return { valid: true };
  }
  
  return {
    valid: false,
    errors: result.errors,
  };
}

export { formatValidationErrors };
