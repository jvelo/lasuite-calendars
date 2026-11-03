/**
 * Scrolls a section into view and moves the focus to its first field.
 * The focus call does not scroll: the smooth scroll above handles it.
 */
export const focusSectionField = (section: HTMLElement | null) => {
  if (!section) return;
  section.scrollIntoView({ block: "nearest", behavior: "smooth" });
  section.querySelector<HTMLElement>("textarea, input")?.focus({ preventScroll: true });
};
