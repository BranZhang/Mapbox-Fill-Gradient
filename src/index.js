import './base.css';

import SkeletonBuilder from 'straight-skeleton';
import {calculateRoundCorner} from './RoundCorner.js';

import vertexShader from './vertex-shader.glsl';
import fragmentShader from './fragment-shader.glsl';

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
    this.float32[this.pos / 4 + 2] = dx;//dx / 100000000;
    //this.float32[this.pos / 4 + 3] = dy;
    this.pos += this.byteSize;
};

const lightGreen = [167/255, 255/255, 130/255,1];
const darkGreen = [49/255, 165/255, 0, 1];
const middleGreen = [79/255, 224/255, 17/255, 1];
let offset = 0;
let bufferArray;


const canvas1 = document.getElementById('canvas1');
const ctx = canvas1.getContext('2d');

canvas1.width = 800;
canvas1.height = 400;

const canvas2 = document.getElementById('canvas2');
canvas2.width = 800;
canvas2.height = 400;

const gl = canvas2.getContext('webgl', { antialias: true });
const program = gl.createProgram();

const points = [
    [135, 99],
    [647, 107],
    [300, 209],
    [590, 304],
    [120, 295]
];
const holes = [[]];
let activeHoleId = 0;
let holeMode = false;

const drawCircle = (x, y, radius) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fill();
}

const drawEdgeResult = (res) => {
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.fillStyle = '#d0d';

    ctx.moveTo(res.Polygon[0].X, res.Polygon[0].Y);

    for (const v of res.Polygon) {
        ctx.lineTo(v.X, v.Y);
    }

    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;

    ctx.moveTo(res.Polygon[0].X, res.Polygon[0].Y);

    for (const v of res.Polygon) {
        ctx.lineTo(v.X, v.Y);
    }

    ctx.closePath();
    ctx.stroke();
}

const drawRoundCorner = (output) => {
    bufferArray = new BufferArray();

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0,1,1,1);
    gl.clearColor(1,1,1,1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const vert = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vert, vertexShader);
    gl.compileShader(vert);
    console.log(gl.getShaderInfoLog(vert));

    const frag = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(frag, fragmentShader);
    gl.compileShader(frag);
    console.log(gl.getShaderInfoLog(frag));

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    gl.useProgram(program);

    for (const poly of output) {
        for (const i of poly.indices) {
            const x = poly.flat[i * 3];
            const y = poly.flat[i * 3 + 1];
            const d = poly.flat[i * 3 + 2];
            bufferArray.add(x, y, d || 0);
        }
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, bufferArray.arrayBuffer, gl.STATIC_DRAW);

    program.u_stroke_width = gl.getUniformLocation(program, "u_stroke_width");
    program.u_stroke_colour = gl.getUniformLocation(program, "u_stroke_colour");
    program.u_fill_colour = gl.getUniformLocation(program, "u_fill_colour");
    program.u_stroke_offset = gl.getUniformLocation(program, "u_stroke_offset");
    program.u_inset_width = gl.getUniformLocation(program, "u_inset_width");
    program.u_inset_colour = gl.getUniformLocation(program, "u_inset_colour");
    program.u_inset_blur = gl.getUniformLocation(program, "u_inset_blur");
    program.a_pos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(program.a_pos);
    gl.vertexAttribPointer(program.a_pos, 4, gl.FLOAT, false, bufferArray.byteSize, 0);

    render();
}

function render() {
    gl.uniform1f(program.u_stroke_width, 10);
    gl.uniform4fv(program.u_stroke_colour, darkGreen);
    gl.uniform4fv(program.u_fill_colour, lightGreen);
    gl.uniform1f(program.u_stroke_offset, offset);
    gl.uniform4fv(program.u_inset_colour, middleGreen);
    gl.uniform1f(program.u_inset_width, 60);
    gl.drawArrays(gl.TRIANGLES, 0, bufferArray.pos / bufferArray.byteSize);
};

const drawPointsAndHoles = () => {
    ctx.fillStyle = '#333';

    for (const point of points) {
        drawCircle(point[0] + 0.5, point[1] + 0.5, 4);
    }

    for (const hole of holes) {
        for (const point of hole) {
            drawCircle(point[0] + 0.5, point[1] + 0.5, 4);
        }
    }
}

const rebuildSkeleton = (roundCorner = false) => {
    ctx.clearRect(0, 0, canvas1.width, canvas1.height);

    if (points.length > 2) {
        let skeleton;

        try {
            skeleton = SkeletonBuilder.BuildFromGeoJSON([[
                points,
                ...(holes.filter(hole => hole.length > 2))
            ]]);
        } catch (e) {
            console.error(e);
        }

        if (skeleton) {
            for (const edgeRes of skeleton.Edges) {
                drawEdgeResult(edgeRes);
            }
            if (roundCorner) {
                drawRoundCorner(calculateRoundCorner(skeleton));
            }
        }
    }

    drawPointsAndHoles();
};

canvas1.addEventListener('pointerdown', e => {
    const x = e.offsetX * canvas1.width / canvas1.clientWidth;
    const y = e.offsetY * canvas1.height / canvas1.clientHeight;

    if (!holeMode) {
        points.push([x, y]);
    } else {
        const currentHole = holes[activeHoleId];

        if (currentHole.length > 2 && Math.hypot(currentHole[0][0] - x, currentHole[0][1] - y) < 5) {
            activeHoleId++;
            holes[activeHoleId] = [];
        } else {
            holes[activeHoleId].push([x, y]);
        }
    }

    rebuildSkeleton();
});

const buttonInner = document.getElementById('button-inner');
const buttonOuter = document.getElementById('button-outer');
const buttonClear = document.getElementById('button-clear');
const buttonRound = document.getElementById('button-round');

buttonClear.addEventListener('click', () => {
    points.length = 0;
    holes.length = 0;
    holes.push([]);

    activeHoleId = 0;

    rebuildSkeleton();
});

buttonRound.addEventListener('click', () => {
    rebuildSkeleton(true);
});

buttonInner.addEventListener('click', () => {
    holeMode = true;

    buttonInner.disabled = true;
    buttonOuter.disabled = false;
});

buttonOuter.addEventListener('click', () => {
    holeMode = false;

    buttonInner.disabled = false;
    buttonOuter.disabled = true;
});

buttonInner.disabled = false;
buttonOuter.disabled = true;

rebuildSkeleton();
