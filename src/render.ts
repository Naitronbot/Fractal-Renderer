const canvas = document.getElementById("webGLCanvas") as HTMLCanvasElement;
const coordDisplay = document.getElementById("coordDisplay") as HTMLElement;
const gl = canvas.getContext("webgl2")!;

if (gl === null) {
    alert("WebGL 2 not supported, please update your browser.");
}

class Point {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    toArray() {
        return [this.x,this.y];
    }

    static fromArray(array: number[]) {
        return new Point(array[0], array[1]);
    }
    
    static duplicate(p: Point): Point {
        return new Point(p.x, p.y);
    }
}

// Structure for setting, binding, and updating shader uniforms
const enum UniformTypes {FLOAT, INT};
class ShaderUniformContainer {
    program: WebGLProgram;
    private uniformLocations: WebGLUniformLocation[];
    private uniformValues: Function[];
    private uniformTypes: UniformTypes[];

    constructor(program: WebGLProgram) {
        this.program = program;
        this.uniformLocations = [];
        this.uniformValues = [];
        this.uniformTypes = [];
    }

    add(name: string, value: Function, type: UniformTypes) {
        let uniform = gl.getUniformLocation(this.program, name);
        if (uniform === null) {
            throw new Error("Invalid uniform name");
        }
        this.uniformLocations.push(uniform);
        this.uniformValues.push(value);
        this.uniformTypes.push(type);
    }

    assignAll() {
        for (let i = 0; i < this.uniformLocations.length; i++) {
            let values = this.uniformValues[i]() as number[];
            let len = values.length;
            if (this.uniformTypes[i] === UniformTypes.FLOAT) {
                if (values[0] === undefined) {
                    return;
                }
                if (len === 1) {
                    gl.uniform1fv(this.uniformLocations[i], values);
                } else if (len === 2) {
                    gl.uniform2fv(this.uniformLocations[i], values);
                } else if (len === 3) {
                    gl.uniform3fv(this.uniformLocations[i], values);
                } else if (len === 4) {
                    gl.uniform4fv(this.uniformLocations[i], values);
                } else {
                    throw new Error("Invalid uniform length");
                }
            } else if (this.uniformTypes[i] === UniformTypes.INT) {
                if (len === 1) {
                    gl.uniform1iv(this.uniformLocations[i], values);
                } else if (len === 2) {
                    gl.uniform2iv(this.uniformLocations[i], values);
                } else if (len === 3) {
                    gl.uniform3iv(this.uniformLocations[i], values);
                } else if (len === 4) {
                    gl.uniform4iv(this.uniformLocations[i], values);
                } else {
                    throw new Error("Invalid uniform length");
                }
            } else {
                throw new Error("Invalid uniform type");
            }
        }
    }
}

// Contains all information about the current viewport
const viewport = {
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

// Settings for the current fractal
type settingVals = keyof typeof settings;
const settings = {
    iterations: 500,
    breakout: 10000,
    coloring: 1,
    bias: 0,
    domain: 1,
    hueShift: 0,
    julia: false,
    smooth: false,
    fad: false,
    equation: "z^{2}+c",
    samples: 1,
    antiAlias: false,
    screenshot: false,
    zoom: {
        level: 0,
        log: 1
    },
    offset: {
        pos: new Point(0,0),
        angle: 0
    },
};

// let currentError = "";
// let currentAST: ParseNode;
//let currentVars = new Set<string>();
let shaderUniforms: ShaderUniformContainer;

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
    "px": [paramTypes.offsetX],
    "py": [paramTypes.offsetY],
    "zm": [paramTypes.zoom]
};

