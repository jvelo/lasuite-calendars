import type { TFunction } from "i18next";

import type { CalDavErrorCode } from "@/features/calendar/services/dav/types/caldav-service";

/** Translation key of the message for each error code. */
const MESSAGE_KEYS: Record<CalDavErrorCode, string> = {
  "unsupported-timezone": "calendar.error.unsupportedTimezone",
};

/** The known error code of an error or a failed result, if any. */
const errorCode = (error: unknown): CalDavErrorCode | undefined => {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  const { code } = error;
  return typeof code === "string" && Object.hasOwn(MESSAGE_KEYS, code)
    ? (code as CalDavErrorCode)
    : undefined;
};

/**
 * Message to show for a failed CalDAV operation. An error with a known
 * code gets the translated message for that code. Any other error gets
 * the fallback.
 */
export const errorMessage = (t: TFunction, error: unknown, fallback: string): string => {
  const code = errorCode(error);
  return code ? t(MESSAGE_KEYS[code]) : fallback;
};
