/**
 * CalDavService mailbox calendar deletion. The client reads the Messages
 * role and the owner URL from the PROPFIND, and sends the DELETE to the
 * owner URL.
 */
import type { Mock } from "vitest";
import { CalDavService } from "../CalDavService";
import { isMailboxCalendarAdmin } from "../../../utils/calendar-ownership";

const HOME = "http://srv/caldav/calendars/users/me@example.com/";
const OWNER_URL = "http://srv/caldav/calendars/mailboxes/team@example.com/default/";

function mockResponse(status: number, body = ""): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/xml" }),
    text: async () => body,
  } as unknown as Response;
}

const mailboxCalendar = (uri: string, role: string) => `
  <d:response>
    <d:href>/caldav/calendars/users/me@example.com/${uri}/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>${uri}</d:displayname>
        <d:resourcetype><d:collection/><cal:calendar/><cs:shared/></d:resourcetype>
        <ls:calendar-owner-type>MAILBOX</ls:calendar-owner-type>
        <ls:calendar-sync-managed>true</ls:calendar-sync-managed>
        <ls:mailbox-role>${role}</ls:mailbox-role>
        <cs:shared-url>
          <d:href>/caldav/calendars/mailboxes/team%40example.com/default/</d:href>
        </cs:shared-url>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>`;

const MULTISTATUS = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav"
  xmlns:cs="http://calendarserver.org/ns/"
  xmlns:ls="http://lasuite.numerique.gouv.fr/ns/">
  ${mailboxCalendar("team-admin", "admin")}
  ${mailboxCalendar("team-sender", "sender")}
</d:multistatus>`;

describe("CalDavService mailbox calendar deletion", () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: Mock;
  let service: CalDavService;

  beforeEach(async () => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    service = new CalDavService();
    await service.connect({ serverUrl: "http://srv/caldav/", userEmail: "me@example.com" });
    fetchMock.mockResolvedValueOnce(mockResponse(207, MULTISTATUS));
    await service.fetchCalendars();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("reads the mailbox role and the owner URL from the PROPFIND", () => {
    const admin = service.getCalendar(`${HOME}team-admin/`);
    const sender = service.getCalendar(`${HOME}team-sender/`);

    expect(admin?.mailboxRole).toBe("admin");
    expect(decodeURIComponent(admin?.sharedUrl ?? "")).toBe(OWNER_URL);
    expect(isMailboxCalendarAdmin(admin!)).toBe(true);
    expect(isMailboxCalendarAdmin(sender!)).toBe(false);
  });

  it("sends the DELETE to the owner URL", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(204));

    const result = await service.deleteMailboxCalendar(`${HOME}team-admin/`);

    expect(result.success).toBe(true);
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(decodeURIComponent(url)).toBe(OWNER_URL);
    expect(init.method).toBe("DELETE");
    expect(service.getCalendar(`${HOME}team-admin/`)).toBeUndefined();
  });

  it("reports a refused DELETE as a failure with its status", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(403));

    const result = await service.deleteMailboxCalendar(`${HOME}team-sender/`);

    expect(result.success).toBe(false);
    expect(result.status).toBe(403);
    expect(service.getCalendar(`${HOME}team-sender/`)).toBeDefined();
  });

  it("does not send a request for a calendar without an owner URL", async () => {
    const calls = fetchMock.mock.calls.length;

    const result = await service.deleteMailboxCalendar(`${HOME}unknown/`);

    expect(result.success).toBe(false);
    expect(fetchMock.mock.calls.length).toBe(calls);
  });
});
