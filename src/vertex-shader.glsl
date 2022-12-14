uniform mat4 u_matrix;
attribute vec4 a_pos;

varying float v_distance;

void main(void) {
    gl_Position = u_matrix * vec4(a_pos.xy, 0.0, 1.0);
    v_distance = a_pos[2];
}
