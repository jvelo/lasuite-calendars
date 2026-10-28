import { findRsvpBlocker } from "../rsvp-blocker";

import type { IcsEvent } from "ts-ics";

const UID = "event-uid";
const USER = "bob@example.com";
const START = new Date("2026-11-02T09:00:00Z");
const SECOND = new Date("2026-11-03T09:00:00Z");

const makeEvent = (overrides: Partial<IcsEvent> = {}): IcsEvent =>
  ({
    uid: UID,
    stamp: { date: START },
    start: { date: START, type: "DATE-TIME" },
    summary: "Weekly",
    organizer: { email: "alice@example.com" },
    attendees: [{ email: "Bob@Example.com", partstat: "NEEDS-ACTION" }],
    ...overrides,
  }) as IcsEvent;

const recurring = (overrides: Partial<IcsEvent> = {}) =>
  makeEvent({ recurrenceRule: { frequency: "DAILY", count: 3 }, ...overrides });

const override = (overrides: Partial<IcsEvent> = {}) =>
  makeEvent({
    start: { date: SECOND, type: "DATE-TIME" },
    recurrenceId: { value: { date: SECOND, type: "DATE-TIME" } },
    ...overrides,
  });

const scheduled = (date: Date) => ({ date, scheduled: true });
const unscheduled = (date: Date) => ({ date, scheduled: false });

describe("findRsvpBlocker", () => {
  it("allows an answer to a confirmed event", () => {
    expect(findRsvpBlocker([makeEvent()], UID, USER)).toBeNull();
  });

  it("reports a deleted event", () => {
    expect(findRsvpBlocker([], UID, USER)).toBe("deleted");
    expect(findRsvpBlocker(undefined, UID, USER)).toBe("deleted");
    expect(findRsvpBlocker([makeEvent({ uid: "other" })], UID, USER)).toBe("deleted");
  });

  it("reports a cancelled event", () => {
    expect(findRsvpBlocker([makeEvent({ status: "CANCELLED" })], UID, USER)).toBe("cancelled");
  });

  it("reports a cancelled series for a single occurrence", () => {
    const events = [recurring({ status: "CANCELLED" })];
    expect(findRsvpBlocker(events, UID, USER, scheduled(SECOND))).toBe("cancelled");
  });

  it("reports a removed attendee", () => {
    const events = [makeEvent({ attendees: [{ email: "carol@example.com" }] })];
    expect(findRsvpBlocker(events, UID, USER)).toBe("notAttendee");
  });

  it("allows an answer to a scheduled occurrence", () => {
    expect(findRsvpBlocker([recurring()], UID, USER, scheduled(SECOND))).toBeNull();
  });

  it("reports an occurrence that the server no longer expands", () => {
    expect(findRsvpBlocker([recurring()], UID, USER, unscheduled(SECOND))).toBe("cancelled");
  });

  it("reports a cancelled override", () => {
    const events = [recurring(), override({ status: "CANCELLED" })];
    expect(findRsvpBlocker(events, UID, USER, scheduled(SECOND))).toBe("cancelled");
    expect(findRsvpBlocker(events, UID, USER, scheduled(START))).toBeNull();
  });

  it("reports an attendee removed from one override", () => {
    const events = [recurring(), override({ attendees: [] })];
    expect(findRsvpBlocker(events, UID, USER, scheduled(SECOND))).toBe("notAttendee");
    expect(findRsvpBlocker(events, UID, USER, scheduled(START))).toBeNull();
  });
});
