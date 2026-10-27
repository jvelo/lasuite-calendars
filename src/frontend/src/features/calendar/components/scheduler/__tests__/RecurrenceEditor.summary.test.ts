import { createInstance, type TFunction } from "i18next";
import type { IcsRecurrenceRule } from "ts-ics";

import resources from "@/features/i18n/translations.json";

import { buildRecurrenceSummary } from "../RecurrenceEditor";

const translator = async (language: string): Promise<TFunction> => {
  const i18n = createInstance();
  await i18n.init({ resources, lng: language, showSupportNotice: false });
  return i18n.t;
};

function rule(overrides: Partial<IcsRecurrenceRule>): IcsRecurrenceRule {
  return { frequency: "DAILY", ...overrides } as IcsRecurrenceRule;
}

describe("buildRecurrenceSummary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    [rule({ frequency: "DAILY", interval: 1 }), "Tous les jours"],
    [rule({ frequency: "DAILY", interval: 3 }), "Tous les 3 jours"],
    [rule({ frequency: "WEEKLY", interval: 1 }), "Chaque semaine"],
    [rule({ frequency: "WEEKLY", interval: 2 }), "Toutes les 2 semaines"],
    [rule({ frequency: "MONTHLY" }), "Tous les mois"],
    [rule({ frequency: "YEARLY", interval: 2 }), "Tous les 2 ans"],
  ])("uses the French gender of the frequency", async (value, expected) => {
    const t = await translator("fr");
    expect(buildRecurrenceSummary(value, t, "fr-FR")).toBe(expected);
  });

  it("lists the week days", async () => {
    const t = await translator("en");
    const value = rule({ frequency: "WEEKLY", interval: 2, byDay: [{ day: "MO" }, { day: "WE" }] });
    expect(buildRecurrenceSummary(value, t, "en-US")).toBe("Every 2 weeks · Mon, Wed");
  });

  it("tells Tuesday from Thursday in French", async () => {
    const t = await translator("fr");
    const value = rule({ frequency: "WEEKLY", byDay: [{ day: "TU" }, { day: "TH" }] });
    expect(buildRecurrenceSummary(value, t, "fr-FR")).toBe("Chaque semaine · mar., jeu.");
  });

  it("formats the end date in the app language", async () => {
    const until = { type: "DATE" as const, date: new Date("2026-03-15T00:00:00Z") };
    const value = rule({ frequency: "DAILY", until });
    expect(buildRecurrenceSummary(value, await translator("fr"), "fr-FR")).toBe(
      "Tous les jours · jusqu'au 15 mars 2026",
    );
    expect(buildRecurrenceSummary(value, await translator("en"), "en-US")).toBe(
      "Every day · until Mar 15, 2026",
    );
  });

  it.each([
    ["en", 1, "Every day · 1 occurrence"],
    ["en", 5, "Every day · 5 occurrences"],
    ["nl", 5, "Elke dag · 5 keer"],
  ])("pluralizes the occurrence count in %s (%i)", async (language, count, expected) => {
    const value = rule({ frequency: "DAILY", count });
    expect(buildRecurrenceSummary(value, await translator(language), "en-US")).toBe(expected);
  });

  it("hides a count past the forever threshold", async () => {
    const value = rule({ frequency: "DAILY", count: 7300 });
    expect(buildRecurrenceSummary(value, await translator("en"), "en-US")).toBe("Every day");
  });

  it("returns an empty summary for a frequency the editor does not support", async () => {
    const value = rule({ frequency: "HOURLY" });
    expect(buildRecurrenceSummary(value, await translator("en"), "en-US")).toBe("");
  });
});
