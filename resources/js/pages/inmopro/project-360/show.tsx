import { Head, router, useForm } from '@inertiajs/react';
import {
    Check,
    Clipboard,
    ExternalLink,
    Link2,
    MapPinned,
    MousePointer2,
    Plus,
    Save,
    Star,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
    Project360Viewer,
    type Project360ViewerHandle,
} from '@/components/inmopro/project-360-viewer';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { pointerToPlanCoordinates } from '@/lib/project-360-geometry';
import { confirmDelete } from '@/lib/swal';
import project360 from '@/routes/inmopro/project-360';
import floorPlanRoutes from '@/routes/inmopro/project-360/floor-plans';
import hotspotRoutes from '@/routes/inmopro/project-360/hotspots';
import panoramaRoutes from '@/routes/inmopro/project-360/panoramas';
import sceneSettingsRoutes from '@/routes/inmopro/project-360/scene-settings';
import settingsRoutes from '@/routes/inmopro/project-360/settings';
import shareLinkRoutes from '@/routes/inmopro/project-360/share-links';
import startPanoramaRoutes from '@/routes/inmopro/project-360/start-panorama';
import type { BreadcrumbItem } from '@/types';
import type {
    Project360Hotspot,
    Project360HotspotShape,
    Project360LabelVisibility,
    Project360Tour,
} from '@/types/project-360';

type Project = {
    id: number;
    name: string;
    is_active: boolean;
};

type PageProps = {
    project: Project;
    tour: Project360Tour;
    canManage: boolean;
};

type UploadForm = {
    panorama_files: File[];
    panorama_titles: string[];
};

type FloorPlanUploadForm = {
    floor_plan_files: File[];
    floor_plan_titles: string[];
};

type HotspotDraft = {
    label: string;
    target_panorama_id: number;
    yaw: number;
    pitch: number;
    color: string | null;
    hover_color: string | null;
    text_color: string | null;
    size: number | null;
    shape: Project360HotspotShape | null;
    label_visibility: Project360LabelVisibility | null;
    pulse_enabled: boolean | null;
};

type PlacementMode =
    | { type: 'create' }
    | { type: 'reposition'; hotspotId: number }
    | null;

const project360DateFormatter = new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Lima',
});

function hotspotDraft(hotspot: Project360Hotspot): HotspotDraft {
    return {
        label: hotspot.label,
        target_panorama_id: hotspot.target_panorama_id,
        yaw: hotspot.yaw,
        pitch: hotspot.pitch,
        color: hotspot.overrides.color,
        hover_color: hotspot.overrides.hover_color,
        text_color: hotspot.overrides.text_color,
        size: hotspot.overrides.size,
        shape: hotspot.overrides.shape,
        label_visibility: hotspot.overrides.label_visibility,
        pulse_enabled: hotspot.overrides.pulse_enabled,
    };
}

