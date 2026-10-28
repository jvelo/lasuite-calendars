import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { ReactNode } from "react";

/**
 * Whether the user closed the first-calendar prompt.
 *
 * The state lives above the routes, so it survives navigation inside
 * the app. It is not persisted: a page reload shows the prompt again.
 */
export interface OnboardingPromptContextType {
  dismissed: boolean;
  dismiss: () => void;
}

const OnboardingPromptContext = createContext<OnboardingPromptContextType | undefined>(undefined);

export const useOnboardingPrompt = () => {
  const context = useContext(OnboardingPromptContext);
  if (!context) {
    throw new Error("useOnboardingPrompt must be used within an OnboardingPromptProvider");
  }
  return context;
};

export const OnboardingPromptProvider = ({ children }: { children: ReactNode }) => {
  const [dismissed, setDismissed] = useState(false);
  const dismiss = useCallback(() => setDismissed(true), []);
  const value = useMemo(() => ({ dismissed, dismiss }), [dismissed, dismiss]);
  return (
    <OnboardingPromptContext.Provider value={value}>{children}</OnboardingPromptContext.Provider>
  );
};
