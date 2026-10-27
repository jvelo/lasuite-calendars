/**
 * CalDavService ownership detection.
 *
 * The owner and a sharee send the same DELETE. SabreDAV decides what
 * it removes. The client must read ownership from the PROPFIND
 * resource type to show the right action.
 */
import type { Mock } from "vitest";
import { CalDavService } from "../CalDavService";
import { getCalendarDeleteMode } from "../../../utils/calendar-ownership";

function mockResponse(status: number, body = ""): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/xml" }),
    text: async () => body,
  } as unknown as Response;
}

const calendarResponse = (uri: string, sharingType: string, invite = "") => `
  <d:response>
    <d:href>/caldav/calendars/users/me@example.com/${uri}/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>${uri}</d:displayname>
        <d:resourcetype><d:collection/><cal:calendar/>${sharingType}</d:resourcetype>
        <cs:invite>${invite}</cs:invite>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>`;

const SHAREE_INVITE = `
  <cs:organizer><d:href>/caldav/principals/users/me@example.com</d:href></cs:organizer>
  <cs:user>
    <cs:invite-accepted/>
    <cs:access><cs:read/></cs:access>
    <d:href>mailto:bob@example.com</d:href>
  </cs:user>`;

const MULTISTATUS = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav"
  xmlns:cs="http://calendarserver.org/ns/">
  ${calendarResponse("private", "<cs:shared-owner/>")}
  ${calendarResponse("team", "<cs:shared-owner/>", SHAREE_INVITE)}
  ${calendarResponse("from-alice", "<cs:shared/>", SHAREE_INVITE)}
</d:multistatus>`;

describe("CalDavService ownership detection", () => {
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

  it("reads the delete mode of each calendar from the PROPFIND", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(207, MULTISTATUS));

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
});
