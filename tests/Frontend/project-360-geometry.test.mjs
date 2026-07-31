import assert from 'node:assert/strict';
import test from 'node:test';
import {
    anglesToPoint,
    pointToAngles,
    polygonCentroid,
    polygonHasSelfIntersection,
    polylineHasSelfIntersection,
    pointerToPlanCoordinates,
    unwrapPolygonVertices,
} from '../../resources/js/lib/project-360-geometry.ts';

test('convierte yaw y pitch a un punto y recupera los mismos ángulos', () => {
    const source = { yaw: 72.5, pitch: -18.25 };
    const point = anglesToPoint(source.yaw, source.pitch);
    const result = pointToAngles(point);

    assert.ok(Math.abs(result.yaw - source.yaw) < 0.001);
    assert.ok(Math.abs(result.pitch - source.pitch) < 0.001);
});

test('convierte un clic de plano a coordenadas normalizadas y limita los bordes', () => {
    const bounds = { left: 100, top: 50, width: 400, height: 200 };

    assert.deepEqual(pointerToPlanCoordinates(300, 100, bounds), {
        x: 50,
        y: 25,
    });
    assert.deepEqual(pointerToPlanCoordinates(900, -50, bounds), {
        x: 100,
        y: 0,
    });
});

test('desenvuelve polígonos que cruzan el meridiano de 180 grados', () => {
    const result = unwrapPolygonVertices([
        { yaw: 170, pitch: -10 },
        { yaw: -170, pitch: -10 },
        { yaw: -172, pitch: 8 },
        { yaw: 172, pitch: 8 },
    ]);

    assert.deepEqual(
        result.map((vertex) => vertex.yaw),
        [170, 190, 188, 172],
    );
    assert.deepEqual(polygonCentroid(result), { yaw: 180 - 360, pitch: -1 });
});

test('detecta lados cruzados y acepta un polígono simple', () => {
    assert.equal(
        polygonHasSelfIntersection([
            { yaw: 0, pitch: 0 },
            { yaw: 10, pitch: 10 },
            { yaw: 0, pitch: 10 },
            { yaw: 10, pitch: 0 },
        ]),
        true,
    );
    assert.equal(
        polygonHasSelfIntersection([
            { yaw: 0, pitch: 0 },
            { yaw: 10, pitch: 0 },
            { yaw: 10, pitch: 10 },
            { yaw: 0, pitch: 10 },
        ]),
        false,
    );
});

test('mantiene abierto el trazado y valida el cierre por separado', () => {
    const vertices = [
        { yaw: 0, pitch: 0 },
        { yaw: 10, pitch: 0 },
        { yaw: 0, pitch: 10 },
        { yaw: 10, pitch: 10 },
    ];

    assert.equal(polylineHasSelfIntersection(vertices), false);
    assert.equal(polygonHasSelfIntersection(vertices), true);
});