export default function Project360Show({
    project,
    tour,
    canManage,
}: PageProps) {
    const viewerRef = useRef<Project360ViewerHandle>(null);
    const initialPanoramaId =
        tour.start_panorama_id ?? tour.panoramas[0]?.id ?? null;
    const initialPanorama =
        tour.panoramas.find((panorama) => panorama.id === initialPanoramaId) ??
        null;
    const [activePanoramaId, setActivePanoramaId] = useState<number | null>(
        initialPanoramaId,
    );
    const [placementMode, setPlacementMode] = useState<PlacementMode>(null);
    const [createPointSelected, setCreatePointSelected] = useState(false);
    const [selectedHotspotId, setSelectedHotspotId] = useState<number | null>(
        null,
    );
    const [panoramaTitles, setPanoramaTitles] = useState(
        Object.fromEntries(
            tour.panoramas.map((panorama) => [panorama.id, panorama.title]),
        ),
    );
    const [floorPlanTitles, setFloorPlanTitles] = useState(
        Object.fromEntries(
            tour.floor_plans.map((floorPlan) => [
                floorPlan.id,
                floorPlan.title,
            ]),
        ),
    );
    const [floorPlanOrders, setFloorPlanOrders] = useState(
        Object.fromEntries(
            tour.floor_plans.map((floorPlan) => [
                floorPlan.id,
                floorPlan.sort_order,
            ]),
        ),
    );
    const [hotspotDrafts, setHotspotDrafts] = useState<
        Record<number, HotspotDraft>
    >(
        Object.fromEntries(
            tour.hotspots.map((hotspot) => [hotspot.id, hotspotDraft(hotspot)]),
        ),
    );
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
    const [sceneDraft, setSceneDraft] = useState({
        initial_yaw: initialPanorama?.initial_yaw ?? 0,
        initial_pitch: initialPanorama?.initial_pitch ?? 0,
        floor_plan_id: initialPanorama?.floor_plan_id ?? null,
        plan_x: initialPanorama?.plan_x ?? null,
        plan_y: initialPanorama?.plan_y ?? null,
    });

    const uploadForm = useForm<UploadForm>({
        panorama_files: [],
        panorama_titles: [],
    });
    const floorPlanUploadForm = useForm<FloorPlanUploadForm>({
        floor_plan_files: [],
        floor_plan_titles: [],
    });
    const hotspotForm = useForm<HotspotDraft & { source_panorama_id: number }>({
        source_panorama_id: initialPanoramaId ?? 0,
        target_panorama_id:
            tour.panoramas.find((panorama) => panorama.id !== initialPanoramaId)
                ?.id ?? 0,
        label: '',
        yaw: 0,
        pitch: 0,
        color: null,
        hover_color: null,
        text_color: null,
        size: null,
        shape: null,
        label_visibility: null,
        pulse_enabled: null,
    });
    const themeForm = useForm({ ...tour.settings });
    const shareForm = useForm({ label: '' });

    const currentPanorama =
        tour.panoramas.find((panorama) => panorama.id === activePanoramaId) ??
        tour.panoramas.find(
            (panorama) => panorama.id === tour.start_panorama_id,
        ) ??
        tour.panoramas[0] ??
        null;
    const currentPanoramaId = currentPanorama?.id ?? null;
    const currentHotspots = tour.hotspots.filter(
        (hotspot) => hotspot.source_panorama_id === currentPanoramaId,
    );
    const selectedHotspot = tour.hotspots.find(
        (hotspot) => hotspot.id === selectedHotspotId,
    );
    const selectedDraft = selectedHotspot
        ? hotspotDrafts[selectedHotspot.id]
        : null;
    const previewPoint = useMemo(() => {
        if (createPointSelected) {
            return {
                yaw: Number(hotspotForm.data.yaw),
                pitch: Number(hotspotForm.data.pitch),
            };
        }

        if (selectedDraft) {
            return {
                yaw: Number(selectedDraft.yaw),
                pitch: Number(selectedDraft.pitch),
            };
        }

        return null;
    }, [
        hotspotForm.data.pitch,
        hotspotForm.data.yaw,
        createPointSelected,
        selectedDraft,
    ]);
    const draftStyle = useMemo(() => {
        const draft = selectedDraft ?? hotspotForm.data;

        return {
            color: draft.color ?? tour.settings.hotspot_color,
            hover_color: draft.hover_color ?? tour.settings.hotspot_hover_color,
            text_color: draft.text_color ?? tour.settings.hotspot_text_color,
            size: draft.size ?? tour.settings.hotspot_size,
            shape: draft.shape ?? tour.settings.hotspot_shape,
            label_visibility:
                draft.label_visibility ??
                tour.settings.hotspot_label_visibility,
            pulse_enabled:
                draft.pulse_enabled ?? tour.settings.hotspot_pulse_enabled,
        };
    }, [hotspotForm.data, selectedDraft, tour.settings]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Vista 360', href: project360.index().url },
        { title: project.name, href: project360.show(project.id).url },
    ];

    const handlePanoramaChange = (panoramaId: number) => {
        setActivePanoramaId(panoramaId);
        setSelectedHotspotId(null);
        setPlacementMode(null);
        setCreatePointSelected(false);
        const alternative = tour.panoramas.find(
            (panorama) => panorama.id !== panoramaId,
        );
        const panorama = tour.panoramas.find((item) => item.id === panoramaId);
        if (panorama) {
            setSceneDraft({
                initial_yaw: panorama.initial_yaw,
                initial_pitch: panorama.initial_pitch,
                floor_plan_id: panorama.floor_plan_id,
                plan_x: panorama.plan_x,
                plan_y: panorama.plan_y,
            });
        }
        hotspotForm.setData((current) => ({
            ...current,
            source_panorama_id: panoramaId,
            target_panorama_id:
                current.target_panorama_id === panoramaId
                    ? (alternative?.id ?? 0)
                    : current.target_panorama_id,
        }));
    };

    const handlePlacement = ({
        yaw,
        pitch,
    }: {
        yaw: number;
        pitch: number;
    }) => {
        if (placementMode?.type === 'reposition') {
            const hotspotId = placementMode.hotspotId;
            setHotspotDrafts((current) => ({
                ...current,
                [hotspotId]: {
                    ...current[hotspotId],
                    yaw,
                    pitch,
                },
            }));
            setSelectedHotspotId(hotspotId);
        } else {
            hotspotForm.setData((current) => ({
                ...current,
                yaw,
                pitch,
            }));
            setCreatePointSelected(true);
        }
        setPlacementMode(null);
    };

    const submitPanoramas = (event: React.FormEvent) => {
        event.preventDefault();
        uploadForm.post(panoramaRoutes.store(project.id).url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => uploadForm.reset(),
        });
    };

    const submitFloorPlans = (event: React.FormEvent) => {
        event.preventDefault();
        floorPlanUploadForm.post(floorPlanRoutes.store(project.id).url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => floorPlanUploadForm.reset(),
        });
    };

    const createHotspot = (event: React.FormEvent) => {
        event.preventDefault();
        hotspotForm.transform((data) => ({
            ...data,
            source_panorama_id: currentPanoramaId,
        }));
        hotspotForm.post(hotspotRoutes.store(project.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                hotspotForm.reset(
                    'label',
                    'yaw',
                    'pitch',
                    'color',
                    'hover_color',
                    'text_color',
                    'size',
                    'shape',
                    'label_visibility',
                    'pulse_enabled',
                );
                setPlacementMode(null);
                setCreatePointSelected(false);
            },
        });
    };

    const updateHotspot = (hotspot: Project360Hotspot) => {
        const draft = hotspotDrafts[hotspot.id] ?? hotspotDraft(hotspot);
        router.put(
            hotspotRoutes.update({
                project: project.id,
                hotspot: hotspot.id,
            }).url,
            {
                source_panorama_id: hotspot.source_panorama_id,
                ...draft,
            },
            {
                preserveScroll: true,
                onSuccess: () => setSelectedHotspotId(null),
            },
        );
    };

    const deleteHotspot = async (hotspot: Project360Hotspot) => {
        if (await confirmDelete(`¿Eliminar el hotspot "${hotspot.label}"?`)) {
            router.delete(
                hotspotRoutes.destroy({
                    project: project.id,
                    hotspot: hotspot.id,
                }).url,
                { preserveScroll: true },
            );
        }
    };

    const saveSceneSettings = () => {
        if (!currentPanoramaId) {
            return;
        }

        router.put(
            sceneSettingsRoutes.update(project.id).url,
            {
                panorama_id: currentPanoramaId,
                ...sceneDraft,
            },
            { preserveScroll: true },
        );
    };

    const createShareLink = (event: React.FormEvent) => {
        event.preventDefault();
        shareForm.post(shareLinkRoutes.store(project.id).url, {
            preserveScroll: true,
            onSuccess: () => shareForm.reset(),
        });
    };

    const copyLink = async (id: string, url: string) => {
        await navigator.clipboard.writeText(url);
        setCopiedLinkId(id);
        window.setTimeout(() => setCopiedLinkId(null), 1800);
    };

    const updateHotspotDraft = (
        hotspotId: number,
        changes: Partial<HotspotDraft>,
    ) => {
        setHotspotDrafts((current) => ({
            ...current,
            [hotspotId]: {
                ...current[hotspotId],
                ...changes,
            },
        }));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Vista 360 - ${project.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">
                                Vista 360 · {project.name}
                            </h1>
                            <Badge
                                variant={
                                    project.is_active ? 'default' : 'secondary'
                                }
                            >
                                {project.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            Pulsa directamente en la imagen para colocar los
                            puntos de navegación.
                        </p>
                    </div>
                </div>

                <Project360Viewer
                    ref={viewerRef}
                    panoramas={tour.panoramas}
                    hotspots={tour.hotspots}
                    floorPlans={tour.floor_plans}
                    settings={tour.settings}
                    startPanoramaId={tour.start_panorama_id}
                    placementMode={placementMode !== null}
                    draftPoint={previewPoint}
                    draftStyle={draftStyle}
                    onPlacement={handlePlacement}
                    onPanoramaChange={handlePanoramaChange}
                    className="min-h-[32rem]"
                />

                {canManage ? (
                    <div className="grid gap-6 xl:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Panoramas</CardTitle>
                                <CardDescription>
                                    Hasta 5 imágenes 2:1 por carga, entre
                                    2048×1024 y 8192×4096.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <form
                                    onSubmit={submitPanoramas}
                                    className="space-y-3 rounded-lg border p-4"
                                >
                                    <Input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        multiple
                                        onChange={(event) => {
                                            const files = Array.from(
                                                event.target.files ?? [],
                                            );
                                            uploadForm.setData({
                                                panorama_files: files,
                                                panorama_titles: files.map(
                                                    (file) =>
                                                        file.name.replace(
                                                            /\.[^.]+$/,
                                                            '',
                                                        ),
                                                ),
                                            });
                                        }}
                                    />
                                    {uploadForm.data.panorama_titles.map(
                                        (title, index) => (
                                            <Input
                                                key={`${uploadForm.data.panorama_files[index]?.name}-${index}`}
                                                value={title}
                                                onChange={(event) => {
                                                    const titles = [
                                                        ...uploadForm.data
                                                            .panorama_titles,
                                                    ];
                                                    titles[index] =
                                                        event.target.value;
                                                    uploadForm.setData(
                                                        'panorama_titles',
                                                        titles,
                                                    );
                                                }}
                                                placeholder={`Título ${index + 1}`}
                                            />
                                        ),
                                    )}
                                    <InputError
                                        message={
                                            uploadForm.errors.panorama_files
                                        }
                                    />
                                    <Button
                                        type="submit"
                                        disabled={
                                            uploadForm.processing ||
                                            uploadForm.data.panorama_files
                                                .length === 0
                                        }
                                    >
                                        <Upload className="h-4 w-4" />
                                        Subir panoramas
                                    </Button>
                                </form>

                                {tour.panoramas.map((panorama) => (
                                    <div
                                        key={panorama.id}
                                        className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
                                    >
                                        <Input
                                            value={
                                                panoramaTitles[panorama.id] ??
                                                panorama.title
                                            }
                                            onChange={(event) =>
                                                setPanoramaTitles(
                                                    (current) => ({
                                                        ...current,
                                                        [panorama.id]:
                                                            event.target.value,
                                                    }),
                                                )
                                            }
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            onClick={() =>
                                                router.patch(
                                                    panoramaRoutes.update({
                                                        project: project.id,
                                                        panorama: panorama.id,
                                                    }).url,
                                                    {
                                                        title: panoramaTitles[
                                                            panorama.id
                                                        ],
                                                    },
                                                    {
                                                        preserveScroll: true,
                                                    },
                                                )
                                            }
                                            title="Guardar título"
                                        >
                                            <Save className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant={
                                                panorama.is_starting
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            onClick={() =>
                                                router.put(
                                                    startPanoramaRoutes.update(
                                                        project.id,
                                                    ).url,
                                                    {
                                                        panorama_id:
                                                            panorama.id,
                                                    },
                                                    {
                                                        preserveScroll: true,
                                                    },
                                                )
                                            }
                                            title="Escena inicial"
                                        >
                                            <Star className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="destructive"
                                            onClick={() =>
                                                void (async () => {
                                                    if (
                                                        await confirmDelete(
                                                            `¿Eliminar el panorama "${panorama.title}"?`,
                                                        )
                                                    ) {
                                                        router.delete(
                                                            panoramaRoutes.destroy(
                                                                {
                                                                    project:
                                                                        project.id,
                                                                    panorama:
                                                                        panorama.id,
                                                                },
                                                            ).url,
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        );
                                                    }
                                                })()
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Hotspots visuales</CardTitle>
                                <CardDescription>
                                    Selecciona el punto, previsualiza y completa
                                    sus datos.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {tour.panoramas.length < 2 ? (
                                    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                                        Añade al menos dos panoramas para crear
                                        navegación.
                                    </p>
                                ) : (
                                    <>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    setPlacementMode({
                                                        type: 'create',
                                                    });
                                                    setSelectedHotspotId(null);
                                                    setCreatePointSelected(
                                                        false,
                                                    );
                                                }}
                                                disabled={
                                                    currentPanoramaId === null
                                                }
                                            >
                                                <MousePointer2 className="h-4 w-4" />
                                                Añadir hotspot
                                            </Button>
                                            {placementMode ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setPlacementMode(null);
                                                        setCreatePointSelected(
                                                            false,
                                                        );
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                    Cancelar colocación
                                                </Button>
                                            ) : null}
                                        </div>

                                        <form
                                            onSubmit={createHotspot}
                                            className="space-y-3 rounded-lg border p-4"
                                        >
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div>
                                                    <Label>Etiqueta</Label>
                                                    <Input
                                                        value={
                                                            hotspotForm.data
                                                                .label
                                                        }
                                                        onChange={(event) =>
                                                            hotspotForm.setData(
                                                                'label',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Ir a la sala"
                                                    />
                                                    <InputError
                                                        message={
                                                            hotspotForm.errors
                                                                .label
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Destino</Label>
                                                    <select
                                                        value={
                                                            hotspotForm.data
                                                                .target_panorama_id
                                                        }
                                                        onChange={(event) =>
                                                            hotspotForm.setData(
                                                                'target_panorama_id',
                                                                Number(
                                                                    event.target
                                                                        .value,
                                                                ),
                                                            )
                                                        }
                                                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                                                    >
                                                        {tour.panoramas
                                                            .filter(
                                                                (panorama) =>
                                                                    panorama.id !==
                                                                    currentPanoramaId,
                                                            )
                                                            .map((panorama) => (
                                                                <option
                                                                    key={
                                                                        panorama.id
                                                                    }
                                                                    value={
                                                                        panorama.id
                                                                    }
                                                                >
                                                                    {
                                                                        panorama.title
                                                                    }
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                                <NumberField
                                                    label="Yaw"
                                                    value={hotspotForm.data.yaw}
                                                    min={-180}
                                                    max={180}
                                                    step={0.001}
                                                    onChange={(value) => {
                                                        hotspotForm.setData(
                                                            'yaw',
                                                            value,
                                                        );
                                                        setCreatePointSelected(
                                                            true,
                                                        );
                                                    }}
                                                />
                                                <NumberField
                                                    label="Pitch"
                                                    value={
                                                        hotspotForm.data.pitch
                                                    }
                                                    min={-85}
                                                    max={85}
                                                    step={0.001}
                                                    onChange={(value) => {
                                                        hotspotForm.setData(
                                                            'pitch',
                                                            value,
                                                        );
                                                        setCreatePointSelected(
                                                            true,
                                                        );
                                                    }}
                                                />
                                            </div>
                                            <HotspotStyleFields
                                                value={hotspotForm.data}
                                                onChange={(changes) =>
                                                    hotspotForm.setData(
                                                        (current) => ({
                                                            ...current,
                                                            ...changes,
                                                        }),
                                                    )
                                                }
                                                inherited={{
                                                    color: tour.settings
                                                        .hotspot_color,
                                                    hover_color:
                                                        tour.settings
                                                            .hotspot_hover_color,
                                                    text_color:
                                                        tour.settings
                                                            .hotspot_text_color,
                                                    size: tour.settings
                                                        .hotspot_size,
                                                    shape: tour.settings
                                                        .hotspot_shape,
                                                    label_visibility:
                                                        tour.settings
                                                            .hotspot_label_visibility,
                                                    pulse_enabled:
                                                        tour.settings
                                                            .hotspot_pulse_enabled,
                                                }}
                                            />
                                            <Button
                                                type="submit"
                                                disabled={
                                                    hotspotForm.processing ||
                                                    !hotspotForm.data.label ||
                                                    !createPointSelected
                                                }
                                            >
                                                <Plus className="h-4 w-4" />
                                                Guardar hotspot
                                            </Button>
                                            {createPointSelected ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setCreatePointSelected(
                                                            false,
                                                        );
                                                        hotspotForm.setData(
                                                            (current) => ({
                                                                ...current,
                                                                yaw: 0,
                                                                pitch: 0,
                                                            }),
                                                        );
                                                    }}
                                                >
                                                    Cancelar punto
                                                </Button>
                                            ) : null}
                                        </form>
                                    </>
                                )}

                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold">
                                        Hotspots de esta escena
                                    </h3>
                                    {currentHotspots.map((hotspot) => (
                                        <button
                                            key={hotspot.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedHotspotId(
                                                    hotspot.id,
                                                );
                                                setCreatePointSelected(false);
                                            }}
                                            className={`flex w-full items-center justify-between rounded-lg border p-3 text-left ${
                                                selectedHotspotId === hotspot.id
                                                    ? 'border-orange-500 bg-orange-50'
                                                    : ''
                                            }`}
                                        >
                                            <span>
                                                <span className="block font-medium">
                                                    {hotspot.label}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    yaw {hotspot.yaw} · pitch{' '}
                                                    {hotspot.pitch}
                                                </span>
                                            </span>
                                            <MapPinned className="h-4 w-4" />
                                        </button>
                                    ))}
                                </div>

                                {selectedHotspot && selectedDraft ? (
                                    <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50/40 p-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold">
                                                Editar hotspot
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedHotspotId(null)
                                                }
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <Input
                                            value={selectedDraft.label}
                                            onChange={(event) =>
                                                updateHotspotDraft(
                                                    selectedHotspot.id,
                                                    {
                                                        label: event.target
                                                            .value,
                                                    },
                                                )
                                            }
                                        />
                                        <Input
                                            type="number"
                                            className="w-24"
                                            min={0}
                                            value={
                                                floorPlanOrders[floorPlan.id] ??
                                                floorPlan.sort_order
                                            }
                                            onChange={(event) =>
                                                setFloorPlanOrders(
                                                    (current) => ({
                                                        ...current,
                                                        [floorPlan.id]: Number(
                                                            event.target.value,
                                                        ),
                                                    }),
                                                )
                                            }
                                            title="Orden"
                                        />
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <NumberField
                                                label="Yaw"
                                                value={selectedDraft.yaw}
                                                min={-180}
                                                max={180}
                                                step={0.001}
                                                onChange={(yaw) =>
                                                    updateHotspotDraft(
                                                        selectedHotspot.id,
                                                        { yaw },
                                                    )
                                                }
                                            />
                                            <NumberField
                                                label="Pitch"
                                                value={selectedDraft.pitch}
                                                min={-85}
                                                max={85}
                                                step={0.001}
                                                onChange={(pitch) =>
                                                    updateHotspotDraft(
                                                        selectedHotspot.id,
                                                        { pitch },
                                                    )
                                                }
                                            />
                                        </div>
                                        <HotspotStyleFields
                                            value={selectedDraft}
                                            onChange={(changes) =>
                                                updateHotspotDraft(
                                                    selectedHotspot.id,
                                                    changes,
                                                )
                                            }
                                            inherited={{
                                                color: tour.settings
                                                    .hotspot_color,
                                                hover_color:
                                                    tour.settings
                                                        .hotspot_hover_color,
                                                text_color:
                                                    tour.settings
                                                        .hotspot_text_color,
                                                size: tour.settings
                                                    .hotspot_size,
                                                shape: tour.settings
                                                    .hotspot_shape,
                                                label_visibility:
                                                    tour.settings
                                                        .hotspot_label_visibility,
                                                pulse_enabled:
                                                    tour.settings
                                                        .hotspot_pulse_enabled,
                                            }}
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    setPlacementMode({
                                                        type: 'reposition',
                                                        hotspotId:
                                                            selectedHotspot.id,
                                                    })
                                                }
                                            >
                                                <MousePointer2 className="h-4 w-4" />
                                                Reposicionar
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    updateHotspot(
                                                        selectedHotspot,
                                                    )
                                                }
                                            >
                                                <Save className="h-4 w-4" />
                                                Guardar cambios
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={() =>
                                                    void deleteHotspot(
                                                        selectedHotspot,
                                                    )
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Tema visual</CardTitle>
                                <CardDescription>
                                    Apariencia predeterminada del tour y sus
                                    hotspots.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form
                                    className="grid gap-4 sm:grid-cols-2"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        themeForm.put(
                                            settingsRoutes.update(project.id)
                                                .url,
                                            { preserveScroll: true },
                                        );
                                    }}
                                >
                                    <ColorField
                                        label="Color principal"
                                        value={themeForm.data.accent_color}
                                        onChange={(value) =>
                                            themeForm.setData(
                                                'accent_color',
                                                value,
                                            )
                                        }
                                    />
                                    <ColorField
                                        label="Hotspot"
                                        value={themeForm.data.hotspot_color}
                                        onChange={(value) =>
                                            themeForm.setData(
                                                'hotspot_color',
                                                value,
                                            )
                                        }
                                    />
                                    <ColorField
                                        label="Hover"
                                        value={
                                            themeForm.data.hotspot_hover_color
                                        }
                                        onChange={(value) =>
                                            themeForm.setData(
                                                'hotspot_hover_color',
                                                value,
                                            )
                                        }
                                    />
                                    <ColorField
                                        label="Texto"
                                        value={
                                            themeForm.data.hotspot_text_color
                                        }
                                        onChange={(value) =>
                                            themeForm.setData(
                                                'hotspot_text_color',
                                                value,
                                            )
                                        }
                                    />
                                    <NumberField
                                        label="Tamaño"
                                        value={themeForm.data.hotspot_size}
                                        min={0.08}
                                        max={0.5}
                                        step={0.01}
                                        onChange={(value) =>
                                            themeForm.setData(
                                                'hotspot_size',
                                                value,
                                            )
                                        }
                                    />
                                    <SelectField
                                        label="Forma"
                                        value={themeForm.data.hotspot_shape}
                                        options={[
                                            ['sphere', 'Esfera'],
                                            ['ring', 'Anillo'],
                                            ['pin', 'Pin'],
                                        ]}
                                        onChange={(value) =>
                                            themeForm.setData(
                                                'hotspot_shape',
                                                value as Project360HotspotShape,
                                            )
                                        }
                                    />
                                    <SelectField
                                        label="Etiqueta"
                                        value={
                                            themeForm.data
                                                .hotspot_label_visibility
                                        }
                                        options={[
                                            ['always', 'Siempre'],
                                            ['hover', 'Al pasar'],
                                            ['hidden', 'Oculta'],
                                        ]}
                                        onChange={(value) =>
                                            themeForm.setData(
                                                'hotspot_label_visibility',
                                                value as Project360LabelVisibility,
                                            )
                                        }
                                    />
                                    <label className="flex items-center gap-2 self-end pb-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={
                                                themeForm.data
                                                    .hotspot_pulse_enabled
                                            }
                                            onChange={(event) =>
                                                themeForm.setData(
                                                    'hotspot_pulse_enabled',
                                                    event.target.checked,
                                                )
                                            }
                                        />
                                        Animación de pulso
                                    </label>
                                    <Button
                                        type="submit"
                                        className="sm:col-span-2 sm:w-fit"
                                        disabled={themeForm.processing}
                                    >
                                        <Save className="h-4 w-4" />
                                        Guardar tema
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Planos y posición</CardTitle>
                                <CardDescription>
                                    Sube planos y pulsa sobre uno para ubicar la
                                    escena actual.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <form
                                    onSubmit={submitFloorPlans}
                                    className="space-y-3 rounded-lg border p-4"
                                >
                                    <Input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        multiple
                                        onChange={(event) => {
                                            const files = Array.from(
                                                event.target.files ?? [],
                                            );
                                            floorPlanUploadForm.setData({
                                                floor_plan_files: files,
                                                floor_plan_titles: files.map(
                                                    (file) =>
                                                        file.name.replace(
                                                            /\.[^.]+$/,
                                                            '',
                                                        ),
                                                ),
                                            });
                                        }}
                                    />
                                    {floorPlanUploadForm.data.floor_plan_titles.map(
                                        (title, index) => (
                                            <Input
                                                key={`${floorPlanUploadForm.data.floor_plan_files[index]?.name}-${index}`}
                                                value={title}
                                                onChange={(event) => {
                                                    const titles = [
                                                        ...floorPlanUploadForm
                                                            .data
                                                            .floor_plan_titles,
                                                    ];
                                                    titles[index] =
                                                        event.target.value;
                                                    floorPlanUploadForm.setData(
                                                        'floor_plan_titles',
                                                        titles,
                                                    );
                                                }}
                                            />
                                        ),
                                    )}
                                    <InputError
                                        message={
                                            floorPlanUploadForm.errors
                                                .floor_plan_files
                                        }
                                    />
                                    <Button
                                        type="submit"
                                        disabled={
                                            floorPlanUploadForm.processing ||
                                            floorPlanUploadForm.data
                                                .floor_plan_files.length === 0
                                        }
                                    >
                                        <Upload className="h-4 w-4" />
                                        Subir planos
                                    </Button>
                                </form>

                                {tour.floor_plans.map((floorPlan) => (
                                    <div
                                        key={floorPlan.id}
                                        className="flex gap-2"
                                    >
                                        <Input
                                            value={
                                                floorPlanTitles[floorPlan.id] ??
                                                floorPlan.title
                                            }
                                            onChange={(event) =>
                                                setFloorPlanTitles(
                                                    (current) => ({
                                                        ...current,
                                                        [floorPlan.id]:
                                                            event.target.value,
                                                    }),
                                                )
                                            }
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            onClick={() =>
                                                router.patch(
                                                    floorPlanRoutes.update({
                                                        project: project.id,
                                                        floorPlan: floorPlan.id,
                                                    }).url,
                                                    {
                                                        title: floorPlanTitles[
                                                            floorPlan.id
                                                        ],
                                                        sort_order:
                                                            floorPlanOrders[
                                                                floorPlan.id
                                                            ] ??
                                                            floorPlan.sort_order,
                                                    },
                                                    {
                                                        preserveScroll: true,
                                                    },
                                                )
                                            }
                                        >
                                            <Save className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="destructive"
                                            onClick={() =>
                                                void (async () => {
                                                    if (
                                                        await confirmDelete(
                                                            `¿Eliminar el plano "${floorPlan.title}"?`,
                                                        )
                                                    ) {
                                                        router.delete(
                                                            floorPlanRoutes.destroy(
                                                                {
                                                                    project:
                                                                        project.id,
                                                                    floorPlan:
                                                                        floorPlan.id,
                                                                },
                                                            ).url,
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        );
                                                    }
                                                })()
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}

                                {currentPanorama ? (
                                    <div className="space-y-3 rounded-lg border p-4">
                                        <h3 className="font-semibold">
                                            Escena: {currentPanorama.title}
                                        </h3>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <NumberField
                                                label="Yaw inicial"
                                                value={sceneDraft.initial_yaw}
                                                min={-180}
                                                max={180}
                                                step={0.001}
                                                onChange={(initial_yaw) =>
                                                    setSceneDraft(
                                                        (current) => ({
                                                            ...current,
                                                            initial_yaw,
                                                        }),
                                                    )
                                                }
                                            />
                                            <NumberField
                                                label="Pitch inicial"
                                                value={sceneDraft.initial_pitch}
                                                min={-85}
                                                max={85}
                                                step={0.001}
                                                onChange={(initial_pitch) =>
                                                    setSceneDraft(
                                                        (current) => ({
                                                            ...current,
                                                            initial_pitch,
                                                        }),
                                                    )
                                                }
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                const angles =
                                                    viewerRef.current?.getViewAngles();
                                                if (angles) {
                                                    setSceneDraft(
                                                        (current) => ({
                                                            ...current,
                                                            initial_yaw:
                                                                angles.yaw,
                                                            initial_pitch:
                                                                angles.pitch,
                                                        }),
                                                    );
                                                }
                                            }}
                                        >
                                            <MapPinned className="h-4 w-4" />
                                            Capturar orientación actual
                                        </Button>
                                        <SelectField
                                            label="Plano asociado"
                                            value={
                                                sceneDraft.floor_plan_id?.toString() ??
                                                ''
                                            }
                                            options={[
                                                ['', 'Sin plano'],
                                                ...tour.floor_plans.map(
                                                    (floorPlan) =>
                                                        [
                                                            String(
                                                                floorPlan.id,
                                                            ),
                                                            floorPlan.title,
                                                        ] as [string, string],
                                                ),
                                            ]}
                                            onChange={(value) =>
                                                setSceneDraft((current) => ({
                                                    ...current,
                                                    floor_plan_id: value
                                                        ? Number(value)
                                                        : null,
                                                    plan_x: value
                                                        ? current.plan_x
                                                        : null,
                                                    plan_y: value
                                                        ? current.plan_y
                                                        : null,
                                                }))
                                            }
                                        />
                                        {tour.floor_plans.find(
                                            (floorPlan) =>
                                                floorPlan.id ===
                                                sceneDraft.floor_plan_id,
                                        ) ? (
                                            <button
                                                type="button"
                                                className="relative block w-full overflow-hidden rounded-lg border bg-slate-100"
                                                onClick={(event) => {
                                                    const coordinates =
                                                        pointerToPlanCoordinates(
                                                            event.clientX,
                                                            event.clientY,
                                                            event.currentTarget.getBoundingClientRect(),
                                                        );
                                                    setSceneDraft(
                                                        (current) => ({
                                                            ...current,
                                                            plan_x: coordinates.x,
                                                            plan_y: coordinates.y,
                                                        }),
                                                    );
                                                }}
                                                onPointerMove={(event) => {
                                                    if (event.buttons !== 1) {
                                                        return;
                                                    }

                                                    const coordinates =
                                                        pointerToPlanCoordinates(
                                                            event.clientX,
                                                            event.clientY,
                                                            event.currentTarget.getBoundingClientRect(),
                                                        );
                                                    setSceneDraft(
                                                        (current) => ({
                                                            ...current,
                                                            plan_x: coordinates.x,
                                                            plan_y: coordinates.y,
                                                        }),
                                                    );
                                                }}
                                            >
                                                <img
                                                    src={
                                                        tour.floor_plans.find(
                                                            (floorPlan) =>
                                                                floorPlan.id ===
                                                                sceneDraft.floor_plan_id,
                                                        )?.image_url
                                                    }
                                                    alt="Plano seleccionado"
                                                    className="max-h-80 w-full object-contain"
                                                    draggable={false}
                                                />
                                                {sceneDraft.plan_x !== null &&
                                                sceneDraft.plan_y !== null ? (
                                                    <MapPinned
                                                        className="absolute h-7 w-7 -translate-x-1/2 -translate-y-full text-orange-600 drop-shadow"
                                                        style={{
                                                            left: `${sceneDraft.plan_x}%`,
                                                            top: `${sceneDraft.plan_y}%`,
                                                        }}
                                                    />
                                                ) : null}
                                            </button>
                                        ) : null}
                                        <Button
                                            type="button"
                                            onClick={saveSceneSettings}
                                        >
                                            <Save className="h-4 w-4" />
                                            Guardar escena
                                        </Button>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>

                        <Card className="xl:col-span-2">
                            <CardHeader>
                                <CardTitle>Enlaces públicos</CardTitle>
                                <CardDescription>
                                    Incluyen panoramas y planos; permanecen
                                    activos hasta revocarlos.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <form
                                    onSubmit={createShareLink}
                                    className="flex flex-col gap-3 sm:flex-row"
                                >
                                    <div className="flex-1">
                                        <Label>Etiqueta opcional</Label>
                                        <Input
                                            value={shareForm.data.label}
                                            onChange={(event) =>
                                                shareForm.setData(
                                                    'label',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Cliente o campaña"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="sm:self-end"
                                        disabled={shareForm.processing}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Crear enlace
                                    </Button>
                                </form>
                                {(tour.share_links ?? []).map((link) => (
                                    <div
                                        key={link.id}
                                        className="flex flex-col gap-3 rounded-lg border p-3 lg:flex-row lg:items-center"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium">
                                                {link.label || 'Sin etiqueta'}
                                            </p>
                                            <p className="truncate text-xs text-slate-500">
                                                {link.url}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                Último acceso:{' '}
                                                {link.last_accessed_at
                                                    ? project360DateFormatter.format(
                                                          new Date(
                                                              link.last_accessed_at,
                                                          ),
                                                      )
                                                    : 'Nunca'}
                                            </p>
                                        </div>
                                        {link.revoked_at ? (
                                            <Badge variant="secondary">
                                                Revocado
                                            </Badge>
                                        ) : (
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    onClick={() =>
                                                        void copyLink(
                                                            link.id,
                                                            link.url,
                                                        )
                                                    }
                                                >
                                                    {copiedLinkId ===
                                                    link.id ? (
                                                        <Check className="h-4 w-4" />
                                                    ) : (
                                                        <Clipboard className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    asChild
                                                    size="icon"
                                                    variant="outline"
                                                >
                                                    <a
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="destructive"
                                                    onClick={() =>
                                                        router.patch(
                                                            shareLinkRoutes.revoke(
                                                                {
                                                                    project:
                                                                        project.id,
                                                                    shareLink:
                                                                        link.id,
                                                                },
                                                            ).url,
                                                            {},
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        )
                                                    }
                                                >
                                                    <Link2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                ) : null}
            </div>
        </AppLayout>
    );
}

function NumberField({
    label,
    value,
    min,
    max,
    step,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
}) {
    return (
        <div>
            <Label>{label}</Label>
            <Input
                type="number"
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={(event) => onChange(Number(event.target.value))}
            />
        </div>
    );
}

function ColorField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <Label>{label}</Label>
            <div className="flex gap-2">
                <Input
                    type="color"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="w-14 p-1"
                />
                <Input
                    value={value}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    onChange={(event) => onChange(event.target.value)}
                />
            </div>
        </div>
    );
}

function SelectField({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: [string, string][];
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <Label>{label}</Label>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
                {options.map(([optionValue, optionLabel]) => (
                    <option key={optionValue} value={optionValue}>
                        {optionLabel}
                    </option>
                ))}
            </select>
        </div>
    );
}

function HotspotStyleFields({
    value,
    inherited,
    onChange,
}: {
    value: Pick<
        HotspotDraft,
        | 'color'
        | 'hover_color'
        | 'text_color'
        | 'size'
        | 'shape'
        | 'label_visibility'
        | 'pulse_enabled'
    >;
    inherited: {
        color: string;
        hover_color: string;
        text_color: string;
        size: number;
        shape: Project360HotspotShape;
        label_visibility: Project360LabelVisibility;
        pulse_enabled: boolean;
    };
    onChange: (changes: Partial<HotspotDraft>) => void;
}) {
    const custom =
        value.color !== null ||
        value.hover_color !== null ||
        value.text_color !== null ||
        value.size !== null ||
        value.shape !== null ||
        value.label_visibility !== null ||
        value.pulse_enabled !== null;

    return (
        <details className="rounded-lg border bg-white p-3">
            <summary className="cursor-pointer text-sm font-medium">
                Estilo avanzado
            </summary>
            <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={custom}
                    onChange={(event) =>
                        onChange(
                            event.target.checked
                                ? inherited
                                : {
                                      color: null,
                                      hover_color: null,
                                      text_color: null,
                                      size: null,
                                      shape: null,
                                      label_visibility: null,
                                      pulse_enabled: null,
                                  },
                        )
                    }
                />
                Sobrescribir el tema general
            </label>
            {custom ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <ColorField
                        label="Color"
                        value={value.color ?? inherited.color}
                        onChange={(color) => onChange({ color })}
                    />
                    <ColorField
                        label="Hover"
                        value={value.hover_color ?? inherited.hover_color}
                        onChange={(hover_color) => onChange({ hover_color })}
                    />
                    <ColorField
                        label="Texto"
                        value={value.text_color ?? inherited.text_color}
                        onChange={(text_color) => onChange({ text_color })}
                    />
                    <NumberField
                        label="Tamaño"
                        value={value.size ?? inherited.size}
                        min={0.08}
                        max={0.5}
                        step={0.01}
                        onChange={(size) => onChange({ size })}
                    />
                    <SelectField
                        label="Forma"
                        value={value.shape ?? inherited.shape}
                        options={[
                            ['sphere', 'Esfera'],
                            ['ring', 'Anillo'],
                            ['pin', 'Pin'],
                        ]}
                        onChange={(shape) =>
                            onChange({
                                shape: shape as Project360HotspotShape,
                            })
                        }
                    />
                    <SelectField
                        label="Etiqueta"
                        value={
                            value.label_visibility ?? inherited.label_visibility
                        }
                        options={[
                            ['always', 'Siempre'],
                            ['hover', 'Al pasar'],
                            ['hidden', 'Oculta'],
                        ]}
                        onChange={(label_visibility) =>
                            onChange({
                                label_visibility:
                                    label_visibility as Project360LabelVisibility,
                            })
                        }
                    />
                    <label className="flex items-center gap-2 self-end pb-2 text-sm">
                        <input
                            type="checkbox"
                            checked={
                                value.pulse_enabled ?? inherited.pulse_enabled
                            }
                            onChange={(event) =>
                                onChange({
                                    pulse_enabled: event.target.checked,
                                })
                            }
                        />
                        Animación de pulso
                    </label>
                </div>
            ) : null}
        </details>
    );
}
