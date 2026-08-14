import {
    Expand,
    Info,
    LoaderCircle,
    Rotate3D,
    Sparkles,
    X,
} from 'lucide-react';
import {
    forwardRef,
    memo,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Button } from '@/components/ui/button';
import { registerProject360Components } from '@/lib/project-360-aframe';
import {
    anglesToPoint,
    normalizeYaw,
    pointToAngles,
    polygonCentroid,
    type Project360Angles,
    type Project360Point,
} from '@/lib/project-360-geometry';
import {
    project360HotspotLabelLayout,
    project360PinGeometry,
    project360RaycastTargets,
} from '@/lib/project-360-interaction';
import {
    project360LabelBoxLayout,
    resolvePolygonLabelPosition,
    resolveProject360BadgeVisibility,
    resolveProject360LabelFont,
    resolveProject360LabelShape,
    type Project360LabelStyle,
} from '@/lib/project-360-label-style';
import type {
    Project360Hotspot,
    Project360HotspotStyle,
    Project360Label,
    Project360Panorama,
    Project360Polygon,
    Project360TourSettings,
} from '@/types/project-360';

export type Project360ViewerHandle = {
    getViewAngles: () => Project360Angles;
};

type Project360ViewerProps = {
    panoramas: Project360Panorama[];
    hotspots: Project360Hotspot[];
    labels: Project360Label[];
    polygons: Project360Polygon[];
    settings: Project360TourSettings;
    startPanoramaId: number | null;
    placementMode?: boolean;
    draftPoint?: Project360Angles | null;
    draftStyle?: Project360HotspotStyle;
    editingHotspotId?: number | null;
    editingLabelId?: number | null;
    draftLabel?: Project360Label | null;
    polygonDraft?: Project360Angles[];
    polygonPreview?: Project360Polygon | null;
    polygonDrawing?: boolean;
    interactionLocked?: boolean;
    editingPolygonId?: number | null;
    selectedPolygonId?: number | null;
    selectedLabelId?: number | null;
    onPlacement?: (angles: Project360Angles) => void;
    onPolygonClose?: () => void;
    onPanoramaChange?: (panoramaId: number) => void;
    onPolygonSelect?: (polygonId: number | null) => void;
    onLabelSelect?: (labelId: number | null) => void;
    className?: string;
};

type Rotation = { x: number; y: number; z: number };
type AFrameModule = {
    default?: Parameters<typeof registerProject360Components>[0];
};

function pointPosition(yaw: number, pitch: number, radius = 4): string {
    const point = anglesToPoint(yaw, pitch, radius);

    return `${point.x.toFixed(4)} ${point.y.toFixed(4)} ${point.z.toFixed(4)}`;
}

function supportsWebGl(): boolean {
    if (typeof window === 'undefined') {
        return true;
    }

    try {
        const canvas = document.createElement('canvas');

        return Boolean(
            window.WebGLRenderingContext &&
            (canvas.getContext('webgl') ||
                canvas.getContext('experimental-webgl')),
        );
    } catch {
        return false;
    }
}

