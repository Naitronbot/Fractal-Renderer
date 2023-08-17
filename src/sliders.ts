import { RenderContext } from "render";
import { addUndoQueue, expressionState } from "state";
import { UIElements } from "ui";

export const sidebarVars: Set<string> = new Set();
export const sidebarVals: {[key: string]: number} = {};

export class SliderComponent {
    varName: string;
    element: HTMLDivElement;
    sliderElem: HTMLInputElement;
    inputElem: HTMLInputElement;

    constructor(varName: string, value?: string, min?: string, max?: string, step?: string) {
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
        this.sliderElem.addEventListener('input', () => this.update(this.sliderElem.value, true));
        this.sliderElem.addEventListener('change', addUndoQueue);
        this.sliderElem.type = "range";
        this.sliderElem.min = min || "-10";
        this.sliderElem.max = max || "10";
        this.sliderElem.step = step || "0.01";
        sliderDiv.append(this.sliderElem);

        // Create input box
        this.inputElem = document.createElement("input");
        this.inputElem.addEventListener('input', () => this.update(this.inputElem.value, false));
        this.inputElem.addEventListener('change', addUndoQueue);
        this.inputElem.classList.add("input-box");
        this.inputElem.type = "number";
        this.inputElem.step = step || "0.01";
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
        const minInput = createInput("min", min || "-10", value => this.sliderElem.min = value);
        addText("Min: ", minInput);
        boundsDiv.append(minInput);

        // Create max input box
        const maxInput = createInput("max", max || "10", value => this.sliderElem.max = value);
        addText("Max: ", maxInput);
        boundsDiv.append(maxInput);

        // Create step input box
        const stepInput = createInput("step", step || "0.01", value => {
            this.sliderElem.step = value;
            this.inputElem.step = value;
        });
        addText("Step: ", stepInput);
        boundsDiv.append(stepInput);

        // Create x button
        const closeButton = document.createElement("button");
        closeButton.addEventListener('mouseup', e => e.button === 0 && this.delete());
        closeButton.innerHTML = "<img src=\"assets/close.svg\">";
        this.element.append(closeButton);

        // Set default value
        this.update(value || "1", true);

        // Add to DOM
        UIElements.sidebar.append(this.element);
    }

    update(val: string, slider: boolean) {
        sidebarVals[this.varName] = parseFloat(val);
        this.sliderElem.value = val;
        if (slider) {
            this.inputElem.value = val;
        }
        if (expressionState.userVars.has(this.varName)) {
            requestAnimationFrame(RenderContext.draw);
        }
    }

    delete() {
        this.element.remove();
        sidebarVars.delete(this.varName);
        delete sidebarVals[this.varName];
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
            new SliderComponent(val);
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