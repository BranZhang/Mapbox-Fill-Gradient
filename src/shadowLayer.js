import vertexShader from './vertex-shader.glsl';
import fragmentShader from './fragment-shader.glsl';

import SkeletonBuilder from 'straight-skeleton';
import {calculateRoundCorner} from './RoundCorner.js';

import flatten from "@turf/flatten";
import dissolve from "@turf/dissolve";
import simplify from "@turf/simplify";

const lightGreen = [0, 0, 0, 0];
const darkGreen = [49/255, 165/255, 0, 0];
const middleGreen = [20/255, 20/255, 20/255, 0.15];

let bufferArray = new BufferArray();

export default class shadowLayer {
    constructor(options) {
        this.id = options.layerId || 'shadow-layer';
        this.type = 'custom';
        this.renderingMode = '3d';
    }

    onAdd(map, gl) {
        this.map = map;
        map.on('moveend', this.updateData.bind(this));
        this.updateData();

        const vert = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vert, vertexShader);
        gl.compileShader(vert);

        const frag = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(frag, fragmentShader);
        gl.compileShader(frag);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vert);
        gl.attachShader(this.program, frag);
        gl.linkProgram(this.program);

        this.u_stroke_width = gl.getUniformLocation(this.program, "u_stroke_width");
        this.u_stroke_colour = gl.getUniformLocation(this.program, "u_stroke_colour");
        this.u_fill_colour = gl.getUniformLocation(this.program, "u_fill_colour");
        this.u_stroke_offset = gl.getUniformLocation(this.program, "u_stroke_offset");
        this.u_inset_width = gl.getUniformLocation(this.program, "u_inset_width");
        this.u_inset_colour = gl.getUniformLocation(this.program, "u_inset_colour");
        this.u_inset_blur = gl.getUniformLocation(this.program, "u_inset_blur");
        this.a_pos = gl.getAttribLocation(this.program, "a_pos");

    }

    render(gl, matrix) {
        gl.useProgram(this.program);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, bufferArray.arrayBuffer, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.a_pos);
        gl.vertexAttribPointer(this.a_pos, 4, gl.FLOAT, false, bufferArray.byteSize, 0);

        gl.uniformMatrix4fv(
            gl.getUniformLocation(this.program, 'u_matrix'),
            false,
            matrix
        );

        gl.uniform1f(this.u_stroke_width, 0);
        gl.uniform4fv(this.u_stroke_colour, darkGreen);
        gl.uniform4fv(this.u_fill_colour, lightGreen);
        gl.uniform1f(this.u_stroke_offset, 0);
        gl.uniform4fv(this.u_inset_colour, middleGreen);
        gl.uniform1f(this.u_inset_width, 0.000001);

        // gl.enable(gl.BLEND);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES, 0, bufferArray.pos / bufferArray.byteSize);
    }

    updateData() {
        this.center = mapboxgl.MercatorCoordinate.fromLngLat(this.map.getCenter());
        try {
            const features = this.map.queryRenderedFeatures(
                {layers: ['water']}
            )

            if (features.length === 0) {
                return;
            }

            const data = dissolve(flatten({
                type: 'FeatureCollection',
                features: features
            }));

            bufferArray = new BufferArray();

            console.log(data);
            data.features.forEach(feature => {
                const coordinates = this.lngLatToMercator(feature.geometry.coordinates);

                coordinates.forEach(cc => {
                    cc.pop();
                })
                console.log(coordinates);

                const skeleton = SkeletonBuilder.BuildFromGeoJSON([coordinates]);
                for (const poly of calculateRoundCorner(skeleton)) {
                    for (const i of poly.indices) {
                        const x = poly.flat[i * 3] / 1000000 + this.center.x;
                        const y = poly.flat[i * 3 + 1] / 1000000 + this.center.y;
                        const d = poly.flat[i * 3 + 2] / 1000000;
                        bufferArray.add(x, y, d || 0);
                    }
                }
            });
        } catch (e) {
            console.log(e);
        }
    }

    lngLatToMercator(coordinates) {
        if (typeof(coordinates[0]) === 'number') {
            const coordinate = mapboxgl.MercatorCoordinate.fromLngLat({
                lng: coordinates[0],
                lat: coordinates[1]
            });
            return [(coordinate.x - this.center.x) * 1000000, (coordinate.y - this.center.y) * 1000000];
        } else {
            return coordinates.map(c => this.lngLatToMercator(c));
        }
    }
}

function BufferArray() {
    this.arrayBuffer = new ArrayBuffer(1024000);
    this.int16 = new Int16Array(this.arrayBuffer);
    this.float32 = new Float32Array(this.arrayBuffer);
    this.pos = 0;
    this.byteSize = 32;
}

BufferArray.prototype.add = function(x, y, dx, dy) {
    this.float32[this.pos / 4 + 0] = x;
    this.float32[this.pos / 4 + 1] = y;
    this.float32[this.pos / 4 + 2] = dx;
    this.pos += this.byteSize;
};
