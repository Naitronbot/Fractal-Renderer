import { ParseNode, NumberNode, OneOperatorNode, TwoOperatorNode, VariableNode } from "parser";
import { expressionState } from "state";

export function recursiveDecompose(node: ParseNode): string {
    if (node instanceof NumberNode) {
        if (node.value === "i") {
            return "vec2(0.0,1.0)";
        }
        if (node.value === "e") {
            return "vec2(e,0.0)";
        }
        if (node.value === "\\pi") {
            return "vec2(pi,0.0)";
        }
        if (node.value.includes(".")) {
            return `vec2(${node.value},0.0)`;
        }
        return `vec2(${node.value}.0,0.0)`;
    }
    if (node instanceof TwoOperatorNode) {
        if (node.operator === "+" || node.operator === "-") {
            return `(${recursiveDecompose(node.left)}) ${node.operator} (${recursiveDecompose(node.right)})`;
        }
        if (node.operator === "*") {
            return `cm(${recursiveDecompose(node.left)},${recursiveDecompose(node.right)})`;
        }
        if (node.operator === "/") {
            return `cd(${recursiveDecompose(node.left)},${recursiveDecompose(node.right)})`;
        }
        if (node.operator === "^") {
            return `cpow(${recursiveDecompose(node.left)},${recursiveDecompose(node.right)})`;
        }
        if (node.operator === "log") {
            return `clog(${recursiveDecompose(node.left)},${recursiveDecompose(node.right)})`;
        }
    }
    if (node instanceof OneOperatorNode) {
        return `c${node.operator}(${recursiveDecompose(node.value)})`;
    }
    if (node instanceof VariableNode) {
        if (node.userDefined) {
            return "u_" + node.value;   
        }
        return node.value;
    }
    throw new Error("WebGL Error: Unknown node type");
}

