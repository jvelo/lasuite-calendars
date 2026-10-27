/**
 * Hook for calendar locale management
 *
 * Provides locale-aware utilities for date formatting and calendar configuration
 */
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { enUS, fr, nl, Locale } from "date-fns/locale";

type LocaleSettings = {
  dateFns: Locale;
  intl: string;
  // 0 = Sunday, 1 = Monday
  firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
};

// Keyed by base language. Regional codes such as "fr-BE" use their base language.
const LOCALES: Record<string, LocaleSettings> = {
  en: { dateFns: enUS, intl: "en-US", firstDayOfWeek: 0 },
  fr: { dateFns: fr, intl: "fr-FR", firstDayOfWeek: 1 },
  nl: { dateFns: nl, intl: "nl-NL", firstDayOfWeek: 1 },
};

export function useCalendarLocale() {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language;
  const settings = LOCALES[currentLanguage.split("-")[0].toLowerCase()] ?? LOCALES.en;
  const dateFnsLocale = settings.dateFns;
  const intlLocale = settings.intl;
  const firstDayOfWeek = settings.firstDayOfWeek;
  // Calendar library locale code
  const calendarLocale = currentLanguage.split("-")[0] || "en";

  // Format date using Intl.DateTimeFormat with current locale
  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
      const d = typeof date === "string" ? new Date(date) : date;
      return new Intl.DateTimeFormat(intlLocale, options).format(d);
    },
    [intlLocale],
  );

  // Format time using Intl.DateTimeFormat with current locale
  const formatTime = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
      const d = typeof date === "string" ? new Date(date) : date;
      return new Intl.DateTimeFormat(intlLocale, {
        hour: "numeric",
        minute: "numeric",
        ...options,
      }).format(d);
    },
    [intlLocale],
  );

  // Format day header for calendar views
  const formatDayHeader = useCallback(
    (date: Date): { html: string } => {
      const dayOfWeek = date.toLocaleDateString(intlLocale, {
        weekday: "short",
      });
      const dayOfMonth = date.toLocaleDateString(intlLocale, {
        day: "numeric",
      });
      return {
        html: `<div class="day-header"><span class="day-of-week">${dayOfWeek}</span> <span class="day-of-month">${dayOfMonth}</span> </div>`,
      };
    },
    [intlLocale],
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
    intlLocale,
    calendarLocale,
    currentLanguage,

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
