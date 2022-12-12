import earcut from 'earcut';
import {Point, Vector, Line, Polygon, Multiline} from '@flatten-js/core';

function calculateRoundCorner(skeleton) {
    const originalVertices = new Map();
    for (const [key, value] of skeleton.Distances) {
        originalVertices.set(`${key.X},${key.Y}`, value);
    }
    const output = [];

    // traverse every edge of original Polygon.
    for (const {Edge: e, Polygon: p} of skeleton.Edges) {
        const poly = new Polygon(p.map(po => [po.X, po.Y]));

        let polygonCut = false;

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
                    polygonCut = true;

                    const multiline = new Multiline(cutLines);

                    for (let line of cutLines) {
                        const ip = line.intersect(poly);
                        const ipSorted = line.sortPoints(ip);
                        multiline.split(ipSorted);
                    }

                    const splitPolygons = poly.cut(multiline);

                    for (const splitPolygon of splitPolygons) {
                        const sharePoints = sharePointsWithOriginalPolygon(splitPolygon, originalVertices);
                        if (sharePoints.length >= 2) {
                            output.push(triangulate(splitPolygon, originalVertices));
                        } else if (sharePoints.length === 1) {
                            // recalculate distance
                            splitPolygon.vertices.forEach(vertex => {
                                console.log('old', originalVertices.get(`${vertex.x},${vertex.y}`));
                                originalVertices.set(
                                    `${vertex.x},${vertex.y}`,
                                    Math.sqrt((vertex.x - sharePoints[0].x) * (vertex.x - sharePoints[0].x) + (vertex.y - sharePoints[0].y) * (vertex.y - sharePoints[0].y))
                                );
                                console.log('new', originalVertices.get(`${vertex.x},${vertex.y}`));
                            });
                            output.push(triangulate(splitPolygon, originalVertices));
                        } else {
                            output.push(triangulate(splitPolygon, originalVertices));
                        }
                    }
                }
            }
        }

        if (!polygonCut) {
            output.push(triangulate(poly, originalVertices));
        }
    }

    return output;
}

function sharePointsWithOriginalPolygon(polygon, originalVertices) {
    return polygon.vertices.filter(vertex => originalVertices.get(`${vertex.x},${vertex.y}`) === 0);
}

function triangulate(polygon, originalVertices) {
    const flat = [];

    polygon.vertices.forEach(vertex => {
        flat.push(vertex.x, vertex.y, originalVertices.get(`${vertex.x},${vertex.y}`));
    });

    return {
        flat: flat,
        indices: earcut(flat, undefined, 3)
    };
}

export {
    calculateRoundCorner
}
