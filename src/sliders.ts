import { Parser } from "parser";
import { RenderContext } from "render";
import { expressionState } from "state";
import { UIElements } from "ui";

export const sidebarVars: Set<string> = new Set();
export const sidebarVals: {[key: string]: number} = {};

export class Slider {
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
        this.inputElem.step = step || "0.01";
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
        boundsDiv.append(createInput(step || "0.01", value => {
            this.sliderElem.step = value;
            this.inputElem.step = value;
        }));

        let closeButton = document.createElement("button");
        closeButton.addEventListener('mouseup', e => e.button === 0 && this.delete());
        closeButton.innerHTML = "<img src=\"assets/close.svg\">";
        this.element.append(closeButton);

        this.update(value || "1", true);

        UIElements.sidebar.append(this.element);
    }

    update(val: string, slider: boolean) {
        sidebarVals[this.varName] = parseFloat(val);
        this.sliderElem.value = val;
        if (slider) {
            this.inputElem.value = val;
        }
        if (typeof Parser !== "undefined" && expressionState.userVars.has(this.varName)) {
            requestAnimationFrame(RenderContext.draw);
        }
    }

    delete() {
        this.element?.remove();
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
            new Slider(val);
        }
    }
    manageVariables();
    RenderContext.setup(true);
    UIElements.errorBox.hide();
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