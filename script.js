"use strict";
const canvas = document.getElementById("webGLCanvas");
const gl = canvas.getContext("webgl");

let aspect = 1;
let view = {
    zoom: {
        level: 0,
        log: 1
    },
    offset: {
        pos: [0,0]
    },
    pointer: {
        lastPos: [0,0],
        lastDist: 0,
        dragging: false
    }
};

let transformUniform;
let aspectUniform;
async function setup() {
    if (gl === null) {
        alert("Your browser doesn't support webgl, this demo will not work.");
        return;
    }

    let vertexShader = makeShader(gl, "./vertex.glsl", gl.VERTEX_SHADER);
    let fragmentShader = makeShader(gl, "./fragment.glsl", gl.FRAGMENT_SHADER);

    await Promise.all([vertexShader, fragmentShader]).then(results => {
        vertexShader = results[0];
        fragmentShader = results[1];
    });

    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        alert(`LINK ERROR: ${gl.getProgramInfoLog(program)}`);
        return null;
    }

    transformUniform = gl.getUniformLocation(program, "u_transform");
    aspectUniform = gl.getUniformLocation(program, "u_aspect");
    let posAttrib = gl.getAttribLocation(program, "a_position");

    gl.useProgram(program);

    gl.uniform2fv(transformUniform, view.offset.pos);

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

    gl.uniform3fv(transformUniform, [view.offset.pos[0], view.offset.pos[1], view.zoom.log]);
    gl.uniform1f(aspectUniform, aspect);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function resize() {
    if (canvas.clientHeight !== canvas.height || canvas.clientWidth != canvas.width) {
        canvas.height = canvas.clientHeight;
        canvas.width = canvas.clientWidth;
        aspect = canvas.clientWidth/canvas.clientHeight;
    }
}

async function makeShader(gl, path, type) {
    let rawShader = await fetch(path).then(result => result.text());
    let shader = gl.createShader(type);
    gl.shaderSource(shader, rawShader);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return shader;
    }

    alert(`ERROR: ${gl.getShaderInfoLog(shader)}`);
    gl.deleteShader(shader);
}

function pxToMath(px) {
    return [2.0*px[0]/canvas.clientWidth*aspect,2.0*px[1]/canvas.clientHeight]
}

function pxToCanvas(px) {
    return [(2*px[0]/canvas.clientWidth - 1)*aspect, 2*px[1]/canvas.clientHeight - 1];
}

function resetView() {
    view.zoom.level = 0;
    view.zoom.log = 1;
    view.offset.pos = [0,0];
    requestAnimationFrame(draw);
}

window.addEventListener("resize", e => {
    requestAnimationFrame(draw);
});

function moveDrag(coords) {
    let movePos = pxToMath(coords);
    view.offset.pos = [view.offset.pos[0] - movePos[0]/view.zoom.log, view.offset.pos[1] + movePos[1]/view.zoom.log];
    requestAnimationFrame(draw);
}

function zoomScreen(coords, zoomAmt) {
    let zoomPoint = pxToCanvas(coords);
    view.offset.pos = [view.offset.pos[0] + zoomPoint[0]/view.zoom.log, view.offset.pos[1] - zoomPoint[1]/view.zoom.log];
    view.zoom.level += zoomAmt;
    view.zoom.log = Math.pow(2,view.zoom.level);
    view.offset.pos = [view.offset.pos[0] - zoomPoint[0]/view.zoom.log, view.offset.pos[1] + zoomPoint[1]/view.zoom.log];
    requestAnimationFrame(draw);
}

function scaleScreen(coords, zoomAmt) {
    let zoomPoint = pxToCanvas(coords);
    view.offset.pos = [view.offset.pos[0] + zoomPoint[0]/view.zoom.log, view.offset.pos[1] - zoomPoint[1]/view.zoom.log];
    view.zoom.log *= zoomAmt;
    view.zoom.level = Math.log2(view.zoom.log);
    view.offset.pos = [view.offset.pos[0] - zoomPoint[0]/view.zoom.log, view.offset.pos[1] + zoomPoint[1]/view.zoom.log];
    requestAnimationFrame(draw);
}

canvas.addEventListener("mousemove", e => {
    if (e.buttons === 1) {
        let canvasCoords = canvas.getBoundingClientRect();
        let clickPos = [(e.clientX - canvasCoords.left), (e.clientY - canvasCoords.top)];
        if (!view.pointer.dragging) {
            view.pointer.lastPos = clickPos;
            view.pointer.dragging = true;
            return;
        }
        let touchOffset = [clickPos[0] - view.pointer.lastPos[0], clickPos[1] - view.pointer.lastPos[1]];
        moveDrag([touchOffset[0], touchOffset[1]]);
        view.pointer.lastPos = clickPos;
    }
});
canvas.addEventListener("mouseup", e => view.pointer.dragging = false);
canvas.addEventListener("mousedown", e => view.pointer.dragging = false);
canvas.addEventListener("wheel", e => {
    zoomScreen([e.offsetX,e.offsetY],-0.5*Math.sign(e.deltaY));
});

function getTouches(e) {
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

canvas.addEventListener("touchmove", e => {
    let touches = getTouches(e);
    if (!view.pointer.dragging) {
        view.pointer.lastPos = touches.center;
        view.pointer.dist = touches.dist;
        view.pointer.dragging = true;
        return;
    }
    let touchOffset = [touches.center[0] - view.pointer.lastPos[0], touches.center[1] - view.pointer.lastPos[1]];
    moveDrag([touchOffset[0], touchOffset[1]]);
    let zoomFactor;
    if (view.pointer.dist > 0) {
        zoomFactor = touches.dist / view.pointer.dist;
    } else {
        zoomFactor = 1;
    }
    scaleScreen(touches.center, zoomFactor);
    view.pointer.lastPos = touches.center;
    view.pointer.dist = touches.dist;
});

canvas.addEventListener("touchstart", e => view.pointer.dragging = false);
canvas.addEventListener("touchend", e => view.pointer.dragging = false);

setup();