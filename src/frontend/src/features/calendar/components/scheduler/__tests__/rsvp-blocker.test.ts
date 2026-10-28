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
    expect(findRsvpBlocker(events, UID, USER, SECOND)).toBe("cancelled");
  });

  it("reports a removed attendee", () => {
    const events = [makeEvent({ attendees: [{ email: "carol@example.com" }] })];
    expect(findRsvpBlocker(events, UID, USER)).toBe("notAttendee");
  });

  it("reports an occurrence excluded by EXDATE", () => {
    const events = [recurring({ exceptionDates: [{ date: SECOND, type: "DATE-TIME" }] })];
    expect(findRsvpBlocker(events, UID, USER, SECOND)).toBe("cancelled");
    expect(findRsvpBlocker(events, UID, USER, START)).toBeNull();
    expect(findRsvpBlocker(events, UID, USER)).toBeNull();
  });

  it("reports an occurrence after the series UNTIL", () => {
    const events = [
      recurring({
        recurrenceRule: { frequency: "DAILY", until: { date: START, type: "DATE-TIME" } },
      }),
    ];
    expect(findRsvpBlocker(events, UID, USER, SECOND)).toBe("cancelled");
    expect(findRsvpBlocker(events, UID, USER, START)).toBeNull();
  });

  it("reports an occurrence before the series start", () => {
    const before = new Date("2026-11-01T09:00:00Z");
    expect(findRsvpBlocker([recurring()], UID, USER, before)).toBe("cancelled");
  });

  it("reports an occurrence after the series COUNT", () => {
    const events = [recurring({ recurrenceRule: { frequency: "DAILY", count: 1 } })];
    expect(findRsvpBlocker(events, UID, USER, SECOND)).toBe("cancelled");
    expect(findRsvpBlocker(events, UID, USER, START)).toBeNull();
  });

  it("reports a day that a weekly BYDAY rule skips", () => {
    // 2026-11-02 is a Monday.
    const events = [
      recurring({
        recurrenceRule: { frequency: "WEEKLY", byDay: [{ day: "MO" }, { day: "WE" }] },
      }),
    ];
    expect(findRsvpBlocker(events, UID, USER, SECOND)).toBe("cancelled");
    expect(findRsvpBlocker(events, UID, USER, new Date("2026-11-04T09:00:00Z"))).toBeNull();
  });

  it("allows the last occurrence of a zoned series with a UTC UNTIL", () => {
    // 09:00 in Paris is 08:00 UTC. The fake UTC dates hold 09:00.
    const zoned = (date: Date) => ({
      date,
      type: "DATE-TIME" as const,
      local: { date, timezone: "Europe/Paris", tzoffset: "+0100" },
    });
    const events = [
      recurring({
        start: zoned(START),
        recurrenceRule: {
          frequency: "DAILY",
          until: { date: new Date("2026-11-03T08:00:00Z"), type: "DATE-TIME" },
        },
      }),
    ];
    expect(findRsvpBlocker(events, UID, USER, SECOND)).toBeNull();
    expect(findRsvpBlocker(events, UID, USER, new Date("2026-11-04T09:00:00Z"))).toBe("cancelled");
  });

  it("matches an EXDATE on its local date", () => {
    const fakeUtc = new Date("2026-11-03T10:00:00Z");
    const events = [
      recurring({
        exceptionDates: [
          {
            date: SECOND,
            type: "DATE-TIME",
            local: { date: fakeUtc, timezone: "Europe/Paris", tzoffset: "+0100" },
          },
        ],
      }),
    ];
    expect(findRsvpBlocker(events, UID, USER, fakeUtc)).toBe("cancelled");
  });

  it("reports a cancelled override", () => {
    const events = [
      recurring({ exceptionDates: [{ date: SECOND, type: "DATE-TIME" }] }),
      override({ status: "CANCELLED" }),
    ];
    expect(findRsvpBlocker(events, UID, USER, SECOND)).toBe("cancelled");
    expect(findRsvpBlocker(events, UID, USER, START)).toBeNull();
  });

  it("allows an answer to an override that replaces an EXDATE", () => {
    const events = [
      recurring({ exceptionDates: [{ date: SECOND, type: "DATE-TIME" }] }),
      override(),
    ];
    expect(findRsvpBlocker(events, UID, USER, SECOND)).toBeNull();
  });

  it("reports an attendee removed from one override", () => {
    const events = [recurring(), override({ attendees: [] })];
    expect(findRsvpBlocker(events, UID, USER, SECOND)).toBe("notAttendee");
    expect(findRsvpBlocker(events, UID, USER, START)).toBeNull();
  });
});
