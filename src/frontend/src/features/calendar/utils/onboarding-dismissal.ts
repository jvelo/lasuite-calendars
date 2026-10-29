/**
 * The key holds the first 8 characters of the user id, not the email.
 * The stored keys then do not show who logged in on this browser.
 */
const storageKey = (userId: string) => `calendar-onboarding-dismissed:${userId.slice(0, 8)}`;

/**
 * Read the dismissal flag for this user in this browser.
 * Return false when the flag is absent or storage is not available.
 */
export const loadOnboardingDismissed = (userId: string): boolean => {
  try {
    return localStorage.getItem(storageKey(userId)) === "1";
  } catch {
    return false;
  }
};

export const saveOnboardingDismissed = (userId: string) => {
  try {
    localStorage.setItem(storageKey(userId), "1");
  } catch {
    // Ignore storage errors
  }
};
