import type { CalDavCalendar } from "../services/dav/types/caldav-service";

/**
 * What a DELETE on the calendar does for the current user.
 *
 * - `delete`: the user owns the calendar. Nobody else has access.
 * - `delete-shared`: the user owns the calendar. Other users lose it too.
 * - `remove`: the user is a sharee. Only their own access goes away.
 */
export type CalendarDeleteMode = "delete" | "delete-shared" | "remove";

/**
 * Tell if the current user owns the calendar.
 *
 * SabreDAV adds `CS:shared` to the resource type of a sharee instance.
 * The owner instance has `CS:shared-owner` instead, which the DAV
 * parser turns into `sharedOwner`. The URL does not help: SabreDAV
 * puts each sharee instance in the sharee's own calendar home.
 */
export const isCalendarOwner = (calendar: CalDavCalendar): boolean =>
  !(calendar.resourcetype ?? []).includes("shared");

/**
 * Tell if the calendar is one of the user's own calendars.
 *
 * A mailbox calendar is a sharee instance. The user acts for the
 * mailbox, so a mailbox calendar counts as one of their own calendars.
 */
export const isOwnedCalendar = (calendar: CalDavCalendar): boolean =>
  calendar.ownerType === "MAILBOX" || isCalendarOwner(calendar);

export const getCalendarDeleteMode = (calendar: CalDavCalendar): CalendarDeleteMode => {
  if (!isCalendarOwner(calendar)) {
    return "remove";
  }
  return calendar.sharees?.length ? "delete-shared" : "delete";
};
