import { buildOccurrenceReply, findRsvpBlocker, toOccurrenceInstant } from "../utils/rsvp";

import type { IcsEvent } from "ts-ics";

const UID = "event-uid";
const USER = "bob@example.com";
const START = new Date("2026-11-02T09:00:00Z");
const END = new Date("2026-11-02T10:00:00Z");
const SECOND = new Date("2026-11-03T09:00:00Z");

const master = (overrides: Partial<IcsEvent> = {}): IcsEvent =>
  ({
    uid: UID,
    stamp: { date: START },
    start: { date: START, type: "DATE-TIME" },
    end: { date: END, type: "DATE-TIME" },
    summary: "Weekly",
    organizer: { email: "alice@example.com" },
    recurrenceRule: { frequency: "DAILY", count: 3 },
    exceptionDates: [{ date: new Date("2026-11-04T09:00:00Z"), type: "DATE-TIME" }],
    attendees: [
      { email: "Bob@Example.com", partstat: "NEEDS-ACTION" },
      { email: "carol@example.com", partstat: "ACCEPTED" },
    ],
    ...overrides,
  }) as IcsEvent;

const override = (overrides: Partial<IcsEvent> = {}) =>
  master({
    start: { date: SECOND, type: "DATE-TIME" },
    recurrenceRule: undefined,
    exceptionDates: undefined,
    recurrenceId: { value: { date: SECOND, type: "DATE-TIME" } },
    ...overrides,
  });

const scheduled = (date: Date) => ({ date, scheduled: true });
const unscheduled = (date: Date) => ({ date, scheduled: false });

describe("findRsvpBlocker", () => {
  it("allows an answer to a confirmed event", () => {
    expect(findRsvpBlocker([master()], UID, USER)).toBeNull();
  });

  it("reports a deleted event", () => {
    expect(findRsvpBlocker([], UID, USER)).toBe("deleted");
    expect(findRsvpBlocker(undefined, UID, USER)).toBe("deleted");
    expect(findRsvpBlocker([master({ uid: "other" })], UID, USER)).toBe("deleted");
  });

  it("reports a cancelled event", () => {
    expect(findRsvpBlocker([master({ status: "CANCELLED" })], UID, USER)).toBe("cancelled");
  });

  it("reports a removed attendee", () => {
    const events = [master({ attendees: [{ email: "carol@example.com" }] })];
    expect(findRsvpBlocker(events, UID, USER)).toBe("notAttendee");
  });

  it("allows an answer to a scheduled occurrence", () => {
    expect(findRsvpBlocker([master()], UID, USER, scheduled(SECOND))).toBeNull();
  });

  it("reports an occurrence that the server no longer expands", () => {
    expect(findRsvpBlocker([master()], UID, USER, unscheduled(SECOND))).toBe("cancelled");
  });

  it("reports a cancelled override", () => {
    const events = [master(), override({ status: "CANCELLED" })];
    expect(findRsvpBlocker(events, UID, USER, scheduled(SECOND))).toBe("cancelled");
    expect(findRsvpBlocker(events, UID, USER, scheduled(START))).toBeNull();
  });

  it("reports an attendee removed from one override", () => {
    const events = [master(), override({ attendees: [] })];
    expect(findRsvpBlocker(events, UID, USER, scheduled(SECOND))).toBe("notAttendee");
    expect(findRsvpBlocker(events, UID, USER, scheduled(START))).toBeNull();
  });
});

describe("buildOccurrenceReply", () => {
  it("moves the master to the occurrence and changes only the PARTSTAT", () => {
    const reply = buildOccurrenceReply([master()], UID, SECOND, USER, "ACCEPTED");

    expect(reply?.summary).toBe("Weekly");
    expect(reply?.start.date).toEqual(SECOND);
    expect(reply?.end?.date).toEqual(new Date("2026-11-03T10:00:00Z"));
    expect(reply?.recurrenceRule).toBeUndefined();
    expect(reply?.exceptionDates).toBeUndefined();
    expect(reply?.attendees).toEqual([
      { email: "Bob@Example.com", partstat: "ACCEPTED" },
      { email: "carol@example.com", partstat: "ACCEPTED" },
    ]);
  });

  it("gives a zoned start the wall-clock time of the occurrence", () => {
    // 09:00 in Paris is 08:00 UTC.
    const zoned = master({
      start: {
        date: new Date("2026-11-02T08:00:00Z"),
        type: "DATE-TIME",
        local: { date: START, timezone: "Europe/Paris", tzoffset: "+0100" },
      },
    });
    const instant = new Date("2026-11-03T08:00:00Z");

    const reply = buildOccurrenceReply([zoned], UID, instant, USER, "ACCEPTED");

    expect(reply?.start.date).toEqual(instant);
    expect(reply?.start.local).toEqual({
      date: SECOND,
      timezone: "Europe/Paris",
      tzoffset: "+0100",
    });
  });

  it("uses the server override of the occurrence", () => {
    const moved = override({
      summary: "Moved by the organizer",
      start: { date: new Date("2026-11-03T14:00:00Z"), type: "DATE-TIME" },
    });

    const reply = buildOccurrenceReply([master(), moved], UID, SECOND, USER, "DECLINED");

    expect(reply?.summary).toBe("Moved by the organizer");
    expect(reply?.start.date).toEqual(new Date("2026-11-03T14:00:00Z"));
    expect(reply?.attendees?.[0].partstat).toBe("DECLINED");
  });

  it("returns undefined when the server has no VEVENT for the UID", () => {
    expect(buildOccurrenceReply([], UID, SECOND, USER, "ACCEPTED")).toBeUndefined();
  });
});

describe("toOccurrenceInstant", () => {
  it("converts a wall-clock time in its timezone to an instant", () => {
    const local = { date: SECOND, timezone: "Europe/Paris", tzoffset: "+0100" };
    const value = { date: SECOND, type: "DATE-TIME" as const, local };

    expect(toOccurrenceInstant(SECOND, value)).toEqual(new Date("2026-11-03T08:00:00Z"));
  });

  it("applies the summer offset", () => {
    const summer = new Date("2026-07-01T09:00:00Z");
    const value = {
      date: summer,
      type: "DATE-TIME" as const,
      local: { date: summer, timezone: "Europe/Paris", tzoffset: "+0200" },
    };

    expect(toOccurrenceInstant(summer, value)).toEqual(new Date("2026-07-01T07:00:00Z"));
  });

  it("keeps an all-day date at midnight UTC", () => {
    const day = new Date("2026-11-03T00:00:00Z");

    expect(toOccurrenceInstant(day, { date: day, type: "DATE" })).toEqual(day);
  });
});
