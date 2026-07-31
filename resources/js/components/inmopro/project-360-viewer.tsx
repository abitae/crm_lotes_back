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
import type {
    Project360Hotspot,
    Project360HotspotStyle,
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
    polygons: Project360Polygon[];
    settings: Project360TourSettings;
    startPanoramaId: number | null;
    placementMode?: boolean;
    draftPoint?: Project360Angles | null;
    draftStyle?: Project360HotspotStyle;
    editingHotspotId?: number | null;
    polygonDraft?: Project360Angles[];
    polygonPreview?: Project360Polygon | null;
    polygonDrawing?: boolean;
    interactionLocked?: boolean;
    editingPolygonId?: number | null;
    selectedPolygonId?: number | null;
    onPlacement?: (angles: Project360Angles) => void;
    onPolygonClose?: () => void;
    onPanoramaChange?: (panoramaId: number) => void;
    onPolygonSelect?: (polygonId: number | null) => void;
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
    const labelVisible = style.label_visibility === 'always';
    const pulse = style.pulse_enabled && !draft && !reducedMotion;
    const markerRotation = `${hotspot.pitch} ${-hotspot.yaw} 0`;
    const coreMaterial = `color: ${style.color}; shader: flat; opacity: ${draft ? 0.72 : 1}; transparent: true`;

    const core =
        style.shape === 'ring' ? (
            <a-ring
                className="tour-hotspot-core"
                radius-inner={style.size * 0.52}
                radius-outer={style.size}
                material={coreMaterial}
            />
        ) : style.shape === 'pin' ? (
            <a-entity>
                <a-sphere
                    className="tour-hotspot-core"
                    radius={style.size * 0.7}
                    material={coreMaterial}
                />
                <a-cone
                    radius-bottom={style.size * 0.4}
                    radius-top="0"
                    height={style.size * 1.2}
                    position={`0 ${-style.size * 0.95} 0`}
                    material={coreMaterial}
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
                    : 'property: scale; from: 0.45 0.45 0.45; to: 1 1 1; dur: 360; easing: easeOutBack'
            }
            animation__hoverin={
                draft || reducedMotion
                    ? undefined
                    : 'property: scale; to: 1.14 1.14 1.14; dur: 180; easing: easeOutQuad; startEvents: tour-hover-start'
            }
            animation__hoverout={
                draft || reducedMotion
                    ? undefined
                    : 'property: scale; to: 1 1 1; dur: 180; easing: easeOutQuad; startEvents: tour-hover-end,tour-press-end'
            }
            animation__press={
                draft || reducedMotion
                    ? undefined
                    : 'property: scale; to: 0.9 0.9 0.9; dur: 90; easing: easeOutQuad; startEvents: tour-press-start'
            }
            title={hotspot.label}
        >
            <a-sphere
                radius={style.size * 1.65}
                material="opacity: 0; transparent: true; depthWrite: false"
            />
            <a-ring
                radius-inner={style.size * 1.15}
                radius-outer={style.size * 1.32}
                material={`color: ${style.color}; shader: flat; opacity: ${draft ? 0.22 : 0.55}; transparent: true; depthWrite: false`}
                animation__halo={
                    pulse
                        ? 'property: scale; from: 0.8 0.8 0.8; to: 1.42 1.42 1.42; dir: alternate; loop: true; dur: 1050; easing: easeInOutSine'
                        : undefined
                }
                animation__opacity={
                    pulse
                        ? 'property: material.opacity; from: 0.65; to: 0.16; dir: alternate; loop: true; dur: 1050; easing: easeInOutSine'
                        : undefined
                }
            />
            {core}
            <a-entity
                className="tour-hotspot-label"
                data-visibility={style.label_visibility}
                position={`0 ${style.size * 2.35} 0.02`}
                visible={labelVisible ? 'true' : 'false'}
            >
                <a-plane
                    width={Math.max(0.75, hotspot.label.length * 0.055)}
                    height="0.25"
                    material="color: #0f172a; shader: flat; opacity: 0.88; transparent: true"
                />
                <a-text
                    value={hotspot.label || 'Nuevo hotspot'}
                    align="center"
                    color={style.text_color}
                    position="0 0 0.01"
                    width={Math.max(2.6, style.size * 19)}
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
    const centroid = polygonCentroid(polygon.vertices);
    const label = polygon.lot ? `Lote ${polygon.lot.number}` : polygon.title;
    const interactive = polygon.id >= 0;

    return (
        <a-entity
            className={interactive ? 'tour-polygon' : undefined}
            data-polygon-id={interactive ? polygon.id : undefined}
            tour-polygon-mesh={`vertices: ${JSON.stringify(polygon.vertices)}; color: ${polygon.color}; hoverColor: ${polygon.hover_color}; opacity: ${polygon.opacity}; selected: ${selected}`}
            title={polygon.title}
        >
            <a-entity
                position={pointPosition(centroid.yaw, centroid.pitch, 3.88)}
                rotation={`${centroid.pitch} ${-centroid.yaw} 0`}
                visible={polygon.lot || selected ? 'true' : 'false'}
            >
                <a-plane
                    width="0.9"
                    height="0.28"
                    material="color: #0f172a; shader: flat; opacity: 0.88; transparent: true; depthWrite: false"
                />
                <a-text
                    value={label}
                    align="center"
                    color="#ffffff"
                    position="0 0 0.01"
                    width="2.6"
                />
            </a-entity>
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
        polygons,
        settings,
        startPanoramaId,
        placementMode = false,
        draftPoint = null,
        draftStyle,
        editingHotspotId = null,
        polygonDraft = [],
        polygonPreview = null,
        polygonDrawing = false,
        interactionLocked = false,
        editingPolygonId = null,
        selectedPolygonId = null,
        onPlacement,
        onPolygonClose,
        onPanoramaChange,
        onPolygonSelect,
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
                onPolygonSelect?.(null);
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
            scene.querySelectorAll<HTMLElement>('.tour-hotspot, .tour-polygon'),
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
                        onPolygonSelect?.(polygonId);
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
        activePolygons,
        aframeReady,
        interactionLocked,
        onPlacement,
        onPolygonClose,
        onPolygonSelect,
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
                        Sube una imagen panorámica 2:1 para comenzar.
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
    const raycastObjects = placementMode
        ? canClosePolygon
            ? '.hotspot-placement-surface, .polygon-close-target'
            : '.hotspot-placement-surface'
        : interactionLocked
          ? '.tour-noninteractive'
          : '.tour-hotspot, .tour-polygon';
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
                    raycaster={`objects: ${raycastObjects}`}
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
                        wasd-controls="enabled: false"
                    >
                        <a-cursor
                            fuse="false"
                            raycaster={`objects: ${raycastObjects}`}
                            color={settings.accent_color}
                        />
                    </a-camera>
                    <a-entity
                        laser-controls="hand: right"
                        raycaster={`objects: ${raycastObjects}`}
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
