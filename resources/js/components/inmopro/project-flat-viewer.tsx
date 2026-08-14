import { LoaderCircle, MapPin, Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { registerProjectFlatComponents } from '@/lib/project-flat-aframe';
import {
    aframeCameraDistance,
    findPolygonAtPoint,
    isNearPixel,
    pixelToAframe,
    polygonCentroid,
    type PixelPoint,
    type ProjectFlatVertex,
} from '@/lib/project-flat-geometry';
import {
    isLibreLot,
    type ProjectFlatMapsCenter,
    type ProjectFlatPolygon,
} from '@/types/project-flat';

type ProjectFlatViewerProps = {
    apiKey: string | null;
    center: ProjectFlatMapsCenter | null;
    polygons: ProjectFlatPolygon[];
    draftVertices?: ProjectFlatVertex[];
    draftColor?: string;
    draftLabel?: string;
    hiddenPolygonId?: number | null;
    selectedPolygonId?: number | null;
    hoveredPolygonId?: number | null;
    drawing?: boolean;
    onMapClick?: (vertex: ProjectFlatVertex) => void;
    onVertexDrag?: (index: number, vertex: ProjectFlatVertex) => void;
    onCloseRequest?: () => void;
    onHoverPolygon?: (polygonId: number | null) => void;
    onSelectPolygon?: (polygonId: number | null) => void;
    className?: string;
};

type ScreenPolygon = {
    id: string;
    label: string;
    color: string;
    hoverColor: string;
    opacity: number;
    selected: boolean;
    vertices: string;
    pixels: PixelPoint[];
    labelPixel: { x: number; y: number } | null;
};

const currencyFormatter = new Intl.NumberFormat('es-PE', {
    currency: 'PEN',
    maximumFractionDigits: 0,
    style: 'currency',
});

function formatMoney(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    const amount = Number(value);

    return Number.isFinite(amount) ? currencyFormatter.format(amount) : '—';
}

function resizeAframeScene(
    scene: HTMLElement | null,
    size: { width: number; height: number },
): void {
    if (!scene || size.width < 1 || size.height < 1) {
        return;
    }

    const canvas = scene.querySelector('canvas');

    if (canvas instanceof HTMLCanvasElement) {
        canvas.style.width = '100%';
        canvas.style.height = '100%';
    }

    const sceneElement = scene as HTMLElement & {
        resize?: () => void;
        renderer?: { setSize: (width: number, height: number, updateStyle?: boolean) => void };
    };

    sceneElement.renderer?.setSize(size.width, size.height, false);
    sceneElement.resize?.();
}

type AFrameModule = {
    default?: Parameters<typeof registerProjectFlatComponents>[0];
};

function supportsWebGl(): boolean {
    if (typeof window === 'undefined') {
        return true;
    }

    try {
        const canvas = document.createElement('canvas');

        return Boolean(
            canvas.getContext('webgl') ||
            canvas.getContext('experimental-webgl'),
        );
    } catch {
        return false;
    }
}

function projectLatLngs(
    vertices: ProjectFlatVertex[],
    overlay: google.maps.OverlayView,
): PixelPoint[] {
    const projection = overlay.getProjection();

    if (!projection) {
        return [];
    }

    return vertices.flatMap((vertex) => {
        const point = projection.fromLatLngToContainerPixel(
            new google.maps.LatLng(vertex.lat, vertex.lng),
        );

        return point ? [{ x: point.x, y: point.y }] : [];
    });
}

function latLngFromContainerPixel(
    overlay: google.maps.OverlayView,
    pixel: PixelPoint,
): ProjectFlatVertex | null {
    const projection = overlay.getProjection();
    const latLng = projection?.fromContainerPixelToLatLng(
        new google.maps.Point(pixel.x, pixel.y),
    );

    if (!latLng) {
        return null;
    }

    return { lat: latLng.lat(), lng: latLng.lng() };
}

function latLngsToScreenVertices(
    vertices: ProjectFlatVertex[],
    overlay: google.maps.OverlayView,
    size: { width: number; height: number },
): {
    aframe: { x: number; y: number }[];
    pixels: PixelPoint[];
    centroidPixel: { x: number; y: number } | null;
} {
    const pixels = projectLatLngs(vertices, overlay);
    const centroid = polygonCentroid(vertices);
    const centroidPixels = centroid ? projectLatLngs([centroid], overlay) : [];

    return {
        aframe: pixels.map((pixel) => pixelToAframe(pixel, size)),
        pixels,
        centroidPixel: centroidPixels[0] ?? null,
    };
}

function toSvgPoints(points: PixelPoint[]): string {
    return points.map((point) => `${point.x},${point.y}`).join(' ');
}

export function ProjectFlatViewer({
    apiKey,
    center,
    polygons,
    draftVertices = [],
    draftColor = '#38bdf8',
    draftLabel = 'Nuevo',
    hiddenPolygonId = null,
    selectedPolygonId = null,
    hoveredPolygonId = null,
    drawing = false,
    onMapClick,
    onVertexDrag,
    onCloseRequest,
    onHoverPolygon,
    onSelectPolygon,
    className = '',
}: ProjectFlatViewerProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<HTMLElement | null>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const overlayRef = useRef<google.maps.OverlayView | null>(null);
    const draggingIndexRef = useRef<number | null>(null);
    const vertexMovedRef = useRef(false);
    const [aframeReady, setAframeReady] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [screenPolygons, setScreenPolygons] = useState<ScreenPolygon[]>([]);
    const [draftPixels, setDraftPixels] = useState<PixelPoint[]>([]);
    const [cursorPixel, setCursorPixel] = useState<PixelPoint | null>(null);
    const [viewport, setViewport] = useState({ width: 800, height: 560 });
    const polygonsRef = useRef(polygons);
    const draftRef = useRef(draftVertices);
    const hiddenRef = useRef(hiddenPolygonId);
    const selectedRef = useRef(selectedPolygonId);
    const hoveredRef = useRef(hoveredPolygonId);
    const drawingRef = useRef(drawing);
    const onMapClickRef = useRef(onMapClick);
    const onVertexDragRef = useRef(onVertexDrag);
    const onCloseRef = useRef(onCloseRequest);
    const onHoverRef = useRef(onHoverPolygon);
    const onSelectRef = useRef(onSelectPolygon);

    polygonsRef.current = polygons;
    draftRef.current = draftVertices;
    hiddenRef.current = hiddenPolygonId;
    selectedRef.current = selectedPolygonId;
    hoveredRef.current = hoveredPolygonId;
    drawingRef.current = drawing;
    onMapClickRef.current = onMapClick;
    onVertexDragRef.current = onVertexDrag;
    onCloseRef.current = onCloseRequest;
    onHoverRef.current = onHoverPolygon;
    onSelectRef.current = onSelectPolygon;

    const cameraDistance = useMemo(
        () => aframeCameraDistance(viewport.height),
        [viewport.height],
    );
    const canClose =
        drawing && draftPixels.length >= 3 && cursorPixel
            ? isNearPixel(cursorPixel, draftPixels[0])
            : false;
    const previewPixels = useMemo(() => {
        if (draftPixels.length === 0) {
            return [];
        }

        if (!drawing || !cursorPixel || canClose) {
            return draftPixels;
        }

        return [...draftPixels, cursorPixel];
    }, [canClose, cursorPixel, draftPixels, drawing]);
    const previewCentroid = useMemo(() => {
        if (previewPixels.length === 0) {
            return null;
        }

        const total = previewPixels.reduce(
            (current, point) => ({
                x: current.x + point.x,
                y: current.y + point.y,
            }),
            { x: 0, y: 0 },
        );

        return {
            x: total.x / previewPixels.length,
            y: total.y / previewPixels.length,
        };
    }, [previewPixels]);

    useEffect(() => {
        let active = true;

        if (!supportsWebGl()) {
            setLoadError('Este dispositivo no tiene WebGL disponible.');

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
                                typeof registerProjectFlatComponents
                            >[0];
                        }
                    ).AFRAME;

                if (!aframe) {
                    throw new Error('A-Frame no se registró en el navegador.');
                }

                registerProjectFlatComponents(aframe);
                setAframeReady(true);
            })
            .catch(() => {
                if (active) {
                    setLoadError('No se pudo iniciar el visor de polígonos.');
                }
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!apiKey || !center || !mapRef.current || mapInstanceRef.current) {
            return;
        }

        let cancelled = false;
        const mapElement = mapRef.current;

        void import('@googlemaps/js-api-loader')
            .then(async ({ importLibrary, setOptions }) => {
                setOptions({ key: apiKey, v: 'weekly' });
                const maps = await importLibrary('maps');

                if (cancelled || !mapElement) {
                    return;
                }

                const map = new maps.Map(mapElement, {
                    center,
                    zoom: 17,
                    mapTypeId: 'hybrid',
                    clickableIcons: false,
                    streetViewControl: false,
                    rotateControl: false,
                    tilt: 0,
                    gestureHandling: 'greedy',
                    mapTypeControl: true,
                    fullscreenControl: false,
                    zoomControl: true,
                    disableDoubleClickZoom: false,
                });
                class ProjectionOverlay extends maps.OverlayView {
                    override onAdd(): void {}

                    override onRemove(): void {}

                    override draw(): void {
                        const projection = this.getProjection();
                        const sizeElement = wrapperRef.current ?? mapElement;
                        const size = {
                            width: sizeElement.clientWidth,
                            height: sizeElement.clientHeight,
                        };

                        if (!projection || size.width < 1 || size.height < 1) {
                            return;
                        }

                        setViewport(size);
                        resizeAframeScene(sceneRef.current, size);
                        setDraftPixels(projectLatLngs(draftRef.current, this));
                        setScreenPolygons(
                            polygonsRef.current
                                .filter(
                                    (polygon) =>
                                        polygon.id !== hiddenRef.current,
                                )
                                .map((polygon) => {
                                    const projected = latLngsToScreenVertices(
                                        polygon.vertices,
                                        this,
                                        size,
                                    );
                                    const highlighted =
                                        polygon.id === selectedRef.current ||
                                        polygon.id === hoveredRef.current;

                                    return {
                                        id: `saved-${polygon.id}`,
                                        label: polygon.title,
                                        color: polygon.color,
                                        hoverColor: polygon.hover_color,
                                        opacity: polygon.opacity,
                                        selected: highlighted,
                                        vertices: JSON.stringify(
                                            projected.aframe,
                                        ),
                                        pixels: projected.pixels,
                                        labelPixel: projected.centroidPixel,
                                    };
                                }),
                        );
                    }
                }
                const overlay = new ProjectionOverlay();
                overlay.setMap(map);
                map.addListener('click', (event: google.maps.MapMouseEvent) => {
                    if (draggingIndexRef.current !== null) {
                        return;
                    }

                    const lat = event.latLng?.lat();
                    const lng = event.latLng?.lng();

                    if (lat === undefined || lng === undefined) {
                        return;
                    }

                    const point = { lat, lng };

                    if (drawingRef.current) {
                        const pixels = projectLatLngs(
                            draftRef.current,
                            overlay,
                        );
                        const clickPixel = projectLatLngs([point], overlay)[0];

                        if (
                            clickPixel &&
                            pixels.length >= 3 &&
                            isNearPixel(clickPixel, pixels[0])
                        ) {
                            onCloseRef.current?.();

                            return;
                        }

                        onMapClickRef.current?.(point);

                        return;
                    }

                    const hit = findPolygonAtPoint(point, polygonsRef.current);
                    onSelectRef.current?.(hit?.id ?? null);
                });
                map.addListener(
                    'dblclick',
                    (event: google.maps.MapMouseEvent) => {
                        if (
                            !drawingRef.current ||
                            draftRef.current.length < 3
                        ) {
                            return;
                        }

                        event.stop();
                        onCloseRef.current?.();
                    },
                );
                map.addListener(
                    'mousemove',
                    (event: google.maps.MapMouseEvent) => {
                        const lat = event.latLng?.lat();
                        const lng = event.latLng?.lng();

                        if (lat === undefined || lng === undefined) {
                            setCursorPixel(null);
                            onHoverRef.current?.(null);

                            return;
                        }

                        if (drawingRef.current) {
                            const pixels = projectLatLngs(
                                [{ lat, lng }],
                                overlay,
                            );
                            setCursorPixel(pixels[0] ?? null);

                            return;
                        }

                        setCursorPixel(null);
                        const hit = findPolygonAtPoint(
                            { lat, lng },
                            polygonsRef.current,
                        );
                        onHoverRef.current?.(hit?.id ?? null);
                    },
                );

                mapInstanceRef.current = map;
                overlayRef.current = overlay;
                setMapReady(true);
            })
            .catch(() => {
                if (!cancelled) {
                    setLoadError('No se pudo cargar Google Maps.');
                }
            });

        return () => {
            cancelled = true;
            overlayRef.current?.setMap(null);
            overlayRef.current = null;
            mapInstanceRef.current = null;
        };
    }, [apiKey, center]);

    useEffect(() => {
        overlayRef.current?.draw();
    }, [
        draftVertices,
        hiddenPolygonId,
        hoveredPolygonId,
        polygons,
        selectedPolygonId,
    ]);

    useEffect(() => {
        mapInstanceRef.current?.setOptions({
            disableDoubleClickZoom: drawing,
            draggableCursor: drawing ? 'crosshair' : undefined,
        });

        if (!drawing) {
            setCursorPixel(null);
        }
    }, [drawing]);

    useEffect(() => {
        const wrapper = wrapperRef.current;

        if (!wrapper || !mapReady) {
            return;
        }

        const syncSize = () => {
            const size = {
                width: wrapper.clientWidth,
                height: wrapper.clientHeight,
            };

            setViewport(size);
            resizeAframeScene(sceneRef.current, size);
            overlayRef.current?.draw();

            const map = mapInstanceRef.current;

            if (map && typeof google !== 'undefined') {
                google.maps.event.trigger(map, 'resize');
            }
        };
        const observer = new ResizeObserver(() => {
            syncSize();
        });

        observer.observe(wrapper);
        syncSize();

        const onFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === wrapper);
            requestAnimationFrame(syncSize);
        };

        document.addEventListener('fullscreenchange', onFullscreenChange);

        return () => {
            observer.disconnect();
            document.removeEventListener(
                'fullscreenchange',
                onFullscreenChange,
            );
        };
    }, [aframeReady, mapReady]);

    const didFitRef = useRef(false);

    useEffect(() => {
        const map = mapInstanceRef.current;

        if (!map || !center || !mapReady || didFitRef.current) {
            return;
        }

        const bounds = new google.maps.LatLngBounds();
        let hasPoints = false;

        polygons.forEach((polygon) => {
            polygon.vertices.forEach((vertex) => {
                bounds.extend(vertex);
                hasPoints = true;
            });
        });

        if (hasPoints) {
            map.fitBounds(bounds, 48);
        } else {
            map.setCenter(center);
            map.setZoom(17);
        }

        didFitRef.current = true;
    }, [center, mapReady, polygons]);

    const selectedSource = polygons.find(
        (polygon) => polygon.id === selectedPolygonId,
    );
    const selectedScreen = screenPolygons.find(
        (polygon) => polygon.id === `saved-${selectedPolygonId}`,
    );
    const selectedLot = selectedSource?.lot ?? null;
    const selectedLotIsLibre = isLibreLot(selectedLot);

    const toggleFullscreen = () => {
        const wrapper = wrapperRef.current;

        if (!wrapper) {
            return;
        }

        if (document.fullscreenElement) {
            void document.exitFullscreen();

            return;
        }

        void wrapper.requestFullscreen();
    };

    const startVertexDrag = (index: number, event: React.PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        draggingIndexRef.current = index;
        vertexMovedRef.current = false;
        mapInstanceRef.current?.setOptions({ gestureHandling: 'none' });

        const origin = { x: event.clientX, y: event.clientY };
        const handleMove = (moveEvent: PointerEvent) => {
            const overlay = overlayRef.current;
            const mapElement = mapRef.current;

            if (!overlay || !mapElement || draggingIndexRef.current === null) {
                return;
            }

            if (
                Math.hypot(
                    moveEvent.clientX - origin.x,
                    moveEvent.clientY - origin.y,
                ) > 3
            ) {
                vertexMovedRef.current = true;
            }

            const bounds = mapElement.getBoundingClientRect();
            const vertex = latLngFromContainerPixel(overlay, {
                x: moveEvent.clientX - bounds.left,
                y: moveEvent.clientY - bounds.top,
            });

            if (vertex) {
                onVertexDragRef.current?.(draggingIndexRef.current, vertex);
            }
        };
        const stopDrag = () => {
            draggingIndexRef.current = null;
            mapInstanceRef.current?.setOptions({
                gestureHandling: 'greedy',
            });
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', stopDrag);
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', stopDrag);
    };

    if (!apiKey) {
        return (
            <div
                className={`flex min-h-[32rem] items-center justify-center rounded-xl border border-dashed bg-slate-50 p-8 text-center text-slate-600 ${className}`}
            >
                Falta configurar la clave de Google Maps (GOOGLE_MAPS_API_KEY)
                para mostrar el mapa en vivo.
            </div>
        );
    }

    if (!center) {
        return (
            <div
                className={`flex min-h-[32rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-slate-50 p-8 text-center text-slate-600 ${className}`}
            >
                <MapPin className="h-6 w-6 text-slate-400" />
                <p>
                    Este proyecto no tiene coordenadas válidas. Usa un par
                    latitud,longitud o una URL de Google Maps con ubicación.
                </p>
            </div>
        );
    }

    if (loadError) {
        return (
            <div
                className={`flex min-h-[32rem] items-center justify-center rounded-xl border border-dashed bg-slate-50 p-8 text-center text-red-600 ${className}`}
            >
                {loadError}
            </div>
        );
    }

    return (
        <div
            ref={wrapperRef}
            className={`project-flat-viewer relative min-h-[32rem] overflow-hidden rounded-xl bg-slate-900 ${className}`}
            style={{ cursor: drawing ? 'crosshair' : 'grab' }}
        >
            <style>{`
                .project-flat-viewer:fullscreen,
                .project-flat-viewer:-webkit-full-screen {
                    border-radius: 0;
                    height: 100%;
                    min-height: 100%;
                    width: 100%;
                }
                .project-flat-viewer a-scene,
                .project-flat-viewer .a-canvas,
                .project-flat-viewer canvas.a-canvas {
                    height: 100% !important;
                    inset: 0 !important;
                    position: absolute !important;
                    width: 100% !important;
                }
            `}</style>
            <div ref={mapRef} className="absolute inset-0" />
            {(!aframeReady || !mapReady) && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/40 text-white">
                    <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                    Cargando mapa…
                </div>
            )}
            {aframeReady ? (
                <a-scene
                    ref={sceneRef}
                    embedded
                    vr-mode-ui="enabled: false"
                    device-orientation-permission-ui="enabled: false"
                    renderer="alpha: true; antialias: true; colorManagement: true"
                    loading-screen="enabled: false"
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background: 'transparent',
                        height: '100%',
                        pointerEvents: 'none',
                        width: '100%',
                    }}
                >
                    <a-entity
                        camera={`active: true; fov: 90; near: 0.1; far: ${Math.max(2000, cameraDistance * 4)}`}
                        look-controls="enabled: false"
                        wasd-controls="enabled: false"
                        position={`0 0 ${cameraDistance}`}
                    />
                </a-scene>
            ) : null}
            <svg
                className="pointer-events-none absolute inset-0 z-20 h-full w-full"
                preserveAspectRatio="none"
                viewBox={`0 0 ${viewport.width} ${viewport.height}`}
            >
                {screenPolygons.map((polygon) =>
                    polygon.pixels.length >= 3 ? (
                        <polygon
                            key={polygon.id}
                            fill={
                                polygon.selected
                                    ? polygon.hoverColor
                                    : polygon.color
                            }
                            fillOpacity={
                                polygon.selected
                                    ? Math.min(0.55, polygon.opacity + 0.2)
                                    : polygon.opacity
                            }
                            points={toSvgPoints(polygon.pixels)}
                            stroke={
                                polygon.selected
                                    ? polygon.hoverColor
                                    : polygon.color
                            }
                            strokeWidth={polygon.selected ? 3 : 2}
                        />
                    ) : null,
                )}
                {drawing || draftPixels.length > 0 ? (
                    <>
                        {previewPixels.length >= 3 ? (
                            <polygon
                                fill={draftColor}
                                fillOpacity="0.32"
                                points={toSvgPoints(previewPixels)}
                                stroke={draftColor}
                                strokeWidth="2"
                            />
                        ) : previewPixels.length >= 2 ? (
                            <polyline
                                fill="none"
                                points={toSvgPoints(previewPixels)}
                                stroke={draftColor}
                                strokeWidth="2"
                            />
                        ) : null}
                        {drawing &&
                        cursorPixel &&
                        draftPixels.length >= 1 &&
                        !canClose ? (
                            <line
                                stroke={draftColor}
                                strokeDasharray="6 4"
                                strokeWidth="2"
                                x1={draftPixels[draftPixels.length - 1]?.x}
                                x2={cursorPixel.x}
                                y1={draftPixels[draftPixels.length - 1]?.y}
                                y2={cursorPixel.y}
                            />
                        ) : null}
                    </>
                ) : null}
            </svg>
            {screenPolygons.map((polygon) =>
                polygon.labelPixel ? (
                    <div
                        key={`${polygon.id}-label`}
                        className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow"
                        style={{
                            backgroundColor: polygon.selected
                                ? polygon.hoverColor
                                : polygon.color,
                            left: polygon.labelPixel.x,
                            top: polygon.labelPixel.y,
                        }}
                    >
                        {polygon.label}
                    </div>
                ) : null,
            )}
            {!drawing && selectedSource && selectedScreen?.labelPixel ? (
                <div
                    className="pointer-events-none absolute z-40 w-56 -translate-x-1/2 rounded-lg border border-white/20 bg-white/95 p-3 text-xs shadow-lg"
                    style={{
                        left: selectedScreen.labelPixel.x,
                        top: selectedScreen.labelPixel.y + 18,
                    }}
                >
                    <p className="font-semibold text-slate-900">
                        {selectedSource.title}
                    </p>
                    {selectedLot?.status ? (
                        <p
                            className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                            style={{
                                backgroundColor: selectedLot.status.color,
                            }}
                        >
                            {selectedLot.status.name}
                        </p>
                    ) : null}
                    {selectedLot ? (
                        <div className="mt-2 space-y-1 text-slate-700">
                            <p>
                                Manzana {selectedLot.block} · Lote{' '}
                                {selectedLot.number}
                            </p>
                            {selectedLotIsLibre ? (
                                <>
                                    <p>Área: {selectedLot.area ?? '—'} m²</p>
                                    <p>
                                        Precio: {formatMoney(selectedLot.price)}
                                    </p>
                                </>
                            ) : (
                                <p className="text-slate-500">
                                    Este lote no está disponible. La ficha se
                                    muestra solo cuando está libre.
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="mt-2 text-slate-500">
                            Polígono informativo, sin lote ligado.
                        </p>
                    )}
                </div>
            ) : null}
            {previewCentroid && (drawing || draftPixels.length >= 3) ? (
                <div
                    className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow"
                    style={{
                        backgroundColor: draftColor,
                        left: previewCentroid.x,
                        top: previewCentroid.y,
                    }}
                >
                    {draftLabel || 'Nuevo'}
                </div>
            ) : null}
            {draftPixels.map((pixel, index) => (
                <button
                    key={`vertex-${index}`}
                    type="button"
                    aria-label={`Vértice ${index + 1}`}
                    className={`absolute z-50 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${
                        index === 0 && draftPixels.length >= 3
                            ? 'h-4 w-4'
                            : 'h-3 w-3'
                    }`}
                    style={{
                        backgroundColor:
                            index === 0 && canClose ? '#ffffff' : draftColor,
                        cursor: 'grab',
                        left: pixel.x,
                        top: pixel.y,
                    }}
                    onPointerDown={(event) => startVertexDrag(index, event)}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        if (
                            !vertexMovedRef.current &&
                            index === 0 &&
                            draftPixels.length >= 3
                        ) {
                            onCloseRequest?.();
                        }
                    }}
                />
            ))}
            <button
                type="button"
                aria-label={
                    isFullscreen
                        ? 'Salir de pantalla completa'
                        : 'Ver en pantalla completa'
                }
                className="absolute top-14 right-2.5 z-50 flex h-10 w-10 items-center justify-center rounded bg-white text-slate-700 shadow hover:bg-slate-50"
                onClick={toggleFullscreen}
            >
                {isFullscreen ? (
                    <Minimize2 className="h-5 w-5" />
                ) : (
                    <Maximize2 className="h-5 w-5" />
                )}
            </button>
        </div>
    );
}