export function getFragment(): string {
    let functionString = recursiveDecompose(expressionState.ast!);
    return `#version 300 es
    precision highp float;
    uniform int u_iterations;
    uniform int u_toggles;
    uniform int u_color;
    uniform float u_breakout;
    uniform float u_bias;
    uniform int u_domain;
    uniform float u_hueShift;
    uniform int u_samples;
    uniform vec2 u_resolution;
    uniform float u_angle;
    uniform vec3 u_transform;
    uniform sampler2D u_texture;
    uniform vec2 u_offset;

    ${(() => {
        let unif = "";
        for (let uni of expressionState.userVars.values()) {
            unif += `uniform vec2 u_${uni};\n`;
        }
        return unif;
    })()}
    
    in vec2 uv;
    out vec4 fragColor;

    const float e = exp(1.0);
    const float pi = 3.141592653589793;
    const float phaseLines = 8.0;

    vec3 hsltorgb(vec3 colorHSL) {        
        float chroma = (1.0-abs(2.0*colorHSL.z-1.0)) * colorHSL.y;
        
        float h1 = colorHSL.x/60.0;
        
        float x = chroma * (1.0 - abs(mod(h1,2.0)-1.0));
        
        vec3 col = vec3(0.0,0.0,0.0);
        
        if (h1 < 1.0) {
            col = vec3(chroma,x,0.0);
        } else if (h1 < 2.0) {
            col = vec3(x,chroma,0.0);
        } else if (h1 < 3.0) {
            col = vec3(0.0,chroma,x);
        } else if (h1 < 4.0) {
            col = vec3(0.0,x,chroma);
        } else if (h1 < 5.0) {
            col = vec3(x,0.0,chroma);
        } else if (h1 <= 7.0) {
            col = vec3(chroma,0.0,x);
        }
        
        vec3 m = max(vec3(colorHSL.z-chroma/2.0),0.0);
        
        return vec3(col+m);
    }

    vec2 cm(vec2 z1, vec2 z2) {
        return vec2(z1.x*z2.x-z1.y*z2.y,z1.y*z2.x+z1.x*z2.y);
    }

    vec2 cd(vec2 z1, vec2 z2) {
        return vec2(z1.x*z2.x+z1.y*z2.y,-z1.x*z2.y+z1.y*z2.x)/(z2.x*z2.x + z2.y*z2.y);
    }

    vec2 cs(vec2 z) {
        return vec2(z.x*z.x-z.y*z.y,2.0*z.x*z.y);
    }

    vec2 cpow1(float n, vec2 z) {
        float angle = z.y*log(n);
        return pow(n,z.x)*vec2(cos(angle),sin(angle));
    }

    vec2 cpow2(vec2 z, float n) {
        if (z.x == 0.0) {
            float angle = (z.y >= 0.0) ? pi/2.0 : -pi/2.0;
            return pow(length(z),n)*vec2(cos(n*angle),sin(n*angle));
        }
        float angle = n*atan(z.y,z.x);
        return pow(length(z),n)*vec2(cos(angle),sin(angle));
    }

    vec2 cln(vec2 z) {
        if (z.x == 0.0) {
            float angle = (z.y >= 0.0) ? pi/2.0 : -pi/2.0;
            return vec2(log(length(z)), angle);
        }
        return vec2(log(length(z)),atan(z.y,z.x));
    }

    vec2 clog(vec2 z, vec2 b) {
        return cd(cln(z),cln(b));
    }

    vec2 cabs(vec2 z) {
        return vec2(length(z),0.0);
    }

    vec2 carg(vec2 z) {
        if (z.x == 0.0) {
            float angle = (z.y >= 0.0) ? pi/2.0 : -pi/2.0;
            return vec2(angle,0);
        }
        return vec2(atan(z.y,z.x),0);
    }

    vec2 csign(vec2 z) {
        if (z == vec2(0.0,0.0)) {
            return z;
        }
        return z/length(z);
    }

    vec2 csgn(vec2 z) {
        return csign(z);
    }

    vec2 cexp(vec2 z) {
        return exp(z.x)*vec2(cos(z.y),sin(z.y));
    }

    vec2 ccis(vec2 z) {
        return cexp(vec2(-z.y,z.x));
    }

    vec2 cpow(vec2 z1, vec2 z2) {
        if (abs(z2.y) < 1e-07) {
            return cpow2(z1,z2.x);
        }
        //if (abs(z1.y) < 1e-07) {
        //    return cpow1(z1.x,z2);
        //}

        if (z1 == vec2(0.0,0.0)) {
            if (z2.x == 0.0) {
                return vec2(1.0,0.0);
            }
            if (z2.x < 0.0) {
                float infinity = 1.0/max(z2.x, 0.0);
                return vec2(infinity, infinity);
            }
            return vec2(0.0, 0.0);
        }
        return cexp(cm(z2,cln(z1)));
    }

    vec2 csqrt(vec2 z) {
        if (z.x == 0.0) {
            float angle = (z.y >= 0.0) ? pi/2.0 : -pi/2.0;
            return pow(z.x*z.x+z.y*z.y,0.25)*vec2(cos(angle),sin(angle));
        }
        float angle = 0.5*atan(z.y,z.x);
        return pow(z.x*z.x+z.y*z.y,0.25)*vec2(cos(angle),sin(angle));
    }

    // Non algebraic functions

    vec2 cfloor(vec2 z) {
        return floor(z);
    }

    vec2 cround(vec2 z) {
        return floor(z+vec2(0.5));
    }

    vec2 cceil(vec2 z) {
        return ceil(z);
    }

    vec2 cRe(vec2 z) {
        return vec2(z.x, 0.0);
    }

    vec2 cIm(vec2 z) {
        return vec2(z.y, 0.0);
    }

    vec2 cconj(vec2 z) {
        return vec2(z.x,-z.y);
    }

    // Trigonometric functions
    
    vec2 csin(vec2 z) {
        return vec2(sin(z.x)*cosh(z.y),cos(z.x)*sinh(z.y));
    }
    
    vec2 ccos(vec2 z) {
        return vec2(cos(z.x)*cosh(z.y),-sin(z.x)*sinh(z.y));
    }

    vec2 ctan(vec2 z) {
        return cd(csin(z),ccos(z));
    }

    vec2 ccot(vec2 z) {
        return cd(ccos(z),csin(z));
    }

    vec2 csec(vec2 z) {
        return cd(vec2(1.0,0.0), ccos(z));
    }

    vec2 ccsc(vec2 z) {
        return cd(vec2(1.0,0.0), csin(z));
    }

    // Hyperbolic trig

    vec2 csinh(vec2 z) {
        return vec2(sinh(z.x)*cos(z.y),cosh(z.x)*sin(z.y));
    }

    vec2 ccosh(vec2 z) {
        return vec2(cosh(z.x)*cos(z.y),sinh(z.x)*sin(z.y));
    }

    vec2 ctanh(vec2 z) {
        return cd(csinh(z),ccosh(z));
    }

    vec2 ccoth(vec2 z) {
        return cd(ccosh(z),csinh(z));
    }

    vec2 csech(vec2 z) {
        return cd(vec2(1.0,0.0), ccosh(z));
    }

    vec2 ccsch(vec2 z) {
        return cd(vec2(1.0,0.0), csinh(z));
    }

    // Inverse Trig

    vec2 carcsin(vec2 z) {
        return cm(cd(vec2(1.0,0.0),vec2(0.0,1.0)),cln(cm(z,vec2(0.0,1.0))+cm(cpow2(cabs(vec2(1.0,0.0)-cs(z)),0.5),cexp(cm(vec2(0.0,0.5),carg(vec2(1.0,0.0)-cs(z)))))));
    }

    vec2 carccos(vec2 z) {
        return cm(cd(vec2(1.0,0.0),vec2(0.0,1.0)),cln(z+cm(vec2(0.0,1.0),cm(cpow2(cabs(vec2(1.0,0.0)-cs(z)),0.5),cexp(cm(vec2(0.0,0.5),carg(vec2(1.0,0.0)-cs(z))))))));
    }

    vec2 carctan(vec2 z) {
        return cm(cd(vec2(1.0,0.0),vec2(0.0,2.0)),cln(cd(vec2(0.0,1.0)-z,vec2(0.0,1.0)+z)));
    }

    vec2 carccot(vec2 z) {
        return cm(cd(vec2(1.0,0.0),vec2(0.0,2.0)),cln(cd(z+vec2(0.0,1.0),z-vec2(0.0,1.0))));
    }

    vec2 carcsec(vec2 z) {
        return carccos(cd(vec2(1.0,0.0),z));
    }

    vec2 carccsc(vec2 z) {
        return carcsin(cd(vec2(1.0,0.0),z));
    }

    // Inverse Hyperbolic Trig

    vec2 carcsinh(vec2 z) {
        vec2 zSquared = cpow2(z,2.0);
        return cln(z+cm(csqrt(cabs(vec2(1.0,0.0) + zSquared)),cexp(vec2(0.0,0.5*carg(vec2(1.0,0.0) + zSquared)))));
    }

    vec2 carccosh(vec2 z) {
        vec2 zSquared = cpow2(z,2.0);
        return cln(z+cm(csqrt(cabs(zSquared - vec2(1.0,0.0))),cexp(vec2(0.0,0.5*carg(zSquared - vec2(1.0,0.0))))));
    }

    vec2 carctanh(vec2 z) {
        return 0.5*cln(cd(vec2(1.0,0.0) + z,vec2(1.0,0.0) - z));
    }

    vec2 carccoth(vec2 z) {
        return 0.5*cln(cd(z + vec2(1.0,0.0),z - vec2(1.0,0.0)));
    }

    vec2 carcsech(vec2 z) {
        return carccosh(cd(vec2(1.0,0.0),z));
    }

    vec2 carccsch(vec2 z) {
        return carcsinh(cd(vec2(1.0,0.0),z));
    }

    float p[9] = float[9](0.99999999999980993,676.5203681218851,-1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7);
    const float epsilon = 1e-07;
    vec2 cGamma2(vec2 z) {
        z = z - vec2(1.0,0.0);
        vec2 x = vec2(p[0],0.0);
        if (x.y < -1.0) {
            return vec2(0.0);
        }
        for (int i = 1; i < 9; i++) {
            x += cd(vec2(p[i],0.0),z + vec2(i,0.0));
        }
        vec2 t = z + vec2(7.5,0.0);
        vec2 y = sqrt(2.0*pi) * cm(cm(cpow(t,z+vec2(0.5,0.0)), cexp(-t)), x);

        if (abs(y.y) <= epsilon) {
            y = vec2(y.x,0.0);
        }
        return y;
    }
    vec2 cGamma(vec2 z) {
        if (z.x < 0.5) {
            return cd(vec2(pi,0.0), cm(csin(pi*z), cGamma2(vec2(1.0,0.0) - z)));
        }
        return cGamma2(z);
    }

    vec2 func(vec2 z, vec2 c) {
        return ${functionString};
    }
    
    vec3 color(float iter, float totalIter) {
        float x;
        if (iter >= totalIter && u_color != 10) {
            x = 1.0;
        } else {
            x = iter/totalIter;
        }
        float shift = u_hueShift;
        
        if (u_color == 1) {
            if (x >= 1.0 || x <= 0.0) {
                return vec3(0.0);
            }
            x = pow(x,pow(1.1,u_bias));
            float angle = mod(360.0 * x + shift, 360.0);
            vec3 hsl = vec3(angle, 1.0, 0.5);
            return hsltorgb(hsl);
        }
        if (u_color == 3) {
            x = clamp(x,0.0,1.0);
            x = pow(x,pow(1.1,u_bias));
            return vec3(1.0-x);
        }
        if (u_color == 4) {
            x = clamp(x,0.0,1.0);
            x = pow(x,pow(1.1,u_bias));
            return vec3(x);
        }
        if (u_color == 5) {
            x = clamp(x,0.0,1.0);
            x = pow(x,pow(1.1,u_bias));
            return vec3(0.706+x*0.294,0.690+x*0.310,1.0);
        }
        if (u_color == 6) {
            x = clamp(x,0.0,1.0);
            x = pow(x,pow(1.1,u_bias));
            x = 1.0-x;
            return vec3(0.706+x*0.294,0.690+x*0.310,1.0);
        }
        if (u_color == 7) {
            if (x >= 1.0) {
                return vec3(0.0);
            }
            return vec3(1.0);
        }
        if (u_color == 8) {
            if (x >= 1.0) {
                return vec3(1.0);
            }
            return vec3(0.0);
        }
        if (u_color == 9) {
            x = clamp(x,0.0,1.0);
            x = pow(x,pow(1.1,u_bias));
            return vec3(x*0.176,x*0.439,x*0.702);
        }
        if (u_color == 10) {
            x = mod(x,1.0);
            if (x >= 1.0 || x <= 0.0) {
                return vec3(0.0);
            }
            x = pow(x,pow(1.1,u_bias));
            float angle = mod(360.0 * x + shift, 360.0);
            vec3 hsl = vec3(angle, 1.0, 0.5);
            return hsltorgb(hsl);
        }
    }

    vec3 domain(vec2 z) {
        if (isnan(z.x) || isnan(z.y)) {
            return vec3(0.0);
        }

        float shift = u_hueShift;
        float mag = length(z);
        float angle;
        angle = 180.0/pi * atan(z.y,z.x) + shift;
        angle = mod(angle,360.0);
        vec3 hsl = vec3(angle, 1.0, 0.5);
        if ((u_toggles&4) == 4) {
            hsl.z = 2.0/pi * atan(mag);
        }

        float phaseConst;
        float magConst;
        if ((u_domain&1) == 1) {
            phaseConst = (phaseLines/(2.0*pi))*mod(mod(carg(z).x,pi*2.0),pi/phaseLines)+0.5;
        } else {
            phaseConst = 1.0;
        }
        
        if ((u_domain&2) == 2) {
            float slope = 1.0/pow(2.0,floor(log(mag)/log(2.0)));
            magConst = (slope*mag-floor(slope*mag))/2.0+0.5;
        } else {
            magConst = 1.0;
        }

        return (magConst+phaseConst)/2.0*hsltorgb(hsl);
    }

    vec4 mainLoop(vec2 c) {
        // Main fractal loop
        vec2 z;

        if ((u_toggles&1) == 1) {
            z = c;
        } else {
            z = vec2(0.0);
        }
        int totalIter = u_iterations;
        int iter = totalIter;
        float dist = 0.0;
        if (u_color == 2) {
            for (int i = 0; i < u_iterations; i++) {
                z = func(z, c);
            }
        } else if (u_color == 10) {
            vec2 lastIter;
            for (int i = 0; i < u_iterations; i++) {
                if (length(z) > u_breakout) {
                    iter = i;
                    break;
                }
                lastIter = z;
                z = func(z, c);
                if (isnan(z.x) || isnan(z.y)) {
                    iter = i;
                    z = lastIter;
                    break;
                }
                dist += length(z-lastIter);
            }
        } else {
            vec2 prevZ;
            for (int i = 0; i < u_iterations; i++) {
                if (length(z) > u_breakout) {
                    iter = i;
                    break;
                }
                prevZ = z;
                z = func(z, c);
                if (isnan(z.x) || isnan(z.y)) {
                    iter = i;
                    z = prevZ;
                    break;
                }
            }
        }

        float floatIterTotal = float(totalIter);
        float floatIter = float(iter);

        if ((u_toggles&2) == 2 && floatIter != floatIterTotal) {
            float log_zn = log(z.x*z.x+z.y*z.y)/2.0;
            float nu = log(log_zn / log(2.0)) / log(2.0);
    
            floatIter = floatIter + 1.0 - nu;
        }
        
        // Output final color
        if (u_color == 2) {
            return vec4(domain(z), 1.0);
        } else if (u_color == 10) {
            return vec4(color(dist, floatIter), 1.0);
        } else {
            return vec4(color(floatIter, floatIterTotal), 1.0);
        }
    }
    
    void main() {
        vec2 pos = 2.0*(gl_FragCoord.xy+u_offset)/u_resolution-1.0;
        vec2 c;
        float aspect = u_resolution.x/u_resolution.y;
        
        c = vec2(pos.x * (aspect),pos.y);
        // Fad mode
        if (abs(u_angle) > 0.0) {
            c = vec2(c.x*cos(u_angle) - c.y*sin(u_angle),c.x*sin(u_angle) + c.y*cos(u_angle));
        }

        c = c/u_transform.z + u_transform.xy;

        if (u_samples == 1) {
            fragColor = mainLoop(c);
        } else {
            fragColor = pow((pow(texture(u_texture, uv),vec4(2.2)) * float(u_samples-1) + pow(mainLoop(c),vec4(2.2)))/float(u_samples),vec4(1.0/2.2));
        }
    }`;
}

export function getVertex(): string {
    return `#version 300 es
    in vec4 a_position;
    out vec2 uv;
    
    void main() {
        gl_Position = a_position;
        uv = 0.5*a_position.xy+0.5;
    }`;
}

export function getCanvasShader(): string {
    return `#version 300 es
    precision highp float;

    uniform sampler2D u_texture;

    in vec2 uv;
    out vec4 fragColor;
    
    void main() {
        fragColor = texture(u_texture,uv);
    }`;
}