precision highp float;

varying vec2 uv;
varying vec2 pos;
varying float zoom;

const int iterations = 500;
const float e = exp(1.0);
const float pi = 3.141592653589793;

float cosh(float x) {
    return (pow(e,x) + pow(e,-x))/2.0;
}

float sinh(float x) {
    return (pow(e,x) - pow(e,-x))/2.0;
}

float color(float x) {
    return pow(x, 0.5);
}

vec2 csin(vec2 z) {
    return vec2(sin(z.x)*cosh(z.y),cos(z.x)*sinh(z.y));
}

vec2 cs(vec2 z) {
    return vec2(pow(z.x,2.0)-pow(z.y,2.0),2.0*z.x*z.y);
}

void main() {
    // Main fractal loop
    vec2 z = vec2(0.0,0.0);
    vec2 c = uv/zoom + pos;
    float floatIter = float(iterations);
    float iter = floatIter;
    for (int i = 0; i < iterations; i++) {
        if (z.x*z.x + z.y*z.y > 10000.0) {
            iter = float(i);
            break;
        }
        z = csin(z) + c;
        z = vec2(mod(z.x,2.0*pi),z.y);
    }

    // Adjust iterations for smooth coloring
    if (iter != floatIter) {
        float log_zn = log(z.x*z.x+z.y*z.y)/2.0;
        float nu = log(log_zn / log(2.0)) / log(2.0);

        iter = iter + 1.0 - nu;
    }
    
    // HSL to RGB
    vec3 colorHSL = vec3(360.0 * color(iter/floatIter), 1.0, 0.5);
    
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
    
    // Output final color
    gl_FragColor = vec4(col+m, 1.0);
}