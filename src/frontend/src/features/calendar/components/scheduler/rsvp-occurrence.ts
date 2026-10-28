import type { IcsAttendeePartStatusType, IcsDateObject, IcsEvent } from "ts-ics";

import { getEventCalendarAdapter } from "../../services/dav/EventCalendarAdapter";

const instantOf = (value: IcsDateObject): Date => value.local?.date ?? value.date;

const isSameDate = (value: IcsDateObject, date: Date): boolean =>
  value.date.getTime() === date.getTime() || value.local?.date.getTime() === date.getTime();

const moveTo = (value: IcsDateObject, date: Date): IcsDateObject => ({
  ...value,
  date,
  local: value.local && { ...value.local, date },
});

/** Copy the master to one occurrence. The start and the end move; the rest stays. */
const occurrenceOf = (master: IcsEvent, occurrenceDate: Date): IcsEvent => {
  const offset = occurrenceDate.getTime() - instantOf(master.start).getTime();
  const start = moveTo(master.start, occurrenceDate);
  const moved: IcsEvent = master.end
    ? {
        ...master,
        start,
        end: moveTo(master.end, new Date(instantOf(master.end).getTime() + offset)),
      }
    : { ...master, start };
  return { ...moved, recurrenceRule: undefined, exceptionDates: undefined };
};

/** Find the override VEVENT of the occurrence at `occurrenceDate`. */
export const findOverride = (instances: IcsEvent[], occurrenceDate: Date): IcsEvent | undefined =>
  instances.find((e) => e.recurrenceId && isSameDate(e.recurrenceId.value, occurrenceDate));

/** Give the wall-clock time of `date` in `timezone`, stored as UTC ("fake UTC"). */
const toFakeUtc = (date: Date, timezone: string): Date => {
  const c = getEventCalendarAdapter().getDateComponentsInTimezone(date, timezone);
  return new Date(Date.UTC(c.year, c.month - 1, c.day, c.hours, c.minutes, c.seconds));
};

/**
 * Tell if the server expansion still holds the occurrence at `occurrenceDate`.
 *
 * `expanded` holds real UTC dates. `occurrenceDate` is fake UTC, in the
 * series timezone. Without a TZID, the browser timezone applies. A date
 * also matches as is, for all-day series.
 */
export const isScheduledOccurrence = (
  events: IcsEvent[] | undefined,
  uid: string,
  expanded: Date[],
  occurrenceDate: Date,
): boolean => {
  const master = events?.find((e) => e.uid === uid && !e.recurrenceId);
  const tz = master?.start.local?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const target = occurrenceDate.getTime();
  return expanded.some((d) => d.getTime() === target || toFakeUtc(d, tz).getTime() === target);
};

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
  occurrenceDate: Date,
  attendeeEmail: string,
  partstat: IcsAttendeePartStatusType,
): IcsEvent | undefined => {
  const instances = events?.filter((e) => e.uid === uid) ?? [];
  const master = instances.find((e) => !e.recurrenceId);
  const base =
    findOverride(instances, occurrenceDate) ?? (master && occurrenceOf(master, occurrenceDate));
  if (!base) return undefined;

  const email = attendeeEmail.toLowerCase();
  return {
    ...base,
    attendees: base.attendees?.map((a) =>
      a.email.toLowerCase() === email ? { ...a, partstat } : a,
    ),
  };
};
