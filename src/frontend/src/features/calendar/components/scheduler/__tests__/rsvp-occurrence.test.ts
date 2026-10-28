import { buildOccurrenceReply, isScheduledOccurrence } from "../rsvp-occurrence";

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

  it("keeps the local date of a zoned start in step with the occurrence", () => {
    const zoned = master({
      start: {
        date: START,
        type: "DATE-TIME",
        local: { date: START, timezone: "Europe/Paris", tzoffset: "+0100" },
      },
    });

    const reply = buildOccurrenceReply([zoned], UID, SECOND, USER, "ACCEPTED");

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

describe("isScheduledOccurrence", () => {
  it("matches a zoned occurrence against the real UTC expansion", () => {
    // 09:00 in Paris is 08:00 UTC. The fake UTC occurrence holds 09:00.
    const zoned = master({
      start: {
        date: START,
        type: "DATE-TIME",
        local: { date: START, timezone: "Europe/Paris", tzoffset: "+0100" },
      },
    });
    const expanded = [new Date("2026-11-03T08:00:00Z")];

    expect(isScheduledOccurrence([zoned], UID, expanded, SECOND)).toBe(true);
    expect(isScheduledOccurrence([zoned], UID, [], SECOND)).toBe(false);
  });

  it("matches an all-day occurrence as is", () => {
    const day = new Date("2026-11-03T00:00:00Z");
    const allDay = master({ start: { date: new Date("2026-11-02T00:00:00Z"), type: "DATE" } });

    expect(isScheduledOccurrence([allDay], UID, [day], day)).toBe(true);
  });
});
