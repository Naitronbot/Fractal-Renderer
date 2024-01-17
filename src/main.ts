import FractalRenderer from "./main/Main.svelte";
import "./global.css";
import "mathquill/mathquill-basic.css";

const fractal = new FractalRenderer({
  target: document.getElementById("Main")!,
});

declare global {
  interface Window {
    fractalRenderer: FractalRenderer;
  }
}
window.fractalRenderer = fractal;

export default fractal;
