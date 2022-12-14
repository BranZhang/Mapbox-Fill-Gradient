varying highp float v_distance;

uniform highp float u_stroke_width;
uniform highp vec4 u_stroke_colour;
uniform highp vec4 u_fill_colour;
uniform highp float u_stroke_offset;
uniform highp vec4 u_inset_colour;
uniform highp float u_inset_width;

void main(void) {
    highp float inset_dist = (u_inset_width - v_distance) / u_inset_width;
    highp float inset_alpha = clamp(min(1.0, smoothstep(0.0, 1.5, inset_dist)), 0.0, 1.0);

    highp float fill_alpha = clamp(sign(v_distance + u_stroke_offset) - inset_alpha, 0.0, 1.0);
    gl_FragColor = u_inset_colour * inset_alpha + u_fill_colour * fill_alpha;
//    gl_FragColor = vec4(v_distance / 200.0 + 0.5,0.0,0.0,1.0);
}
