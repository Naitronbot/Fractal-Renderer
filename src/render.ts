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

const enum UniformTypes {FLOAT, INT};
class ShaderUniformContainer {
    private uniformLocations: WebGLUniformLocation[];
    private uniformValues: Function[];
    private uniformTypes: UniformTypes[];
    program: WebGLProgram;
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

const viewport: {[key: string]: any} = {
    width: 0,
    height: 0,
    zoom: {
        level: 0,
        log: 1
    },
    offset: {
        pos: new Point(0,0),
        angle: 0
    },
    pointer: {
        lastPos: new Point(0,0),
        lastDist: 0,
        dist: 0,
        lastAngle: 0,
        dragging: false
    },
    settings: {
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
        screenshot: false
    }
};

let currentAST: ParseNode;
let shaderUniforms: ShaderUniformContainer;

loadQueryParams();

const enum paramTypes {string, bool, num, offset, zoom}
function loadQueryParams() {
    const queryParams = new URLSearchParams(window.location.search);
    let iter = queryParams.get('it');
    if (iter !== null && parseInt(iter) > 1000 && !confirm(`High iteration count detected (${iter}), this may lag, would you like to proceed anyways?`)) {
        return;
    }
    setParam(queryParams, paramTypes.string, 'eq', 'equation');
    setParam(queryParams, paramTypes.num, 'it', 'iterations');
    setParam(queryParams, paramTypes.num, 'bk', 'breakout');
    setParam(queryParams, paramTypes.bool, 'jm', 'julia');
    setParam(queryParams, paramTypes.num, 'cm', 'coloring');
    setParam(queryParams, paramTypes.num, 'cb', 'bias');
    setParam(queryParams, paramTypes.num, 'dm', 'domain');
    setParam(queryParams, paramTypes.num, 'hs', 'hueShift');
    setParam(queryParams, paramTypes.bool, 'sm', 'smooth');
    setParam(queryParams, paramTypes.offset, 'px', 'x');
    setParam(queryParams, paramTypes.offset, 'py', 'y');
    setParam(queryParams, paramTypes.zoom, 'zm', 'level/log');
    setDefaults();
}

function setParam(params: URLSearchParams, type: paramTypes, param: string, setting: string) {
    const currentParam = params.get(param);
    if (currentParam === null) {
        return;
    }
    if (type === paramTypes.string) {
        viewport.settings[setting!] = decodeURI(currentParam);
    } else if (type === paramTypes.bool) {
        viewport.settings[setting!] = currentParam === '1' ? 1 : 0;
    } else if (type === paramTypes.num) {
        viewport.settings[setting!] = parseFloat(currentParam);
    } else if (type === paramTypes.offset) {
        viewport.offset.pos[setting!] = parseFloat(currentParam);
    } else if (type === paramTypes.zoom) {
        const zoom = parseFloat(currentParam)
        viewport.zoom.level = zoom;
        viewport.zoom.log = Math.pow(2,viewport.zoom.level);
    }
}

function setDefaults() {
    ITERATIONS_SLIDER.value = viewport.settings.iterations;
    ITERATIONS_BOX.value = viewport.settings.iterations;
    BREAKOUT_SLIDER.value = viewport.settings.breakout;
    BREAKOUT_BOX.value = viewport.settings.breakout;
    JULIA_TOGGLE.checked = viewport.settings.julia;
    SMOOTH_TOGGLE.checked = viewport.settings.smooth;
    HUESHIFT_SLIDER.value = viewport.settings.hueShift;
    HUESHIFT_BOX.value = viewport.settings.hueShift;
    BIAS_SLIDER.value = viewport.settings.bias;
    BIAS_BOX.value = viewport.settings.bias;
    DOMAIN_SLIDER.value = viewport.settings.domain;
    DOMAIN_BOX.value = viewport.settings.domain;
    COLORING_MODE.value = viewport.settings.coloring;
    toggleColoringActive();
}

let textureProgram: WebGLProgram;
let canvasProgram: WebGLProgram;
let samplesLocation: WebGLUniformLocation;
let offsetLocation: WebGLUniformLocation;
let frameBuffers: WebGLFramebuffer[] = [];
function setup(manual: boolean) {
    if (RECOMP_TOGGLE.checked && !manual) {
        return;
    }

    let vertexShader = createVertex();
    let fragmentShader = createFragment();
    let canvasShader = createCanvasShader();
    if (!vertexShader || !fragmentShader || !canvasShader) {
        return;
    }

    textureProgram = gl.createProgram()!;
    canvasProgram = gl.createProgram()!;
    gl.attachShader(textureProgram, vertexShader);
    gl.attachShader(textureProgram, fragmentShader);
    gl.attachShader(canvasProgram, vertexShader);
    gl.attachShader(canvasProgram, canvasShader);
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
    shaderUniforms.add("u_transform", ()=>[viewport.offset.pos.x, viewport.offset.pos.y, viewport.zoom.log], UniformTypes.FLOAT);
    shaderUniforms.add("u_iterations", ()=>[viewport.settings.iterations], UniformTypes.INT);
    shaderUniforms.add("u_breakout", ()=>[viewport.settings.breakout], UniformTypes.FLOAT);
    shaderUniforms.add("u_bias", ()=>[viewport.settings.bias], UniformTypes.FLOAT);
    shaderUniforms.add("u_domain", ()=>[viewport.settings.domain - 1], UniformTypes.INT);
    shaderUniforms.add("u_hueShift", ()=>[viewport.settings.hueShift], UniformTypes.FLOAT);
    shaderUniforms.add("u_toggles", ()=>[viewport.settings.julia + 2*viewport.settings.smooth], UniformTypes.INT);
    shaderUniforms.add("u_resolution", ()=>[viewport.width, viewport.height], UniformTypes.FLOAT);
    shaderUniforms.add("u_color", ()=>[viewport.settings.coloring], UniformTypes.INT);
    shaderUniforms.add("u_angle", ()=>[viewport.offset.angle], UniformTypes.FLOAT);

    samplesLocation = gl.getUniformLocation(textureProgram, "u_samples")!;
    offsetLocation = gl.getUniformLocation(textureProgram, "u_offset")!;
    
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
    console.log("aa");
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

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[0]);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[0], 0);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[1]);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[1], 0);
}