function HotspotMarker({
    hotspot,
    draft = false,
    reducedMotion = false,
}: {
    hotspot: Pick<
        Project360Hotspot,
        'id' | 'label' | 'target_panorama_id' | 'yaw' | 'pitch'
    > & { style: Project360HotspotStyle };
    draft?: boolean;
    reducedMotion?: boolean;
}) {
    const { style } = hotspot;
    const isPin = style.shape === 'pin';
    const labelVisible = style.label_visibility === 'always';
    const pulse = style.pulse_enabled && !draft && !reducedMotion;
    const markerRotation = `${hotspot.pitch} ${-hotspot.yaw} 0`;
    const coreMaterial = `color: ${style.color}; shader: flat; opacity: ${draft ? 0.72 : 1}; transparent: true`;
    const labelLayout = project360HotspotLabelLayout(
        hotspot.label,
        style.size,
        style.shape,
    );
    const pin = isPin ? project360PinGeometry(style.size) : null;

    const core =
        style.shape === 'ring' ? (
            <a-ring
                className="tour-hotspot-core"
                radius-inner={style.size * 0.52}
                radius-outer={style.size}
                material={coreMaterial}
            />
        ) : isPin && pin ? (
            <a-entity>
                {pulse ? (
                    <a-circle
                        radius={pin.rippleRadius}
                        position="0 0.012 0"
                        material={`color: ${style.color}; shader: flat; opacity: 0.42; transparent: true; depthWrite: false`}
                        animation__ripple="property: scale; from: 0.55 0.55 0.55; to: 2.6 2.6 2.6; loop: true; dur: 1500; easing: easeOutQuad"
                        animation__fade="property: material.opacity; from: 0.38; to: 0.02; loop: true; dur: 1500; easing: easeOutQuad"
                    />
                ) : null}
                <a-circle
                    radius={pin.rippleRadius * 0.7}
                    position="0.01 0.008 -0.008"
                    material="color: #0f172a; shader: flat; opacity: 0.22; transparent: true; depthWrite: false"
                />
                <a-circle
                    radius={pin.headRadius + 0.02}
                    position={`0.016 ${pin.headY - 0.018} -0.016`}
                    material="color: #020617; shader: flat; opacity: 0.22; transparent: true; depthWrite: false"
                />
                <a-triangle
                    className="tour-hotspot-core"
                    vertex-a="0 0 0"
                    vertex-b={`${-pin.tipHalfWidth} ${pin.tipTopY} 0`}
                    vertex-c={`${pin.tipHalfWidth} ${pin.tipTopY} 0`}
                    material={coreMaterial}
                />
                <a-circle
                    className="tour-hotspot-core"
                    radius={pin.headRadius}
                    position={`0 ${pin.headY} 0.004`}
                    material={coreMaterial}
                />
                <a-circle
                    radius={pin.innerRadius}
                    position={`0 ${pin.headY} 0.012`}
                    material="color: #ffffff; shader: flat; opacity: 0.98; depthWrite: false"
                />
                <a-circle
                    radius={pin.accentRadius}
                    position={`0 ${pin.headY} 0.016`}
                    material={`color: ${style.color}; shader: flat; opacity: 0.95; depthWrite: false`}
                />
            </a-entity>
        ) : (
            <a-sphere
                className="tour-hotspot-core"
                radius={style.size}
                material={coreMaterial}
            />
        );

    return (
        <a-entity
            className={draft ? 'tour-hotspot-draft' : 'tour-hotspot'}
            data-target-panorama-id={hotspot.target_panorama_id}
            data-color={style.color}
            data-hover-color={style.hover_color}
            position={pointPosition(hotspot.yaw, hotspot.pitch)}
            rotation={markerRotation}
            tour-hotspot-interaction={draft ? undefined : ''}
            animation__appear={
                reducedMotion || draft
                    ? undefined
                    : 'property: scale; from: 0.2 0.2 0.2; to: 1 1 1; dur: 520; easing: easeOutElastic'
            }
            animation__hoverin={
                draft || reducedMotion
                    ? undefined
                    : 'property: scale; to: 1.18 1.18 1.18; dur: 240; easing: easeOutBack; startEvents: tour-hover-start'
            }
            animation__hoverout={
                draft || reducedMotion
                    ? undefined
                    : 'property: scale; to: 1 1 1; dur: 260; easing: easeOutCubic; startEvents: tour-hover-end,tour-press-end'
            }
            animation__press={
                draft || reducedMotion
                    ? undefined
                    : 'property: scale; to: 0.91 0.91 0.91; dur: 85; easing: easeOutQuad; startEvents: tour-press-start'
            }
            title={hotspot.label}
        >
            <a-sphere
                className="tour-hotspot-hit-area"
                radius={isPin && pin ? pin.hitRadius : style.size * 1.65}
                position={isPin && pin ? `0 ${pin.hitY} 0` : undefined}
                material="opacity: 0; transparent: true; depthWrite: false"
            />
            <a-entity
                animation__float={
                    reducedMotion || draft || isPin
                        ? undefined
                        : `property: position; from: 0 ${-style.size * 0.06} 0; to: 0 ${style.size * 0.09} 0; dir: alternate; loop: true; dur: 1650; easing: easeInOutSine`
                }
            >
                {isPin ? null : (
                    <>
                        <a-ring
                            radius-inner={style.size * 1.15}
                            radius-outer={style.size * 1.3}
                            material={`color: ${style.color}; shader: flat; opacity: ${draft ? 0.22 : 0.62}; transparent: true; depthWrite: false`}
                            animation__halo={
                                pulse
                                    ? 'property: scale; from: 0.82 0.82 0.82; to: 1.55 1.55 1.55; loop: true; dur: 1250; easing: easeOutQuad'
                                    : undefined
                            }
                            animation__opacity={
                                pulse
                                    ? 'property: material.opacity; from: 0.62; to: 0.04; loop: true; dur: 1250; easing: easeOutQuad'
                                    : undefined
                            }
                        />
                        <a-ring
                            radius-inner={style.size * 1.38}
                            radius-outer={style.size * 1.44}
                            material={`color: ${style.hover_color}; shader: flat; opacity: ${draft ? 0.1 : 0.3}; transparent: true; depthWrite: false`}
                            animation__halo={
                                pulse
                                    ? 'property: scale; from: 0.78 0.78 0.78; to: 1.38 1.38 1.38; loop: true; dur: 1650; delay: 340; easing: easeOutSine'
                                    : undefined
                            }
                            animation__opacity={
                                pulse
                                    ? 'property: material.opacity; from: 0.32; to: 0.02; loop: true; dur: 1650; delay: 340; easing: easeOutSine'
                                    : undefined
                            }
                        />
                        <a-circle
                            radius={style.size * 1.16}
                            position="0 0 -0.018"
                            material="color: #020617; shader: flat; opacity: 0.82; transparent: true; depthWrite: false"
                        />
                        <a-ring
                            radius-inner={style.size * 1.06}
                            radius-outer={style.size * 1.18}
                            position="0 0 -0.012"
                            material={`color: ${style.hover_color}; shader: flat; opacity: 0.82; transparent: true; depthWrite: false`}
                        />
                    </>
                )}
                {core}
                <a-entity
                    className="tour-hotspot-label"
                    data-visibility={style.label_visibility}
                    position={`0 ${labelLayout.positionY} 0.025`}
                    tour-billboard=""
                    visible={labelVisible ? 'true' : 'false'}
                    animation__labelin={
                        reducedMotion
                            ? undefined
                            : 'property: scale; from: 0.82 0.82 0.82; to: 1 1 1; dur: 220; easing: easeOutBack; startEvents: tour-label-show'
                    }
                >
                    {isPin ? (
                        <>
                            <a-plane
                                width={labelLayout.width + 0.05}
                                height={labelLayout.height + 0.05}
                                position="0.012 -0.014 -0.012"
                                material="color: #0f172a; shader: flat; opacity: 0.16; transparent: true; depthTest: false; depthWrite: false"
                            />
                            <a-plane
                                width={labelLayout.width}
                                height={labelLayout.height}
                                material="color: #ffffff; shader: flat; opacity: 0.98; transparent: true; depthTest: false; depthWrite: false"
                            />
                            <a-triangle
                                vertex-a={`0 ${-(labelLayout.height / 2 + 0.055)} 0.004`}
                                vertex-b={`${-0.055} ${-(labelLayout.height / 2 - 0.004)} 0.004`}
                                vertex-c={`${0.055} ${-(labelLayout.height / 2 - 0.004)} 0.004`}
                                material="color: #ffffff; shader: flat; opacity: 0.98; depthTest: false; depthWrite: false"
                            />
                            <a-text
                                value={labelLayout.displayLabel}
                                align="center"
                                color="#1f2937"
                                position="0 0 0.018"
                                width={labelLayout.textWidth}
                            />
                        </>
                    ) : (
                        <>
                            <a-plane
                                width={labelLayout.width + 0.07}
                                height={labelLayout.height + 0.07}
                                position="0 -0.025 -0.012"
                                material="color: #000000; shader: flat; opacity: 0.42; transparent: true; depthTest: false; depthWrite: false"
                            />
                            <a-plane
                                width={labelLayout.width}
                                height={labelLayout.height}
                                material={`color: ${style.color}; shader: flat; opacity: 0.98; transparent: true; depthTest: false; depthWrite: false`}
                            />
                            <a-plane
                                width={labelLayout.width - 0.045}
                                height={labelLayout.height - 0.045}
                                position="0 0 0.006"
                                material="color: #020617; shader: flat; opacity: 0.96; transparent: true; depthTest: false; depthWrite: false"
                            />
                            <a-plane
                                width="0.035"
                                height={labelLayout.height - 0.11}
                                position={`${-labelLayout.width / 2 + 0.045} 0 0.012`}
                                material={`color: ${style.color}; shader: flat; opacity: 1; depthTest: false; depthWrite: false`}
                            />
                            <a-circle
                                radius="0.06"
                                segments="3"
                                position={`0 ${-(labelLayout.height / 2 + 0.045)} 0.004`}
                                rotation="0 0 180"
                                material={`color: ${style.color}; shader: flat; opacity: 0.98; depthTest: false; depthWrite: false`}
                            />
                            <a-text
                                value={labelLayout.displayLabel}
                                align="center"
                                color={style.text_color}
                                position="0.015 0 0.018"
                                width={labelLayout.textWidth}
                            />
                        </>
                    )}
                </a-entity>
            </a-entity>
        </a-entity>
    );
}

