import { toCunninghamLocale } from "../utils";

describe("toCunninghamLocale", () => {
  it.each([
    ["fr", "fr-FR"],
    ["fr-fr", "fr-FR"],
    ["fr-BE", "fr-FR"],
    ["FR-ca", "fr-FR"],
    ["en", "en-US"],
    ["en-GB", "en-US"],
    ["nl", "nl-NL"],
    ["nl-be", "nl-NL"],
    ["de-de", "de-DE"],
  ])("maps %s to %s", (language, expected) => {
    expect(toCunninghamLocale(language)).toBe(expected);
  });
});