loadQueryParams();
function loadQueryParams() {
    const queryParams = new URLSearchParams(window.location.search);
    let iter = queryParams.get('it');
    if (iter !== null && parseInt(iter) > 1000 && !confirm(`High iteration count detected (${iter}), this may lag, would you like to proceed anyways?`)) {
        setDefaults();
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
    setDefaults();
}

function setParam(value: string, type: paramTypes, setting?: settingVals, userVar?: string) {
    if (value === null) {
        return;
    }
    if (setting === undefined) {
        if (type === paramTypes.offsetX) {
            settings.offset.pos.x = parseFloat(value);
        } else if (type === paramTypes.offsetY) {
            settings.offset.pos.y = parseFloat(value);
        } else if (type === paramTypes.zoom) {
            settings.zoom.level = parseFloat(value);
            settings.zoom.log = Math.pow(2,settings.zoom.level);
        }
        return;
    }
    if (type === paramTypes.string) {
        (settings[setting] as string) = decodeURI(value);
    } else if (type === paramTypes.bool) {
        (settings[setting] as boolean) = value === '1' ? true : false;
    } else if (type === paramTypes.num) {
        (settings[setting] as number) = parseFloat(value);
    } else if (type === paramTypes.user) {
        let values = value.split("/");
        if (values.length === 4) {
            new Slider(userVar!.split("uv")[1], values[0], values[1], values[2], values[3]);
        }
    }
}

function setDefaults() {
    ITERATIONS_SLIDER.value = settings.iterations+"";
    ITERATIONS_BOX.value = settings.iterations+"";
    BREAKOUT_SLIDER.value = settings.breakout+"";
    BREAKOUT_BOX.value = settings.breakout+"";
    JULIA_TOGGLE.checked = settings.julia;
    SMOOTH_TOGGLE.checked = settings.smooth;
    HUESHIFT_SLIDER.value = settings.hueShift+"";
    HUESHIFT_BOX.value = settings.hueShift+"";
    BIAS_SLIDER.value = settings.bias+"";
    BIAS_BOX.value = settings.bias+"";
    DOMAIN_SLIDER.value = settings.domain+"";
    DOMAIN_BOX.value = settings.domain+"";
    COLORING_MODE.value = settings.coloring+"";
    toggleColoringActive();
}

let textureProgram = gl.createProgram()!;
let canvasProgram = gl.createProgram()!;
let samplesLocation: WebGLUniformLocation;
let offsetLocation: WebGLUniformLocation;
let frameBuffers: WebGLFramebuffer[] = [];

{
    let vertexShader = createVertex();
    let canvasShader = createCanvasShader();
    if (!vertexShader || !canvasShader) {
        throw new Error("WebGL Error: Canvas shader failed");
    }

    gl.attachShader(canvasProgram, canvasShader);
    gl.attachShader(canvasProgram, vertexShader);
    gl.attachShader(textureProgram, vertexShader);
}

let fragmentShader: WebGLShader | undefined;
function setup(manual: boolean) {
    if (!Parser.current.success || Parser.current.needsVars) {
        return;
    }

    if (RECOMP_TOGGLE.checked && !manual) {
        return;
    }

    if (fragmentShader) {
        gl.detachShader(textureProgram, fragmentShader);
        gl.deleteShader(fragmentShader);
    }

    fragmentShader = createFragment();
    if (!fragmentShader) {
        return;
    }

    gl.attachShader(textureProgram, fragmentShader);
    gl.linkProgram(textureProgram);
    gl.linkProgram(canvasProgram);

    if (!gl.getProgramParameter(textureProgram, gl.LINK_STATUS)) {
        console.log(`LINK ERROR: ${gl.getProgramInfoLog(textureProgram)}`);
        return;
    }
    if (!gl.getProgramParameter(canvasProgram, gl.LINK_STATUS)) {
        console.log(`LINK ERROR: ${gl.getProgramInfoLog(canvasProgram)}`);
        return;
    }
    shaderUniforms = new ShaderUniformContainer(textureProgram);
    shaderUniforms.add("u_transform", ()=>[settings.offset.pos.x, settings.offset.pos.y, settings.zoom.log], UniformTypes.FLOAT);
    shaderUniforms.add("u_iterations", ()=>[settings.iterations], UniformTypes.INT);
    shaderUniforms.add("u_breakout", ()=>[settings.breakout], UniformTypes.FLOAT);
    shaderUniforms.add("u_bias", ()=>[settings.bias], UniformTypes.FLOAT);
    shaderUniforms.add("u_domain", ()=>[settings.domain - 1], UniformTypes.INT);
    shaderUniforms.add("u_hueShift", ()=>[settings.hueShift], UniformTypes.FLOAT);
    shaderUniforms.add("u_toggles", ()=>[+settings.julia + 2*+settings.smooth], UniformTypes.INT);
    shaderUniforms.add("u_resolution", ()=>[viewport.width, viewport.height], UniformTypes.FLOAT);
    shaderUniforms.add("u_color", ()=>[settings.coloring], UniformTypes.INT);
    shaderUniforms.add("u_angle", ()=>[settings.offset.angle], UniformTypes.FLOAT);
    for (let userVar of Parser.current.userVars) {
        shaderUniforms.add("u_" + userVar, ()=>[sidebarVals[userVar], 0], UniformTypes.FLOAT);
    }

    samplesLocation = gl.getUniformLocation(textureProgram, "u_samples")!;
    offsetLocation = gl.getUniformLocation(textureProgram, "u_offset")!;
    
    for (let buffer of frameBuffers) {
        gl.deleteFramebuffer(buffer);
    }
    frameBuffers = [];
    frameBuffers.push(gl.createFramebuffer()!);
    frameBuffers.push(gl.createFramebuffer()!);

    gl.bindAttribLocation(textureProgram, 0, "zero");
    gl.bindAttribLocation(canvasProgram, 0, "zero");

    let vertexData = [-1, -1, -1, 1, 1, 1, -1, -1, 1, 1, 1, -1];
    let posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);

    let posAttrib = gl.getAttribLocation(textureProgram, "a_position");
    gl.enableVertexAttribArray(posAttrib);
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

    requestAnimationFrame(draw);
}

