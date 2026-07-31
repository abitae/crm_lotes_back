export type Project360Angles = {
    yaw: number;
    pitch: number;
};

export type Project360Point = {
    x: number;
    y: number;
    z: number;
};

export function normalizeYaw(value: number): number {
    return ((((value + 180) % 360) + 360) % 360) - 180;
}

export function anglesToPoint(
    yaw: number,
    pitch: number,
    radius = 4,
    cameraHeight = 1.6,
): Project360Point {
    const yawRadians = (yaw * Math.PI) / 180;
    const pitchRadians = (pitch * Math.PI) / 180;

    return {
        x: -radius * Math.sin(yawRadians) * Math.cos(pitchRadians),
        y: cameraHeight + radius * Math.sin(pitchRadians),
        z: -radius * Math.cos(yawRadians) * Math.cos(pitchRadians),
    };
}

export function pointToAngles(
    point: Project360Point,
    cameraHeight = 1.6,
): Project360Angles {
    const x = point.x;
    const y = point.y - cameraHeight;
    const z = point.z;
    const horizontalDistance = Math.sqrt(x * x + z * z);

    return {
        yaw: Number(
            normalizeYaw((Math.atan2(-x, -z) * 180) / Math.PI).toFixed(3),
        ),
        pitch: Number(
            Math.max(
                -85,
                Math.min(
                    85,
                    (Math.atan2(y, horizontalDistance) * 180) / Math.PI,
                ),
            ).toFixed(3),
        ),
    };
}

export function pointerToPlanCoordinates(
    clientX: number,
    clientY: number,
    bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
): { x: number; y: number } {
    return {
        x: Number(
            Math.max(
                0,
                Math.min(100, ((clientX - bounds.left) / bounds.width) * 100),
            ).toFixed(3),
        ),
        y: Number(
            Math.max(
                0,
                Math.min(100, ((clientY - bounds.top) / bounds.height) * 100),
            ).toFixed(3),
        ),
    };
}
