import { RenderContext } from "render";
import { addUndoQueue, expressionState } from "state";
import { UIElements } from "ui";
import { pageState } from "state";

export const sidebarVars: Set<string> = new Set();

export class Slider {
    val: number;
    min: number;
    max: number;
    step: number;
    
    constructor(val: string, min: string, max: string, step: string) {
        this.val = parseFloat(val);
        this.min = parseFloat(min);
        this.max = parseFloat(max);
        this.step = parseFloat(step);
    }

    update(val: string, min: string, max: string, step: string) {
        this.val = parseFloat(val);
        this.min = parseFloat(min);
        this.max = parseFloat(max);
        this.step = parseFloat(step);
    }
}

export class SliderComponent {
    varName: string;
    element: HTMLDivElement;
    sliderElem: HTMLInputElement;
    inputElem: HTMLInputElement;
    minElem: HTMLInputElement;
    maxElem: HTMLInputElement;
    stepElem: HTMLInputElement;

    constructor(varName: string, value: string, min: string, max: string, step: string) {
        this.varName = varName;
        sidebarVars.add(varName);

        // Create bounding div
        this.element = document.createElement("div");
        this.element.classList.add("slider-wrapper");

        // Create slider label
        const sliderTitle = document.createElement("p");
        sliderTitle.innerHTML = this.varName;
        this.element.append(sliderTitle);

        // Create div to house slider and main input box
        const sliderDiv = document.createElement("div");
        this.element.append(sliderDiv);

        // Create slider
        this.sliderElem = document.createElement("input");
        this.sliderElem.addEventListener('input', () => this.update(this.sliderElem.value, this.minElem.value, this.maxElem.value, this.stepElem.value, true));
        this.sliderElem.addEventListener('change', addUndoQueue);
        this.sliderElem.type = "range";
        this.sliderElem.min = min + "";
        this.sliderElem.max = max + "";
        this.sliderElem.step = step + "";
        sliderDiv.append(this.sliderElem);

        // Create input box
        this.inputElem = document.createElement("input");
        this.inputElem.addEventListener('input', () => this.update(this.inputElem.value, this.minElem.value, this.maxElem.value, this.stepElem.value, false));
        this.inputElem.addEventListener('change', addUndoQueue);
        this.inputElem.classList.add("input-box");
        this.inputElem.type = "number";
        this.inputElem.step = step + "";
        sliderDiv.append(this.inputElem);

        // Create div to house min, max, and step size inputs
        const boundsDiv = document.createElement("div");
        this.element.append(boundsDiv);

        // Create label for bounds boxes
        const addText = (text: string, box: HTMLInputElement) => {
            const label = document.createElement("label");
            label.innerHTML = text;
            label.setAttribute("for", box.name);
            boundsDiv.append(label);
        };

        // Create inputs for bounds boxes
        const createInput = (name: string, defaultValue: string, callback: (value: string) => void) => {
            let element = document.createElement("input");
            element.addEventListener('input', () => callback(element.value));
            element.addEventListener('change', addUndoQueue);
            element.classList.add("input-box");
            element.type = "number";
            element.value = defaultValue;
            element.name = name + this.varName;
            element.id = name + this.varName;
            return element;
        }

        // Create min input box
        this.minElem = createInput("min", min + "", value => this.sliderElem.min = value);
        addText("Min: ", this.minElem);
        boundsDiv.append(this.minElem);

        // Create max input box
        this.maxElem = createInput("max", max + "", value => this.sliderElem.max = value);
        addText("Max: ", this.maxElem);
        boundsDiv.append(this.maxElem);

        // Create step input box
        this.stepElem = createInput("step", step + "", value => {
            this.sliderElem.step = value;
            this.inputElem.step = value;
        });
        addText("Step: ", this.stepElem);
        boundsDiv.append(this.stepElem);

        // Create x button
        const closeButton = document.createElement("button");
        closeButton.addEventListener('mouseup', e => e.button === 0 && this.delete());
        closeButton.innerHTML = "<img src=\"assets/close.svg\">";
        this.element.append(closeButton);

        // Set default value
        this.update(value, min, max, step, true);

        // Add to DOM
        UIElements.sidebar.append(this.element);
    }

    update(value: string, min: string, max: string, step: string, updateInput: boolean) {
        if (pageState.sliders[this.varName]) {
            pageState.sliders[this.varName].update(value, min, max, step);
        } else {
            pageState.sliders[this.varName] = new Slider(value, min, max, step);
        }
        this.sync(updateInput);
        if (expressionState.userVars.has(this.varName)) {
            requestAnimationFrame(RenderContext.draw);
        }
    }

    sync(updateInput: boolean) {
        const currentSlider = pageState.sliders[this.varName];
        this.sliderElem.value = currentSlider.val + "";
        if (updateInput) {
            this.inputElem.value = currentSlider.val + "";
        }
        this.minElem.value = currentSlider.min + "";
        this.maxElem.value = currentSlider.max + "";
        this.stepElem.value = currentSlider.step + "";
    }

    delete() {
        this.element.remove();
        sidebarVars.delete(this.varName);
        delete pageState.sliders[this.varName];
        for (let val of expressionState.userVars) {
            if (!sidebarVars.has(val)) {
                manageVariables();
                RenderContext.setup(true);
                break;
            }
        }
        requestAnimationFrame(RenderContext.draw);
    }
}

export function updateSidebar() {
    if (UIElements.sliderButton.classList.contains("disabled")) {
        return;
    }
    UIElements.sliderButton.classList.add("disabled");
    if (expressionState.type !== "success") {
        return;
    }
    let newVars: string[] = [];
    expressionState.userVars.forEach(val => {
        if (!sidebarVars.has(val)) {
            newVars.push(val);
        }
    });
    if (newVars.length > 0) {
        for (let val of newVars) {
            new SliderComponent(val, "1", "-10", "10", "0.01");
        }
    }
    manageVariables();
    RenderContext.setup(true);
    UIElements.errorBox.hide();
    
    addUndoQueue();
}

export let needsVars = false;
export function manageVariables() {
    if (expressionState.type !== "success") {
        UIElements.sliderButton.classList.add("disabled");
        return;
    }
    for (let val of expressionState.userVars) {
        if (!sidebarVars.has(val)) {
            UIElements.errorBox.show("Variable Error", `${val} is not defined`);
            UIElements.sliderButton.classList.remove("disabled");
            needsVars = true;
            return;
        }
    }
    UIElements.sliderButton.classList.add("disabled");
    needsVars = false;
}