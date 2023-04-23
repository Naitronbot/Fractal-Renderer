const ITERATIONS_SLIDER = document.getElementById("iterationsSlider") as HTMLInputElement;
const ITERATIONS_BOX = document.getElementById("iterationsBox") as HTMLInputElement;
const BREAKOUT_SLIDER = document.getElementById("breakoutSlider") as HTMLInputElement;
const BREAKOUT_BOX = document.getElementById("breakoutBox") as HTMLInputElement;
const COLORING_MODE = document.getElementById("coloringMode") as HTMLInputElement;

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
    setup();
});