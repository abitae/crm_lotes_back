import {
    Expand,
    Glasses,
    LoaderCircle,
    Map,
    MapPinned,
    Rotate3D,
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
    type Project360Angles,
    type Project360Point,
} from '@/lib/project-360-geometry';
import type {
    Project360FloorPlan,
    Project360Hotspot,
    Project360HotspotStyle,
    Project360Panorama,
    Project360TourSettings,
} from '@/types/project-360';

export type Project360ViewerHandle = {
    getViewAngles: () => Project360Angles;
};

type Project360ViewerProps = {
    panoramas: Project360Panorama[];
    hotspots: Project360Hotspot[];
    floorPlans?: Project360FloorPlan[];
    settings: Project360TourSettings;
    startPanoramaId: number | null;
    placementMode?: boolean;
    draftPoint?: Project360Angles | null;
    draftStyle?: Project360HotspotStyle;
    onPlacement?: (angles: Project360Angles) => void;
    onPanoramaChange?: (panoramaId: number) => void;
    className?: string;
};

type Rotation = { x: number; y: number; z: number };
type AFrameModule = {
    default?: Parameters<typeof registerProject360Components>[0];
};

function pointPosition(yaw: number, pitch: number): string {
    const point = anglesToPoint(yaw, pitch);

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
}: {
    hotspot: Pick<
        Project360Hotspot,
        'id' | 'label' | 'target_panorama_id' | 'yaw' | 'pitch'
    > & {
        style: Project360HotspotStyle;
    };
    draft?: boolean;
}) {
    const { style } = hotspot;
    const commonProps = {
        className: draft ? 'tour-hotspot-draft' : 'tour-hotspot',
        'data-target-panorama-id': hotspot.target_panorama_id,
        'data-color': style.color,
        'data-hover-color': style.hover_color,
        position: pointPosition(hotspot.yaw, hotspot.pitch),
        material: `color: ${style.color}; shader: flat; opacity: ${draft ? 0.75 : 1}`,
        'tour-hotspot-interaction': draft ? undefined : '',
        animation__pulse:
            style.pulse_enabled && !draft
                ? 'property: scale; from: 1 1 1; to: 1.22 1.22 1.22; dir: alternate; loop: true; dur: 900'
                : undefined,
        title: hotspot.label,
    };
    const labelVisible = style.label_visibility === 'always';
    const label = (
        <a-text
            className="tour-hotspot-label"
            data-visibility={style.label_visibility}
            value={hotspot.label || 'Nuevo hotspot'}
            align="center"
            color={style.text_color}
            position={`0 ${style.size * 2.4} 0`}
            width={Math.max(2.4, style.size * 18)}
            visible={labelVisible ? 'true' : 'false'}
        />
    );

    if (style.shape === 'ring') {
        return (
            <a-ring
                {...commonProps}
                radius-inner={style.size * 0.55}
                radius-outer={style.size}
                rotation={`${hotspot.pitch} ${-hotspot.yaw} 0`}
            >
                {label}
            </a-ring>
        );
    }

    if (style.shape === 'pin') {
        return (
            <a-sphere {...commonProps} radius={style.size * 0.72}>
                <a-cone
                    radius-bottom={style.size * 0.45}
                    radius-top="0"
                    height={style.size * 1.35}
                    position={`0 ${-style.size} 0`}
                    material={`color: ${style.color}; shader: flat`}
                />
                {label}
            </a-sphere>
        );
    }

    return (
        <a-sphere {...commonProps} radius={style.size}>
            {label}
        </a-sphere>
    );
}

const Project360ViewerBase = forwardRef<
    Project360ViewerHandle,
    Project360ViewerProps
