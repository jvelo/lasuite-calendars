/* eslint-disable @typescript-eslint/no-explicit-any */
export class APIError extends Error {
  data?: any;
  code: number;

  constructor(code: number, data?: any) {
    super();
    this.data = data;
    this.code = code;
  }
}

/** A request that did not reach the server. */
export class NetworkError extends Error {}

const STATUS_KEYS: Record<number, string> = {
  403: "api.error.forbidden",
  413: "api.error.fileTooLarge",
};

/** Returns the translation key of a user message for an error. */
export const getErrorMessageKey = (error: unknown): string => {
  if (error instanceof NetworkError) {
    return "api.error.network";
  }
  if (error instanceof APIError) {
    return STATUS_KEYS[error.code] ?? "api.error.unexpected";
  }
  return "api.error.unexpected";
};
