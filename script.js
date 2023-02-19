"use strict";
const canvas = document.getElementById("webGLCanvas");
const gl = canvas.getContext("webgl");

let aspect = 1;
let dragStart = [0,0];
let oldpos = [0,0];
let pos = [0,0];
let zoom = 0;
let logZoom = 1;
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

    gl.uniform2fv(transformUniform, pos);

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

    gl.uniform3fv(transformUniform, [pos[0], pos[1], logZoom]);
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

function pxToCanvas(px) {
    return [(2*px[0]/canvas.clientWidth - 1)*aspect, 2*px[1]/canvas.clientHeight - 1];
}

window.addEventListener("resize", e => {
    requestAnimationFrame(draw);
});

let dragging = false;
canvas.addEventListener("mousedown", e => {
    dragging = true;
    oldpos = [pos[0],pos[1]];
    dragStart = pxToCanvas([e.offsetX,e.offsetY]);
    requestAnimationFrame(draw);
});
canvas.addEventListener("mousemove", e => {
    if (dragging) {
        let curpos = pxToCanvas([e.offsetX,e.offsetY]);
        pos = [oldpos[0] - (curpos[0] - dragStart[0])/logZoom, oldpos[1] + (curpos[1] - dragStart[1])/logZoom];
        requestAnimationFrame(draw);
    }
});
canvas.addEventListener("mouseup", e => {
    dragging = false;
    let endpos = pxToCanvas([e.offsetX,e.offsetY]);
    pos = [oldpos[0] - (endpos[0] - dragStart[0])/logZoom, oldpos[1] + (endpos[1] - dragStart[1])/logZoom];
    requestAnimationFrame(draw);
});
canvas.addEventListener("wheel", e => {
    let zoomPoint = pxToCanvas([e.offsetX,e.offsetY]);
    pos = [pos[0] + zoomPoint[0]/logZoom, pos[1] - zoomPoint[1]/logZoom];
    zoom += -0.5*Math.sign(e.deltaY);
    logZoom = Math.pow(2, zoom);
    pos = [pos[0] - zoomPoint[0]/logZoom, pos[1] + zoomPoint[1]/logZoom];
    requestAnimationFrame(draw);
})

setup();