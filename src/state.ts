import { Slider } from "sliders";
import { Point } from "shared";
import { UIElements } from "ui";
import { RenderContext } from "render";
import { ParseError, ParseNode } from "parser";

// Page State Object
type settingVals = keyof typeof pageState.settings;
export const pageState = {
    // Contains all information about the current viewport
    viewport: {
        width: 0,
        height: 0,
        pointer: {
            lastPos: new Point(0,0),
            lastDist: 0,
            dist: 0,
            lastAngle: 0,
            dragging: false
        }
    },

    // Settings for the current fractal
    settings: {
        iterations: 500,
        breakout: 10000,
        coloring: 1,
        bias: 0,
        domain: 1,
        hueShift: 0,
        julia: false,
        smooth: false,
        domainLightness: false,
        fad: false,
        equation: "z^{2}+c",
        samples: 1,
        antiAlias: false,
        manualRecomp: false,
        screenshot: false,
        zoom: {
            level: 0,
            log: 1
        },
        offset: {
            pos: new Point(0,0),
            angle: 0
        },
    }
};

export let expressionState: {type: "success" | "error" | "blank", userVars: Set<string>, ast?: ParseNode, error?: ParseError, set?(obj: typeof expressionState): void} = {
    type: "blank",
    userVars: new Set(),
};

export function setExpressionState(obj: typeof expressionState) {
    expressionState = obj;
}

window.pageState = pageState;

// Loading query parameters into state object
const enum paramTypes {string, bool, num, user, offsetX, offsetY, zoom};
const paramNames: {[key:string]: [paramTypes, settingVals?]} = {
    "eq": [paramTypes.string, "equation"],
    "it": [paramTypes.num, "iterations"],
    "bk": [paramTypes.num, "breakout"],
    "jm": [paramTypes.bool, "julia"],
    "cm": [paramTypes.num, "coloring"],
    "cb": [paramTypes.num, "bias"],
    "dm": [paramTypes.num, "domain"],
    "hs": [paramTypes.num, "hueShift"],
    "sm": [paramTypes.bool, "smooth"],
    "lt": [paramTypes.bool, "domainLightness"],
    "px": [paramTypes.offsetX],
    "py": [paramTypes.offsetY],
    "zm": [paramTypes.zoom]
};

export function loadQueryParams() {
    const queryParams = new URLSearchParams(window.location.search);
    let iter = queryParams.get('it');
    if (iter !== null && parseInt(iter) > 1000 && !confirm(`High iteration count detected (${iter}), this may lag, would you like to proceed anyways?`)) {
        return;
    }
    queryParams.forEach((value, key) => {
        let paramData = paramNames[key];
        if (paramData !== undefined) {
            setParam(value, paramData[0], paramData[1]);
        } else if (key.startsWith("uv")) {
            setParam(value, paramTypes.user, undefined, key);
        }
    });
}

function setParam(value: string, type: paramTypes, setting?: settingVals, userVar?: string) {
    if (value === null) {
        return;
    }
    if (setting === undefined) {
        if (type === paramTypes.offsetX) {
            pageState.settings.offset.pos.x = parseFloat(value);
        } else if (type === paramTypes.offsetY) {
            pageState.settings.offset.pos.y = parseFloat(value);
        } else if (type === paramTypes.zoom) {
            pageState.settings.zoom.level = parseFloat(value);
            pageState.settings.zoom.log = Math.pow(2,pageState.settings.zoom.level);
        } else if (type === paramTypes.user) {
            let values = value.split("/");
            if (values.length === 4) {
                new Slider(userVar!.split("uv")[1], values[0], values[1], values[2], values[3]);
            }
        }
        return;
    }
    if (type === paramTypes.string) {
        (pageState.settings[setting] as string) = decodeURI(value);
    } else if (type === paramTypes.bool) {
        (pageState.settings[setting] as boolean) = value === '1' ? true : false;
    } else if (type === paramTypes.num) {
        (pageState.settings[setting] as number) = parseFloat(value);
    }
}

export function getURL() {
    RenderContext.setup(true);
    let base = window.location.href.split("?")[0];
    base += `?eq=${encodeURIComponent(pageState.settings.equation)}`;
    base += `&it=${pageState.settings.iterations}`;
    base += `&bk=${pageState.settings.breakout}`;
    base += `&jm=${+pageState.settings.julia}`;
    base += `&cm=${pageState.settings.coloring}`;
    base += `&cb=${pageState.settings.bias}`;
    base += `&dm=${pageState.settings.domain}`;
    base += `&hs=${pageState.settings.hueShift}`;
    base += `&sm=${+pageState.settings.smooth}`;
    base += `&lt=${+pageState.settings.domainLightness}`;
    base += `&px=${pageState.settings.offset.pos.x}`;
    base += `&py=${pageState.settings.offset.pos.y}`;
    base += `&zm=${pageState.settings.zoom.level}`;
    for (let slider of UIElements.sidebar.getElementsByClassName("slider-wrapper")) {
        let inputs = slider.getElementsByClassName("input-box");
        let nameInput = slider.getElementsByTagName("p")[0] as HTMLElement;
        let valueInput = inputs[0] as HTMLInputElement;
        let minInput = inputs[1] as HTMLInputElement;
        let maxInput = inputs[2] as HTMLInputElement;
        let stepInput = inputs[3] as HTMLInputElement;
        base += `&uv${nameInput.innerHTML}=${valueInput.value}%2F${minInput.value}%2F${maxInput.value}%2F${stepInput.value}`;
    }
    return base;
}