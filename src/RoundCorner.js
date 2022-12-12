import {Point, Vector, Line, Polygon, Multiline} from '@flatten-js/core';

function calculateRoundCorner(skeleton) {
    // traverse every edge of original Polygon.
    for (let {Edge: e, Polygon: p} of skeleton.Edges) {
        for (let i = 0; i < p.length - 1; i++) {
            if (skeleton.Distances.get(p[i]) === 0 && skeleton.Distances.get(p[i + 1]) === 0) {
                // this edge is coming from original Polygon.

                const cutLines = [];

                const previous = i > 0 ? p[i - 1] : p[p.length - 1];
                const next = i + 1 < p.length - 1 ? p[i + 2] : p[0];
                if (p[i + 1].Sub(p[i]).Dot(previous.Sub(p[i])) < 0) {
                    // create a new line perpendicular to this edge
                    // !! the definition of Norm in 'straight-skeleton' is different from 'flatten-js'.
                    cutLines.push(new Line(new Point(p[i].X, p[i].Y), new Vector(e.Norm.X, e.Norm.Y)));
                }
                if (p[i].Sub(p[i + 1]).Dot(next.Sub(p[i + 1])) < 0) {
                    cutLines.push(new Line(new Point(p[i + 1].X, p[i + 1].Y), new Vector(e.Norm.X, e.Norm.Y)));
                }

                if (cutLines.length > 0) {
                    const poly = new Polygon(p.map(po => [po.X, po.Y]));
                    const multiline = new Multiline(cutLines);

                    for (let line of cutLines) {
                        const ip = line.intersect(poly);
                        const ipSorted = line.sortPoints(ip);
                        multiline.split(ipSorted);
                    }

                    console.log(poly.cut(multiline));
                }
            }
        }
    }
}

export {
    calculateRoundCorner
}
