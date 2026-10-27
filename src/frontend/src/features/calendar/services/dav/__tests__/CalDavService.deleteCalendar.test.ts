/**
 * CalDavService calendar deletion.
 *
 * The owner and a sharee send the same DELETE. SabreDAV decides what
 * it removes. Messages manages some mailbox calendar instances, and
 * SabreDAV refuses to delete them. The client must read ownership and
 * this flag from the PROPFIND, and must report a refused DELETE as a
 * failure.
 */
import type { Mock } from "vitest";
import { CalDavService } from "../CalDavService";
import { getCalendarDeleteMode } from "../../../utils/calendar-ownership";

const HOME = "http://srv/caldav/calendars/users/me@example.com/";

function mockResponse(status: number, body = "", contentType = "application/xml"): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": contentType }),
    text: async () => body,
  } as unknown as Response;
}

const calendarResponse = (uri: string, extraProps = "", sharingType = "") => `
  <d:response>
    <d:href>/caldav/calendars/users/me@example.com/${uri}/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>${uri}</d:displayname>
        <d:resourcetype><d:collection/><cal:calendar/>${sharingType}</d:resourcetype>
        ${extraProps}
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>`;

const MAILBOX = "<ls:calendar-owner-type>MAILBOX</ls:calendar-owner-type>";

const MULTISTATUS = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav"
  xmlns:ls="http://lasuite.numerique.gouv.fr/ns/">
  ${calendarResponse("private")}
  ${calendarResponse(
    "team-synced",
    `${MAILBOX}<ls:calendar-sync-managed>true</ls:calendar-sync-managed>`,
  )}
  ${calendarResponse("team-manual", MAILBOX)}
</d:multistatus>`;

const SHAREE_INVITE = `
  <cs:invite>
    <cs:organizer><d:href>/caldav/principals/users/me@example.com</d:href></cs:organizer>
    <cs:user>
      <cs:invite-accepted/>
      <cs:access><cs:read/></cs:access>
      <d:href>mailto:bob@example.com</d:href>
    </cs:user>
  </cs:invite>`;

const SHARING_MULTISTATUS = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav"
  xmlns:cs="http://calendarserver.org/ns/">
  ${calendarResponse("private", "", "<cs:shared-owner/>")}
  ${calendarResponse("team", SHAREE_INVITE, "<cs:shared-owner/>")}
  ${calendarResponse("from-alice", SHAREE_INVITE, "<cs:shared/>")}
</d:multistatus>`;

describe("CalDavService calendar deletion", () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: Mock;
  let service: CalDavService;

  beforeEach(async () => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    service = new CalDavService();
    await service.connect({ serverUrl: "http://srv/caldav/", userEmail: "me@example.com" });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("reads the sync-managed flag of each calendar from the PROPFIND", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(207, MULTISTATUS));

    const result = await service.fetchCalendars();

    expect(result.success).toBe(true);
    const flags = Object.fromEntries(
      (result.data ?? []).map((cal) => [cal.displayName, cal.syncManaged]),
    );
    expect(flags).toEqual({
      private: false,
      "team-synced": true,
      "team-manual": false,
    });
  });

  it("reads the delete mode of each calendar from the PROPFIND", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(207, SHARING_MULTISTATUS));

    const result = await service.fetchCalendars();

    expect(result.success).toBe(true);
    const modes = Object.fromEntries(
      (result.data ?? []).map((cal) => [cal.displayName, getCalendarDeleteMode(cal)]),
    );
    expect(modes).toEqual({
      private: "delete",
      team: "delete-shared",
      "from-alice": "remove",
    });
  });

  it("sends a DELETE to the calendar URL", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(204));

    const result = await service.deleteCalendar(`${HOME}private/`);

    expect(result.success).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${HOME}private/`);
    expect(init.method).toBe("DELETE");
  });

  it("reports a refused DELETE as a failure with its status", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        403,
        '<?xml version="1.0"?><d:error xmlns:d="DAV:" xmlns:s="http://sabredav.org/ns">' +
          "<s:message>This calendar is managed by Messages.</s:message></d:error>",
      ),
    );

    const result = await service.deleteCalendar(`${HOME}team-synced/`);

    expect(result).toEqual({
      success: false,
      status: 403,
      error: "This calendar is managed by Messages.",
    });
  });
});
