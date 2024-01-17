export class FractalState {
  iterations: number = 500;
  test: number = 500;
  equation: string = "z^{2}+c";

  constructor(state?: Partial<FractalState>) {
    Object.assign(this, state);
  }
}
