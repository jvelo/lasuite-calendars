import type { IcsEvent } from "ts-ics";

import { findOverride, isRemovedOccurrence } from "./rsvp-occurrence";

/** A reason that prevents an attendee from answering an invitation. */
export type RsvpBlocker = "cancelled" | "deleted" | "notAttendee";

export const RSVP_BLOCKER_MESSAGE_KEYS: Record<RsvpBlocker, string> = {
  cancelled: "rsvp.error.eventCancelled",
  deleted: "rsvp.error.eventNotFound",
  notAttendee: "rsvp.error.notAttendee",
};

/**
 * Find why an attendee cannot answer an invitation, from the event as
 * the server stores it.
 *
 * Give `occurrenceDate` to check a single occurrence of a recurring
 * event. An occurrence is cancelled when its override has
 * STATUS:CANCELLED. Without an override, it is cancelled when the master
 * no longer generates it: an EXDATE excludes it, or it is outside the
 * series bounds.
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
    const override = findOverride(instances, occurrenceDate);
    const removed = !!master && isRemovedOccurrence(master, occurrenceDate);
    if (override ? override.status === "CANCELLED" : removed) return "cancelled";
    target = override ?? master;
  }

  const email = attendeeEmail.toLowerCase();
  const isAttendee = target?.attendees?.some((a) => a.email.toLowerCase() === email);
  return isAttendee ? null : "notAttendee";
};
