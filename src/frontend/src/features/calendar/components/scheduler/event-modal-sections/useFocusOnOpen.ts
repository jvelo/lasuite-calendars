import { useEffect, useRef } from "react";
import { focusSectionField } from "./focusSectionField";

/**
 * Returns a ref for a section root. When `enabled` is true, the hook scrolls
 * the section into view and focuses its first field.
 */
export const useFocusOnOpen = (enabled: boolean) => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    focusSectionField(sectionRef.current);
  }, [enabled]);

  return sectionRef;
};
