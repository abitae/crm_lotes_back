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

export function unwrapPolygonVertices(
    vertices: Project360Angles[],
): Project360Angles[] {
    let previousYaw: number | null = null;

    return vertices.map((vertex) => {
        let yaw = vertex.yaw;

        if (previousYaw !== null) {
            while (yaw - previousYaw > 180) {
                yaw -= 360;
            }

            while (yaw - previousYaw < -180) {
                yaw += 360;
            }
        }

        previousYaw = yaw;

        return { yaw, pitch: vertex.pitch };
    });
}

export function polygonHasSelfIntersection(
    vertices: Project360Angles[],
): boolean {
    const points = unwrapPolygonVertices(vertices);

    for (let first = 0; first < points.length; first += 1) {
        const firstNext = (first + 1) % points.length;

        for (let second = first + 1; second < points.length; second += 1) {
            const secondNext = (second + 1) % points.length;

            if (
                first === second ||
                firstNext === second ||
                secondNext === first
            ) {
                continue;
            }

            if (
                segmentsIntersect(
                    points[first],
                    points[firstNext],
                    points[second],
                    points[secondNext],
                )
            ) {
                return true;
            }
        }
    }

    return false;
}

export function polygonCentroid(
    vertices: Project360Angles[],
): Project360Angles {
    const points = unwrapPolygonVertices(vertices);
    const total = points.reduce(
        (current, point) => ({
            yaw: current.yaw + point.yaw,
            pitch: current.pitch + point.pitch,
        }),
        { yaw: 0, pitch: 0 },
    );

    return {
        yaw: normalizeYaw(total.yaw / Math.max(1, points.length)),
        pitch: total.pitch / Math.max(1, points.length),
    };
}

function segmentsIntersect(
    first: Project360Angles,
    second: Project360Angles,
    third: Project360Angles,
    fourth: Project360Angles,
): boolean {
    const orientationOne = orientation(first, second, third);
    const orientationTwo = orientation(first, second, fourth);
    const orientationThree = orientation(third, fourth, first);
    const orientationFour = orientation(third, fourth, second);

    if (
        (Math.abs(orientationOne) < 0.000001 &&
            isOnSegment(first, third, second)) ||
        (Math.abs(orientationTwo) < 0.000001 &&
            isOnSegment(first, fourth, second)) ||
        (Math.abs(orientationThree) < 0.000001 &&
            isOnSegment(third, first, fourth)) ||
        (Math.abs(orientationFour) < 0.000001 &&
            isOnSegment(third, second, fourth))
    ) {
        return true;
    }

    return (
        orientationOne * orientationTwo < 0 &&
        orientationThree * orientationFour < 0
    );
}

function isOnSegment(
    start: Project360Angles,
    point: Project360Angles,
    end: Project360Angles,
): boolean {
    return (
        point.yaw >= Math.min(start.yaw, end.yaw) - 0.000001 &&
        point.yaw <= Math.max(start.yaw, end.yaw) + 0.000001 &&
        point.pitch >= Math.min(start.pitch, end.pitch) - 0.000001 &&
        point.pitch <= Math.max(start.pitch, end.pitch) + 0.000001
    );
}

function orientation(
    first: Project360Angles,
    second: Project360Angles,
    third: Project360Angles,
): number {
    return (
        (second.yaw - first.yaw) * (third.pitch - first.pitch) -
        (second.pitch - first.pitch) * (third.yaw - first.yaw)
    );
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
