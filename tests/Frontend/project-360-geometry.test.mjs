import assert from 'node:assert/strict';
import test from 'node:test';
import {
    anglesToPoint,
    pointToAngles,
    pointerToPlanCoordinates,
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
