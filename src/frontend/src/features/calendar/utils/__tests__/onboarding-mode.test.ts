import { getOnboardingMode } from "../onboarding-mode";
import type { CalDavCalendar } from "../../services/dav/types/caldav-service";

const calendar = (overrides: Partial<CalDavCalendar>): CalDavCalendar => ({
  url: "http://srv/caldav/calendars/users/me@example.com/cal/",
  displayName: "Cal",
  includeInAvailability: true,
  ...overrides,
});

const owned = calendar({ resourcetype: ["collection", "calendar"] });
const sharedWithMe = calendar({ resourcetype: ["collection", "calendar", "shared"] });
const mailbox = calendar({
  resourcetype: ["collection", "calendar", "shared"],
  ownerType: "MAILBOX",
});

describe("getOnboardingMode", () => {
  it("requires a calendar when the user has none", () => {
    expect(getOnboardingMode([])).toBe("required");
  });

  it("lets a user with only shared calendars dismiss the prompt", () => {
    expect(getOnboardingMode([sharedWithMe])).toBe("dismissible");
  });

  it("does not ask a user who owns a calendar", () => {
    expect(getOnboardingMode([owned, sharedWithMe])).toBe("none");
  });

  it("counts a mailbox calendar as owned", () => {
    expect(getOnboardingMode([mailbox])).toBe("none");
  });
});
