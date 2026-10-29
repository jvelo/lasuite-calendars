/**
 * Hook for the calendar locale: date formatting and calendar settings.
 *
 * Terms follow BCP 47 (RFC 5646):
 * - language: an ISO 639-1 code, such as "fr".
 * - region: an ISO 3166-1 alpha-2 code, such as "BE".
 * - locale: a language tag that can combine both, such as "fr-BE".
 *
 * `i18n.language` holds a locale, despite its name. It can be any tag
 * that the browser sends. The hook keeps only its language and uses the
 * settings of that language, or English when the language is not supported.
 * The region is not used: "fr-BE" gets the "fr-FR" formats.
 */
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { enUS, fr, nl, Locale } from "date-fns/locale";

type LanguageSettings = {
  dateFns: Locale;
  // BCP 47 locale tag, such as "fr-FR".
  locale: string;
  // 0 = Sunday, 1 = Monday
  firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
};

const LANGUAGE_SETTINGS: Record<string, LanguageSettings> = {
  en: { dateFns: enUS, locale: "en-US", firstDayOfWeek: 0 },
  fr: { dateFns: fr, locale: "fr-FR", firstDayOfWeek: 1 },
  nl: { dateFns: nl, locale: "nl-NL", firstDayOfWeek: 1 },
};

export function useCalendarLocale() {
  const { i18n, t } = useTranslation();
  const language = i18n.language.split("-")[0].toLowerCase();
  const settings = LANGUAGE_SETTINGS[language] ?? LANGUAGE_SETTINGS.en;
  const dateFnsLocale = settings.dateFns;
  const locale = settings.locale;
  const firstDayOfWeek = settings.firstDayOfWeek;

  // Format date using Intl.DateTimeFormat with current locale
  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
      const d = typeof date === "string" ? new Date(date) : date;
      return new Intl.DateTimeFormat(locale, options).format(d);
    },
    [locale],
  );

  // Format time using Intl.DateTimeFormat with current locale
  const formatTime = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
      const d = typeof date === "string" ? new Date(date) : date;
      return new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "numeric",
        ...options,
      }).format(d);
    },
    [locale],
  );

  // Format day header for calendar views
  const formatDayHeader = useCallback(
    (date: Date): { html: string } => {
      const dayOfWeek = date.toLocaleDateString(locale, {
        weekday: "short",
      });
      const dayOfMonth = date.toLocaleDateString(locale, {
        day: "numeric",
      });
      return {
        html: `<div class="day-header"><span class="day-of-week">${dayOfWeek}</span> <span class="day-of-month">${dayOfMonth}</span> </div>`,
      };
    },
    [locale],
  );

  // Get calendar translations for the library
  const getCalendarTranslations = useCallback(
    () => ({
      dayGridMonth: t("calendar.views.month"),
      dayGridWeek: t("calendar.views.week"),
      dayGridDay: t("calendar.views.day"),
      timeGridWeek: t("calendar.views.week"),
      timeGridDay: t("calendar.views.day"),
      listDay: t("calendar.views.listDay"),
      listWeek: t("calendar.views.listWeek"),
      listMonth: t("calendar.views.listMonth"),
      listYear: t("calendar.views.listYear"),
      today: t("calendar.views.today"),
    }),
    [t],
  );

  return {
    // Locales
    dateFnsLocale,
    locale,

    // Calendar settings
    firstDayOfWeek,

    // Formatters
    formatDate,
    formatTime,
    formatDayHeader,

    // Translations
    getCalendarTranslations,
    t,
  };
}

export type CalendarLocale = ReturnType<typeof useCalendarLocale>;
