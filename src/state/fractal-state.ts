import type { FractalProperty } from "./fractal-state-types.ts";

export type FractalState = {
  iterations: number;
  balls: string;
  balls2: string;
};

export const stateDescription: Record<keyof FractalState, FractalProperty> = {
  iterations: {
    type: "number",
    defaultValue: 500,
    category: "Fractal Settings",
    description: "How many iterations the function will iterated",
    displayName: "Iterations",
    range: {
      min: 0,
      max: Infinity,
    },
  },
  balls: {
    type: "boolean",
    category: "test",
    defaultValue: false,
    description: "hehe",
    displayName: "gaming",
  },
  balls2: {
    type: "boolean",
    category: "test",
    defaultValue: false,
    description: "aaaaaa",
    displayName: "gaming",
  },
} as const;
