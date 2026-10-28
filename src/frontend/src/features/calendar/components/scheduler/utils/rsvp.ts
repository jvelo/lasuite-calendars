import type { IcsAttendeePartStatusType, IcsDateObject, IcsEvent } from "ts-ics";

import type { RsvpBlocker } from "../types";
import { getEventCalendarAdapter } from "../../../services/dav/EventCalendarAdapter";

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

/** Copy the master to one occurrence. Only the start and the end change. */
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

export const RSVP_BLOCKER_MESSAGE_KEYS: Record<RsvpBlocker, string> = {
  cancelled: "rsvp.error.eventCancelled",
  deleted: "rsvp.error.eventNotFound",
  notAttendee: "rsvp.error.notAttendee",
};

/**
 * Find why an attendee cannot answer an invitation. `events` is the
 * server copy of the event.
 *
 * Give `occurrence` to check a single occurrence of a recurring event.
 * `date` is its RECURRENCE-ID in real UTC. `scheduled` tells if the
 * occurrence still exists. An occurrence is cancelled when it is not
 * scheduled, or when its override has STATUS:CANCELLED.
 *
 * Returns null when the attendee can answer.
 */
export const findRsvpBlocker = (
  events: IcsEvent[] | undefined,
  uid: string,
  attendeeEmail: string,
  occurrence?: { date: Date; scheduled: boolean },
): RsvpBlocker | null => {
  const instances = events?.filter((e) => e.uid === uid) ?? [];
  if (instances.length === 0) return "deleted";

  const master = instances.find((e) => !e.recurrenceId);
  if (master?.status === "CANCELLED") return "cancelled";

  let target = master;
  if (occurrence) {
    const override = findOverride(instances, occurrence.date);
    if (!occurrence.scheduled || override?.status === "CANCELLED") return "cancelled";
    target = override ?? master;
  }

  const email = attendeeEmail.toLowerCase();
  const isAttendee = target?.attendees?.some((a) => a.email.toLowerCase() === email);
  return isAttendee ? null : "notAttendee";
};
