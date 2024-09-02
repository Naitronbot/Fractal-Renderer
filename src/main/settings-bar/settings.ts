import type { FractalSettings } from "./SettingsBar.types";

const settings: FractalSettings = [
  {
    name: "Fractal Settings",
    properties: [
      {
        name: "Iterations",
        key: "iterations",
        type: "slider",
        min: 1,
        max: 1000,
        step: 1,
      },
      {
        name: "Escape Point",
        key: "escape",
        type: "slider",
        min: 0,
        max: 100000,
        step: 1,
      },
    ],
  },
];

export default settings;