let textures: WebGLTexture[] = [];
function createTextures() {
    gl.deleteTexture(textures[0]);
    gl.deleteTexture(textures[1]);
    textures = [];

    textures.push(gl.createTexture()!);
    gl.bindTexture(gl.TEXTURE_2D, textures[0]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    textures.push(gl.createTexture()!);
    gl.bindTexture(gl.TEXTURE_2D, textures[1]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

let bufferIndex = 0;
function draw() {
    // Ensure canvas is sized properly 
    resize();

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[0]);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[0], 0);

    // Set program to render to texture
    gl.useProgram(textureProgram);

    // Asign all uniforms
    shaderUniforms.assignAll();
    settings.samples = 0;

    coordDisplay.innerHTML = `Offset: ${settings.offset.pos.x} + ${settings.offset.pos.y}i\nZoom: 2<sup>${Math.round(settings.zoom.level * 1000) / 1000}</sup>`;

    if (settings.antiAlias) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[1]);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[1], 0);

        bufferIndex = 1;
    } else {
        bufferIndex = 1;
        antiAliasLoop();
    }
}

function antiAliasLoop() {
    bufferIndex = 1 - bufferIndex;

    gl.useProgram(textureProgram);

    // Bind current buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[bufferIndex]);

    // Bind current texture
    gl.bindTexture(gl.TEXTURE_2D, textures[1 - bufferIndex]);

    // Update uniforms
    settings.samples++;
    gl.uniform1i(samplesLocation, settings.samples);
    if (settings.samples > 1) {
        gl.uniform2f(offsetLocation, Math.random()-0.5, Math.random()-0.5);
    } else {
        gl.uniform2f(offsetLocation, 0, 0);
    }

    // Render to texture
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Unbind framebuffer to render to canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Switch to canvas program
    gl.useProgram(canvasProgram);

    // Render to canvas
    gl.bindTexture(gl.TEXTURE_2D, textures[bufferIndex]);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (settings.screenshot) {
        settings.screenshot = false;
        downloadCanvas();
    }

    if (settings.antiAlias) {
        requestAnimationFrame(antiAliasLoop);
    }
}

