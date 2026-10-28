import type { CalDavCalendar } from "../services/dav/types/caldav-service";

/**
 * What a DELETE on the calendar does for the current user.
 *
 * - `delete`: the user owns the calendar. Nobody else has access.
 * - `delete-shared`: the user owns the calendar. Other users lose it too.
 * - `leave`: the user is a sharee. Only their own access goes away.
 */
export type CalendarDeleteMode = "delete" | "delete-shared" | "leave";

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
 * Tell if the calendar goes in the "My calendars" section.
 *
 * This is about display, not ownership. A mailbox calendar is a sharee
 * instance, but the user acts for the mailbox, so it goes there too.
 */
export const belongsInMyCalendars = (calendar: CalDavCalendar): boolean =>
  calendar.ownerType === "MAILBOX" || isCalendarOwner(calendar);

export const getCalendarDeleteMode = (calendar: CalDavCalendar): CalendarDeleteMode => {
  if (!isCalendarOwner(calendar)) {
    return "leave";
  }
  return calendar.sharees?.length ? "delete-shared" : "delete";
};
