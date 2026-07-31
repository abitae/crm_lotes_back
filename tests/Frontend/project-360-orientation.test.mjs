import assert from 'node:assert/strict';
import test from 'node:test';
import { applyProject360InitialOrientation } from '../../resources/js/lib/project-360-orientation.ts';

test('aplica la orientación inicial a los controles internos de la cámara', () => {
    const target = {
        object3D: { rotation: { x: 0, y: 0 } },
        components: {
            'look-controls': {
                pitchObject: { rotation: { x: 0, y: 0 } },
                yawObject: { rotation: { x: 0, y: 0 } },
            },
        },
    };

    assert.equal(applyProject360InitialOrientation(target, 90, -30), true);
    assert.equal(
        target.components['look-controls'].yawObject.rotation.y,
        Math.PI / 2,
    );
    assert.equal(
        target.components['look-controls'].pitchObject.rotation.x,
        -Math.PI / 6,
    );
    assert.equal(target.object3D.rotation.y, Math.PI / 2);
    assert.equal(target.object3D.rotation.x, -Math.PI / 6);
});

test('espera a que look-controls esté disponible', () => {
    const target = { object3D: { rotation: { x: 0, y: 0 } } };

    assert.equal(applyProject360InitialOrientation(target, 45, 10), false);
    assert.deepEqual(target.object3D.rotation, { x: 0, y: 0 });
});
