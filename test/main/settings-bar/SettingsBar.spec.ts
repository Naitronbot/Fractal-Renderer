import { render } from "@testing-library/svelte";
import SettingsBar from "src/main/settings-bar/SettingsBar.svelte";
import { beforeEach, describe, expect, it } from "vitest";
import { settings } from "./SettingsBar.test-data";
import { FractalState } from "src/main/FractalState";
import { TestUtils } from "test/TestUtils";
import userEvent from "@testing-library/user-event";

describe("SettingsBar component", () => {
  let fractalState: FractalState;

  beforeEach(() => {
    fractalState = new FractalState({
      iterations: 50,
      escape: 100,
    });
  });

  it("should mount", () => {
    const settingsBar = render(SettingsBar, {
      props: { fractalState },
    });

    expect(settingsBar).toBeTruthy();
  });

  it("should create categories", () => {
    const settingsBar = render(SettingsBar, {
      props: { settings, fractalState },
    });

    expect(settingsBar).toBeTruthy();

    expect(settingsBar.getByText("Category One")).toBeTruthy();
    expect(settingsBar.getByText("Category Two")).toBeTruthy();
  });

  it("should create properties", () => {
    const settingsBar = render(SettingsBar, {
      props: { settings, fractalState },
    });

    expect(settingsBar).toBeTruthy();

    expect(settingsBar.getByText("Property 1")).toBeTruthy();
    expect(settingsBar.getByText("Property 2")).toBeTruthy();
  });

  it("should update from changes to fractal state", () => {
    const settingsBar = render(SettingsBar, {
      props: { settings, fractalState },
    });

    expect(settingsBar).toBeTruthy();

    const inputs = settingsBar.baseElement.getElementsByTagName("input");

    expect(inputs[0].value).toBe("50");
    expect(inputs[1].value).toBe("100");

    settingsBar.component.fractalState = new FractalState({
      iterations: 100,
      escape: 200,
    });

    expect(inputs[0].value).toBe("100");
    expect(inputs[1].value).toBe("200");
  });

  it("should update fractal state from changes to field", async () => {
    const settingsBar = render(SettingsBar, {
      props: { settings, fractalState },
    });
    const user = userEvent.setup();

    expect(settingsBar).toBeTruthy();

    const inputs = settingsBar.baseElement.getElementsByTagName("input");

    expect(settingsBar.component.fractalState.iterations).toBe(50);
    expect(settingsBar.component.fractalState.escape).toBe(100);

    await TestUtils.setInput(user, inputs[0], "100");
    await TestUtils.setInput(user, inputs[1], "200");

    expect(settingsBar.component.fractalState.iterations).toBe(100);
    expect(settingsBar.component.fractalState.escape).toBe(200);
  });
});