>(function Project360Viewer(
    {
        panoramas,
        hotspots,
        floorPlans = [],
        settings,
        startPanoramaId,
        placementMode = false,
        draftPoint = null,
        draftStyle,
        onPlacement,
        onPanoramaChange,
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
    const [mapOpen, setMapOpen] = useState(false);
    const [immersiveMapOpen, setImmersiveMapOpen] = useState(false);
    const initialPanoramaId =
        panoramas.find((panorama) => panorama.id === startPanoramaId)?.id ??
        panoramas[0]?.id ??
        null;
    const [activePanoramaId, setActivePanoramaId] = useState<number | null>(
        initialPanoramaId,
    );

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
                    hotspot.source_panorama_id === resolvedActivePanoramaId,
            ),
        [hotspots, resolvedActivePanoramaId],
    );
    const activeFloorPlan = useMemo(
        () =>
            floorPlans.find(
                (floorPlan) => floorPlan.id === activePanorama?.floor_plan_id,
            ) ??
            floorPlans[0] ??
            null,
        [activePanorama?.floor_plan_id, floorPlans],
    );
    const [selectedFloorPlanId, setSelectedFloorPlanId] = useState<
        number | null
    >(activeFloorPlan?.id ?? null);
    const selectedFloorPlan =
        floorPlans.find((floorPlan) => floorPlan.id === selectedFloorPlanId) ??
        activeFloorPlan;

    const selectPanorama = useCallback(
        (panoramaId: number) => {
            if (
                panoramaId === resolvedActivePanoramaId ||
                switching ||
                placementMode
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
                setSelectedFloorPlanId(panorama.floor_plan_id);
                onPanoramaChange?.(panorama.id);
                setSwitching(false);
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
            panoramas,
            placementMode,
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
            if (!placementMode) {
                return;
            }

            onPlacement?.(
                pointToAngles((event as CustomEvent<Project360Point>).detail),
            );
        };
        scene.addEventListener('tour-placement-selected', onPlacementSelected);

        const hotspotElements = Array.from(
            scene.querySelectorAll<HTMLElement>(
                '.tour-hotspot, .tour-floor-plan-marker',
            ),
        );
        const listeners = hotspotElements.map((element) => {
            const listener = () => {
                const target = Number(element.dataset.targetPanoramaId);
                if (!placementMode && Number.isFinite(target)) {
                    selectPanorama(target);
                }
            };
            element.addEventListener('click', listener);

            return { element, listener };
        });

        return () => {
            scene.removeEventListener(
                'tour-placement-selected',
                onPlacementSelected,
            );
            listeners.forEach(({ element, listener }) =>
                element.removeEventListener('click', listener),
            );
        };
    }, [
        activeHotspots,
        aframeReady,
        immersiveMapOpen,
        onPlacement,
        placementMode,
        selectedFloorPlan,
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
        if (containerRef.current?.requestFullscreen) {
            await containerRef.current.requestFullscreen();
        }
    };

    if (panoramas.length === 0) {
        return (
            <div
                className={`flex min-h-96 items-center justify-center rounded-xl bg-slate-950 p-8 text-center text-slate-200 ${className}`}
            >
                <div>
                    <Glasses className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                    <p className="font-semibold">Tour 360 sin panoramas</p>
                    <p className="mt-1 text-sm text-slate-400">
                        Añade una imagen equirectangular para iniciar el
                        recorrido.
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
        label_visibility: 'always',
        pulse_enabled: false,
    };
    const raycastObjects = placementMode
        ? '.hotspot-placement-surface'
        : immersiveMapOpen
          ? '.tour-hotspot, .tour-floor-plan-marker'
          : '.tour-hotspot';

    return (
        <div
            ref={containerRef}
            className={`relative min-h-96 overflow-hidden rounded-xl bg-slate-950 ${className}`}
        >
            {!aframeReady || !activePanorama ? (
                <div className="absolute inset-0 z-20 flex items-center justify-center text-slate-200">
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
                        minHeight: '24rem',
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
                    {activeHotspots.map((hotspot) => (
                        <HotspotMarker key={hotspot.id} hotspot={hotspot} />
                    ))}
                    {draftPoint ? (
                        <HotspotMarker
                            draft
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
                        {immersiveMapOpen && selectedFloorPlan ? (
                            <a-entity position="0 -0.15 -1.5">
                                <a-image
                                    src={selectedFloorPlan.image_url}
                                    width="1.2"
                                    height="0.8"
                                    material="shader: flat"
                                />
                                <a-text
                                    value={selectedFloorPlan.title}
                                    align="center"
                                    color="#ffffff"
                                    position="0 0.48 0.01"
                                    width="2.8"
                                />
                                {selectedFloorPlan.markers.map((marker) => (
                                    <a-circle
                                        key={marker.panorama_id}
                                        className="tour-floor-plan-marker"
                                        data-target-panorama-id={
                                            marker.panorama_id
                                        }
                                        radius={
                                            marker.panorama_id ===
                                            resolvedActivePanoramaId
                                                ? '0.035'
                                                : '0.026'
                                        }
                                        position={`${(((marker.x - 50) / 100) * 1.2).toFixed(4)} ${(((50 - marker.y) / 100) * 0.8).toFixed(4)} 0.02`}
                                        material={`color: ${
                                            marker.panorama_id ===
                                            resolvedActivePanoramaId
                                                ? settings.accent_color
                                                : '#0f172a'
                                        }; shader: flat`}
                                    />
                                ))}
                            </a-entity>
                        ) : null}
                    </a-camera>
                    <a-entity
                        laser-controls="hand: right"
                        raycaster={`objects: ${raycastObjects}`}
                    />
                </a-scene>
            )}

            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent p-3 text-white">
                <div className="pointer-events-auto flex items-center gap-2 rounded-lg bg-black/35 px-3 py-2 text-sm backdrop-blur">
                    <Rotate3D className="h-4 w-4" />
                    <span className="max-w-48 truncate">
                        {activePanorama?.title ?? 'Vista 360'}
                    </span>
                </div>
                <div className="pointer-events-auto flex gap-2">
                    {floorPlans.length > 0 ? (
                        <>
                            <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                onClick={() => setMapOpen((open) => !open)}
                                title="Abrir minimapa"
                            >
                                <Map className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                onClick={() =>
                                    setImmersiveMapOpen((open) => !open)
                                }
                                title="Mostrar plano dentro del visor"
                            >
                                <Glasses className="h-4 w-4" />
                            </Button>
                        </>
                    ) : null}
                    <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        onClick={() => void openFullscreen()}
                        title="Pantalla completa"
                    >
                        <Expand className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {placementMode ? (
                <div className="pointer-events-none absolute inset-x-3 top-16 z-20 rounded-lg bg-orange-500/95 px-4 py-3 text-center text-sm font-medium text-white shadow-lg">
                    Pulsa el punto exacto del panorama. Arrastrar solo gira la
                    cámara.
                </div>
            ) : null}

            {mapOpen && selectedFloorPlan ? (
                <div className="absolute top-16 right-3 z-30 w-72 max-w-[calc(100%-1.5rem)] overflow-hidden rounded-xl border border-white/20 bg-slate-950/95 text-white shadow-2xl backdrop-blur">
                    <div className="flex items-center justify-between gap-2 p-2">
                        <div className="flex min-w-0 gap-1 overflow-x-auto">
                            {floorPlans.map((floorPlan) => (
                                <button
                                    key={floorPlan.id}
                                    type="button"
                                    className={`shrink-0 rounded-md px-2 py-1 text-xs ${
                                        floorPlan.id === selectedFloorPlan.id
                                            ? 'bg-orange-500'
                                            : 'bg-white/10'
                                    }`}
                                    onClick={() =>
                                        setSelectedFloorPlanId(floorPlan.id)
                                    }
                                >
                                    {floorPlan.title}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            className="rounded p-1 hover:bg-white/10"
                            onClick={() => setMapOpen(false)}
                            aria-label="Cerrar minimapa"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="relative">
                        <img
                            src={selectedFloorPlan.image_url}
                            alt={`Plano ${selectedFloorPlan.title}`}
                            className="max-h-72 w-full object-contain"
                            loading="lazy"
                        />
                        {selectedFloorPlan.markers.map((marker) => {
                            const panorama = panoramas.find(
                                (item) => item.id === marker.panorama_id,
                            );

                            return (
                                <button
                                    key={marker.panorama_id}
                                    type="button"
                                    onClick={() =>
                                        selectPanorama(marker.panorama_id)
                                    }
                                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white p-1 shadow ${
                                        marker.panorama_id ===
                                        resolvedActivePanoramaId
                                            ? 'scale-125 bg-orange-500'
                                            : 'bg-slate-800 hover:bg-orange-400'
                                    }`}
                                    style={{
                                        left: `${marker.x}%`,
                                        top: `${marker.y}%`,
                                    }}
                                    title={panorama?.title}
                                    aria-label={`Ir a ${panorama?.title ?? 'panorama'}`}
                                >
                                    <MapPinned className="h-3 w-3" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            <div className="absolute inset-x-0 bottom-0 z-10 flex gap-2 overflow-x-auto bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                {panoramas.map((panorama) => (
                    <button
                        key={panorama.id}
                        type="button"
                        disabled={placementMode}
                        onClick={() => selectPanorama(panorama.id)}
                        className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            panorama.id === resolvedActivePanoramaId
                                ? 'text-white'
                                : 'bg-black/55 text-slate-100 hover:bg-black/75'
                        } disabled:opacity-60`}
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
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45 text-white">
                    <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                    Cargando panorama…
                </div>
            ) : null}

            {loadError ? (
                <div className="absolute inset-x-3 top-16 z-30 rounded-lg bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
                    {loadError}
                </div>
            ) : null}
        </div>
    );
});

export const Project360Viewer = memo(Project360ViewerBase);
