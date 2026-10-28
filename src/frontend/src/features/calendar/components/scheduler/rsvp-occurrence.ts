import { extendByRecurrenceRule } from "ts-ics";
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

/** Tell if the master generates an occurrence at `occurrenceDate`. */
const isGenerated = (master: IcsEvent, occurrenceDate: Date): boolean => {
  const start = instantOf(master.start);
  const rule = master.recurrenceRule;
  if (!rule) return start.getTime() === occurrenceDate.getTime();

  // DTSTART and occurrenceDate are fake UTC. With a TZID, UNTIL is real UTC.
  const tz = master.start.local?.timezone;
  const until =
    rule.until &&
    (rule.until.local?.date ?? (tz ? toFakeUtc(rule.until.date, tz) : rule.until.date));
  // Stop the expansion just after the occurrence. COUNT still applies.
  const after = new Date(occurrenceDate.getTime() + 1);
  const end = until && until < after ? until : after;
  return extendByRecurrenceRule(
    { ...rule, until: { type: "DATE-TIME", date: end } },
    { start, end },
  ).some((d) => d.getTime() === occurrenceDate.getTime());
};

/**
 * Tell if the master no longer generates the occurrence at `occurrenceDate`.
 * This is the case when the RRULE does not produce it, or an EXDATE excludes it.
 */
export const isRemovedOccurrence = (master: IcsEvent, occurrenceDate: Date): boolean =>
  !isGenerated(master, occurrenceDate) ||
  !!master.exceptionDates?.some((d) => isSameDate(d, occurrenceDate));

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
