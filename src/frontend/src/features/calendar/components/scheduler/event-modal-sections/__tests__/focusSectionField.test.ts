import { focusSectionField } from "../focusSectionField";

const buildSection = (fieldHtml: string) => {
  const section = document.createElement("div");
  section.innerHTML = fieldHtml;
  // jsdom does not implement scrollIntoView.
  section.scrollIntoView = vi.fn();
  document.body.appendChild(section);
  return section;
};

describe("focusSectionField", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("scrolls the section into view and focuses the textarea", () => {
    const section = buildSection("<textarea></textarea>");

    focusSectionField(section);

    expect(section.scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });
    expect(document.activeElement).toBe(section.querySelector("textarea"));
  });

  it("focuses the first field when the section holds an input", () => {
    const section = buildSection("<input type='text' /><textarea></textarea>");

    focusSectionField(section);

    expect(document.activeElement).toBe(section.querySelector("input"));
  });

  it("only scrolls when the section has no field", () => {
    const section = buildSection("<p>No field</p>");

    focusSectionField(section);

    expect(section.scrollIntoView).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(document.body);
  });

  it("does nothing when the section is null", () => {
    expect(() => focusSectionField(null)).not.toThrow();
  });
});
