import vertexShader from './vertex-shader.glsl';
import fragmentShader from './fragment-shader.glsl';

import SkeletonBuilder from 'straight-skeleton';
import {calculateRoundCorner} from './RoundCorner.js';

import flatten from "@turf/flatten";
import dissolve from "@turf/dissolve";
import simplify from "@turf/simplify";

const data = [[116.3672,34.6289],[116.4551,34.8926],[116.8066,34.9365],[117.2461,34.4531],[117.334,34.585],[117.5977,34.4531],[117.9492,34.6729],[118.125,34.6289],[118.2129,34.4092],[118.3887,34.4092],[118.4766,34.6729],[118.7402,34.7168],[118.916,35.0244],[119.2676,35.1123],[119.3555,35.0244],[119.3555,34.8486],[119.707,34.585],[120.3223,34.3652],[120.9375,33.0469],[121.0254,32.6514],[121.377,32.4756],[121.4648,32.168],[121.9043,31.9922],[121.9922,31.6846],[121.9922,31.5967],[121.2012,31.8604],[121.1133,31.7285],[121.377,31.5088],[121.2012,31.4648],[120.9375,31.0254],[120.498,30.8057],[119.9707,31.1572],[119.6191,31.1133],[119.4434,31.1572],[119.3555,31.2891],[118.8281,31.2451],[118.7402,31.377],[118.916,31.5527],[118.3887,31.9482],[118.4766,32.168],[118.6523,32.2119],[118.5645,32.5635],[119.1797,32.4756],[119.1797,32.8271],[118.916,32.959],[118.7402,32.7393],[118.3008,32.7832],[118.2129,33.2227],[118.0371,33.1348],[117.9492,33.2227],[118.125,33.75],[117.7734,33.7061],[117.5977,34.0137],[117.1582,34.0576],[116.8945,34.4092]];
const lightGreen = [0, 0, 0, 0];
const darkGreen = [49/255, 165/255, 0, 0];
const middleGreen = [79/255, 224/255, 17/255, 1];

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


        // const skeleton = SkeletonBuilder.BuildFromGeoJSON([[
        //    data.map(c => {
        //        const coordinate = mapboxgl.MercatorCoordinate.fromLngLat({
        //            lng: c[0],
        //            lat: c[1]
        //        });
        //        return [coordinate.x * 100, coordinate.y * 100];
        //    })
        // ]]);
        //
        // for (const poly of calculateRoundCorner(skeleton)) {
        //     for (const i of poly.indices) {
        //         const x = poly.flat[i * 3] / 100;
        //         const y = poly.flat[i * 3 + 1] / 100;
        //         const d = poly.flat[i * 3 + 2];
        //         bufferArray.add(x, y, d || 0);
        //     }
        // }

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, bufferArray.arrayBuffer, gl.STATIC_DRAW);

        this.u_stroke_width = gl.getUniformLocation(this.program, "u_stroke_width");
        this.u_stroke_colour = gl.getUniformLocation(this.program, "u_stroke_colour");
        this.u_fill_colour = gl.getUniformLocation(this.program, "u_fill_colour");
        this.u_stroke_offset = gl.getUniformLocation(this.program, "u_stroke_offset");
        this.u_inset_width = gl.getUniformLocation(this.program, "u_inset_width");
        this.u_inset_colour = gl.getUniformLocation(this.program, "u_inset_colour");
        this.u_inset_blur = gl.getUniformLocation(this.program, "u_inset_blur");
        this.a_pos = gl.getAttribLocation(this.program, "a_pos");
        gl.enableVertexAttribArray(this.a_pos);
        gl.vertexAttribPointer(this.a_pos, 4, gl.FLOAT, false, bufferArray.byteSize, 0);
    }

    render(gl, matrix) {
        gl.useProgram(this.program);

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
        gl.uniform1f(this.u_inset_width, 0.05);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES, 0, bufferArray.pos / bufferArray.byteSize);
    }

    updateData() {
        try {
            const features = this.map.queryRenderedFeatures(
                {layers: ['water']}
            )
            const data = dissolve(flatten(simplify({
                type: 'FeatureCollection',
                features: features
            }, {
                tolerance: 0.0005
            })));

            bufferArray = new BufferArray();

            console.log(data);
            data.features.forEach(feature => {
                const coordinates = this.lngLatToMercator(feature.geometry.coordinates);

                coordinates.forEach(cc => {
                    cc.pop();
                    cc.reverse();
                })
                console.log(coordinates);

                const ss = new StraightSkeleton();
                ss.execute(coordinates[0], []);
                console.log(ss);

                const skeleton = SkeletonBuilder.BuildFromGeoJSON([[coordinates[0]]]);
                for (const poly of calculateRoundCorner(skeleton)) {
                    for (const i of poly.indices) {
                        const x = poly.flat[i * 3] / 1000000;
                        const y = poly.flat[i * 3 + 1] / 1000000;
                        const d = poly.flat[i * 3 + 2];
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
            return [coordinate.x * 1000000, coordinate.y * 1000000];
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
