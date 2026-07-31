import { Expand, Glasses, LoaderCircle, Rotate3D } from 'lucide-react';
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
import type {
    Project360Hotspot,
    Project360Panorama,
} from '@/types/project-360';

export type Project360ViewerHandle = {
    getViewAngles: () => { yaw: number; pitch: number };
};

type Project360ViewerProps = {
    panoramas: Project360Panorama[];
    hotspots: Project360Hotspot[];
    startPanoramaId: number | null;
    onPanoramaChange?: (panoramaId: number) => void;
    className?: string;
};

type Rotation = { x: number; y: number; z: number };

function normalizeYaw(value: number): number {
    return ((((value + 180) % 360) + 360) % 360) - 180;
}

function hotspotPosition(yaw: number, pitch: number): string {
    const radius = 4;
    const yawRadians = (yaw * Math.PI) / 180;
    const pitchRadians = (pitch * Math.PI) / 180;
    const x = -radius * Math.sin(yawRadians) * Math.cos(pitchRadians);
    const y = 1.6 + radius * Math.sin(pitchRadians);
    const z = -radius * Math.cos(yawRadians) * Math.cos(pitchRadians);

    return `${x.toFixed(4)} ${y.toFixed(4)} ${z.toFixed(4)}`;
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

const Project360ViewerBase = forwardRef<
    Project360ViewerHandle,
    Project360ViewerProps
>(function Project360Viewer(
    { panoramas, hotspots, startPanoramaId, onPanoramaChange, className = '' },
    ref,
) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<HTMLElement>(null);
    const cameraRef = useRef<HTMLElement>(null);
    const [aframeReady, setAframeReady] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [switching, setSwitching] = useState(false);
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
            setLoadError('Este dispositivo no tiene WebGL disponible.');
            return () => {
                active = false;
            };
        }

        void import('aframe')
            .then(() => {
                if (active) {
                    setAframeReady(true);
                }
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

    useEffect(() => {
        if (
            activePanoramaId === null ||
            !panoramas.some((panorama) => panorama.id === activePanoramaId)
        ) {
            setActivePanoramaId(initialPanoramaId);
        }
    }, [activePanoramaId, initialPanoramaId, panoramas]);

    const activePanorama = useMemo(
        () =>
            panoramas.find((panorama) => panorama.id === activePanoramaId) ??
            null,
        [activePanoramaId, panoramas],
    );
    const activeHotspots = useMemo(
        () =>
            hotspots.filter(
                (hotspot) => hotspot.source_panorama_id === activePanoramaId,
            ),
        [activePanoramaId, hotspots],
    );

    const selectPanorama = useCallback(
        (panoramaId: number) => {
            if (panoramaId === activePanoramaId || switching) {
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
        [activePanoramaId, onPanoramaChange, panoramas, switching],
    );

    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene || !aframeReady) {
            return;
        }

        const hotspotElements = Array.from(
            scene.querySelectorAll<HTMLElement>('.tour-hotspot'),
        );
        const listeners = hotspotElements.map((element) => {
            const listener = () => {
                const target = Number(element.dataset.targetPanoramaId);
                if (Number.isFinite(target)) {
                    selectPanorama(target);
                }
            };
            element.addEventListener('click', listener);

            return { element, listener };
        });

        return () => {
            listeners.forEach(({ element, listener }) =>
                element.removeEventListener('click', listener),
            );
        };
    }, [activeHotspots, aframeReady, selectPanorama]);

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
                    renderer="colorManagement: true; antialias: true"
                    xr-mode-ui="enabled: true"
                    loading-screen="enabled: false"
                    style={{
                        height: '100%',
                        minHeight: '24rem',
                        width: '100%',
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
                        src={`#tour-panorama-${activePanorama.id}`}
                        material="shader: flat"
                    />
                    {activeHotspots.map((hotspot) => (
                        <a-sphere
                            key={hotspot.id}
                            className="tour-hotspot"
                            data-target-panorama-id={hotspot.target_panorama_id}
                            position={hotspotPosition(
                                hotspot.yaw,
                                hotspot.pitch,
                            )}
                            radius="0.16"
                            material="color: #f97316; emissive: #ea580c; emissiveIntensity: 0.55; shader: standard"
                            animation__pulse="property: scale; from: 1 1 1; to: 1.25 1.25 1.25; dir: alternate; loop: true; dur: 900"
                            title={hotspot.label}
                        >
                            <a-text
                                value={hotspot.label}
                                align="center"
                                color="#ffffff"
                                position="0 0.35 0"
                                width="3"
                            />
                        </a-sphere>
                    ))}
                    <a-camera
                        ref={cameraRef}
                        position="0 1.6 0"
                        look-controls="pointerLockEnabled: false; magicWindowTrackingEnabled: true"
                        wasd-controls="enabled: false"
                    >
                        <a-cursor
                            fuse="false"
                            raycaster="objects: .tour-hotspot"
                            color="#ffffff"
                        />
                    </a-camera>
                    <a-entity
                        laser-controls="hand: right"
                        raycaster="objects: .tour-hotspot"
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

            <div className="absolute inset-x-0 bottom-0 z-10 flex gap-2 overflow-x-auto bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                {panoramas.map((panorama) => (
                    <button
                        key={panorama.id}
                        type="button"
                        onClick={() => selectPanorama(panorama.id)}
                        className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            panorama.id === activePanoramaId
                                ? 'bg-orange-500 text-white'
                                : 'bg-black/55 text-slate-100 hover:bg-black/75'
                        }`}
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
