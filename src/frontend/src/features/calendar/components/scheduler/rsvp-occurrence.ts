import type { IcsAttendeePartStatusType, IcsDateObject, IcsEvent } from "ts-ics";

import { getEventCalendarAdapter } from "../../services/dav/EventCalendarAdapter";

/** Give the wall-clock time of `date` in `timezone`, stored as UTC ("fake UTC"). */
const toFakeUtc = (date: Date, timezone: string): Date => {
  const c = getEventCalendarAdapter().getDateComponentsInTimezone(date, timezone);
  return new Date(Date.UTC(c.year, c.month - 1, c.day, c.hours, c.minutes, c.seconds));
};

/** Give the real UTC instant of a fake UTC date in `timezone`. */
const fromFakeUtc = (date: Date, timezone: string): Date => {
  const offset = (d: Date) => toFakeUtc(d, timezone).getTime() - d.getTime();
  // A second pass corrects the offset near a DST change.
  const guess = new Date(date.getTime() - offset(date));
  return new Date(date.getTime() - offset(guess));
};

/**
 * Give the real UTC instant of an occurrence date from the grid.
 *
 * The grid gives fake UTC in the timezone of `value.local`. An all-day
 * date stays at midnight UTC, as in the server expansion.
 */
export const toOccurrenceInstant = (date: Date, value?: IcsDateObject): Date =>
  value?.type === "DATE" || !value?.local ? date : fromFakeUtc(date, value.local.timezone);

const moveTo = (value: IcsDateObject, date: Date): IcsDateObject => ({
  ...value,
  date,
  local: value.local && { ...value.local, date: toFakeUtc(date, value.local.timezone) },
});

/** Copy the master to one occurrence. The start and the end move; the rest stays. */
const occurrenceOf = (master: IcsEvent, instant: Date): IcsEvent => {
  const offset = instant.getTime() - master.start.date.getTime();
  const start = moveTo(master.start, instant);
  const moved: IcsEvent = master.end
    ? { ...master, start, end: moveTo(master.end, new Date(master.end.date.getTime() + offset)) }
    : { ...master, start };
  return { ...moved, recurrenceRule: undefined, exceptionDates: undefined };
};

/** Find the override VEVENT whose RECURRENCE-ID is at `instant` (real UTC). */
export const findOverride = (instances: IcsEvent[], instant: Date): IcsEvent | undefined =>
  instances.find((e) => e.recurrenceId?.value.date.getTime() === instant.getTime());

/**
 * Build the override that answers one occurrence, from the server copy
 * of the event. The base is the existing override, or else the master
 * moved to the occurrence. Only the PARTSTAT of the attendee changes.
 *
 * Returns undefined when the server copy has no VEVENT for this UID.
 */
export const buildOccurrenceReply = (
  events: IcsEvent[] | undefined,
  uid: string,
  instant: Date,
  attendeeEmail: string,
  partstat: IcsAttendeePartStatusType,
): IcsEvent | undefined => {
  const instances = events?.filter((e) => e.uid === uid) ?? [];
  const master = instances.find((e) => !e.recurrenceId);
  const base = findOverride(instances, instant) ?? (master && occurrenceOf(master, instant));
  if (!base) return undefined;

  const email = attendeeEmail.toLowerCase();
  return {
    ...base,
    attendees: base.attendees?.map((a) =>
      a.email.toLowerCase() === email ? { ...a, partstat } : a,
    ),
  };
};
