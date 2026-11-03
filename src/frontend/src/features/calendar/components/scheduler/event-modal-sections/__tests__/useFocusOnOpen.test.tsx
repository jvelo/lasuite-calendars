import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useFocusOnOpen } from "../useFocusOnOpen";

// Let React know that act() drives the updates in this test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const Section = ({ focusOnOpen }: { focusOnOpen: boolean }) => {
  const sectionRef = useFocusOnOpen(focusOnOpen);
  return (
    <div ref={sectionRef}>
      <textarea />
    </div>
  );
};

describe("useFocusOnOpen", () => {
  let container: HTMLDivElement;
  let root: Root;
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    // jsdom does not implement scrollIntoView.
    Element.prototype.scrollIntoView = scrollIntoView;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    scrollIntoView.mockReset();
  });

  it("scrolls to the section and focuses its field when enabled", () => {
    act(() => root.render(<Section focusOnOpen />));

    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(container.querySelector("textarea"));
  });

  it("leaves the focus alone when disabled", () => {
    act(() => root.render(<Section focusOnOpen={false} />));

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.body);
  });
});
