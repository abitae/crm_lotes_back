const NON_INTERACTIVE_TARGET = '.tour-noninteractive';

export type Project360RaycastTargets = {
    pointer: string;
};

export type Project360HotspotLabelLayout = {
    displayLabel: string;
    width: number;
    height: number;
    textWidth: number;
    positionY: number;
};

export function project360HotspotLabelLayout(
    label: string,
    hotspotSize: number,
): Project360HotspotLabelLayout {
    const displayLabel = label.trim() || 'Nuevo hotspot';
    const width = Number(
        Math.min(
            2.4,
            Math.max(0.92, 0.32 + Math.min(displayLabel.length, 32) * 0.058),
        ).toFixed(3),
    );

    return {
        displayLabel,
        width,
        height: 0.34,
        textWidth: Number(Math.max(3.2, width * 3.3).toFixed(3)),
        positionY: Number((hotspotSize * 2.7 + 0.1).toFixed(3)),
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
          : '.tour-hotspot-hit-area, .tour-polygon';

    return { pointer };
}
