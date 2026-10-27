import { APIError, getErrorMessageKey, NetworkError } from "../APIError";

describe("getErrorMessageKey", () => {
  it("maps a network failure", () => {
    expect(getErrorMessageKey(new NetworkError("Failed to fetch"))).toBe("api.error.network");
  });

  it("does not take a TypeError from the app for a network failure", () => {
    expect(getErrorMessageKey(new TypeError("Cannot read properties of null"))).toBe(
      "api.error.unexpected",
    );
  });

  it("maps a forbidden response", () => {
    expect(getErrorMessageKey(new APIError(403, { detail: "Forbidden" }))).toBe(
      "api.error.forbidden",
    );
  });

  it("maps a request that is too large", () => {
    expect(getErrorMessageKey(new APIError(413))).toBe("api.error.fileTooLarge");
  });

  it("ignores the backend text of other API errors", () => {
    expect(getErrorMessageKey(new APIError(400, { error: "Failed to fetch mailboxes" }))).toBe(
      "api.error.unexpected",
    );
  });

  it("uses the unexpected error for other errors", () => {
    expect(getErrorMessageKey(new Error("boom"))).toBe("api.error.unexpected");
    expect(getErrorMessageKey("boom")).toBe("api.error.unexpected");
  });
});
