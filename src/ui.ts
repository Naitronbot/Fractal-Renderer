import { getURL, pageState } from "state";
import { RenderContext } from "render";
import { updateSidebar } from "sliders";

type UIDropdown = {
    label: HTMLElement,
    dropdown: HTMLInputElement,
    hide: (hidden: boolean) => void
}

type UISlider = {
    label: HTMLElement,
    slider: HTMLInputElement,
    input: HTMLInputElement,
    setVal: (n: string) => void,
    getVal: () => string,
    setActive: (active: boolean) => void,
    hide: (hidden: boolean) => void,
};

type UIToggle = {
    label: HTMLElement,
    checkbox: HTMLInputElement,
    checked: () => boolean,
    setActive: (active: boolean) => void,
    hide: (hidden: boolean) => void,
};

const buttons = [
    {
        id: "slider",
        event: () => {
            updateSidebar();
        } 
    },
    {
        id: "slidersToggle",
        event: () => {
            UIElements.inputGrid.classList.toggle("hidden");
            UIElements.sidebar.classList.toggle("hidden");
            requestAnimationFrame(RenderContext.draw);
        } 
    },
    {
        id: "reset",
        event: () => {
            pageState.settings.zoom.level = 0;
            pageState.settings.zoom.log = 1;
            pageState.settings.offset.pos.x = 0;
            pageState.settings.offset.pos.y = 0;
            requestAnimationFrame(RenderContext.draw);
        }
    },
    {
        id: "download",
        event: () => {
            if(pageState.settings.antiAlias) {
                pageState.settings.screenshot = true
            } else {
                RenderContext.downloadCanvas();
            }
        }
    },
    {
        id: "url",
        event: () => {
            const shareInput = UIElements.shareInput as HTMLInputElement;
            UIElements.sharePopup.style.display = "flex";
            shareInput.value = getURL();
            shareInput.select();
        }
    },
    {
        id: "copyUrl",
        event: () => {
            const shareInput = UIElements.shareInput as HTMLInputElement;
            shareInput.select();
            shareInput.setSelectionRange(0, Infinity);

            navigator.clipboard.writeText(shareInput.value);

            UIElements.sharePopup.style.display = 'none';
        }
    },
    {
        id: 'closeUrl',
        event: () => {
            UIElements.sharePopup.style.display = 'none'
        }
    },
    {
        id: "fullscreen",
        event: () => {
            if (UIElements.canvas.requestFullscreen) {
                UIElements.canvas.requestFullscreen();
            } else if ((UIElements.canvas as any).webkitRequestFullscreen) {
                (UIElements.canvas as any).webkitRequestFullscreen();
            } else {
                throw new Error("Error fullscreening the canvas");
            }
        }
    },
    {
        id: "manualRecomp",
        event: () => {
            RenderContext.setup(true);
        }
    }
] as const;

const dropdowns = [
    {
        id: "coloring",
        beforeDraw: () => UIElements.toggleColoringActive(),
        afterDraw: () => {}
    }
] as const;

const enum sliderType {INT, FLOAT};
const sliders = [
    {
        id: "iterations",
        type: sliderType.INT,
        beforeDraw: () => {},
        afterDraw: () => {}
    },
    {
        id: "breakout",
        type: sliderType.FLOAT,
        beforeDraw: () => {},
        afterDraw: () => {}
    },
    {
        id: "bias",
        type: sliderType.FLOAT,
        beforeDraw: () => {},
        afterDraw: () => {}
    },
    {
        id: "hueShift",
        type: sliderType.FLOAT,
        beforeDraw: () => {},
        afterDraw: () => {}
    },
    {
        id: "domain",
        type: sliderType.INT,
        beforeDraw: () => {},
        afterDraw: () => {}
    }
] as const;

