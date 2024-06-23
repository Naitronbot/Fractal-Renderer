import type { UserEvent } from "@testing-library/user-event";

type MouseInput = {
  button: "left" | "right";
  pos: { x: number; y: number };
  type?:
    | "click"
    | "dblclick"
    | "mousedown"
    | "mouseenter"
    | "mouseleave"
    | "mousemove"
    | "mouseout"
    | "mouseover"
    | "mouseup";
};

export class TestUtils {
  static async setInput(
    user: UserEvent,
    input: HTMLInputElement,
    value: string,
  ) {
    await user.click(input);
    await user.clear(input);
    await user.keyboard(value);
  }

  static async click(element: Element, options: MouseInput) {
    const { top, left } = element.getBoundingClientRect();

    const type = options.type ?? "click";

    const event = new MouseEvent(type, {
      button: { left: 0, right: 2 }[options.button],
      clientX: left + options.pos.x,
      clientY: top + options.pos.y,
      bubbles: true,
    });

    element.dispatchEvent(event);
  }
}
