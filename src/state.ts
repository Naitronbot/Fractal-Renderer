import { SliderComponent, Slider } from "sliders";
import { Point } from "shared";
import { UIElements } from "ui";
import { RenderContext } from "render";
import { ParseError, ParseNode, Parser } from "parser";
import { UndoRedoQueue } from "undo";
import { MQ_FIELD } from "input";

/// Settings for the current fractal
type settingVals = keyof typeof pageState;
export let pageState = {
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
    sliders: {} as {[key: string]: Slider}
};
Object.defineProperty(window, "pageState", {get() {return pageState}});

const pageStateQueue = new UndoRedoQueue<typeof pageState>(100);

export function addUndoQueue() {
    console.log("queued");
    if (structuredClone) {
        pageStateQueue.add(structuredClone(pageState));
    } else {
        pageStateQueue.add(JSON.parse(JSON.stringify(pageState)));
    }
}

export function undo() {
    const oldEq = pageState.equation;
    const newState = pageStateQueue.undo();
    if (newState) {
        pageState = newState;
        UIElements.updateAll();
    }
    if (oldEq !== pageState.equation) {
        let parsed = Parser.parse(pageState.equation);
        setExpressionState(parsed);
        RenderContext.setup(true);
    }
    requestAnimationFrame(RenderContext.draw);
    MQ_FIELD.latex(pageState.equation);
};

export function redo() {
    const oldEq = pageState.equation;
    const newState = pageStateQueue.redo();
    if (newState) {
        pageState = newState;
        UIElements.updateAll();
    }
    if (oldEq !== pageState.equation) {
        let parsed = Parser.parse(pageState.equation);
        setExpressionState(parsed);
        RenderContext.setup(true);
    }
    requestAnimationFrame(RenderContext.draw);
    MQ_FIELD.latex(pageState.equation);
};

export const viewportState = {
    width: 0,
    height: 0,
    pointer: {
        lastPos: new Point(0,0),
        lastDist: 0,
        dist: 0,
        lastAngle: 0,
        dragging: false
    }
};

export let expressionState: {type: "success" | "error" | "blank", userVars: Set<string>, ast?: ParseNode, error?: ParseError, set?(obj: typeof expressionState): void} = {
    type: "blank",
    userVars: new Set(),
};

export function setExpressionState(obj: typeof expressionState) {
    expressionState = obj;
};

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
            pageState.offset.pos.x = parseFloat(value);
        } else if (type === paramTypes.offsetY) {
            pageState.offset.pos.y = parseFloat(value);
        } else if (type === paramTypes.zoom) {
            pageState.zoom.level = parseFloat(value);
            pageState.zoom.log = Math.pow(2,pageState.zoom.level);
        } else if (type === paramTypes.user) {
            let values = value.split("/");
            if (values.length === 4) {
                new SliderComponent(userVar!.split("uv")[1], values[0], values[1], values[2], values[3]);
            }
        }
        return;
    }
    if (type === paramTypes.string) {
        (pageState[setting] as string) = decodeURI(value);
    } else if (type === paramTypes.bool) {
        (pageState[setting] as boolean) = value === '1' ? true : false;
    } else if (type === paramTypes.num) {
        (pageState[setting] as number) = parseFloat(value);
    }
}

export function getURL() {
    RenderContext.setup(true);
    let base = window.location.href.split("?")[0];
    base += `?eq=${encodeURIComponent(pageState.equation)}`;
    base += `&it=${pageState.iterations}`;
    base += `&bk=${pageState.breakout}`;
    base += `&jm=${+pageState.julia}`;
    base += `&cm=${pageState.coloring}`;
    base += `&cb=${pageState.bias}`;
    base += `&dm=${pageState.domain}`;
    base += `&hs=${pageState.hueShift}`;
    base += `&sm=${+pageState.smooth}`;
    base += `&lt=${+pageState.domainLightness}`;
    base += `&px=${pageState.offset.pos.x}`;
    base += `&py=${pageState.offset.pos.y}`;
    base += `&zm=${pageState.zoom.level}`;
    for (let key in pageState.sliders) {
        const slider = pageState.sliders[key]; 
        base += `&uv${key}=${slider.val}%2F${slider.min}%2F${slider.max}%2F${slider.step}`;
    }
    return base;
}