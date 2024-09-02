import { FractalState } from "../FractalState";

export type FractalSettings = Category[];

type Category = {
  name: string;
  properties: Property[];
};

type Property = Slider | Toggle;

type BaseProperty<T> = {
  name: string;
  // Gets all entries in FractalState which have type T
  key: {
    [key in keyof FractalState]: FractalState[key] extends T ? key : never;
  }[keyof FractalState];
};

type Slider = BaseProperty<number> & {
  type: "slider";
  min: number;
  max: number;
  step: number;
};

type Toggle = BaseProperty<boolean> & {
  type: "toggle";
};
