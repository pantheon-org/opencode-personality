import type { AppError } from "./types.js";

export function formatErrorForUser(error: AppError): string {
  let message = error.message;

  switch (error.code) {
    case "CONFIG_NOT_FOUND":
      message += "\n\nRun `/install` to set up your personality configuration.";
      break;
    case "PERSONALITY_NOT_FOUND":
      message += `\n\nUse "/personality list" to see available personalities.`;
      break;
    case "PERSONALITY_ALREADY_EXISTS":
      message += `\n\nUse a different name or delete the existing one first.`;
      break;
    case "VALIDATION_ERROR":
      if (error.context?.field) {
        message += `\n\nInvalid field: ${error.context.field}`;
      }
      break;
  }

  return message;
}

export function formatErrorForLogging(error: AppError): string {
  const parts = [`[${error.code}] ${error.message}`];

  if (error.context && Object.keys(error.context).length > 0) {
    parts.push(`Context: ${JSON.stringify(error.context)}`);
  }

  if (error.cause !== undefined) {
    parts.push(`Caused by: ${error.cause}`);
  }

  return parts.join("\n");
}

export function formatErrorForCli(error: AppError): string {
  const parts = [`Error: ${error.message}`];

  if (error.code !== "UNKNOWN_ERROR") {
    parts.push(`Code: ${error.code}`);
  }

  if (error.context && Object.keys(error.context).length > 0) {
    parts.push(`Context: ${JSON.stringify(error.context, null, 2)}`);
  }

  return parts.join("\n");
}
