export type ProjectFlatVertex = {
    lat: number;
    lng: number;
};

export type PixelPoint = {
    x: number;
    y: number;
};

export type ViewportSize = {
    width: number;
    height: number;
};

const VERTEX_EPSILON = 0.0000001;

export function pixelToAframe(
    pixel: PixelPoint,
    size: ViewportSize,
): PixelPoint {
    return {
        x: pixel.x - size.width / 2,
        y: size.height / 2 - pixel.y,
    };
}

export function aframeCameraDistance(height: number, fov = 90): number {
    const safeHeight = Math.max(1, height);
    const halfFovRadians = (fov * Math.PI) / 360;

    return safeHeight / 2 / Math.tan(halfFovRadians);
}

export function pointInPolygon(
    point: ProjectFlatVertex,
    vertices: ProjectFlatVertex[],
): boolean {
    if (vertices.length < 3) {
        return false;
    }

    let inside = false;

    for (
        let index = 0, previous = vertices.length - 1;
        index < vertices.length;
        previous = index, index += 1
    ) {
        const current = vertices[index];
        const last = vertices[previous];
        const intersects =
            current.lat > point.lat !== last.lat > point.lat &&
            point.lng <
                ((last.lng - current.lng) * (point.lat - current.lat)) /
                    (last.lat - current.lat + Number.EPSILON) +
                    current.lng;

        if (intersects) {
            inside = !inside;
        }
    }

    return inside;
}

export function findPolygonAtPoint<T extends { vertices: ProjectFlatVertex[] }>(
    point: ProjectFlatVertex,
    polygons: T[],
): T | null {
    for (let index = polygons.length - 1; index >= 0; index -= 1) {
        if (pointInPolygon(point, polygons[index].vertices)) {
            return polygons[index];
        }
    }

    return null;
}

export function hasDuplicateAdjacentVertices(
    vertices: ProjectFlatVertex[],
): boolean {
    if (vertices.length < 2) {
        return false;
    }

    for (let index = 0; index < vertices.length; index += 1) {
        const current = vertices[index];
        const next = vertices[(index + 1) % vertices.length];

        if (
            Math.abs(current.lat - next.lat) < VERTEX_EPSILON &&
            Math.abs(current.lng - next.lng) < VERTEX_EPSILON
        ) {
            return true;
        }
    }

    return false;
}

export function polygonHasSelfIntersection(
    vertices: ProjectFlatVertex[],
): boolean {
    const count = vertices.length;

    for (let first = 0; first < count; first += 1) {
        const firstNext = (first + 1) % count;

        for (let second = first + 1; second < count; second += 1) {
            const secondNext = (second + 1) % count;

            if (
                first === second ||
                firstNext === second ||
                secondNext === first
            ) {
                continue;
            }

            if (
                segmentsIntersect(
                    vertices[first],
                    vertices[firstNext],
                    vertices[second],
                    vertices[secondNext],
                )
            ) {
                return true;
            }
        }
    }

    return false;
}

export function polylineHasSelfIntersection(
    vertices: ProjectFlatVertex[],
): boolean {
    for (let first = 0; first < vertices.length - 1; first += 1) {
        for (
            let second = first + 2;
            second < vertices.length - 1;
            second += 1
        ) {
            if (
                segmentsIntersect(
                    vertices[first],
                    vertices[first + 1],
                    vertices[second],
                    vertices[second + 1],
                )
            ) {
                return true;
            }
        }
    }

    return false;
}

export function polygonCentroid(
    vertices: ProjectFlatVertex[],
): ProjectFlatVertex | null {
    if (vertices.length === 0) {
        return null;
    }

    const total = vertices.reduce(
        (current, vertex) => ({
            lat: current.lat + vertex.lat,
            lng: current.lng + vertex.lng,
        }),
        { lat: 0, lng: 0 },
    );

    return {
        lat: total.lat / vertices.length,
        lng: total.lng / vertices.length,
    };
}

function segmentsIntersect(
    first: ProjectFlatVertex,
    second: ProjectFlatVertex,
    third: ProjectFlatVertex,
    fourth: ProjectFlatVertex,
): boolean {
    const orientationOne = orientation(first, second, third);
    const orientationTwo = orientation(first, second, fourth);
    const orientationThree = orientation(third, fourth, first);
    const orientationFour = orientation(third, fourth, second);

    if (
        (Math.abs(orientationOne) < 1e-12 &&
            isOnSegment(first, third, second)) ||
        (Math.abs(orientationTwo) < 1e-12 &&
            isOnSegment(first, fourth, second)) ||
        (Math.abs(orientationThree) < 1e-12 &&
            isOnSegment(third, first, fourth)) ||
        (Math.abs(orientationFour) < 1e-12 &&
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
    start: ProjectFlatVertex,
    point: ProjectFlatVertex,
    end: ProjectFlatVertex,
): boolean {
    return (
        point.lng >= Math.min(start.lng, end.lng) - 1e-12 &&
        point.lng <= Math.max(start.lng, end.lng) + 1e-12 &&
        point.lat >= Math.min(start.lat, end.lat) - 1e-12 &&
        point.lat <= Math.max(start.lat, end.lat) + 1e-12
    );
}

function orientation(
    first: ProjectFlatVertex,
    second: ProjectFlatVertex,
    third: ProjectFlatVertex,
): number {
    return (
        (second.lng - first.lng) * (third.lat - first.lat) -
        (second.lat - first.lat) * (third.lng - first.lng)
    );
}

export const CLOSE_VERTEX_PIXEL_THRESHOLD = 16;

export function pixelDistance(first: PixelPoint, second: PixelPoint): number {
    return Math.hypot(first.x - second.x, first.y - second.y);
}

export function isNearPixel(
    first: PixelPoint,
    second: PixelPoint,
    threshold = CLOSE_VERTEX_PIXEL_THRESHOLD,
): boolean {
    return pixelDistance(first, second) <= threshold;
}

export function lightenHex(hex: string, amount = 0.28): string {
    const value = hex.replace('#', '');

    if (!/^[\da-fA-F]{6}$/.test(value)) {
        return '#fb923c';
    }

    const mix = (channel: number): string =>
        Math.min(255, Math.round(channel + (255 - channel) * amount))
            .toString(16)
            .padStart(2, '0');

    return `#${mix(Number.parseInt(value.slice(0, 2), 16))}${mix(Number.parseInt(value.slice(2, 4), 16))}${mix(Number.parseInt(value.slice(4, 6), 16))}`;
}
