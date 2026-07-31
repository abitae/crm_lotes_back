type MutableRotation = {
    x: number;
    y: number;
};

export type Project360OrientationTarget = {
    object3D: { rotation: MutableRotation };
    components?: {
        'look-controls'?: {
            pitchObject: { rotation: MutableRotation };
            yawObject: { rotation: MutableRotation };
        };
    };
};

export function faceProject360ElementToCamera<Position>(
    target: { lookAt: (position: Position) => void },
    cameraPosition: Position,
): void {
    target.lookAt(cameraPosition);
}

export function applyProject360InitialOrientation(
    target: Project360OrientationTarget,
    yaw: number,
    pitch: number,
): boolean {
    const lookControls = target.components?.['look-controls'];

    if (!lookControls) {
        return false;
    }

    const yawRadians = (yaw * Math.PI) / 180;
    const pitchRadians = (pitch * Math.PI) / 180;

    lookControls.yawObject.rotation.y = yawRadians;
    lookControls.pitchObject.rotation.x = pitchRadians;
    target.object3D.rotation.y = yawRadians;
    target.object3D.rotation.x = pitchRadians;

    return true;
}
