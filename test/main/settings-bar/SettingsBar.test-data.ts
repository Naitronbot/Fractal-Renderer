import { FractalState } from "src/main/FractalState";
import type { FractalSettings } from "src/main/settings-bar/SettingsBar.types";

export const settings: FractalSettings = [
  {
    name: "Category One",
    properties: [
      {
        name: "Property 1",
        key: "iterations",
        type: "slider",
        min: 1,
        max: 5,
        step: 1,
      },
    ],
  },
  {
    name: "Category Two",
    properties: [
      {
        name: "Property 2",
        key: "escape",
        type: "slider",
        min: 0,
        max: 10,
        step: 5,
      },
    ],
  },
];
