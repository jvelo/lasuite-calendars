import { APIError } from "@/features/api/APIError";

// Error code from the setup API: the user cannot send as the mailbox.
const MAILBOX_ROLE_REQUIRED = "mailbox_role_required";

/** Returns the translation key for an error that occurs when a calendar is saved. */
export const getCalendarSaveErrorKey = (error: unknown, mode: "create" | "edit"): string => {
  if (error instanceof APIError && error.data?.code === MAILBOX_ROLE_REQUIRED) {
    return "calendar.createCalendar.errorMailboxRole";
  }
  return mode === "create" ? "calendar.createCalendar.error" : "api.error.unexpected";
};
