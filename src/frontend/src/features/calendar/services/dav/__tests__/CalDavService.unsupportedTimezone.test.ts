/**
 * Occurrence writes refuse a source timezone that Intl cannot convert.
 *
 * Outlook sends Windows TZIDs with a VTIMEZONE block. ts-ics resolves
 * them, but Intl does not, so the occurrence date the UI passes in is UTC.
 * Writing it with the source TZID would target the wrong occurrence.
 */
import type { Mock } from "vitest";
import type { IcsEvent } from "ts-ics";
import { CalDavService } from "../CalDavService";

const EVENT_URL = "http://srv/caldav/calendars/users/u@example.com/cal-uid/event-uid.ics";
const UID = "event-uid";
const TZID = "Romance Standard Time";
const OCCURRENCE = new Date(Date.UTC(2026, 1, 5, 15, 0));

const ICS = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//test//EN",
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "BEGIN:STANDARD",
  "DTSTART:16010101T030000",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "DTSTART:16010101T020000",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
  "BEGIN:VEVENT",
  `UID:${UID}`,
  "DTSTAMP:20260101T000000Z",
  `DTSTART;TZID=${TZID}:20260129T150000`,
  `DTEND;TZID=${TZID}:20260129T160000`,
  "RRULE:FREQ=WEEKLY",
  "SUMMARY:Weekly",
  "END:VEVENT",
  "END:VCALENDAR",
  "",
].join("\r\n");

const overrideEvent: IcsEvent = {
  uid: UID,
  stamp: { date: new Date() },
  start: { type: "DATE-TIME", date: OCCURRENCE },
  end: { type: "DATE-TIME", date: new Date(OCCURRENCE.getTime() + 3_600_000) },
  summary: "Moved",
};

const METHODS = {
  createOverrideInstance: (service: CalDavService) =>
    service.createOverrideInstance(EVENT_URL, overrideEvent, OCCURRENCE, '"e1"'),
  addExdateToEvent: (service: CalDavService) =>
    service.addExdateToEvent(EVENT_URL, OCCURRENCE, '"e1"'),
  deleteOverrideInstance: (service: CalDavService) =>
    service.deleteOverrideInstance(EVENT_URL, OCCURRENCE, UID, '"e1"'),
  truncateRecurringSeries: (service: CalDavService) =>
    service.truncateRecurringSeries(EVENT_URL, OCCURRENCE, UID, '"e1"'),
};

describe.each(Object.entries(METHODS))("CalDavService.%s", (_name, write) => {
  const originalFetch = globalThis.fetch;
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => ICS,
    } as unknown as Response);
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fails without a PUT when Intl rejects the source timezone", async () => {
    const result = await write(new CalDavService());

    expect(result.success).toBe(false);
    expect(result.code).toBe("unsupported-timezone");
    const methods = fetchMock.mock.calls.map(([, init]) => (init as RequestInit)?.method);
    expect(methods).not.toContain("PUT");
  });
});
