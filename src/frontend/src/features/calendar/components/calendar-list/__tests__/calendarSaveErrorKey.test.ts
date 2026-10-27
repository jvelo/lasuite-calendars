import { APIError } from "@/features/api/APIError";

import { getCalendarSaveErrorKey } from "../calendarSaveErrorKey";

describe("getCalendarSaveErrorKey", () => {
  it("maps the mailbox role error code", () => {
    const error = new APIError(400, {
      error: "User needs 'sender' or 'admin' role to create a mailbox calendar",
      code: "mailbox_role_required",
    });
    expect(getCalendarSaveErrorKey(error, "create")).toBe(
      "calendar.createCalendar.errorMailboxRole",
    );
  });

  it("ignores the backend text of other API errors", () => {
    const error = new APIError(400, { error: "name is required" });
    expect(getCalendarSaveErrorKey(error, "create")).toBe("calendar.createCalendar.error");
  });

  it("uses the generic error when the creation fails", () => {
    expect(getCalendarSaveErrorKey(new Error("boom"), "create")).toBe(
      "calendar.createCalendar.error",
    );
  });

  it("uses the unexpected error when the edit fails", () => {
    expect(getCalendarSaveErrorKey(new Error("boom"), "edit")).toBe("api.error.unexpected");
  });
});
