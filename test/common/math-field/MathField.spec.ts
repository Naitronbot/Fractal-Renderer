import MathField from "src/common/math-field/MathField.svelte";
import { describe, test, expect } from "vitest";
import { render } from "@testing-library/svelte";

describe("MathField Component", () => {
  test("should mount", () => {
    const mathField = render(MathField);

    expect(mathField).toBeTruthy();
  });

  test("should have initial text", () => {
    const mathField = render(MathField, { value: "Testing" });

    expect(mathField.container.textContent).toBe("Testing");
  });

  test("should update when typed in", () => {
    const mathField = render(MathField);

    mathField.component.mathField.typedText("sin(e^ipi");

    expect(mathField.component.value).toBe("\\sin\\left(e^{i\\pi}\\right)");
  });

  test("should update from external changes", () => {
    const mathField = render(MathField, { value: "StartingValue" });

    expect(mathField.container.textContent).toBe("StartingValue");

    mathField.component.value = "NewValue";

    expect(mathField.container.textContent).toBe("NewValue");
  });
});