function flatLabelMaterial(color: string, opacity: number): string {
    return `color: ${color}; shader: flat; opacity: ${opacity}; transparent: true; depthTest: false; depthWrite: false`;
}

function standaloneLabelStyle(label: Project360Label): Project360LabelStyle {
    return {
        color: label.color,
        background_color: label.background_color,
        border_color: label.border_color,
        border_width: label.border_width,
        font: label.font,
        size: label.size,
        width: label.width,
        height: label.height,
        rotation: label.rotation,
        shape: resolveProject360LabelShape(label.shape),
        visibility: resolveProject360BadgeVisibility(label.visibility),
    };
}

function polygonLabelStyle(polygon: Project360Polygon): Project360LabelStyle {
    return {
        color: polygon.label_color,
        background_color: polygon.label_background_color,
        border_color: polygon.label_border_color,
        border_width: polygon.label_border_width,
        font: polygon.label_font,
        size: polygon.label_size,
        width: polygon.label_width,
        height: polygon.label_height,
        rotation: polygon.label_rotation,
        shape: resolveProject360LabelShape(polygon.label_shape),
        visibility: resolveProject360BadgeVisibility(polygon.label_visibility),
    };
}

function LabelBadgeMeshes({
    text,
    style,
    draft = false,
    selected = false,
    hitArea = false,
}: {
    text: string;
    style: Project360LabelStyle;
    draft?: boolean;
    selected?: boolean;
    hitArea?: boolean;
}) {
    const layout = project360LabelBoxLayout(text, style);
    const fillOpacity = draft ? 0.7 : selected ? 0.98 : 0.94;
    const borderOpacity = draft ? 0.55 : 0.96;
    const shape = style.shape;
    const border = Math.max(0, style.border_width);
    const width = layout.width;
    const height = layout.height;
    const textNode = (
        <a-text
            value={layout.displayLabel}
            font={resolveProject360LabelFont(style.font)}
            align="center"
            color={style.color}
            position="0 0 0.02"
            width={layout.textWidth}
            wrap-count="24"
            side="double"
        />
    );

    if (shape === 'none') {
        return (
            <>
                {hitArea ? (
                    <a-plane
                        className="tour-label-hit-area"
                        width={width}
                        height={height}
                        material="opacity: 0; transparent: true; depthWrite: false"
                    />
                ) : null}
                {textNode}
            </>
        );
    }

    if (shape === 'pill') {
        const bodyWidth = Math.max(0.08, width - height);
        const fillRadius = height / 2;
        const borderRadius = fillRadius + border;

        return (
            <>
                {border > 0 ? (
                    <>
                        <a-plane
                            width={bodyWidth}
                            height={height + border * 2}
                            position="0 0 -0.012"
                            material={flatLabelMaterial(
                                style.border_color,
                                borderOpacity,
                            )}
                        />
                        <a-circle
                            radius={borderRadius}
                            position={`${(-bodyWidth / 2).toFixed(4)} 0 -0.012`}
                            material={flatLabelMaterial(
                                style.border_color,
                                borderOpacity,
                            )}
                        />
                        <a-circle
                            radius={borderRadius}
                            position={`${(bodyWidth / 2).toFixed(4)} 0 -0.012`}
                            material={flatLabelMaterial(
                                style.border_color,
                                borderOpacity,
                            )}
                        />
                    </>
                ) : null}
                <a-plane
                    className={hitArea ? 'tour-label-hit-area' : undefined}
                    width={bodyWidth}
                    height={height}
                    material={flatLabelMaterial(
                        style.background_color,
                        fillOpacity,
                    )}
                />
                <a-circle
                    radius={fillRadius}
                    position={`${(-bodyWidth / 2).toFixed(4)} 0 0.002`}
                    material={flatLabelMaterial(
                        style.background_color,
                        fillOpacity,
                    )}
                />
                <a-circle
                    radius={fillRadius}
                    position={`${(bodyWidth / 2).toFixed(4)} 0 0.002`}
                    material={flatLabelMaterial(
                        style.background_color,
                        fillOpacity,
                    )}
                />
                {textNode}
            </>
        );
    }

    const outerWidth = width + border * 2;
    const outerHeight = height + border * 2;
    const corner = shape === 'rounded' ? Math.min(0.09, height * 0.28) : 0;

    return (
        <>
            {border > 0 ? (
                <a-plane
                    width={outerWidth}
                    height={outerHeight}
                    position="0 0 -0.012"
                    material={flatLabelMaterial(
                        style.border_color,
                        borderOpacity,
                    )}
                />
            ) : null}
            {shape === 'rounded' && border > 0
                ? (
                      [
                          [-outerWidth / 2, outerHeight / 2],
                          [outerWidth / 2, outerHeight / 2],
                          [-outerWidth / 2, -outerHeight / 2],
                          [outerWidth / 2, -outerHeight / 2],
                      ] as const
                  ).map(([x, y]) => (
                      <a-circle
                          key={`border-${x}-${y}`}
                          radius={corner + border}
                          position={`${x.toFixed(4)} ${y.toFixed(4)} -0.012`}
                          material={flatLabelMaterial(
                              style.border_color,
                              borderOpacity,
                          )}
                      />
                  ))
                : null}
            <a-plane
                className={hitArea ? 'tour-label-hit-area' : undefined}
                width={width}
                height={height}
                material={flatLabelMaterial(
                    style.background_color,
                    fillOpacity,
                )}
            />
            {shape === 'rounded'
                ? (
                      [
                          [-width / 2, height / 2],
                          [width / 2, height / 2],
                          [-width / 2, -height / 2],
                          [width / 2, -height / 2],
                      ] as const
                  ).map(([x, y]) => (
                      <a-circle
                          key={`fill-${x}-${y}`}
                          radius={corner}
                          position={`${x.toFixed(4)} ${y.toFixed(4)} 0.002`}
                          material={flatLabelMaterial(
                              style.background_color,
                              fillOpacity,
                          )}
                      />
                  ))
                : null}
            {shape === 'tag' ? (
                <a-circle
                    segments="3"
                    radius={height * 0.42}
                    position={`${(-width / 2 - 0.02).toFixed(4)} 0 0.004`}
                    rotation="0 0 90"
                    material={flatLabelMaterial(
                        style.background_color,
                        fillOpacity,
                    )}
                />
            ) : null}
            {textNode}
        </>
    );
}

