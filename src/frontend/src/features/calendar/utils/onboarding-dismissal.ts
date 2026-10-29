const storageKey = (email: string) => `calendar-onboarding-dismissed:${email}`;

/**
 * Read the dismissal flag for this email in this browser.
 * Return false when the flag is absent or storage is not available.
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
