import { getCanvasShader, getFragment, getVertex } from "shaders";
import { UIElements } from "ui";
import { expressionState, pageState, viewportState } from "state";
import { Point } from "shared";
import { needsVars } from "sliders";

// Structure for setting, binding, and updating shader uniforms
const enum UniformTypes {FLOAT, INT};
class ShaderUniformContainer {
    private program: WebGLProgram;
    private gl: WebGL2RenderingContext;
    private uniformLocations: WebGLUniformLocation[];
    private uniformValues: Function[];
    private uniformTypes: UniformTypes[];

    constructor(gl: WebGL2RenderingContext, program: WebGLProgram) {
        this.gl = gl;
        this.program = program;
        this.uniformLocations = [];
        this.uniformValues = [];
        this.uniformTypes = [];
    }

    add(name: string, value: Function, type: UniformTypes) {
        let uniform = this.gl.getUniformLocation(this.program, name);
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
                    this.gl.uniform1fv(this.uniformLocations[i], values);
                } else if (len === 2) {
                    this.gl.uniform2fv(this.uniformLocations[i], values);
                } else if (len === 3) {
                    this.gl.uniform3fv(this.uniformLocations[i], values);
                } else if (len === 4) {
                    this.gl.uniform4fv(this.uniformLocations[i], values);
                } else {
                    throw new Error("Invalid uniform length");
                }
            } else if (this.uniformTypes[i] === UniformTypes.INT) {
                if (len === 1) {
                    this.gl.uniform1iv(this.uniformLocations[i], values);
                } else if (len === 2) {
                    this.gl.uniform2iv(this.uniformLocations[i], values);
                } else if (len === 3) {
                    this.gl.uniform3iv(this.uniformLocations[i], values);
                } else if (len === 4) {
                    this.gl.uniform4iv(this.uniformLocations[i], values);
                } else {
                    throw new Error("Invalid uniform length");
                }
            } else {
                throw new Error("Invalid uniform type");
            }
        }
    }
}

export class RenderContext {
    static gl: WebGL2RenderingContext;
    
    private static shaderUniforms: ShaderUniformContainer;

    private static textureProgram: WebGLProgram;
    private static canvasProgram: WebGLProgram;
    private static samplesLocation: WebGLUniformLocation;
    private static offsetLocation: WebGLUniformLocation;
    private static frameBuffers: WebGLFramebuffer[] = [];

    private static fragmentShader: WebGLShader | undefined;

    private static textures: WebGLTexture[];

    private static bufferIndex = 0;

    static pxToMath(px: Point): Point {
        return new Point(2.0*px.x/UIElements.canvas.clientWidth*(viewportState.width/viewportState.height), 2.0*px.y/UIElements.canvas.clientHeight);
    }
    
    static pxToCanvas(px: Point): Point {
        return new Point((2.0*px.x/UIElements.canvas.clientWidth - 1)*(viewportState.width/viewportState.height), 2.0*px.y/UIElements.canvas.clientHeight - 1);
    }

    static initialize() {
        // Create WebGL context
        const gl = UIElements.canvas.getContext("webgl2");
        if (gl === null) {
            alert("WebGL 2 not supported, please update your browser.");
            throw new Error("WebGL 2 not supported, please update your browser.");
        } else {
            this.gl = gl;
        }

        // Create programs
        const textureProgram = this.gl.createProgram();
        const canvasProgram = this.gl.createProgram();
        if (textureProgram === null || canvasProgram === null) {
            throw new Error("Error creating WebGL programs");
        }
        this.textureProgram = textureProgram;
        this.canvasProgram = canvasProgram;

        // Create shaders
        const vertexShader = this.createVertex();
        const canvasShader = this.createCanvasShader();
        if (!vertexShader || !canvasShader) {
            throw new Error("WebGL Error: Canvas shader failed");
        }
        this.gl.attachShader(canvasProgram, canvasShader);
        this.gl.attachShader(canvasProgram, vertexShader);
        this.gl.attachShader(textureProgram, vertexShader);

        this.textures = [];

        this.setup(true);
    }

