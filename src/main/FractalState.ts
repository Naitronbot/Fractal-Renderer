export class FractalState {
  equation: string = "z^{2}+c";
  iterations: number = 500;
  escape: number = 10000;

  constructor(state?: Partial<FractalState>) {
    Object.assign(this, state);
  }
}
