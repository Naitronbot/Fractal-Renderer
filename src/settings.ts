const ITERATIONS_SLIDER = document.getElementById("iterationsSlider") as HTMLInputElement;
const ITERATIONS_BOX = document.getElementById("iterationsBox") as HTMLInputElement;
const BREAKOUT_SLIDER = document.getElementById("breakoutSlider") as HTMLInputElement;
const BREAKOUT_LABEL = document.getElementById("breakoutLabel") as HTMLElement;
const BREAKOUT_BOX = document.getElementById("breakoutBox") as HTMLInputElement;
const COLORING_MODE = document.getElementById("coloringMode") as HTMLInputElement;
const BIAS_LABEL = document.getElementById("biasLabel") as HTMLElement;
const BIAS_BOX = document.getElementById("biasBox") as HTMLInputElement;
const BIAS_SLIDER = document.getElementById("biasSlider") as HTMLInputElement;
const DOMAIN_LABEL = document.getElementById("domainLabel") as HTMLElement;
const DOMAIN_BOX = document.getElementById("domainBox") as HTMLInputElement;
const DOMAIN_SLIDER = document.getElementById("domainSlider") as HTMLInputElement;
const HUESHIFT_SLIDER = document.getElementById("hueShiftSlider") as HTMLInputElement;
const HUESHIFT_BOX = document.getElementById("hueShiftBox") as HTMLInputElement;
const JULIA_TOGGLE = document.getElementById("juliaToggle") as HTMLInputElement;
const SMOOTH_LABEL = document.getElementById("smoothLabel") as HTMLElement;
const SMOOTH_TOGGLE = document.getElementById("smoothToggle") as HTMLInputElement;
const LIGHTNESS_LABEL = document.getElementById("domainLightnessLabel") as HTMLElement;
const LIGHTNESS_TOGGLE = document.getElementById("domainLightnessToggle") as HTMLInputElement;
const RECOMP_TOGGLE = document.getElementById("recompToggle") as HTMLInputElement;
const AA_TOGGLE = document.getElementById("aaToggle") as HTMLInputElement;
const FAD_TOGGLE = document.getElementById("fadToggle") as HTMLInputElement;
const RECOMP_BUTTON = document.getElementById("recompButton") as HTMLElement;
const ERROR_BOX = document.getElementById("errorBox") as HTMLElement;
const SLIDERS_TOGGLE = document.getElementById("slidersToggle")!;

function settingSetup(slider: HTMLInputElement, box: HTMLInputElement, setting: settingVals, float: boolean) {
    slider.addEventListener("input", () => {
        box.value = slider.value;
        let num = (float) ? parseFloat(box.value) : parseInt(box.value);
        if (!isNaN(num)) {
            (settings[setting] as number) = num;
        }
        requestAnimationFrame(draw);
    });
    box.addEventListener("input", () => {
        let num = (float) ? parseFloat(box.value) : parseInt(box.value);
        if (!isNaN(num)) {
            slider.value = num + "";
            (settings[setting] as number) = num;
        }
        requestAnimationFrame(draw);
    });
}

settingSetup(ITERATIONS_SLIDER, ITERATIONS_BOX, "iterations", false);
settingSetup(BREAKOUT_SLIDER, BREAKOUT_BOX, "breakout", true);
settingSetup(BIAS_SLIDER, BIAS_BOX, "bias", true);
settingSetup(HUESHIFT_SLIDER, HUESHIFT_BOX, "hueShift", true);
settingSetup(DOMAIN_SLIDER, DOMAIN_BOX, "domain", false);

COLORING_MODE.addEventListener("change", () => {
    settings.coloring = parseInt(COLORING_MODE.value);
    toggleColoringActive();
    requestAnimationFrame(draw);
});
function toggleColoringActive() {
    if (settings.coloring === 2) {
        BREAKOUT_LABEL.style.color = "#646464";
        BREAKOUT_BOX.disabled = true;
        BREAKOUT_SLIDER.disabled = true;
        BIAS_LABEL.style.display = "none";
        BIAS_BOX.style.display = "none";
        BIAS_SLIDER.style.display = "none";
        DOMAIN_LABEL.style.display = "";
        DOMAIN_BOX.style.display = "";
        DOMAIN_SLIDER.style.display = "";
        SMOOTH_LABEL.style.display = "none";
        SMOOTH_TOGGLE.style.display = "none";
        LIGHTNESS_LABEL.style.display = "";
        LIGHTNESS_TOGGLE.style.display = "";
    } else {
        BREAKOUT_LABEL.style.color = "";
        BREAKOUT_BOX.disabled = false;
        BREAKOUT_SLIDER.disabled = false;
        BIAS_LABEL.style.display = "";
        BIAS_BOX.style.display = "";
        BIAS_SLIDER.style.display = "";
        DOMAIN_LABEL.style.display = "none";
        DOMAIN_BOX.style.display = "none";
        DOMAIN_SLIDER.style.display = "none";
        SMOOTH_LABEL.style.display = "";
        SMOOTH_TOGGLE.style.display = "";
        LIGHTNESS_LABEL.style.display = "none";
        LIGHTNESS_TOGGLE.style.display = "none";
    }
}

JULIA_TOGGLE.addEventListener("change", () => {
    settings.julia = JULIA_TOGGLE.checked;
    requestAnimationFrame(draw);
});

SMOOTH_TOGGLE.addEventListener("change", () => {
    settings.smooth = SMOOTH_TOGGLE.checked;
    requestAnimationFrame(draw);
});

