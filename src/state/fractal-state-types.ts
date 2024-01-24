export type FractalProperty = CommonProperty &
  (NumberProperty | BooleanProperty | SelectionProperty);

type CommonProperty = {
  readonly displayName: string;
  readonly description: string;
  readonly category: string;
};
type NumberProperty = {
  readonly type: "number";
  readonly defaultValue: number;
  readonly range: {
    readonly min: number;
    readonly max: number;
  };
};
type BooleanProperty = {
  readonly type: "boolean";
  readonly defaultValue: boolean;
};
type SelectionProperty = {
  readonly type: "selection";
  readonly values: string[];
};
