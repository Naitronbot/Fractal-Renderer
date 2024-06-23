import Collapsible from "./Collapsible.spec.svelte";
import { describe, test, expect } from "vitest";
import { render, waitFor } from "@testing-library/svelte";

const props = {
  title: "Test Collapsible",
  open: false,
};

describe("Collapsible Component", () => {
  test("should mount", () => {
    const collapsible = render(Collapsible, { props });

    expect(collapsible).toBeTruthy();
  });

  test("should have title", () => {
    const collapsible = render(Collapsible, { props });

    expect(collapsible.getByText("Test Collapsible")).toBeTruthy();
  });

  test("should start closed", () => {
    const collapsible = render(Collapsible, {
      props: { ...props, open: false },
    });

    expect(collapsible.queryByText("Test slot")).toBeFalsy();
  });

  test("should start open", () => {
    const collapsible = render(Collapsible, {
      props: { ...props, open: true },
    });

    expect(collapsible.queryByText("Test slot")).toBeTruthy();
  });

  test("should toggle state when clicked", async () => {
    const collapsible = render(Collapsible, {
      props: { ...props, open: false },
    });

    const button = collapsible.getByRole("button");

    expect(collapsible.queryByText("Test slot")).toBeFalsy();

    button.click();
    await waitFor(() =>
      expect(collapsible.queryByText("Test slot")).toBeTruthy(),
    );

    button.click();
    await waitFor(() =>
      expect(collapsible.queryByText("Test slot")).toBeFalsy(),
    );
  });
});
