attribute vec4 a_position;
uniform vec3 u_transform;
uniform float u_aspect;

varying vec2 uv;
varying vec2 pos;
varying float zoom;

void main() {
    gl_Position = a_position;
    uv = vec2(gl_Position.x * u_aspect,gl_Position.y);
    pos = u_transform.xy;
    zoom = u_transform.z;
}