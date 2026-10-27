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

  it("translates the share errors in French", async () => {
    expect(await translate("fr-fr", "calendar.shareCalendar.errorOwner")).toBe(
      "Vous ne pouvez pas partager un calendrier avec son propriétaire.",
    );
  });
});
