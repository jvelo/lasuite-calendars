import type { IcsDateObject, IcsEvent } from "ts-ics";

/** A reason that prevents an attendee from answering an invitation. */
export type RsvpBlocker = "cancelled" | "deleted" | "notAttendee";

export const RSVP_BLOCKER_MESSAGE_KEYS: Record<RsvpBlocker, string> = {
  cancelled: "rsvp.error.eventCancelled",
  deleted: "rsvp.error.eventNotFound",
  notAttendee: "rsvp.error.notAttendee",
};

const isSameDate = (value: IcsDateObject, date: Date): boolean =>
  value.date.getTime() === date.getTime() || value.local?.date.getTime() === date.getTime();

/**
 * Find why an attendee cannot answer an invitation, from the event as
 * the server stores it.
 *
 * Give `occurrenceDate` to check a single occurrence of a recurring
 * event. An occurrence is cancelled when the master excludes it with
 * an EXDATE and no override replaces it, or when its override has
 * STATUS:CANCELLED.
 *
 * Returns null when the attendee can answer.
 */
export const findRsvpBlocker = (
  events: IcsEvent[] | undefined,
  uid: string,
  attendeeEmail: string,
  occurrenceDate?: Date,
): RsvpBlocker | null => {
  const instances = events?.filter((e) => e.uid === uid) ?? [];
  if (instances.length === 0) return "deleted";

  const master = instances.find((e) => !e.recurrenceId);
  if (master?.status === "CANCELLED") return "cancelled";

  let target = master;
  if (occurrenceDate) {
    const override = instances.find(
      (e) => e.recurrenceId && isSameDate(e.recurrenceId.value, occurrenceDate),
    );
    const excluded = master?.exceptionDates?.some((d) => isSameDate(d, occurrenceDate));
    if (!override && excluded) return "cancelled";
    if (override?.status === "CANCELLED") return "cancelled";
    target = override ?? master;
  }

  const email = attendeeEmail.toLowerCase();
  const isAttendee = target?.attendees?.some((a) => a.email.toLowerCase() === email);
  return isAttendee ? null : "notAttendee";
};
