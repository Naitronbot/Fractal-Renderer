const canvas = document.getElementById("webGLCanvas") as HTMLCanvasElement;
const coordDisplay = document.getElementById("coordDisplay") as HTMLElement;
const gl = canvas.getContext("webgl")!;

if (gl === null) {
    alert("Your browser doesn't support webgl.");
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

const viewport: {[key: string]: any} = {
    aspectRatio: 1,
    zoom: {
        level: 0,
        log: 1
    },
    offset: {
        pos: new Point(0,0)
    },
    pointer: {
        lastPos: new Point(0,0),
        lastDist: 0,
        dist: 0,
        dragging: false
    },
    settings: {
        iterations: 500,
        breakout: 10000,
        coloring: "hue",
        bias: 0,
        hueShift: 0,
        julia: false,
        smooth: false
    }
};

let currentAST: ParseNode;
let transformUniform: number;
let aspectUniform: number;
function setup(manual: boolean) {
    if (RECOMP_TOGGLE.checked && !manual) {
        return;
    }

    let vertexShader = createVertex();
    let fragmentShader = createFragment();
    if (!vertexShader || !fragmentShader) {
        return;
    }

    let program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.log(`LINK ERROR: ${gl.getProgramInfoLog(program)}`);
        return;
    }

    transformUniform = gl.getUniformLocation(program, "u_transform")! as number;
    aspectUniform = gl.getUniformLocation(program, "u_aspect")! as number;
    let posAttrib = gl.getAttribLocation(program, "a_position");

    gl.useProgram(program);

    gl.uniform2fv(transformUniform, viewport.offset.pos.toArray());

    gl.enableVertexAttribArray(transformUniform);
    gl.vertexAttribPointer(transformUniform, 2, gl.FLOAT, false, 0, 0);

    let vertexData = [-1, -1, -1, 1, 1, 1, -1, -1, 1, 1, 1, -1];
    let posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(posAttrib);
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

    requestAnimationFrame(draw);
}

function draw() {
    resize();
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform3fv(transformUniform, [viewport.offset.pos.x, viewport.offset.pos.y, viewport.zoom.log]);
    gl.uniform1f(aspectUniform, viewport.aspectRatio);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    coordDisplay.innerHTML = `Coords: ${viewport.offset.pos.x} + ${viewport.offset.pos.y}i\nZoom: ${viewport.zoom.level}`;
}

