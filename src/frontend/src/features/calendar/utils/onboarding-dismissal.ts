const storageKey = (email: string) => `calendar-onboarding-dismissed:${email}`;

/**
 * Tell if the user closed the first-calendar prompt in this browser.
 *
 * The flag is per user, so another account on the same browser
 * still gets the prompt.
 */
export const loadOnboardingDismissed = (email: string): boolean => {
  try {
    return localStorage.getItem(storageKey(email)) === "1";
  } catch {
    return false;
  }
};

export const saveOnboardingDismissed = (email: string) => {
  try {
    localStorage.setItem(storageKey(email), "1");
  } catch {
    // Ignore storage errors
  }
};