function StandaloneLabelEntity({
    label,
    draft = false,
    selected = false,
    reducedMotion = false,
}: {
    label: Project360Label;
    draft?: boolean;
    selected?: boolean;
    reducedMotion?: boolean;
}) {
    const style = standaloneLabelStyle(label);
    const interactive = !draft && label.id >= 0;
    const expanded = draft || selected || style.visibility === 'always';

    return (
        <a-entity
            className={interactive ? 'tour-label' : undefined}
            data-label-id={interactive ? label.id : undefined}
            position={pointPosition(label.yaw, label.pitch, 3.95)}
            scale={`${label.size} ${label.size} ${label.size}`}
            tour-billboard=""
            title={label.text}
        >
            <a-entity
                rotation={`0 0 ${label.rotation}`}
                animation__appear={
                    reducedMotion || draft
                        ? undefined
                        : 'property: scale; from: 0.55 0.55 0.55; to: 1 1 1; dur: 420; easing: easeOutBack'
                }
            >
                {expanded ? (
                    <LabelBadgeMeshes
                        text={label.text}
                        style={style}
                        draft={draft}
                        selected={selected}
                        hitArea={interactive}
                    />
                ) : (
                    <>
                        <a-circle
                            className={
                                interactive ? 'tour-label-hit-area' : undefined
                            }
                            radius="0.12"
                            material={flatLabelMaterial(
                                style.border_color,
                                0.95,
                            )}
                        />
                        <a-circle
                            radius="0.08"
                            position="0 0 0.006"
                            material={flatLabelMaterial(
                                style.background_color,
                                0.98,
                            )}
                        />
                        <a-circle
                            radius="0.035"
                            position="0 0 0.01"
                            material={flatLabelMaterial(style.color, 1)}
                        />
                    </>
                )}
            </a-entity>
        </a-entity>
    );
}