const toggles = [
    {
        id: "julia",
        beforeDraw: () => {},
        afterDraw: () => {}
    },
    {
        id: "antiAlias",
        beforeDraw: () => {},
        afterDraw: () => {
            if (pageState.settings.antiAlias) {
                requestAnimationFrame(RenderContext.antiAliasLoop);
            }
        }
    },
    {
        id: "smooth",
        beforeDraw: () => {},
        afterDraw: () => {}
    },
    {
        id: "manualRecomp",
        beforeDraw: () => {},
        afterDraw: () => {
            if (pageState.settings.manualRecomp) {
                UIElements.manualRecompButton.style.display = "";
            } else {
                UIElements.manualRecompButton.style.display = "none";
            }
        }
    },
    {
        id: "fad",
        beforeDraw: () => {
            if (pageState.settings.fad) {
                pageState.settings.fad = true;
            } else {
                pageState.settings.offset.angle = 0;
                pageState.settings.fad = false;
            }
        },
        afterDraw: () => {}
    },
    {
        id: "domainLightness",
        beforeDraw: () => {},
        afterDraw: () => {}
    }
] as const;

const additionalUI = [
    "canvasWrapper",
    "coordDisplay",
    "sidebar",
    "mqInput",
    "inputGrid",
    "main",
    "sharePopup",
    "shareInput"
] as const;

const errorBox = {
    element: document.getElementById("errorBox")!,
    show(type: string, message: string) {
        this.element.innerHTML = type + ": " + message;
        this.element.style.display = "";
    },
    hide() {
        this.element.innerHTML = "";
        this.element.style.display = "none";
    }
};

export const UIElements = {
    canvas: document.getElementById("canvas") as HTMLCanvasElement,
    hasSidebar: true,
    errorBox: errorBox,

    updateAll() {
        for (const currentDropdown of dropdowns) {
            let current = pageState.settings[currentDropdown.id];
            this[currentDropdown.id].dropdown.value = current + "";
        }

        for (const currentSlider of sliders) {
            let current = pageState.settings[currentSlider.id] + "";
            this[currentSlider.id].setVal(current);
        }

        for (const currentToggle of toggles) {
            let current = pageState.settings[currentToggle.id];
            this[currentToggle.id].checkbox.checked = current;
        }
    },

    toggleColoringActive() {
        if (pageState.settings.coloring === 2) {
            this.breakout.setActive(false);
            this.bias.hide(true);
            this.domain.hide(false);
            this.smooth.hide(true);
            this.domainLightness.hide(false);
        } else {
            this.breakout.setActive(true);
            this.bias.hide(false);
            this.domain.hide(true);
            this.smooth.hide(false);
            this.domainLightness.hide(true);
        }
    },

    fixGrid() {
        if (window.innerWidth >= 1000 && !this.hasSidebar) {
            this.sidebar.remove();
            document.body.prepend(this.sidebar);
            this.sidebar.classList.remove("hidden");
            this.inputGrid.classList.remove("hidden");
            this.slidersToggleButton.style.display = "none";
            this.hasSidebar = true;
        } else if (window.innerWidth <= 1000 && this.hasSidebar) {
            this.sidebar.remove();
            this.main.append(this.sidebar);
            this.sidebar.classList.add("hidden");
            this.slidersToggleButton.style.display = "";
            this.hasSidebar = false;
        }
    
        if (window.innerWidth <= 800) {
            return;
        }
        const inputElements = this.inputGrid.children;
        let totalWidth = inputElements[0].clientWidth + inputElements[1].clientWidth + inputElements[2].clientWidth;
        if (totalWidth + 20 > UIElements.canvas.clientWidth) {
            this.inputGrid.classList.add("input-correction");
            this.canvasWrapper.classList.add("input-correction");
        } else {
            this.inputGrid.classList.remove("input-correction");
            this.canvasWrapper.classList.remove("input-correction");
        }
        requestAnimationFrame(RenderContext.draw);
    }
} as {[key in typeof buttons[number]['id'] as `${key}Button`]: HTMLElement}
& {[key in typeof dropdowns[number]['id']]: UIDropdown}
& {[key in typeof sliders[number]['id']]: UISlider}
& {[key in typeof toggles[number]['id']]: UIToggle}
& {[key in typeof additionalUI[number]]: HTMLElement}
& {updateAll(): void, toggleColoringActive(): void, fixGrid(): void, canvas: HTMLCanvasElement, hasSidebar: boolean, errorBox: typeof errorBox};

for (const currentButton of buttons) {
    const currentId = currentButton.id + "Button" as `${typeof buttons[number]['id']}Button`;
    UIElements[currentId] = document.getElementById(currentButton.id + "Button")!;

    UIElements[currentId].addEventListener("click", currentButton.event);
}

