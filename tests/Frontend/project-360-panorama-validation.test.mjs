import assert from 'node:assert/strict';
import test from 'node:test';
import {
    formatBytes,
    formatRatio,
    hasAcceptableEquirectangularRatio,
    inspectPanoramaFile,
    inspectPanoramaSelection,
    isAllowedPanoramaFormat,
    PROJECT_360_PANORAMA_RULES,
} from '../../resources/js/lib/project-360-panorama-validation.ts';

test('acepta proporción 2:1 con tolerancia de ±5 %', () => {
    assert.equal(hasAcceptableEquirectangularRatio(4096, 2048), true);
    assert.equal(hasAcceptableEquirectangularRatio(4096, 2050), true);
    assert.equal(hasAcceptableEquirectangularRatio(2048, 1200), false);
    assert.equal(hasAcceptableEquirectangularRatio(1024, 512), true);
});

test('reconoce formatos permitidos por mime o extensión', () => {
    assert.equal(
        isAllowedPanoramaFormat({ name: 'entrada.jpg', type: 'image/jpeg' }),
        true,
    );
    assert.equal(
        isAllowedPanoramaFormat({ name: 'entrada.PNG', type: '' }),
        true,
    );
    assert.equal(
        isAllowedPanoramaFormat({ name: 'entrada.heic', type: 'image/heic' }),
        false,
    );
    assert.equal(
        isAllowedPanoramaFormat({ name: 'entrada.jpg', type: 'application/pdf' }),
        false,
    );
});

test('lista todos los requisitos que falla un panorama pequeño y desproporcionado', () => {
    const report = inspectPanoramaFile({
        name: 'fachada.jpg',
        type: 'image/jpeg',
        size: 800 * 1024,
        width: 1280,
        height: 720,
        readable: true,
    });

    assert.equal(report.ok, false);
    assert.deepEqual(
        report.checks.filter((check) => !check.ok).map((check) => check.id),
        ['min_resolution', 'ratio'],
    );
    assert.match(report.errors[0] ?? '', /1280×720/);
    assert.match(report.errors[1] ?? '', /1\.78:1/);
});

test('rechaza peso excesivo y resolución demasiado grande', () => {
    const report = inspectPanoramaFile({
        name: 'gigante.png',
        type: 'image/png',
        size: 25 * 1024 * 1024,
        width: 9000,
        height: 4500,
        readable: true,
    });

    const failed = report.checks.filter((check) => !check.ok).map((check) => check.id);

    assert.equal(failed.includes('size'), true);
    assert.equal(failed.includes('max_resolution'), true);
    assert.match(report.errors.join(' '), /25/);
    assert.match(report.errors.join(' '), /9000×4500/);
});

test('marca ilegible cuando no se pueden leer las dimensiones', () => {
    const report = inspectPanoramaFile({
        name: 'roto.webp',
        type: 'image/webp',
        size: 1024,
        width: null,
        height: null,
        readable: false,
    });

    assert.equal(report.ok, false);
    assert.equal(
        report.checks.find((check) => check.id === 'readable')?.ok,
        false,
    );
});

test('acepta un panorama que cumple todos los requisitos', () => {
    const report = inspectPanoramaFile({
        name: 'entrada.jpg',
        type: 'image/jpeg',
        size: 4 * 1024 * 1024,
        width: 4096,
        height: 2048,
        readable: true,
    });

    assert.equal(report.ok, true);
    assert.equal(report.errors.length, 0);
    assert.equal(formatRatio(4096, 2048), '2.00:1');
    assert.equal(formatBytes(4 * 1024 * 1024), '4 MB');
});

test('reporta el exceso de archivos en la selección', () => {
    const inspections = Array.from({ length: 6 }, (_, index) => ({
        name: `pano-${index}.jpg`,
        type: 'image/jpeg',
        size: 1024,
        width: 4096,
        height: 2048,
        readable: true,
    }));
    const analysis = inspectPanoramaSelection(inspections);

    assert.equal(analysis.ok, false);
    assert.equal(analysis.reports.length, 6);
    assert.match(analysis.batchErrors[0] ?? '', /hasta 5/);
    assert.equal(PROJECT_360_PANORAMA_RULES.maxFiles, 5);
});
