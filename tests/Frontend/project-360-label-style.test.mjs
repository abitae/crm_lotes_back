import assert from 'node:assert/strict';
import test from 'node:test';
import {
    PROJECT_360_LABEL_FONTS,
    PROJECT_360_LABEL_STYLE_DEFAULTS,
    project360LabelBoxLayout,
    resolvePolygonLabelPosition,
    resolveProject360BadgeVisibility,
    resolveProject360LabelFont,
    resolveProject360LabelShape,
} from '../../resources/js/lib/project-360-label-style.ts';

test('expone tipos de letra compatibles con A-Frame', () => {
    assert.deepEqual(
        PROJECT_360_LABEL_FONTS.map(([id]) => id),
        [
            'roboto',
            'exo2bold',
            'kelsonsans',
            'sourcecodepro',
            'monoid',
            'dejavu',
        ],
    );
});

test('resuelve forma y visibilidad de etiqueta con valores por defecto', () => {
    assert.equal(resolveProject360LabelShape('pill'), 'pill');
    assert.equal(resolveProject360LabelShape('octagono'), 'rounded');
    assert.equal(resolveProject360BadgeVisibility('click'), 'click');
    assert.equal(resolveProject360BadgeVisibility('hover'), 'always');
    assert.equal(resolveProject360LabelFont('comic-sans'), 'roboto');
    assert.equal(resolveProject360LabelFont('kelsonsans'), 'kelsonsans');
    assert.equal(PROJECT_360_LABEL_STYLE_DEFAULTS.visibility, 'always');
    assert.equal(PROJECT_360_LABEL_STYLE_DEFAULTS.width, 1.2);
    assert.equal(PROJECT_360_LABEL_STYLE_DEFAULTS.height, 0.34);
});

test('la etiqueta del polígono usa el centro si no hay ángulo propio', () => {
    assert.deepEqual(
        resolvePolygonLabelPosition({
            vertices: [],
            label_yaw: null,
            label_pitch: null,
            centroid: { yaw: 12.5, pitch: -4 },
        }),
        { yaw: 12.5, pitch: -4 },
    );
});

test('la etiqueta del polígono respeta yaw y pitch editados', () => {
    assert.deepEqual(
        resolvePolygonLabelPosition({
            vertices: [],
            label_yaw: 40,
            label_pitch: 8,
            centroid: { yaw: 12.5, pitch: -4 },
        }),
        { yaw: 40, pitch: 8 },
    );
});

test('el recuadro de la etiqueta usa ancho y largo editables', () => {
    assert.deepEqual(
        project360LabelBoxLayout('  Lote 12  ', { width: 2, height: 0.5 }),
        {
            displayLabel: 'Lote 12',
            width: 2,
            height: 0.5,
            textWidth: 6.6,
        },
    );
    assert.equal(
        project360LabelBoxLayout('', { width: 0.1, height: 9 }).width,
        0.5,
    );
    assert.equal(
        project360LabelBoxLayout('', { width: 0.1, height: 9 }).height,
        1.5,
    );
});