LIGHTNESS_TOGGLE.addEventListener("change", () => {
    settings.lightness = LIGHTNESS_TOGGLE.checked;
    requestAnimationFrame(draw);
});

AA_TOGGLE.addEventListener("change", () => {
    settings.antiAlias = AA_TOGGLE.checked;
    requestAnimationFrame(draw);
    if (settings.antiAlias) {
        requestAnimationFrame(antiAliasLoop);
    }
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
        settings.fad = true;
    } else {
        settings.offset.angle = 0;
        settings.fad = false;
    }
    requestAnimationFrame(draw);
});

// Sidebar
const SIDEBAR = document.getElementById("sidebar")!;
const SLIDER_BUTTON = document.getElementById("sliderButton")!;

let sidebarVars: Set<string> = new Set();
let sidebarVals: {[key: string]: number} = {};

class Slider {
    varName: string;
    element: HTMLDivElement | undefined;
    sliderElem!: HTMLInputElement;
    inputElem!: HTMLInputElement;
    constructor(varName: string, value?: string, min?: string, max?: string, step?: string) {
        this.varName = varName;
        sidebarVars.add(varName);
        this.render(value, min, max, step);
    }

    render(value?: string, min?: string, max?: string, step?: string) {
        this.element = document.createElement("div");
        this.element.classList.add("slider-wrapper");

        let sliderTitle = document.createElement("p");
        sliderTitle.innerHTML = this.varName;
        this.element.append(sliderTitle);

        let sliderDiv = document.createElement("div");
        this.element.append(sliderDiv);

        this.sliderElem = document.createElement("input");
        this.sliderElem.addEventListener('input', () => this.update(this.sliderElem.value, true));
        this.sliderElem.type = "range";
        this.sliderElem.min = min || "-10";
        this.sliderElem.max = max || "10";
        this.sliderElem.step = step || "0.01";
        sliderDiv.append(this.sliderElem);

        this.inputElem = document.createElement("input");
        this.inputElem.addEventListener('input', () => this.update(this.inputElem.value, false));
        this.inputElem.classList.add("input-box");
        this.inputElem.type = "number";
        sliderDiv.append(this.inputElem);

        let boundsDiv = document.createElement("div");
        this.element.append(boundsDiv);

        const addText = (text: string) => {
            let pTag = document.createElement("p");
            pTag.innerHTML = text;
            boundsDiv.append(pTag);
        };

        const createInput = (defaultValue: string, callback: (value: string) => void) => {
            let element = document.createElement("input");
            element.addEventListener('input', () => callback(element.value));
            element.classList.add("input-box");
            element.type = "number";
            element.value = defaultValue;
            return element;
        }

        addText("Min: ");
        boundsDiv.append(createInput(min || "-10", value => this.sliderElem.min = value));

        addText("Max: ");
        boundsDiv.append(createInput(max || "10", value => this.sliderElem.max = value));

        addText("Step: ");
        boundsDiv.append(createInput(step || "0.01", value => this.sliderElem.step = value));

        let closeButton = document.createElement("button");
        closeButton.addEventListener('mouseup', e => e.button === 0 && this.delete());
        closeButton.innerHTML = "<img src=\"assets/close.svg\">";
        this.element.append(closeButton);

        this.update(value || "1", true);

        SIDEBAR.append(this.element);
    }

    update(val: string, slider: boolean) {
        sidebarVals[this.varName] = parseFloat(val);
        this.sliderElem.value = val;
        if (slider) {
            this.inputElem.value = val;
        }
        if (typeof Parser !== "undefined" && Parser.current.userVars.has(this.varName)) {
            requestAnimationFrame(draw);
        }
    }

    delete() {
        this.element?.remove();
        sidebarVars.delete(this.varName);
        delete sidebarVals[this.varName];
        for (let val of Parser.current.userVars) {
            if (!sidebarVars.has(val)) {
                Parser.current.manageVariables();
                setup(true);
                break;
            }
        }
        requestAnimationFrame(draw);
    }
}

function updateSidebar() {
    if (SLIDER_BUTTON.classList.contains("disabled")) {
        return;
    }
    SLIDER_BUTTON?.classList.add("disabled");
    if (!Parser.current) {
        return;
    }
    let newVars: string[] = [];
    Parser.current.userVars.forEach(val => {
        if (!sidebarVars.has(val)) {
            newVars.push(val);
        }
    });
    if (newVars.length > 0) {
        for (let val of newVars) {
            new Slider(val);
        }
    }
    Parser.current.manageVariables();
    setup(true);
    ERROR_BOX.innerHTML = "";
    ERROR_BOX.style.display = "none";
}

function toggleSliders() {
    INPUT_GRID.classList.toggle("hidden");
    SIDEBAR.classList.toggle("hidden");
    requestAnimationFrame(draw);
}

const SHARE_POPUP = document.getElementById("sharePopup") as HTMLElement;
const SHARE_INPUT = document.getElementById("shareInput") as HTMLInputElement;
function shareURL() {
    SHARE_POPUP.style.display = "flex";
    SHARE_INPUT.value = getURL();
    SHARE_INPUT.select();
}

function copyShare() {
    SHARE_INPUT.select();
    SHARE_INPUT.setSelectionRange(0, Infinity);

    navigator.clipboard.writeText(SHARE_INPUT.value);

    SHARE_POPUP.style.display = 'none';
}