for (const currentDropdown of dropdowns) {
    UIElements[currentDropdown.id] = {
        label: document.getElementById(currentDropdown.id + "Label") as HTMLElement,
        dropdown: document.getElementById(currentDropdown.id + "Dropdown") as HTMLInputElement,
        hide(hidden: boolean) {
            if (hidden) {
                this.label.style.display = "none";
                this.dropdown.style.display = "none";
            } else {
                this.label.style.display = "";
                this.dropdown.style.display = "";
            }
        }
    }

    UIElements[currentDropdown.id].dropdown.addEventListener("change", () => {
        pageState.settings[currentDropdown.id] = parseInt(UIElements[currentDropdown.id].dropdown.value);
        currentDropdown.beforeDraw();
        requestAnimationFrame(RenderContext.draw);
        currentDropdown.afterDraw();
    });
}

for (const currentSlider of sliders) {
    UIElements[currentSlider.id] = {
        label: document.getElementById(currentSlider.id + "Label") as HTMLElement,
        slider: document.getElementById(currentSlider.id + "Slider") as HTMLInputElement,
        input: document.getElementById(currentSlider.id + "Box") as HTMLInputElement,
        getVal() {
            return this.input.value;
        },
        setVal(n: string) {
            this.slider.value = n;
            this.input.value = n;
        },
        setActive(active: boolean) {
            if (active) {
                this.label.style.color = "";
                this.input.disabled = false;
                this.slider.disabled = false;
            } else {
                this.label.style.color = "#646464";
                this.input.disabled = true;
                this.slider.disabled = true;
            }
        },
        hide(hidden: boolean) {
            if (hidden) {
                this.label.style.display = "none";
                this.input.style.display = "none";
                this.slider.style.display = "none";
            } else {
                this.label.style.display = "";
                this.input.style.display = "";
                this.slider.style.display = "";
            }
        }
    } as UISlider;

    const parseNum = (currentSlider.type === sliderType.FLOAT) ? parseFloat
        : (currentSlider.type === sliderType.INT) ? parseInt
        : (()=>{throw new Error("Invalid slider type")})();
    UIElements[currentSlider.id].slider.addEventListener("input", () => {
        UIElements[currentSlider.id].input.value = UIElements[currentSlider.id].slider.value;
        let num = parseNum(UIElements[currentSlider.id].input.value);
        if (!isNaN(num)) {
            pageState.settings[currentSlider.id] = num;
        }
        currentSlider.beforeDraw();
        requestAnimationFrame(RenderContext.draw);
        currentSlider.afterDraw();
    });
    
    UIElements[currentSlider.id].input.addEventListener("input", () => {
        let num = parseNum(UIElements[currentSlider.id].input.value);
        if (!isNaN(num)) {
            UIElements[currentSlider.id].slider.value = num + "";
            pageState.settings[currentSlider.id] = num;
        }
        currentSlider.beforeDraw();
        requestAnimationFrame(RenderContext.draw);
        currentSlider.afterDraw();
    });
}

for (const currentToggle of toggles) {
    UIElements[currentToggle.id] = {
        label: document.getElementById(currentToggle.id + "Label") as HTMLElement,
        checkbox: document.getElementById(currentToggle.id + "Toggle") as HTMLInputElement,
        checked() {
            return this.checkbox.checked;
        },
        setActive(active: boolean) {
            if (active) {
                this.label.style.color = "#646464";
                this.checkbox.disabled = true;
            } else {
                this.label.style.color = "";
                this.checkbox.disabled = false;
            }
        },
        hide(hidden: boolean) {
            if (hidden) {
                this.label.style.display = "none";
                this.checkbox.style.display = "none";
            } else {
                this.label.style.display = "";
                this.checkbox.style.display = "";
            }
        }
    } as UIToggle;

    UIElements[currentToggle.id].checkbox.addEventListener("change", () => {
        pageState.settings[currentToggle.id] = UIElements[currentToggle.id].checkbox.checked;
        currentToggle.beforeDraw();
        requestAnimationFrame(RenderContext.draw);
        currentToggle.afterDraw();
    });
}

for (const uiName of additionalUI) {
    UIElements[uiName] = document.getElementById(uiName)!;
}