import { createInstance } from "i18next";

import resources from "../translations.json";

const translate = async (language: string, key: string, options?: Record<string, unknown>) => {
  const i18n = createInstance();
  await i18n.init({ resources, lng: language, fallbackLng: "en-us", showSupportNotice: false });
  return i18n.t(key, options);
};

const flattenKeys = (value: unknown, prefix = ""): string[] => {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
};

describe("translations", () => {
  const englishKeys = flattenKeys(resources.en.translation);

  it.each(["fr", "nl"] as const)("%s has every English key", (language) => {
    const keys = new Set(flattenKeys(resources[language].translation));
    expect(englishKeys.filter((key) => !keys.has(key))).toEqual([]);
  });

  describe("calendar.views.moreEvents", () => {
    it.each([
      ["en-us", 1, "+1 more"],
      ["en-us", 4, "+4 more"],
      ["fr-fr", 1, "+1 autre"],
      ["fr-fr", 4, "+4 autres"],
      ["fr", 2, "+2 autres"],
      ["nl-nl", 3, "+3 meer"],
    ])("translates %s with count %i", async (language, count, expected) => {
      expect(await translate(language, "calendar.views.moreEvents", { count })).toBe(expected);
    });
  });

  describe("scheduling.conflicts", () => {
    it.each([
      ["en", 1, "1 conflict"],
      ["en", 3, "3 conflicts"],
      ["fr", 1, "1 conflit"],
      ["fr", 2, "2 conflits"],
      ["nl", 2, "2 conflicten"],
    ])("translates %s with count %i", async (language, count, expected) => {
      expect(await translate(language, "scheduling.conflicts", { count })).toBe(expected);
    });
  });

  it("puts the calendar name in the show calendar label", async () => {
    expect(await translate("nl", "calendar.list.showCalendar", { name: "Werk" })).toBe(
      "Kalender Werk tonen",
    );
  });

  it("translates the share errors in French", async () => {
    expect(await translate("fr-fr", "calendar.shareCalendar.errorOwner")).toBe(
      "Vous ne pouvez pas partager un calendrier avec son propriétaire.",
    );
  });
});
