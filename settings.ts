const ITERATIONS_SLIDER = document.getElementById("iterationsSlider") as HTMLInputElement;
const ITERATIONS_BOX = document.getElementById("iterationsBox") as HTMLInputElement;
const BREAKOUT_SLIDER = document.getElementById("breakoutSlider") as HTMLInputElement;
const BREAKOUT_LABEL = document.getElementById("breakoutLabel") as HTMLInputElement;
const BREAKOUT_BOX = document.getElementById("breakoutBox") as HTMLInputElement;
const COLORING_MODE = document.getElementById("coloringMode") as HTMLInputElement;
const BIAS_BOX = document.getElementById("biasSlider") as HTMLInputElement;
const BIAS_SLIDER = document.getElementById("biasBox") as HTMLInputElement;
const HUESHIFT_SLIDER = document.getElementById("hueShiftSlider") as HTMLInputElement;
const HUESHIFT_BOX = document.getElementById("hueShiftBox") as HTMLInputElement;
const JULIA_TOGGLE = document.getElementById("juliaToggle") as HTMLInputElement;
const SMOOTH_TOGGLE = document.getElementById("smoothToggle") as HTMLInputElement;

ITERATIONS_BOX.addEventListener("change", () => {
    ITERATIONS_SLIDER.value = ITERATIONS_BOX.value;
    viewport.settings.iterations = parseInt(ITERATIONS_BOX.value);
    setup();
});

ITERATIONS_SLIDER.addEventListener("change", () => {
    ITERATIONS_BOX.value = ITERATIONS_SLIDER.value;
    viewport.settings.iterations = parseInt(ITERATIONS_BOX.value);
    setup();
});

BREAKOUT_BOX.addEventListener("change", () => {
    BREAKOUT_SLIDER.value = BREAKOUT_BOX.value;
    viewport.settings.breakout = parseInt(BREAKOUT_BOX.value);
    setup();
});

BREAKOUT_SLIDER.addEventListener("change", () => {
    BREAKOUT_BOX.value = BREAKOUT_SLIDER.value;
    viewport.settings.breakout = parseInt(BREAKOUT_BOX.value);
    setup();
});

COLORING_MODE.addEventListener("change", () => {
    viewport.settings.coloring = COLORING_MODE.value;
    if (viewport.settings.coloring === "domain") {
        BREAKOUT_LABEL.style.color = "#646464";
        BREAKOUT_BOX.disabled = true;
        BREAKOUT_SLIDER.disabled = true;
    } else {
        BREAKOUT_LABEL.style.color = "";
        BREAKOUT_BOX.disabled = false;
        BREAKOUT_SLIDER.disabled = false;
    }
    setup();
});

BIAS_BOX.addEventListener("change", () => {
    BIAS_SLIDER.value = BIAS_BOX.value;
    viewport.settings.bias = parseFloat(BIAS_BOX.value);
    setup();
});

BIAS_SLIDER.addEventListener("change", () => {
    BIAS_BOX.value = BIAS_SLIDER.value;
    viewport.settings.bias = parseFloat(BIAS_BOX.value);
    setup();
});

HUESHIFT_BOX.addEventListener("change", () => {
    HUESHIFT_SLIDER.value = HUESHIFT_BOX.value;
    viewport.settings.hueShift = parseFloat(HUESHIFT_BOX.value);
    setup();
});

HUESHIFT_SLIDER.addEventListener("change", () => {
    HUESHIFT_BOX.value = HUESHIFT_SLIDER.value;
    viewport.settings.hueShift = parseFloat(HUESHIFT_BOX.value);
    setup();
});

JULIA_TOGGLE.addEventListener("change", () => {
    viewport.settings.julia = JULIA_TOGGLE.checked;
    setup();
});

SMOOTH_TOGGLE.addEventListener("change", () => {
    viewport.settings.smooth = SMOOTH_TOGGLE.checked;
    setup();
});