function resize() {
    let prevHeight = canvas.height;
    let prevWidth = canvas.width;
    if (document.fullscreenElement || (document as any).mozFullScreenElement || (document as any).webkitFullscreenElement) {
        canvas.width = screen.width;
        canvas.height = screen.height;
        viewport.width = screen.width;
        viewport.height = screen.height;
    //} else if (CANVAS_WRAPPER.clientHeight * devicePixelRatio !== canvas.height || CANVAS_WRAPPER.clientWidth * devicePixelRatio != canvas.width) {
    } else {
        canvas.height = CANVAS_WRAPPER.clientHeight * devicePixelRatio;
        canvas.width = CANVAS_WRAPPER.clientWidth * devicePixelRatio;
        viewport.width = CANVAS_WRAPPER.clientWidth * devicePixelRatio;
        viewport.height = CANVAS_WRAPPER.clientHeight * devicePixelRatio;
    }

    if (canvas.height != prevHeight || canvas.width != prevWidth) {
        createTextures();
    }
}

function createVertex() {
    let raw = getVertex();
    let shader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(shader, raw);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return shader;
    }

    console.log(`ERROR: ${gl.getShaderInfoLog(shader)}`);
    gl.deleteShader(shader);
}

function createFragment() {
    let raw = getFragment();
    let shader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(shader, raw);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return shader;
    }

    console.log(`ERROR: ${gl.getShaderInfoLog(shader)}`);
    gl.deleteShader(shader);
}

function createCanvasShader() {
    let raw = getCanvasShader();
    let shader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(shader, raw);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return shader;
    }

    console.log(`ERROR: ${gl.getShaderInfoLog(shader)}`);
    gl.deleteShader(shader);
}

function pxToMath(px: Point): Point {
    return new Point(2.0*px.x/canvas.clientWidth*(viewport.width/viewport.height), 2.0*px.y/canvas.clientHeight);
}

function pxToCanvas(px: Point): Point {
    return new Point((2.0*px.x/canvas.clientWidth - 1)*(viewport.width/viewport.height), 2.0*px.y/canvas.clientHeight - 1);
}

function resetView() {
    settings.zoom.level = 0;
    settings.zoom.log = 1;
    settings.offset.pos.x = 0;
    settings.offset.pos.y = 0;
    requestAnimationFrame(draw);
}

function downloadCanvas() {
    if (!settings.antiAlias) {
        draw();
    }
    canvas.toBlob((blob) => {
        if (blob === null) {
            throw new Error("Failed to download file");
        }
        const a = document.createElement('a');
        a.style.display = 'none';
        document.body.appendChild(a);
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = "fractal.png";
        a.click();
        a.remove();
    });
}

function getURL() {
    setup(true);
    let base = window.location.href.split("?")[0];
    base += `?eq=${encodeURIComponent(settings.equation)}`;
    base += `&it=${settings.iterations}`;
    base += `&bk=${settings.breakout}`;
    base += `&jm=${+settings.julia}`;
    base += `&cm=${settings.coloring}`;
    base += `&cb=${settings.bias}`;
    base += `&dm=${settings.domain}`;
    base += `&hs=${settings.hueShift}`;
    base += `&sm=${+settings.smooth}`;
    base += `&px=${settings.offset.pos.x}`;
    base += `&py=${settings.offset.pos.y}`;
    base += `&zm=${settings.zoom.level}`;
    return base;
}

function fullscreen() {
    if (canvas.requestFullscreen) {
        canvas.requestFullscreen();
    } else if ((canvas as any).webkitRequestFullscreen) {
        (canvas as any).webkitRequestFullscreen();
    } else {
        throw new Error("Error fullscreening the canvas");
    }
}

const SHARE_POPUP = document.getElementById("sharePopup") as HTMLElement;
const SHARE_INPUT = document.getElementById("shareInput") as HTMLInputElement;
function shareURL() {
    SHARE_POPUP.style.display = "flex";
    SHARE_INPUT.value = getURL();
    SHARE_INPUT.select();
}