let bufferIndex = 0;
function draw() {
    // Ensure canvas is sized properly 
    resize();

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[0]);

    // Set program to render to texture
    gl.useProgram(textureProgram);

    // Asign all uniforms
    shaderUniforms.assignAll();
    viewport.settings.samples = 0;

    coordDisplay.innerHTML = `Coords: ${viewport.offset.pos.x} + ${viewport.offset.pos.y}i\nZoom: ${viewport.zoom.level}`;

    if (viewport.settings.antiAlias) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[1]);

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
    viewport.settings.samples++;
    gl.uniform1i(samplesLocation, viewport.settings.samples);
    if (viewport.settings.samples > 1) {
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

    if (viewport.settings.screenshot) {
        viewport.settings.screenshot = false;
        downloadCanvas();
    }

    if (viewport.settings.antiAlias) {
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
    if (currentAST === null) {
        throw new Error("WebGL Error: No equation provided");
    }
    let raw = getFragment(currentAST, viewport.settings);
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
    viewport.zoom.level = 0;
    viewport.zoom.log = 1;
    viewport.offset.pos.x = 0;
    viewport.offset.pos.y = 0;
    requestAnimationFrame(draw);
}

function downloadCanvas() {
    if (!viewport.settings.antiAlias) {
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
    base += `?eq=${encodeURIComponent(viewport.settings.equation)}`;
    base += `&it=${viewport.settings.iterations}`;
    base += `&bk=${viewport.settings.breakout}`;
    base += `&jm=${viewport.settings.julia+0}`;
    base += `&cm=${viewport.settings.coloring}`;
    base += `&cb=${viewport.settings.bias}`;
    base += `&dm=${viewport.settings.domain}`;
    base += `&hs=${viewport.settings.hueShift}`;
    base += `&sm=${viewport.settings.smooth+0}`;
    base += `&px=${viewport.offset.pos.x}`;
    base += `&py=${viewport.offset.pos.y}`;
    base += `&zm=${viewport.zoom.level}`;
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

window.addEventListener("resize", e => {
    fixGrid();
    requestAnimationFrame(draw);
});


document.addEventListener("mousemove", e => {
    if (e.buttons === 1 && viewport.pointer.dragging) {
        let canvasCoords = canvas.getBoundingClientRect();
        let clickPos = new Point(e.clientX - canvasCoords.left, e.clientY - canvasCoords.top);
        let touchOffset = new Point(clickPos.x - viewport.pointer.lastPos.x, clickPos.y - viewport.pointer.lastPos.y);
        moveDrag(touchOffset);
        viewport.pointer.lastPos = clickPos;
        requestAnimationFrame(draw);
    }
});
canvas.addEventListener("mousedown", e => {
    document.body.style.userSelect = "none";
    let canvasCoords = canvas.getBoundingClientRect();
    let clickPos = new Point(e.clientX - canvasCoords.left, e.clientY - canvasCoords.top);
    viewport.pointer.lastPos = clickPos;
    viewport.pointer.dragging = true;
});
document.addEventListener("mouseup", () => {
    document.body.style.userSelect = "";
    viewport.pointer.dragging = false;
});
canvas.addEventListener("wheel", e => {
    zoomScreen(new Point(e.offsetX,e.offsetY),-0.002*e.deltaY);
    requestAnimationFrame(draw);
});

document.addEventListener("touchmove", e => {
    if (viewport.pointer.dragging) {
        e.preventDefault();
        let touches = getTouches(e);
        let touchOffset = new Point(touches.center[0] - viewport.pointer.lastPos.x, touches.center[1] - viewport.pointer.lastPos.y);
        if (viewport.settings.fad) {
            moveDrag(touchOffset, viewport.offset.angle);
        } else {
            moveDrag(touchOffset);
        }
        let zoomFactor;
        if (viewport.pointer.dist > 0) {
            zoomFactor = touches.dist / viewport.pointer.dist;
        } else {
            zoomFactor = 1;
        }
        let centerPoint = Point.fromArray(touches.center);
        scaleScreen(centerPoint, zoomFactor);

        let angleDif = touches.angle - viewport.pointer.lastAngle;
        if (viewport.settings.fad) {
            viewport.offset.angle += Math.atan2(Math.sin(angleDif),Math.cos(angleDif));
        }
        viewport.pointer.lastPos = centerPoint;
        viewport.pointer.lastAngle = touches.angle;
        viewport.pointer.dist = touches.dist;
        requestAnimationFrame(draw);
    }
});

canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    document.body.style.userSelect = "none";
    let touches = getTouches(e);
    viewport.pointer.lastPos = Point.fromArray(touches.center);
    viewport.pointer.lastAngle = touches.angle;
    viewport.pointer.dist = touches.dist;
    viewport.pointer.dragging = true;
});
document.addEventListener("touchend", e => {
    document.body.style.userSelect = "";
    viewport.pointer.dragging = false;
});


function moveDrag(coords: Point, angle?: number) {
    let movePos = pxToMath(coords);
    if (angle !== undefined) {
        movePos = new Point(movePos.x * Math.cos(-angle) - movePos.y * Math.sin(-angle), movePos.x * Math.sin(-angle) + movePos.y * Math.cos(-angle));
    }
    viewport.offset.pos.x = viewport.offset.pos.x - movePos.x/viewport.zoom.log;
    viewport.offset.pos.y = viewport.offset.pos.y + movePos.y/viewport.zoom.log;
}

function zoomScreen(coords: Point, zoomAmt: number) {
    let zoomPoint = pxToCanvas(coords);
    viewport.offset.pos.x = viewport.offset.pos.x + zoomPoint.x/viewport.zoom.log;
    viewport.offset.pos.y = viewport.offset.pos.y - zoomPoint.y/viewport.zoom.log;
    viewport.zoom.level += zoomAmt;
    viewport.zoom.log = Math.pow(2,viewport.zoom.level);
    viewport.offset.pos.x = viewport.offset.pos.x - zoomPoint.x/viewport.zoom.log;
    viewport.offset.pos.y = viewport.offset.pos.y + zoomPoint.y/viewport.zoom.log;
}

function scaleScreen(coords: Point, zoomAmt: number) {
    let zoomPoint = pxToCanvas(coords);
    viewport.offset.pos.x = viewport.offset.pos.x + zoomPoint.x/viewport.zoom.log;
    viewport.offset.pos.y = viewport.offset.pos.y - zoomPoint.y/viewport.zoom.log;
    viewport.zoom.log *= zoomAmt;
    viewport.zoom.level = Math.log2(viewport.zoom.log);
    viewport.offset.pos.x = viewport.offset.pos.x - zoomPoint.x/viewport.zoom.log;
    viewport.offset.pos.y = viewport.offset.pos.y + zoomPoint.y/viewport.zoom.log;
}

function getTouches(e: TouchEvent) {
    let canvasCoords = canvas.getBoundingClientRect();
    if (e.touches.length === 1) {
        return {center: [(e.targetTouches[0].pageX - canvasCoords.left), (e.targetTouches[0].pageY - canvasCoords.top)], dist: 0, angle: viewport.pointer.lastAngle};
    } else {
        let total = [0, 0];
        for (let i = 0; i < e.touches.length; i++) {
            total = [total[0] + (e.targetTouches[i].pageX - canvasCoords.left), total[1] + (e.targetTouches[i].pageY - canvasCoords.top)];
        }
        let centerPoint = [total[0]/e.touches.length,total[1]/e.touches.length];
        let centerDistance = Math.sqrt(Math.pow(centerPoint[0] - (e.targetTouches[0].pageX - canvasCoords.left), 2) + Math.pow(centerPoint[1] - (e.targetTouches[0].pageY - canvasCoords.top), 2));
        let angle;
        if (viewport.settings.fad) {
            angle = Math.atan2((e.targetTouches[1].pageY - canvasCoords.top)-(e.targetTouches[0].pageY - canvasCoords.top), (e.targetTouches[1].pageX - canvasCoords.top)-(e.targetTouches[0].pageX - canvasCoords.left))%(2*Math.PI);
        } else {
            angle = viewport.offset.angle;
        }
        return {center: centerPoint, dist: centerDistance, angle: angle};
    }
}