import { generateIcsEvent } from "ts-ics";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EventCalendarAdapter } from "../EventCalendarAdapter";

const RealDateTimeFormat = Intl.DateTimeFormat;

describe("toIcsEvent timezone fallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes UTC without a TZID when Intl rejects the timezone", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(((
      locales?: string | string[],
      options?: Intl.DateTimeFormatOptions,
    ) => {
      if (options?.timeZone === "Europe/Paris") {
        throw new RangeError("Invalid time zone specified: Europe/Paris");
      }
      return new RealDateTimeFormat(locales, options);
    }) as typeof Intl.DateTimeFormat);

    const adapter = new EventCalendarAdapter();
    const start = new Date(Date.UTC(2026, 0, 29, 14, 0));
    const end = new Date(Date.UTC(2026, 0, 29, 15, 0));
    const ics = adapter.toIcsEvent(
      {
        id: "1",
        start,
        end,
        extendedProps: { timezone: "Europe/Paris" },
      },
      { defaultTimezone: "Europe/Paris" },
    );

    expect(ics.start.local).toBeUndefined();
    expect(ics.start.date.getTime()).toBe(start.getTime());
    expect(ics.end?.local).toBeUndefined();
    expect(ics.end?.date.getTime()).toBe(end.getTime());

    const text = generateIcsEvent(ics);
    expect(text).toMatch(/^DTSTART[^:\r\n]*:20260129T140000Z\r?$/m);
    expect(text).toMatch(/^DTEND[^:\r\n]*:20260129T150000Z\r?$/m);
    expect(text).not.toContain("TZID");
  });
});
