import { isOwnedCalendar } from "./calendar-ownership";

import type { CalDavCalendar } from "../services/dav/types/caldav-service";

/**
 * How the app asks the user to create their first calendar.
 *
 * - `none`: the user owns a calendar. The app does not ask.
 * - `required`: the user has no calendar. They must create one.
 * - `dismissible`: the user has only calendars that others share
 *   with them. The app asks, but the user can close the prompt.
 */
export type OnboardingMode = "none" | "required" | "dismissible";

export const getOnboardingMode = (calendars: CalDavCalendar[]): OnboardingMode => {
  if (calendars.some(isOwnedCalendar)) return "none";
  return calendars.length === 0 ? "required" : "dismissible";
};