function resize() {
    if (canvas.clientHeight !== canvas.height || canvas.clientWidth != canvas.width) {
        canvas.height = canvas.clientHeight;
        canvas.width = canvas.clientWidth;
        viewport.aspectRatio = canvas.clientWidth/canvas.clientHeight;
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

function pxToMath(px: Point): Point {
    return new Point(2.0*px.x/canvas.clientWidth*viewport.aspectRatio, 2.0*px.y/canvas.clientHeight);
}

function pxToCanvas(px: Point): Point {
    return new Point((2.0*px.x/canvas.clientWidth - 1)*viewport.aspectRatio, 2.0*px.y/canvas.clientHeight - 1);
}

function resetView() {
    viewport.zoom.level = 0;
    viewport.zoom.log = 1;
    viewport.offset.pos.x = 0;
    viewport.offset.pos.y = 0;
    requestAnimationFrame(draw);
}

function downloadCanvas() {
    draw();
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

window.addEventListener("resize", e => {
    requestAnimationFrame(draw);
});


document.addEventListener("mousemove", e => {
    if (e.buttons === 1 && viewport.pointer.dragging) {
        let canvasCoords = canvas.getBoundingClientRect();
        let clickPos = new Point(e.clientX - canvasCoords.left, e.clientY - canvasCoords.top);
        let touchOffset = new Point(clickPos.x - viewport.pointer.lastPos.x, clickPos.y - viewport.pointer.lastPos.y);
        moveDrag(touchOffset);
        viewport.pointer.lastPos = clickPos;
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
    zoomScreen(new Point(e.offsetX,e.offsetY),-0.5*Math.sign(e.deltaY));
});

document.addEventListener("touchmove", e => {
    if (viewport.pointer.dragging) {
        let touches = getTouches(e);
        let touchOffset = new Point(touches.center[0] - viewport.pointer.lastPos.x, touches.center[1] - viewport.pointer.lastPos.y);
        moveDrag(touchOffset);
        let zoomFactor;
        if (viewport.pointer.dist > 0) {
            zoomFactor = touches.dist / viewport.pointer.dist;
        } else {
            zoomFactor = 1;
        }
        let centerPoint = Point.fromArray(touches.center);
        scaleScreen(centerPoint, zoomFactor);
        viewport.pointer.lastPos = centerPoint;
        viewport.pointer.dist = touches.dist;
    }
});

canvas.addEventListener("touchstart", e => {
    document.body.style.userSelect = "none";
    let touches = getTouches(e);
    viewport.pointer.lastPos = Point.fromArray(touches.center);
    viewport.pointer.dist = touches.dist;
    viewport.pointer.dragging = true;
});
document.addEventListener("touchend", e => {
    document.body.style.userSelect = "";
    viewport.pointer.dragging = false;
});


function moveDrag(coords: Point) {
    let movePos = pxToMath(coords);
    viewport.offset.pos.x = viewport.offset.pos.x - movePos.x/viewport.zoom.log;
    viewport.offset.pos.y = viewport.offset.pos.y + movePos.y/viewport.zoom.log;
    requestAnimationFrame(draw);
}

function zoomScreen(coords: Point, zoomAmt: number) {
    let zoomPoint = pxToCanvas(coords);
    viewport.offset.pos.x = viewport.offset.pos.x + zoomPoint.x/viewport.zoom.log;
    viewport.offset.pos.y = viewport.offset.pos.y - zoomPoint.y/viewport.zoom.log;
    viewport.zoom.level += zoomAmt;
    viewport.zoom.log = Math.pow(2,viewport.zoom.level);
    viewport.offset.pos.x = viewport.offset.pos.x - zoomPoint.x/viewport.zoom.log;
    viewport.offset.pos.y = viewport.offset.pos.y + zoomPoint.y/viewport.zoom.log;
    requestAnimationFrame(draw);
}

function scaleScreen(coords: Point, zoomAmt: number) {
    let zoomPoint = pxToCanvas(coords);
    viewport.offset.pos.x = viewport.offset.pos.x + zoomPoint.x/viewport.zoom.log;
    viewport.offset.pos.y = viewport.offset.pos.y - zoomPoint.y/viewport.zoom.log;
    viewport.zoom.log *= zoomAmt;
    viewport.zoom.level = Math.log2(viewport.zoom.log);
    viewport.offset.pos.x = viewport.offset.pos.x - zoomPoint.x/viewport.zoom.log;
    viewport.offset.pos.y = viewport.offset.pos.y + zoomPoint.y/viewport.zoom.log;
    requestAnimationFrame(draw);
}

function getTouches(e: TouchEvent) {
    let canvasCoords = canvas.getBoundingClientRect();
    if (e.touches.length === 1) {
        return {center: [(e.targetTouches[0].pageX - canvasCoords.left), (e.targetTouches[0].pageY - canvasCoords.top)], dist: 0};
    } else {
        let total = [0, 0];
        for (let i = 0; i < e.touches.length; i++) {
            total = [total[0] + (e.targetTouches[i].pageX - canvasCoords.left), total[1] + (e.targetTouches[i].pageY - canvasCoords.top)];
        }
        let centerPoint = [total[0]/e.touches.length,total[1]/e.touches.length];
        let centerDistance = Math.sqrt(Math.pow(centerPoint[0] - (e.targetTouches[0].pageX - canvasCoords.left), 2) + Math.pow(centerPoint[1] - (e.targetTouches[0].pageY - canvasCoords.top), 2));
        return {center: centerPoint, dist: centerDistance};
    }
}