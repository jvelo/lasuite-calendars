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

/** UI kit locale for a language code. The UI kit only knows full codes such as "fr-FR". */
export const toCunninghamLocale = (language: string) =>
  CUNNINGHAM_LOCALES[splitLocaleCode(language).language.toLowerCase()] ??
  capitalizeRegion(language);
