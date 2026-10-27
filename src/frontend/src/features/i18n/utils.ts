export const splitLocaleCode = (language: string) => {
  const locale = language.split(/[-_]/);
  return {
    language: locale[0],
    region: locale.length === 2 ? locale[1] : undefined,
  };
};

export const capitalizeRegion = (language: string) => {
  const { language: lang, region } = splitLocaleCode(language);
  return lang + (region ? "-" + region.toUpperCase() : "");
};

const CUNNINGHAM_LOCALES: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  nl: "nl-NL",
};

/**
 * Return the UI kit locale for an i18next language code.
 * The UI kit only knows full codes such as "fr-FR". It falls back to
 * English for "fr" or "fr-BE", so we map on the language part.
 */
export const toCunninghamLocale = (language: string) =>
  CUNNINGHAM_LOCALES[splitLocaleCode(language).language.toLowerCase()] ??
  capitalizeRegion(language);
