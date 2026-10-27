import { getShareErrorKey } from "../shareErrorKey";

const FALLBACK = "calendar.shareCalendar.error";

describe("getShareErrorKey", () => {
  it("maps the sync-managed sharee error", () => {
    const error =
      "This sharee is managed by Messages and can only be changed there. " +
      "Update the mailbox permissions in Messages instead.";
    expect(getShareErrorKey({ error, status: 403 }, FALLBACK)).toBe(
      "calendar.shareCalendar.errorSyncManaged",
    );
  });

  it("maps the mailbox read-only error", () => {
    const error =
      "Mailbox calendars can only be shared with read-only access. " +
      "To grant write access, update the mailbox permissions in Messages.";
    expect(getShareErrorKey({ error, status: 403 }, FALLBACK)).toBe(
      "calendar.shareCalendar.errorMailboxReadOnly",
    );
  });

  it("maps other forbidden errors", () => {
    const error = "User did not have the required privileges ({DAV:}share) for path";
    expect(getShareErrorKey({ error, status: 403 }, FALLBACK)).toBe(
      "calendar.shareCalendar.errorForbidden",
    );
  });

  it("returns the fallback key for other errors", () => {
    expect(getShareErrorKey({ error: "Internal server error", status: 500 }, FALLBACK)).toBe(
      FALLBACK,
    );
    expect(getShareErrorKey({}, FALLBACK)).toBe(FALLBACK);
  });
});
