import type { IcsEvent } from "ts-ics";

import { findOverride } from "./rsvp-occurrence";

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
 * Give `occurrence` to check a single occurrence of a recurring event.
 * `scheduled` tells if the server expansion still holds it. An
 * occurrence is cancelled when it is not scheduled, or when its override
 * has STATUS:CANCELLED.
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
