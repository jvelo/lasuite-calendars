/**
 * "Delete this and following" deletes the whole series when the selected
 * occurrence is the first one. That shortcut compares the occurrence date
 * with the series start, so it needs the same timezone guard as the
 * service writes: in an unsupported timezone the occurrence date is UTC,
 * and a later occurrence can look like the first one.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { convertIcsCalendar, type IcsEvent } from "ts-ics";

import type { CalDavService } from "@/features/calendar/services/dav/CalDavService";
import type { EventCalendarAdapter } from "@/features/calendar/services/dav/EventCalendarAdapter";
import { useSchedulerHandlers } from "../useSchedulerHandlers";

vi.mock("@/features/auth/Auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@/features/ui/components/toaster/Toaster", () => ({
  addErrorToast: vi.fn(),
  addSuccessToast: vi.fn(),
}));

const EVENT_URL = "http://srv/caldav/calendars/users/u@example.com/cal-uid/event-uid.ics";
const UID = "event-uid";

const hourlySeries = (tzid: string) =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//test//EN",
    "BEGIN:VTIMEZONE",
    `TZID:${tzid}`,
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
    `DTSTART;TZID=${tzid}:20260129T150000`,
    `DTEND;TZID=${tzid}:20260129T153000`,
    "RRULE:FREQ=HOURLY;COUNT=5",
    "SUMMARY:Hourly",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

const occurrence = (start: Date): IcsEvent => ({
  uid: UID,
  stamp: { date: new Date() },
  start: { type: "DATE-TIME", date: start },
  end: { type: "DATE-TIME", date: new Date(start.getTime() + 1_800_000) },
  summary: "Hourly",
  recurrenceRule: { frequency: "HOURLY", count: 5 },
});

function renderHandlers(caldavService: CalDavService) {
  let handlers!: ReturnType<typeof useSchedulerHandlers>;
  const Probe = () => {
    handlers = useSchedulerHandlers({
      adapter: {} as EventCalendarAdapter,
      caldavService,
      calendarRef: { current: null },
      calendarUrl: "http://srv/caldav/calendars/users/u@example.com/cal-uid/",
      modalState: {
        isOpen: true,
        mode: "edit",
        event: null,
        calendarUrl: "",
        eventUrl: EVENT_URL,
        etag: '"e1"',
      },
      setModalState: vi.fn(),
    });
    return null;
  };
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<Probe />));
  return { handlers, unmount: () => act(() => root.unmount()) };
}

function mockService(tzid: string) {
  return {
    fetchEvent: vi.fn().mockResolvedValue({
      success: true,
      data: {
        url: EVENT_URL,
        etag: '"e1"',
        calendarUrl: "",
        data: convertIcsCalendar(undefined, hourlySeries(tzid)),
      },
    }),
    deleteEvent: vi.fn().mockResolvedValue({ success: true }),
    truncateRecurringSeries: vi.fn().mockResolvedValue({ success: true, data: {} }),
  };
}

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

describe("useSchedulerHandlers delete 'future'", () => {
  it("refuses the whole-series shortcut in an unsupported timezone", async () => {
    const service = mockService("Romance Standard Time");
    const { handlers, unmount } = renderHandlers(service as unknown as CalDavService);

    // Second occurrence, 16:00 local. The UTC fallback gives 15:00, the
    // same value as the series start in fake UTC.
    const second = occurrence(new Date(Date.UTC(2026, 0, 29, 15, 0)));
    const error = await handlers.handleModalDelete(second, "", "future").then(
      () => undefined,
      (e: unknown) => e,
    );

    expect(error).toMatchObject({ code: "unsupported-timezone" });
    expect(service.deleteEvent).not.toHaveBeenCalled();
    expect(service.truncateRecurringSeries).not.toHaveBeenCalled();
    unmount();
  });
});