function PolygonLabelEntity({
    polygon,
    selected,
}: {
    polygon: Project360Polygon;
    selected: boolean;
}) {
    const centroid = polygonCentroid(polygon.vertices);
    const labelText = polygon.label_text?.trim() ?? '';
    const style = polygonLabelStyle(polygon);
    const position = resolvePolygonLabelPosition({
        vertices: polygon.vertices,
        label_yaw: polygon.label_yaw,
        label_pitch: polygon.label_pitch,
        centroid,
    });

    if (labelText === '') {
        return null;
    }

    if (style.visibility === 'click' && !selected) {
        return null;
    }

    return (
        <a-entity
            position={pointPosition(position.yaw, position.pitch, 3.95)}
            scale={`${polygon.label_size} ${polygon.label_size} ${polygon.label_size}`}
            tour-billboard=""
        >
            <a-entity rotation={`0 0 ${polygon.label_rotation}`}>
                <LabelBadgeMeshes
                    text={labelText}
                    style={style}
                    selected={selected}
                />
            </a-entity>
        </a-entity>
    );
}

function PolygonEntity({
    polygon,
    selected,
}: {
    polygon: Project360Polygon;
    selected: boolean;
}) {
    const interactive = polygon.id >= 0;
    const hasLabel = (polygon.label_text?.trim() ?? '') !== '';

    return (
        <a-entity
            className={interactive ? 'tour-polygon' : undefined}
            data-polygon-id={interactive ? polygon.id : undefined}
            tour-polygon-mesh={`vertices: ${JSON.stringify(polygon.vertices)}; color: ${polygon.color}; hoverColor: ${polygon.hover_color}; opacity: ${polygon.opacity}; selected: ${selected}`}
            title={polygon.title}
        >
            {hasLabel ? (
                <PolygonLabelEntity polygon={polygon} selected={selected} />
            ) : null}
        </a-entity>
    );
}

const Project360ViewerBase = forwardRef<
    Project360ViewerHandle,
    Project360ViewerProps
