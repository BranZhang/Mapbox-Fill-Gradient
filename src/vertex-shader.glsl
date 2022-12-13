attribute vec4 a_pos;

varying float v_distance;

void main(void) {
    gl_Position = vec4(a_pos.x / 400.0 - 1.0, a_pos.y / 200.0 * -1.0 + 1.0, 0.0, 1.0);
    v_distance = a_pos[2];
}
