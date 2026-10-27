import { APIError } from "./APIError";

const STATUS_KEYS: Record<number, string> = {
  403: "api.error.forbidden",
  413: "api.error.fileTooLarge",
};

/** Returns the translation key of a user message for an error. */
export const getErrorMessageKey = (error: unknown): string => {
  // fetch() rejects with a TypeError when the request cannot reach the server.
  if (error instanceof TypeError) {
    return "api.error.network";
  }
  if (error instanceof APIError) {
    return STATUS_KEYS[error.code] ?? "api.error.unexpected";
  }
  return "api.error.unexpected";
};
