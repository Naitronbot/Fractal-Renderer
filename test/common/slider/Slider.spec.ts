import Slider from "src/common/slider/Slider.svelte";
import { describe, test, expect } from "vitest";
import { render } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { TestUtils } from "test/TestUtils";

const props = {
  title: "Test Slider",
  value: 7.5,
  min: 5,
  max: 10,
  step: 0.5,
};

describe("Slider Component", () => {
  test("should mount", () => {
    const slider = render(Slider, { props });

    expect(slider).toBeTruthy();
  });

  test("should have title", () => {
    const slider = render(Slider, { props });

    expect(slider.getByText("Test Slider")).toBeTruthy();
  });

  test("should have starting value", () => {
    const slider = render(Slider, { props });

    expect(slider.baseElement.querySelector("input")?.value).toBe("7.5");
  });

  test("should be positioned correctly", () => {
    const slider = render(Slider, { props });

    const sliderWrapper = slider.baseElement.querySelector(".slider-wrapper")!!;
    const sliderKnob: HTMLElement =
      slider.baseElement.querySelector(".slider-knob")!!;

    expect(sliderKnob.offsetLeft).toBe(sliderWrapper.clientWidth / 2);
  });

  test("should update from changes to the input", async () => {
    const slider = render(Slider, { props });
    const user = userEvent.setup();

    const input = slider.baseElement.querySelector("input")!!;
    const sliderWrapper = slider.baseElement.querySelector(".slider-wrapper")!!;
    const sliderKnob: HTMLElement =
      slider.baseElement.querySelector(".slider-knob")!!;

    await TestUtils.setInput(user, input, "5");
    expect(slider.component.value).toBe(5);
    expect(sliderKnob.offsetLeft).toBe(0);

    await TestUtils.setInput(user, input, "10");
    expect(slider.component.value).toBe(10);
    expect(sliderKnob.offsetLeft).toBe(sliderWrapper.clientWidth);

    await TestUtils.setInput(user, input, "8");
    expect(slider.component.value).toBe(8);
    expect(sliderKnob.offsetLeft).toBe(
      Math.floor(sliderWrapper.clientWidth * ((8 - 5) / 5)),
    );
  });

  test("should not go beyond the bounds from changes to the input", async () => {
    const slider = render(Slider, { props });
    const user = userEvent.setup();

    const input = slider.baseElement.querySelector("input")!!;
    const sliderWrapper = slider.baseElement.querySelector(".slider-wrapper")!!;
    const sliderKnob: HTMLElement =
      slider.baseElement.querySelector(".slider-knob")!!;

    await TestUtils.setInput(user, input, "-5");
    expect(slider.component.value).toBe(-5);
    expect(sliderKnob.offsetLeft).toBe(0);

    await TestUtils.setInput(user, input, "100");
    expect(slider.component.value).toBe(100);
    expect(sliderKnob.offsetLeft).toBe(sliderWrapper.clientWidth);
  });

  test("should update from changes to the value", () => {
    const slider = render(Slider, { props });

    const input = slider.baseElement.querySelector("input")!!;
    const sliderWrapper = slider.baseElement.querySelector(".slider-wrapper")!!;
    const sliderKnob: HTMLElement =
      slider.baseElement.querySelector(".slider-knob")!!;

    slider.component.value = 5;
    expect(input.value).toBe("5");
    expect(sliderKnob.offsetLeft).toBe(0);

    slider.component.value = 10;
    expect(input.value).toBe("10");
    expect(sliderKnob.offsetLeft).toBe(sliderWrapper.clientWidth);

    slider.component.value = 8;
    expect(input.value).toBe("8");
    expect(sliderKnob.offsetLeft).toBe(123);
  });

  test("should not go beyond the bounds from changes to the value", () => {
    const slider = render(Slider, { props });

    const input = slider.baseElement.querySelector("input")!!;
    const sliderWrapper = slider.baseElement.querySelector(".slider-wrapper")!!;
    const sliderKnob: HTMLElement =
      slider.baseElement.querySelector(".slider-knob")!!;

    slider.component.value = -5;
    expect(input.value).toBe("-5");
    expect(sliderKnob.offsetLeft).toBe(0);

    slider.component.value = 100;
    expect(input.value).toBe("100");
    expect(sliderKnob.offsetLeft).toBe(sliderWrapper.clientWidth);
  });

  test("should update from clicking the slider", async () => {
    const slider = render(Slider, { props });

    const input = slider.baseElement.querySelector("input")!!;
    const sliderWrapper = slider.baseElement.querySelector(".slider-wrapper")!!;
    const sliderKnob: HTMLElement =
      slider.baseElement.querySelector(".slider-knob")!!;

    await TestUtils.click(sliderWrapper, {
      button: "left",
      pos: { x: 0, y: 0 },
    });

    expect(slider.component.value).toBe(5);
    expect(input.value).toBe("5");
    expect(sliderKnob.offsetLeft).toBe(0);

    await TestUtils.click(sliderWrapper, {
      button: "left",
      pos: { x: sliderWrapper.clientWidth, y: 0 },
    });

    expect(slider.component.value).toBe(10);
    expect(input.value).toBe("10");
    expect(sliderKnob.offsetLeft).toBe(sliderWrapper.clientWidth);

    await TestUtils.click(sliderWrapper, {
      button: "left",
      pos: { x: sliderWrapper.clientWidth / 2, y: 0 },
    });

    expect(slider.component.value).toBe(7.5);
    expect(input.value).toBe("7.5");
    expect(sliderKnob.offsetLeft).toBe(sliderWrapper.clientWidth / 2);
  });

  test("should not go beyond the bounds from dragging the slider", async () => {
    const slider = render(Slider, { props });

    const input = slider.baseElement.querySelector("input")!!;
    const sliderWrapper = slider.baseElement.querySelector(".slider-wrapper")!!;
    const sliderKnob: HTMLElement =
      slider.baseElement.querySelector(".slider-knob")!!;

    await TestUtils.click(sliderWrapper, {
      type: "mousedown",
      button: "left",
      pos: { x: sliderWrapper.clientWidth / 2, y: 0 },
    });

    expect(slider.component.value).toBe(7.5);
    expect(input.value).toBe("7.5");
    expect(sliderKnob.offsetLeft).toBe(sliderWrapper.clientWidth / 2);

    await TestUtils.click(sliderWrapper, {
      type: "mousemove",
      button: "left",
      pos: { x: sliderWrapper.clientWidth + 10, y: 0 },
    });

    expect(slider.component.value).toBe(10);
    expect(input.value).toBe("10");
    expect(sliderKnob.offsetLeft).toBe(sliderWrapper.clientWidth);

    await TestUtils.click(sliderWrapper, {
      type: "mouseup",
      button: "left",
      pos: { x: sliderWrapper.clientWidth + 10, y: 0 },
    });

    expect(slider.component.value).toBe(10);
    expect(input.value).toBe("10");
    expect(sliderKnob.offsetLeft).toBe(sliderWrapper.clientWidth);
  });

  test("should update from using the arrow keys", async () => {
    const slider = render(Slider, { props });
    const user = userEvent.setup();

    const input = slider.baseElement.querySelector("input")!!;
    const sliderWrapper: HTMLElement =
      slider.baseElement.querySelector(".slider-wrapper")!!;
    const sliderKnob: HTMLElement =
      slider.baseElement.querySelector(".slider-knob")!!;

    sliderWrapper.focus();

    await user.keyboard("[ArrowRight]");

    expect(slider.component.value).toBe(8);
    expect(input.value).toBe("8");
    expect(sliderKnob.offsetLeft).toBe(
      Math.floor(sliderWrapper.clientWidth * ((8 - 5) / 5)),
    );

    await user.keyboard("[ArrowRight]");

    expect(slider.component.value).toBe(8.5);
    expect(input.value).toBe("8.5");
    expect(sliderKnob.offsetLeft).toBe(
      Math.floor(sliderWrapper.clientWidth * ((8.5 - 5) / 5)),
    );

    await user.keyboard("[ArrowLeft]");

    expect(slider.component.value).toBe(8);
    expect(input.value).toBe("8");
    expect(sliderKnob.offsetLeft).toBe(
      Math.floor(sliderWrapper.clientWidth * ((8 - 5) / 5)),
    );
  });

  test("should not go beyond the bounds from using the arrow keys", async () => {
    const slider = render(Slider, { props });
    const user = userEvent.setup();

    const input = slider.baseElement.querySelector("input")!!;
    const sliderWrapper: HTMLElement =
      slider.baseElement.querySelector(".slider-wrapper")!!;
    const sliderKnob: HTMLElement =
      slider.baseElement.querySelector(".slider-knob")!!;

    sliderWrapper.focus();

    await user.keyboard("[ArrowRight]");

    expect(slider.component.value).toBe(8);
    expect(input.value).toBe("8");
    expect(sliderKnob.offsetLeft).toBe(
      Math.floor(sliderWrapper.clientWidth * ((8 - 5) / 5)),
    );

    for (let i = 0; i < 10; i++) {
      await user.keyboard("[ArrowRight]");
    }

    expect(slider.component.value).toBe(10);
    expect(input.value).toBe("10");
    expect(sliderKnob.offsetLeft).toBe(Math.floor(sliderWrapper.clientWidth));

    for (let i = 0; i < 20; i++) {
      await user.keyboard("[ArrowLeft]");
    }

    expect(slider.component.value).toBe(5);
    expect(input.value).toBe("5");
    expect(sliderKnob.offsetLeft).toBe(0);
  });
});
