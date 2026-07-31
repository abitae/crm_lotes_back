import assert from 'node:assert/strict';
import test from 'node:test';
import {
    project360HotspotLabelLayout,
    project360RaycastTargets,
} from '../../resources/js/lib/project-360-interaction.ts';

test('calcula una etiqueta legible con fondo para el hotspot', () => {
    assert.deepEqual(project360HotspotLabelLayout(' Sala principal ', 0.16), {
        displayLabel: 'Sala principal',
        width: 1.132,
        height: 0.34,
        textWidth: 3.736,
        positionY: 0.532,
    });
});

test('limita el fondo de etiquetas muy extensas y admite un texto vacío', () => {
    assert.equal(
        project360HotspotLabelLayout('', 0.16).displayLabel,
        'Nuevo hotspot',
    );
    assert.equal(
        project360HotspotLabelLayout('x'.repeat(80), 0.16).width,
        2.176,
    );
});

test('el dibujo solo registra los puntos elegidos por el usuario', () => {
    assert.deepEqual(project360RaycastTargets(true, false, true), {
        pointer: '.hotspot-placement-surface',
        cameraCursor: '.tour-noninteractive',
    });
});

test('el cursor central no agrega un punto al cerrar el polígono', () => {
    assert.deepEqual(project360RaycastTargets(true, true, true), {
        pointer: '.hotspot-placement-surface, .polygon-close-target',
        cameraCursor: '.tour-noninteractive',
    });
});

test('fuera del dibujo se conservan las interacciones del visor', () => {
    assert.deepEqual(project360RaycastTargets(false, false, false), {
        pointer: '.tour-hotspot-hit-area, .tour-polygon',
        cameraCursor: '.tour-hotspot-hit-area, .tour-polygon',
    });
});