    static setup(manual: boolean) {
        if (expressionState.type !== "success" || needsVars) {
            return;
        }
    
        if (pageState.manualRecomp && !manual) {
            return;
        }
    
        if (this.fragmentShader) {
            this.gl.detachShader(this.textureProgram, this.fragmentShader);
            this.gl.deleteShader(this.fragmentShader);
        }
    
        this.fragmentShader = this.createFragment();
        if (!this.fragmentShader) {
            return;
        }
    
        this.gl.attachShader(this.textureProgram, this.fragmentShader);
        this.gl.linkProgram(this.textureProgram);
        this.gl.linkProgram(this.canvasProgram);
    
        if (!this.gl.getProgramParameter(this.textureProgram, this.gl.LINK_STATUS)) {
            console.log(`LINK ERROR: ${this.gl.getProgramInfoLog(this.textureProgram)}`);
            return;
        }
        if (!this.gl.getProgramParameter(this.canvasProgram, this.gl.LINK_STATUS)) {
            console.log(`LINK ERROR: ${this.gl.getProgramInfoLog(this.canvasProgram)}`);
            return;
        }
        this.shaderUniforms = new ShaderUniformContainer(this.gl, this.textureProgram);
        this.shaderUniforms.add("u_transform", ()=>[pageState.offset.pos.x, pageState.offset.pos.y, pageState.zoom.log], UniformTypes.FLOAT);
        this.shaderUniforms.add("u_iterations", ()=>[pageState.iterations], UniformTypes.INT);
        this.shaderUniforms.add("u_breakout", ()=>[pageState.breakout], UniformTypes.FLOAT);
        this.shaderUniforms.add("u_bias", ()=>[pageState.bias], UniformTypes.FLOAT);
        this.shaderUniforms.add("u_domain", ()=>[pageState.domain - 1], UniformTypes.INT);
        this.shaderUniforms.add("u_hueShift", ()=>[pageState.hueShift], UniformTypes.FLOAT);
        this.shaderUniforms.add("u_toggles", ()=>[+pageState.julia + 2*+pageState.smooth + 4*+pageState.domainLightness], UniformTypes.INT);
        this.shaderUniforms.add("u_resolution", ()=>[viewportState.width, viewportState.height], UniformTypes.FLOAT);
        this.shaderUniforms.add("u_color", ()=>[pageState.coloring], UniformTypes.INT);
        this.shaderUniforms.add("u_angle", ()=>[pageState.offset.angle], UniformTypes.FLOAT);
        for (let userVar of expressionState.userVars) {
            this.shaderUniforms.add("u_" + userVar, ()=>[pageState.sliders[userVar].val, 0], UniformTypes.FLOAT);
        }
    
        this.samplesLocation = this.gl.getUniformLocation(this.textureProgram, "u_samples")!;
        this.offsetLocation = this.gl.getUniformLocation(this.textureProgram, "u_offset")!;
        
        for (let buffer of this.frameBuffers) {
            this.gl.deleteFramebuffer(buffer);
        }
        this.frameBuffers = [];
        this.frameBuffers.push(this.gl.createFramebuffer()!);
        this.frameBuffers.push(this.gl.createFramebuffer()!);
    
        this.gl.bindAttribLocation(this.textureProgram, 0, "zero");
        this.gl.bindAttribLocation(this.canvasProgram, 0, "zero");
    
        let vertexData = [-1, -1, -1, 1, 1, 1, -1, -1, 1, 1, 1, -1];
        let posBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, posBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertexData), this.gl.STATIC_DRAW);
    
        this.gl.enableVertexAttribArray(0);
    
        let posAttrib = this.gl.getAttribLocation(this.textureProgram, "a_position");
        this.gl.enableVertexAttribArray(posAttrib);
        this.gl.vertexAttribPointer(posAttrib, 2, this.gl.FLOAT, false, 0, 0);
    
        requestAnimationFrame(RenderContext.draw);
    }

    static createTextures() {
        this.gl.deleteTexture(this.textures[0]);
        this.gl.deleteTexture(this.textures[1]);
        this.textures = [];
    
        this.textures.push(this.gl.createTexture()!);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[0]);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.canvas.width, this.gl.canvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    
        this.textures.push(this.gl.createTexture()!);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[1]);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.canvas.width, this.gl.canvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }

    static draw() {
        // Ensure canvas is sized properly 
        RenderContext.resize();
    
        RenderContext.gl.bindFramebuffer(RenderContext.gl.FRAMEBUFFER, RenderContext.frameBuffers[0]);
        RenderContext.gl.framebufferTexture2D(RenderContext.gl.FRAMEBUFFER, RenderContext.gl.COLOR_ATTACHMENT0, RenderContext.gl.TEXTURE_2D, RenderContext.textures[0], 0);
    
        // Set program to render to texture
        RenderContext.gl.useProgram(RenderContext.textureProgram);
    
        // Asign all uniforms
        RenderContext.shaderUniforms.assignAll();
        pageState.samples = 0;
    
        UIElements.coordDisplay.innerHTML = `Offset: ${pageState.offset.pos.x} + ${pageState.offset.pos.y}i\nZoom: 2<sup>${Math.round(pageState.zoom.level * 1000) / 1000}</sup>`;
    
        if (pageState.antiAlias) {
            RenderContext.gl.bindFramebuffer(RenderContext.gl.FRAMEBUFFER, RenderContext.frameBuffers[1]);
            RenderContext.gl.framebufferTexture2D(RenderContext.gl.FRAMEBUFFER, RenderContext.gl.COLOR_ATTACHMENT0, RenderContext.gl.TEXTURE_2D, RenderContext.textures[1], 0);
    
            RenderContext.bufferIndex = 1;
        } else {
            RenderContext.bufferIndex = 1;
            RenderContext.antiAliasLoop();
        }
    }

    static antiAliasLoop() {
        RenderContext.bufferIndex = 1 - RenderContext.bufferIndex;
    
        RenderContext.gl.useProgram(RenderContext.textureProgram);
    
        // Bind current buffer
        RenderContext.gl.bindFramebuffer(RenderContext.gl.FRAMEBUFFER, RenderContext.frameBuffers[RenderContext.bufferIndex]);
    
        // Bind current texture
        RenderContext.gl.bindTexture(RenderContext.gl.TEXTURE_2D, RenderContext.textures[1 - RenderContext.bufferIndex]);
    
        // Update uniforms
        pageState.samples++;
        RenderContext.gl.uniform1i(RenderContext.samplesLocation, pageState.samples);
        if (pageState.samples > 1) {
            RenderContext.gl.uniform2f(RenderContext.offsetLocation, Math.random()-0.5, Math.random()-0.5);
        } else {
            RenderContext.gl.uniform2f(RenderContext.offsetLocation, 0, 0);
        }
    
        // Render to texture
        RenderContext.gl.viewport(0, 0, RenderContext.gl.canvas.width, RenderContext.gl.canvas.height);
        RenderContext.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        RenderContext.gl.clear(RenderContext.gl.COLOR_BUFFER_BIT);
        RenderContext.gl.drawArrays(RenderContext.gl.TRIANGLES, 0, 6);
    
        // Unbind framebuffer to render to canvas
        RenderContext.gl.bindFramebuffer(RenderContext.gl.FRAMEBUFFER, null);
    
        // Switch to canvas program
        RenderContext.gl.useProgram(RenderContext.canvasProgram);
    
        // Render to canvas
        RenderContext.gl.bindTexture(RenderContext.gl.TEXTURE_2D, RenderContext.textures[RenderContext.bufferIndex]);
        RenderContext.gl.viewport(0, 0, RenderContext.gl.canvas.width, RenderContext.gl.canvas.height);
        RenderContext.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        RenderContext.gl.clear(RenderContext.gl.COLOR_BUFFER_BIT);
        RenderContext.gl.drawArrays(RenderContext.gl.TRIANGLES, 0, 6);
    
        if (pageState.screenshot) {
            pageState.screenshot = false;
            RenderContext.downloadCanvas();
        }
    
        if (pageState.antiAlias) {
            requestAnimationFrame(RenderContext.antiAliasLoop);
        }
    }
    
    static resize() {
        let prevHeight = UIElements.canvas.height;
        let prevWidth = UIElements.canvas.width;
        if (document.fullscreenElement || (document as any).mozFullScreenElement || (document as any).webkitFullscreenElement) {
            UIElements.canvas.width = screen.width;
            UIElements.canvas.height = screen.height;
            viewportState.width = screen.width;
            viewportState.height = screen.height;
        } else {
            UIElements.canvas.height = UIElements.canvasWrapper.clientHeight * devicePixelRatio;
            UIElements.canvas.width = UIElements.canvasWrapper.clientWidth * devicePixelRatio;
            viewportState.width = UIElements.canvasWrapper.clientWidth * devicePixelRatio;
            viewportState.height = UIElements.canvasWrapper.clientHeight * devicePixelRatio;
        }
    
        if (UIElements.canvas.height != prevHeight || UIElements.canvas.width != prevWidth) {
            this.createTextures();
        }
    }
    
    static createVertex() {
        let raw = getVertex();
        let shader = this.gl.createShader(this.gl.VERTEX_SHADER)!;
        this.gl.shaderSource(shader, raw);
        this.gl.compileShader(shader);
    
        if (this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            return shader;
        }
    
        console.log(`ERROR: ${this.gl.getShaderInfoLog(shader)}`);
        this.gl.deleteShader(shader);
    }
    
    static createFragment() {
        let raw = getFragment();
        let shader = this.gl.createShader(this.gl.FRAGMENT_SHADER)!;
        this.gl.shaderSource(shader, raw);
        this.gl.compileShader(shader);
    
        if (this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            return shader;
        }
    
        console.log(`ERROR: ${this.gl.getShaderInfoLog(shader)}`);
        this.gl.deleteShader(shader);
    }
    
    static createCanvasShader() {
        let raw = getCanvasShader();
        let shader = this.gl.createShader(this.gl.FRAGMENT_SHADER)!;
        this.gl.shaderSource(shader, raw);
        this.gl.compileShader(shader);
    
        if (this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            return shader;
        }
    
        console.log(`ERROR: ${this.gl.getShaderInfoLog(shader)}`);
        this.gl.deleteShader(shader);
    }

    static downloadCanvas() {
        if (!pageState.antiAlias) {
            RenderContext.draw();
        }
        UIElements.canvas.toBlob((blob) => {
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
}