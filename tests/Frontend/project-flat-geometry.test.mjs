import assert from 'node:assert/strict';
import test from 'node:test';
import {
    aframeCameraDistance,
    findPolygonAtPoint,
    hasDuplicateAdjacentVertices,
    isNearPixel,
    lightenHex,
    pixelToAframe,
    pointInPolygon,
    polygonCentroid,
    polygonHasSelfIntersection,
} from '../../resources/js/lib/project-flat-geometry.ts';

test('convierte un píxel del mapa a coordenadas A-Frame centradas', () => {
    const size = { width: 400, height: 200 };

    assert.deepEqual(pixelToAframe({ x: 200, y: 100 }, size), { x: 0, y: 0 });
    assert.deepEqual(pixelToAframe({ x: 0, y: 0 }, size), { x: -200, y: 100 });
    assert.deepEqual(pixelToAframe({ x: 400, y: 200 }, size), {
        x: 200,
        y: -100,
    });
});

test('calcula la distancia de cámara para un fov de 90', () => {
    assert.ok(Math.abs(aframeCameraDistance(200, 90) - 100) < 0.000001);
});

test('detecta un punto dentro o fuera del polígono', () => {
    const square = [
        { lat: -12.04, lng: -77.04 },
        { lat: -12.04, lng: -77.03 },
        { lat: -12.05, lng: -77.03 },
        { lat: -12.05, lng: -77.04 },
    ];

    assert.equal(pointInPolygon({ lat: -12.045, lng: -77.035 }, square), true);
    assert.equal(pointInPolygon({ lat: -12.06, lng: -77.035 }, square), false);
});

test('encuentra el polígono superior en un clic', () => {
    const first = {
        id: 1,
        vertices: [
            { lat: -12.04, lng: -77.04 },
            { lat: -12.04, lng: -77.03 },
            { lat: -12.05, lng: -77.03 },
            { lat: -12.05, lng: -77.04 },
        ],
    };
    const second = {
        id: 2,
        vertices: [
            { lat: -12.042, lng: -77.038 },
            { lat: -12.042, lng: -77.032 },
            { lat: -12.048, lng: -77.032 },
            { lat: -12.048, lng: -77.038 },
        ],
    };

    assert.equal(
        findPolygonAtPoint({ lat: -12.045, lng: -77.035 }, [first, second])?.id,
        2,
    );
    assert.equal(
        findPolygonAtPoint({ lat: -12.06, lng: -77.035 }, [first, second]),
        null,
    );
});

test('detecta lados cruzados y vértices repetidos', () => {
    assert.equal(
        polygonHasSelfIntersection([
            { lat: -12.04, lng: -77.04 },
            { lat: -12.05, lng: -77.03 },
            { lat: -12.04, lng: -77.03 },
            { lat: -12.05, lng: -77.04 },
        ]),
        true,
    );
    assert.equal(
        polygonHasSelfIntersection([
            { lat: -12.04, lng: -77.04 },
            { lat: -12.04, lng: -77.03 },
            { lat: -12.05, lng: -77.03 },
            { lat: -12.05, lng: -77.04 },
        ]),
        false,
    );
    assert.equal(
        hasDuplicateAdjacentVertices([
            { lat: -12.04, lng: -77.04 },
            { lat: -12.04, lng: -77.04 },
            { lat: -12.05, lng: -77.03 },
        ]),
        true,
    );
});

test('calcula si un clic está cerca del primer vértice', () => {
    assert.equal(isNearPixel({ x: 10, y: 10 }, { x: 18, y: 12 }), true);
    assert.equal(isNearPixel({ x: 10, y: 10 }, { x: 40, y: 40 }), false);
});

test('aclara un color hexadecimal para el hover', () => {
    assert.equal(lightenHex('#000000'), '#474747');
    assert.match(lightenHex('#ff0000'), /^#[0-9a-f]{6}$/);
});

test('calcula el centroide del polígono', () => {
    assert.deepEqual(
        polygonCentroid([
            { lat: -12.04, lng: -77.04 },
            { lat: -12.04, lng: -77.02 },
            { lat: -12.06, lng: -77.02 },
            { lat: -12.06, lng: -77.04 },
        ]),
        { lat: -12.05, lng: -77.03 },
    );
});
