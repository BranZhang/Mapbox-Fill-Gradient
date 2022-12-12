import './base.css';

import SkeletonBuilder from 'straight-skeleton';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 800;

const points = [
    [100, 100],
    [600, 100],
    [600, 500],
    [350, 400],
    [100, 400],
];
const holes = [[]];
let activeHoleId = 0;
let holeMode = false;

ctx.translate(0.5, 0.5);

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

const drawPointsAndHoles = () => {
    ctx.fillStyle = '#333';

    for (const point of points) {
        drawCircle(point[0] + 0.5, point[1] + 0.5, 2);
    }

    for (const hole of holes) {
        for (const point of hole) {
            drawCircle(point[0] + 0.5, point[1] + 0.5, 2);
        }
    }
}

const rebuildSkeleton = (roundCorner = false) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
            if (roundCorner) {
                skeleton.calculateRoundCorner();
            }
            for (const edgeRes of skeleton.Edges) {
                drawEdgeResult(edgeRes);
            }
        }
    }

    drawPointsAndHoles();
};

canvas.addEventListener('pointerdown', e => {
    const x = e.offsetX * canvas.width / canvas.clientWidth;
    const y = e.offsetY * canvas.height / canvas.clientHeight;

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
