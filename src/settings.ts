const ITERATIONS_SLIDER = document.getElementById("iterationsSlider") as HTMLInputElement;
const ITERATIONS_BOX = document.getElementById("iterationsBox") as HTMLInputElement;
const BREAKOUT_SLIDER = document.getElementById("breakoutSlider") as HTMLInputElement;
const BREAKOUT_LABEL = document.getElementById("breakoutLabel") as HTMLElement;
const BREAKOUT_BOX = document.getElementById("breakoutBox") as HTMLInputElement;
const COLORING_MODE = document.getElementById("coloringMode") as HTMLInputElement;
const BIAS_LABEL = document.getElementById("biasLabel") as HTMLElement;
const BIAS_BOX = document.getElementById("biasBox") as HTMLInputElement;
const BIAS_SLIDER = document.getElementById("biasSlider") as HTMLInputElement;
const HUESHIFT_SLIDER = document.getElementById("hueShiftSlider") as HTMLInputElement;
const HUESHIFT_BOX = document.getElementById("hueShiftBox") as HTMLInputElement;
const JULIA_TOGGLE = document.getElementById("juliaToggle") as HTMLInputElement;
const SMOOTH_LABEL = document.getElementById("smoothLabel") as HTMLElement;
const SMOOTH_TOGGLE = document.getElementById("smoothToggle") as HTMLInputElement;
const RECOMP_TOGGLE = document.getElementById("recompToggle") as HTMLInputElement;
const FAD_TOGGLE = document.getElementById("fadToggle") as HTMLInputElement;
const RECOMP_BUTTON = document.getElementById("recompButton") as HTMLElement;

function settingSetup(slider: HTMLInputElement, box: HTMLInputElement, setting: string, float: boolean) {
    slider.addEventListener("input", () => {
        box.value = slider.value;
        let num = (float) ? parseFloat(box.value) : parseInt(box.value);
        if (!isNaN(num)) {
            viewport.settings[setting] = num;
        }
        requestAnimationFrame(draw);
    });
    box.addEventListener("input", () => {
        let num = (float) ? parseFloat(box.value) : parseInt(box.value);
        if (!isNaN(num)) {
            slider.value = num + "";
            viewport.settings[setting] = num;
        }
        requestAnimationFrame(draw);
    });
}

settingSetup(ITERATIONS_SLIDER, ITERATIONS_BOX, "iterations", false);
settingSetup(BREAKOUT_SLIDER, BREAKOUT_BOX, "breakout", true);
settingSetup(BIAS_SLIDER, BIAS_BOX, "bias", true);
settingSetup(HUESHIFT_SLIDER, HUESHIFT_BOX, "hueShift", true);

COLORING_MODE.addEventListener("change", () => {
    viewport.settings.coloring = parseInt(COLORING_MODE.value);
    toggleColoringActive();
    requestAnimationFrame(draw);
});
function toggleColoringActive() {
    if (viewport.settings.coloring === 2) {
        BREAKOUT_LABEL.style.color = "#646464";
        BREAKOUT_BOX.disabled = true;
        BREAKOUT_SLIDER.disabled = true;
        BIAS_LABEL.style.color = "#646464";
        BIAS_BOX.disabled = true;
        BIAS_SLIDER.disabled = true;
        SMOOTH_LABEL.style.color = "#646464";
        SMOOTH_TOGGLE.disabled = true;
    } else {
        BREAKOUT_LABEL.style.color = "";
        BREAKOUT_BOX.disabled = false;
        BREAKOUT_SLIDER.disabled = false;
        BIAS_LABEL.style.color = "";
        BIAS_BOX.disabled = false;
        BIAS_SLIDER.disabled = false;
        SMOOTH_LABEL.style.color = "";
        SMOOTH_TOGGLE.disabled = false;
    }
}

JULIA_TOGGLE.addEventListener("change", () => {
    viewport.settings.julia = JULIA_TOGGLE.checked;
    requestAnimationFrame(draw);
});

SMOOTH_TOGGLE.addEventListener("change", () => {
    viewport.settings.smooth = SMOOTH_TOGGLE.checked;
    requestAnimationFrame(draw);
});

RECOMP_TOGGLE.addEventListener("change", () => {
    if (RECOMP_TOGGLE.checked) {
        RECOMP_BUTTON.style.display = "";
    } else {
        RECOMP_BUTTON.style.display = "none";
    }
});

FAD_TOGGLE.addEventListener("change", () => {
    if (FAD_TOGGLE.checked) {
        viewport.settings.fad = true;
    } else {
        viewport.offset.angle = 0;
        viewport.settings.fad = false;
    }
    requestAnimationFrame(draw);
});