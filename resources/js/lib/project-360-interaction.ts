const NON_INTERACTIVE_TARGET = '.tour-noninteractive';

export type Project360RaycastTargets = {
    pointer: string;
};

export type Project360HotspotShape = 'sphere' | 'ring' | 'pin';

export type Project360HotspotLabelLayout = {
    displayLabel: string;
    width: number;
    height: number;
    textWidth: number;
    positionY: number;
};

export type Project360PinGeometry = {
    headRadius: number;
    headY: number;
    innerRadius: number;
    accentRadius: number;
    tipHalfWidth: number;
    tipTopY: number;
    rippleRadius: number;
    hitRadius: number;
    hitY: number;
    labelY: number;
};

export function project360HotspotLabelLayout(
    label: string,
    hotspotSize: number,
    shape: Project360HotspotShape = 'sphere',
): Project360HotspotLabelLayout {
    const displayLabel = label.trim() || 'Nuevo hotspot';
    const width = Number(
        Math.min(
            2.4,
            Math.max(0.92, 0.32 + Math.min(displayLabel.length, 32) * 0.058),
        ).toFixed(3),
    );
    const height = 0.34;
    const positionY =
        shape === 'pin'
            ? project360PinGeometry(hotspotSize).labelY
            : Number((hotspotSize * 2.7 + 0.1).toFixed(3));

    return {
        displayLabel,
        width,
        height,
        textWidth: Number(Math.max(3.2, width * 3.3).toFixed(3)),
        positionY,
    };
}

export function project360PinGeometry(
    hotspotSize: number,
): Project360PinGeometry {
    const size = Math.max(0.08, hotspotSize);
    const headRadius = Number((size * 1.18).toFixed(3));
    const headY = Number((size * 1.72).toFixed(3));
    const height = 0.34;

    return {
        headRadius,
        headY,
        innerRadius: Number((headRadius * 0.4).toFixed(3)),
        accentRadius: Number((headRadius * 0.16).toFixed(3)),
        tipHalfWidth: Number((headRadius * 0.78).toFixed(3)),
        tipTopY: Number((headY + headRadius * 0.08).toFixed(3)),
        rippleRadius: Number((size * 0.32).toFixed(3)),
        hitRadius: Number((size * 2.2).toFixed(3)),
        hitY: Number((headY * 0.52).toFixed(3)),
        labelY: Number((headY + headRadius + height / 2 + 0.12).toFixed(3)),
    };
}

export function project360RaycastTargets(
    placementMode: boolean,
    canClosePolygon: boolean,
    interactionLocked: boolean,
): Project360RaycastTargets {
    const pointer = placementMode
        ? canClosePolygon
            ? '.hotspot-placement-surface, .polygon-close-target'
            : '.hotspot-placement-surface'
        : interactionLocked
          ? NON_INTERACTIVE_TARGET
          : '.tour-hotspot-hit-area, .tour-polygon, .tour-label-hit-area';

    return { pointer };
}
