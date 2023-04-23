const COLORING_MODES: {[mode: string]: string} = {
    "hue":
        `x = clamp(x,0.0,1.0);
        vec3 hsl = vec3(360.0 * x, 1.0, 0.5);
        return hsltorgb(hsl);`,
    "grayscaleInv":
        `x = clamp(x,0.0,1.0);
        return vec3(x);`,
    "grayscale":
        `x = clamp(x,0.0,1.0);
        return vec3(1.0-x);`,
    "bw":
        `if (x >= 1.0) {
            return vec3(0.0);
        }
        return vec3(1.0);`,
    "bwInv":
        `if (x >= 1.0) {
            return vec3(1.0);
        }
        return vec3(0.0);`,
    "domain":
        `float angle = 180.0/pi * atan(x.y,x.x);
        angle = mod(angle,360.0);
        vec3 hsl = vec3(angle, 1.0, 0.5);
        return hsltorgb(hsl);`
};

function recursiveDecompose(node: ParseNode): string {
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
            return recursiveDecompose(node.left) + node.operator + recursiveDecompose(node.right);
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
    }
    if (node instanceof OneOperatorNode) {
        return `c${node.operator}(${recursiveDecompose(node.value)})`;
    }
    if (node instanceof VariableNode) {
        return node.value;
    }
    throw new Error("WebGL Error: Unknown node type");
}

function getFragment(ast: ParseNode, iterations: number, breakout: number, coloring: string): string {
    let functionString = recursiveDecompose(ast);
    return `precision highp float;
    uniform vec3 u_transform;

    varying vec2 uv;
    varying vec2 pos;
    varying float zoom;
    
    const int iterations = ${iterations};
    const float e = exp(1.0);
    const float pi = 3.141592653589793;

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
        } else if (h1 < 6.0) {
            col = vec3(chroma,0.0,x);
        }
        
        vec3 m = vec3(colorHSL.z-chroma/2.0);
        
        return vec3(col+m);
    }
    
    float cosh(float x) {
        return (pow(e,x) + pow(e,-x))/2.0;
    }
    
    float sinh(float x) {
        return (pow(e,x) - pow(e,-x))/2.0;
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
        float angle = n*atan(z.y,z.x);
        return pow(length(z),n)*vec2(cos(angle),sin(angle));
    }

    vec2 cln(vec2 z) {
        return vec2(log(length(z)),atan(z.y,z.x));
    }

    vec2 cabs(vec2 z) {
        return vec2(length(z),0.0);
    }

    vec2 carg(vec2 z) {
        return vec2(atan(z.y,z.x),0);
    }

    vec2 cexp(vec2 z) {
        return exp(z.x)*vec2(cos(z.y),sin(z.y));
    }

    vec2 cpow(vec2 z1, vec2 z2) {
        if (z1 == vec2(0.0,0.0)) {
            if (z2.x == 0.0) {
                float nan = 0.0/0.0;
                return vec2(nan, nan);
            }
            if (z2.x < 0.0) {
                float infinity = 1.0/0.0;
                return vec2(infinity, infinity);
            }
            return vec2(0.0, 0.0);
        }
        return cexp(cm(z2,cln(z1)));
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

    vec2 csqrt(vec2 z) {
        float angle = 0.5*atan(z.y,z.x);
        return pow(z.x*z.x+z.y*z.y,0.25)*vec2(cos(angle),sin(angle));
    }

    vec2 f(vec2 z, vec2 c) {
        return ${functionString};
    }
    
    vec3 color(${coloring !== "domain" ? "float" : "vec2"} x) {
        //x = pow(x,0.5);
        ${COLORING_MODES[coloring]}
    }
    
    void main() {
        // Main fractal loop
        vec2 z = vec2(0.0,0.0);
        vec2 c = uv/u_transform.z + u_transform.xy;
        float floatIter = float(iterations);
        float iter = floatIter;
        for (int i = 0; i < iterations; i++) {
            ${coloring !== "domain" ?
                    `if (z.x*z.x + z.y*z.y > ${breakout.toFixed(2)}) {
                        iter = float(i);
                        break;
                    }` : ""
            }
            z = f(z, c);
        }
    
        // Adjust iterations for smooth coloring
        if (iter != floatIter) {
            float log_zn = log(z.x*z.x+z.y*z.y)/2.0;
            float nu = log(log_zn / log(2.0)) / log(2.0);
    
            iter = iter + 1.0 - nu;
        }
        
        // Output final color
        gl_FragColor = vec4(color(${coloring !== "domain" ? "iter/floatIter" : "z"}), 1.0);
    }`;
}

function getVertex(): string {
    return `attribute vec4 a_position;
    uniform float u_aspect;
    
    varying vec2 uv;
    
    void main() {
        gl_Position = a_position;
        uv = vec2(gl_Position.x * u_aspect,gl_Position.y);
    }`;
}