>(function Project360Viewer(
    {
        panoramas,
        hotspots,
        labels,
        polygons,
        settings,
        startPanoramaId,
        placementMode = false,
        draftPoint = null,
        draftStyle,
        editingHotspotId = null,
        editingLabelId = null,
        draftLabel = null,
        polygonDraft = [],
        polygonPreview = null,
        polygonDrawing = false,
        interactionLocked = false,
        editingPolygonId = null,
        selectedPolygonId = null,
        selectedLabelId = null,
        onPlacement,
        onPolygonClose,
        onPanoramaChange,
        onPolygonSelect,
        onLabelSelect,
        className = '',
    },
    ref,
) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<HTMLElement>(null);
    const cameraRef = useRef<HTMLElement>(null);
    const [aframeReady, setAframeReady] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [switching, setSwitching] = useState(false);
    const [internalPolygonId, setInternalPolygonId] = useState<number | null>(
        null,
    );
    const [internalLabelId, setInternalLabelId] = useState<number | null>(null);
    const [reducedMotion, setReducedMotion] = useState(false);
    const initialPanoramaId =
        panoramas.find((panorama) => panorama.id === startPanoramaId)?.id ??
        panoramas[0]?.id ??
        null;
    const [activePanoramaId, setActivePanoramaId] = useState<number | null>(
        initialPanoramaId,
    );

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updatePreference = () => setReducedMotion(media.matches);
        updatePreference();
        media.addEventListener('change', updatePreference);

        return () => media.removeEventListener('change', updatePreference);
    }, []);

    useEffect(() => {
        let active = true;

        if (!supportsWebGl()) {
            queueMicrotask(() => {
                if (active) {
                    setLoadError('Este dispositivo no tiene WebGL disponible.');
                }
            });

            return () => {
                active = false;
            };
        }

        void import('aframe')
            .then((module: AFrameModule) => {
                if (!active) {
                    return;
                }

                const aframe =
                    module.default ??
                    (
                        window as typeof window & {
                            AFRAME?: Parameters<
                                typeof registerProject360Components
                            >[0];
                        }
                    ).AFRAME;

                if (!aframe) {
                    throw new Error('A-Frame no se registró en el navegador.');
                }

                registerProject360Components(aframe);
                setAframeReady(true);
            })
            .catch(() => {
                if (active) {
                    setLoadError('No se pudo iniciar el visor 360.');
                }
            });

        return () => {
            active = false;
        };
    }, []);

    const resolvedActivePanoramaId = panoramas.some(
        (panorama) => panorama.id === activePanoramaId,
    )
        ? activePanoramaId
        : initialPanoramaId;
    const activePanorama = useMemo(
        () =>
            panoramas.find(
                (panorama) => panorama.id === resolvedActivePanoramaId,
            ) ?? null,
        [panoramas, resolvedActivePanoramaId],
    );
    const activeHotspots = useMemo(
        () =>
            hotspots.filter(
                (hotspot) =>
                    hotspot.source_panorama_id === resolvedActivePanoramaId &&
                    hotspot.id !== editingHotspotId,
            ),
        [editingHotspotId, hotspots, resolvedActivePanoramaId],
    );
    const activeLabels = useMemo(
        () =>
            labels.filter(
                (label) =>
                    label.source_panorama_id === resolvedActivePanoramaId &&
                    label.id !== editingLabelId,
            ),
        [editingLabelId, labels, resolvedActivePanoramaId],
    );
    const activePolygons = useMemo(
        () =>
            polygons.filter(
                (polygon) =>
                    polygon.source_panorama_id === resolvedActivePanoramaId &&
                    polygon.id !== editingPolygonId,
            ),
        [editingPolygonId, polygons, resolvedActivePanoramaId],
    );
    const effectiveSelectedPolygonId = selectedPolygonId ?? internalPolygonId;
    const selectedPolygon = activePolygons.find(
        (polygon) => polygon.id === effectiveSelectedPolygonId,
    );
    const effectiveSelectedLabelId = selectedLabelId ?? internalLabelId;

    const selectPanorama = useCallback(
        (panoramaId: number) => {
            if (
                panoramaId === resolvedActivePanoramaId ||
                switching ||
                placementMode ||
                interactionLocked
            ) {
                return;
            }

            const panorama = panoramas.find((item) => item.id === panoramaId);
            if (!panorama) {
                setLoadError('El panorama seleccionado ya no está disponible.');

                return;
            }

            setSwitching(true);
            const image = new Image();
            image.onload = () => {
                setActivePanoramaId(panorama.id);
                setInternalPolygonId(null);
                setInternalLabelId(null);
                onPolygonSelect?.(null);
                onLabelSelect?.(null);
                onPanoramaChange?.(panorama.id);
                window.setTimeout(
                    () => setSwitching(false),
                    reducedMotion ? 0 : 180,
                );
                setLoadError(null);
            };
            image.onerror = () => {
                setSwitching(false);
                setLoadError('No se pudo cargar el panorama seleccionado.');
            };
            image.src = panorama.viewer_url;
        },
        [
            onPanoramaChange,
            onPolygonSelect,
            onLabelSelect,
            panoramas,
            interactionLocked,
            placementMode,
            reducedMotion,
            resolvedActivePanoramaId,
            switching,
        ],
    );

    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene || !aframeReady) {
            return;
        }

        const onPlacementSelected = (event: Event) => {
            if (placementMode) {
                onPlacement?.(
                    pointToAngles(
                        (event as CustomEvent<Project360Point>).detail,
                    ),
                );
            }
        };
        scene.addEventListener('tour-placement-selected', onPlacementSelected);
        const interactiveElements = Array.from(
            scene.querySelectorAll<HTMLElement>(
                '.tour-hotspot, .tour-polygon, .tour-label',
            ),
        );
        const listeners = interactiveElements.map((element) => {
            const listener = () => {
                if (placementMode || interactionLocked) {
                    return;
                }

                if (element.classList.contains('tour-polygon')) {
                    const polygonId = Number(element.dataset.polygonId);
                    if (Number.isFinite(polygonId)) {
                        setInternalPolygonId(polygonId);
                        setInternalLabelId(null);
                        onPolygonSelect?.(polygonId);
                        onLabelSelect?.(null);
                    }

                    return;
                }

                if (element.classList.contains('tour-label')) {
                    const labelId = Number(element.dataset.labelId);
                    if (Number.isFinite(labelId)) {
                        onLabelSelect?.(labelId);
                        onPolygonSelect?.(null);
                        setInternalPolygonId(null);
                        setInternalLabelId(labelId);
                    }

                    return;
                }

                const target = Number(element.dataset.targetPanoramaId);
                if (Number.isFinite(target)) {
                    selectPanorama(target);
                }
            };
            element.addEventListener('click', listener);

            return { element, listener };
        });
        const closeTarget = scene.querySelector<HTMLElement>(
            '.polygon-close-target',
        );
        const closeListener = (event: Event) => {
            event.stopPropagation();
            onPolygonClose?.();
        };
        closeTarget?.addEventListener('click', closeListener);

        return () => {
            scene.removeEventListener(
                'tour-placement-selected',
                onPlacementSelected,
            );
            listeners.forEach(({ element, listener }) =>
                element.removeEventListener('click', listener),
            );
            closeTarget?.removeEventListener('click', closeListener);
        };
    }, [
        activeHotspots,
        activeLabels,
        activePolygons,
        aframeReady,
        interactionLocked,
        onPlacement,
        onPolygonClose,
        onPolygonSelect,
        onLabelSelect,
        placementMode,
        polygonDraft.length,
        polygonDrawing,
        selectPanorama,
    ]);

    useImperativeHandle(ref, () => ({
        getViewAngles: () => {
            const rotation = cameraRef.current?.getAttribute(
                'rotation',
            ) as unknown as Rotation | null;

            return {
                yaw: Number(normalizeYaw(rotation?.y ?? 0).toFixed(3)),
                pitch: Number(
                    Math.max(-85, Math.min(85, rotation?.x ?? 0)).toFixed(3),
                ),
            };
        },
    }));

    const openFullscreen = async () => {
        if (!containerRef.current) {
            return;
        }

        if (document.fullscreenElement) {
            await document.exitFullscreen();
        } else {
            await containerRef.current.requestFullscreen();
        }
    };

    if (panoramas.length === 0) {
        return (
            <div
                className={`flex min-h-96 items-center justify-center rounded-xl border border-dashed bg-slate-950 p-8 text-center text-slate-200 ${className}`}
            >
                <div>
                    <Rotate3D className="mx-auto mb-3 h-10 w-10 text-orange-400" />
                    <p className="font-semibold">Tour 360 sin panoramas</p>
                    <p className="mt-1 text-sm text-slate-400">
                        Sube una imagen panorámica ~2:1 para comenzar.
                    </p>
                </div>
            </div>
        );
    }

    const effectiveDraftStyle: Project360HotspotStyle = draftStyle ?? {
        color: settings.hotspot_color,
        hover_color: settings.hotspot_hover_color,
        text_color: settings.hotspot_text_color,
        size: settings.hotspot_size,
        shape: settings.hotspot_shape,
        label_visibility: settings.hotspot_label_visibility,
        pulse_enabled: settings.hotspot_pulse_enabled,
    };
    const canClosePolygon = polygonDrawing && polygonDraft.length >= 3;
    const raycastTargets = project360RaycastTargets(
        placementMode,
        canClosePolygon,
        interactionLocked,
    );
    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden rounded-xl bg-slate-950 shadow-xl ${className}`}
        >
            {!aframeReady || !activePanorama ? (
                <div className="flex h-full min-h-96 items-center justify-center text-white">
                    <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                    Preparando visor 360…
                </div>
            ) : (
                <a-scene
                    ref={sceneRef}
                    embedded
                    cursor="rayOrigin: mouse"
                    raycaster={`objects: ${raycastTargets.pointer}`}
                    renderer="colorManagement: true; antialias: true"
                    xr-mode-ui="enabled: true"
                    loading-screen="enabled: false"
                    style={{
                        height: '100%',
                        minHeight: '32rem',
                        width: '100%',
                        cursor: placementMode ? 'crosshair' : 'grab',
                    }}
                >
                    <a-assets timeout="15000">
                        <img
                            id={`tour-panorama-${activePanorama.id}`}
                            src={activePanorama.viewer_url}
                            crossOrigin="anonymous"
                            alt=""
                            onError={() =>
                                setLoadError(
                                    'No se pudo cargar el panorama seleccionado.',
                                )
                            }
                        />
                    </a-assets>
                    <a-sky
                        key={activePanorama.id}
                        className={
                            placementMode
                                ? 'hotspot-placement-surface'
                                : undefined
                        }
                        src={`#tour-panorama-${activePanorama.id}`}
                        material="shader: flat"
                        tour-placement-surface={placementMode ? '' : undefined}
                    />
                    {activePolygons.map((polygon) => (
                        <PolygonEntity
                            key={polygon.id}
                            polygon={polygon}
                            selected={polygon.id === effectiveSelectedPolygonId}
                        />
                    ))}
                    {polygonPreview ? (
                        <PolygonEntity polygon={polygonPreview} selected />
                    ) : null}
                    {polygonDrawing
                        ? polygonDraft.map((vertex, index) => (
                              <a-sphere
                                  key={`${vertex.yaw}-${vertex.pitch}-${index}`}
                                  position={pointPosition(
                                      vertex.yaw,
                                      vertex.pitch,
                                      3.87,
                                  )}
                                  className={
                                      index === 0 && canClosePolygon
                                          ? 'polygon-close-target'
                                          : undefined
                                  }
                                  radius={index === 0 ? '0.065' : '0.045'}
                                  material={`color: ${settings.accent_color}; shader: flat`}
                                  animation__closepulse={
                                      index === 0 &&
                                      canClosePolygon &&
                                      !reducedMotion
                                          ? 'property: scale; from: 1 1 1; to: 1.35 1.35 1.35; dir: alternate; loop: true; dur: 650; easing: easeInOutSine'
                                          : undefined
                                  }
                              >
                                  {index === 0 && canClosePolygon ? (
                                      <a-sphere
                                          radius="0.16"
                                          material="color: #ffffff; opacity: 0.001; transparent: true; depthWrite: false"
                                      />
                                  ) : null}
                              </a-sphere>
                          ))
                        : null}
                    {polygonDrawing
                        ? polygonDraft
                              .slice(1)
                              .map((vertex, index) => (
                                  <a-entity
                                      key={`line-${vertex.yaw}-${vertex.pitch}-${index}`}
                                      line={`start: ${pointPosition(
                                          polygonDraft[index].yaw,
                                          polygonDraft[index].pitch,
                                          3.86,
                                      )}; end: ${pointPosition(
                                          vertex.yaw,
                                          vertex.pitch,
                                          3.86,
                                      )}; color: ${settings.accent_color}; opacity: 0.9`}
                                  />
                              ))
                        : null}
                    {activeHotspots.map((hotspot) => (
                        <HotspotMarker
                            key={hotspot.id}
                            hotspot={hotspot}
                            reducedMotion={reducedMotion}
                        />
                    ))}
                    {activeLabels.map((label) => (
                        <StandaloneLabelEntity
                            key={label.id}
                            label={label}
                            selected={label.id === effectiveSelectedLabelId}
                            reducedMotion={reducedMotion}
                        />
                    ))}
                    {draftLabel ? (
                        <StandaloneLabelEntity
                            draft
                            label={draftLabel}
                            reducedMotion
                        />
                    ) : null}
                    {draftPoint ? (
                        <HotspotMarker
                            draft
                            reducedMotion
                            hotspot={{
                                id: -1,
                                label: 'Vista previa',
                                target_panorama_id: 0,
                                yaw: draftPoint.yaw,
                                pitch: draftPoint.pitch,
                                style: effectiveDraftStyle,
                            }}
                        />
                    ) : null}
                    <a-camera
                        key={activePanorama.id}
                        ref={cameraRef}
                        position="0 1.6 0"
                        rotation={`${activePanorama.initial_pitch} ${activePanorama.initial_yaw} 0`}
                        look-controls="pointerLockEnabled: false; magicWindowTrackingEnabled: true"
                        tour-initial-orientation={`yaw: ${activePanorama.initial_yaw}; pitch: ${activePanorama.initial_pitch}`}
                        wasd-controls="enabled: false"
                    />
                    <a-entity
                        laser-controls="hand: right"
                        raycaster={`objects: ${raycastTargets.pointer}`}
                    />
                </a-scene>
            )}

            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between bg-gradient-to-b from-black/75 to-transparent p-3 text-white">
                <div className="pointer-events-auto flex items-center gap-2 rounded-lg bg-black/40 px-3 py-2 text-sm backdrop-blur">
                    <Rotate3D className="h-4 w-4" />
                    <span className="max-w-48 truncate">
                        {activePanorama?.title ?? 'Vista 360'}
                    </span>
                </div>
                <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="pointer-events-auto"
                    onClick={() => void openFullscreen()}
                    title="Pantalla completa"
                >
                    <Expand className="h-4 w-4" />
                </Button>
            </div>

            {placementMode ? (
                <div className="pointer-events-none absolute inset-x-3 top-16 z-20 rounded-lg bg-orange-500/95 px-4 py-3 text-center text-sm font-medium text-white shadow-lg">
                    {polygonDrawing
                        ? canClosePolygon
                            ? 'Agrega más puntos o pulsa el primer vértice para cerrar.'
                            : 'Pulsa el panorama para agregar al menos tres vértices.'
                        : 'Pulsa el punto exacto del panorama. Arrastrar solo gira la cámara.'}
                </div>
            ) : null}

            {selectedPolygon ? (
                <div className="absolute top-16 right-3 z-30 w-80 max-w-[calc(100%-1.5rem)] rounded-xl border border-white/15 bg-slate-950/94 p-4 text-white shadow-2xl backdrop-blur">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wide text-orange-300 uppercase">
                                <Info className="h-3.5 w-3.5" />{' '}
                                {selectedPolygon.lot
                                    ? 'Lote del proyecto'
                                    : 'Zona destacada'}
                            </div>
                            <p className="font-semibold">
                                {selectedPolygon.title}
                            </p>
                            {selectedPolygon.lot?.status ? (
                                <span
                                    className="mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                                    style={{
                                        backgroundColor:
                                            selectedPolygon.lot.status.color,
                                    }}
                                >
                                    {selectedPolygon.lot.status.name}
                                </span>
                            ) : null}
                            {selectedPolygon.description ? (
                                <p className="mt-1 text-sm text-slate-300">
                                    {selectedPolygon.description}
                                </p>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            className="rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-white"
                            onClick={() => {
                                setInternalPolygonId(null);
                                onPolygonSelect?.(null);
                            }}
                            aria-label="Cerrar información del polígono"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ) : null}

            <div className="absolute inset-x-0 bottom-0 z-10 flex gap-2 overflow-x-auto bg-gradient-to-t from-black/85 to-transparent p-3 pt-10">
                {panoramas.map((panorama) => (
                    <button
                        key={panorama.id}
                        type="button"
                        disabled={placementMode || interactionLocked}
                        onClick={() => selectPanorama(panorama.id)}
                        className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${
                            panorama.id === resolvedActivePanoramaId
                                ? 'text-white shadow-lg'
                                : 'bg-black/55 text-slate-100 hover:bg-black/75'
                        }`}
                        style={
                            panorama.id === resolvedActivePanoramaId
                                ? { backgroundColor: settings.accent_color }
                                : undefined
                        }
                    >
                        {panorama.title}
                    </button>
                ))}
            </div>

            {switching ? (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/55 text-white backdrop-blur-sm transition-opacity">
                    <Sparkles className="mr-2 h-5 w-5 animate-pulse text-orange-300" />
                    Cargando panorama…
                </div>
            ) : null}

            {loadError ? (
                <div className="absolute inset-x-3 top-16 z-50 rounded-lg bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
                    {loadError}
                </div>
            ) : null}
        </div>
    );
});

export const Project360Viewer = memo(Project360ViewerBase);
