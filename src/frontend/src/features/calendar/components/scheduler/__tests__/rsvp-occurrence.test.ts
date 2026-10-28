import { buildOccurrenceReply, toOccurrenceInstant } from "../rsvp-occurrence";

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
    recurrenceRule: { frequency: "DAILY", count: 3 },
    exceptionDates: [{ date: new Date("2026-11-04T09:00:00Z"), type: "DATE-TIME" }],
    attendees: [
      { email: "Bob@Example.com", partstat: "NEEDS-ACTION" },
      { email: "carol@example.com", partstat: "ACCEPTED" },
    ],
    ...overrides,
  }) as IcsEvent;

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
    const override = master({
      summary: "Moved by the organizer",
      start: { date: new Date("2026-11-03T14:00:00Z"), type: "DATE-TIME" },
      recurrenceRule: undefined,
      exceptionDates: undefined,
      recurrenceId: { value: { date: SECOND, type: "DATE-TIME" } },
    });

    const reply = buildOccurrenceReply([master(), override], UID, SECOND, USER, "DECLINED");

    expect(reply?.summary).toBe("Moved by the organizer");
    expect(reply?.start.date).toEqual(new Date("2026-11-03T14:00:00Z"));
    expect(reply?.attendees?.[0].partstat).toBe("DECLINED");
  });

  it("returns undefined when the server has no VEVENT for the UID", () => {
    expect(buildOccurrenceReply([], UID, SECOND, USER, "ACCEPTED")).toBeUndefined();
  });
});

describe("toOccurrenceInstant", () => {
  it("converts a fake UTC date in its timezone to real UTC", () => {
    const local = { date: SECOND, timezone: "Europe/Paris", tzoffset: "+0100" };
    const value = { date: SECOND, type: "DATE-TIME" as const, local };

    expect(toOccurrenceInstant(SECOND, value)).toEqual(new Date("2026-11-03T08:00:00Z"));
  });

  it("uses the timezone of the grid, not the series", () => {
    // A UTC browser shows a Paris event at 08:00.
    const utc = new Date("2026-11-03T08:00:00Z");
    const value = {
      date: utc,
      type: "DATE-TIME" as const,
      local: { date: utc, timezone: "UTC", tzoffset: "+0000" },
    };

    expect(toOccurrenceInstant(utc, value)).toEqual(utc);
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
