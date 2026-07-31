import { Head, router, useForm, type InertiaFormProps } from '@inertiajs/react';
import {
    Check,
    Clipboard,
    Crosshair,
    ExternalLink,
    Link2,
    MousePointer2,
    Pentagon,
    Plus,
    Rotate3D,
    Save,
    Star,
    Trash2,
    Undo2,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import {
    polygonHasSelfIntersection,
    polylineHasSelfIntersection,
} from '@/lib/project-360-geometry';
import { confirmDelete } from '@/lib/swal';
import project360 from '@/routes/inmopro/project-360';
import hotspotRoutes from '@/routes/inmopro/project-360/hotspots';
import labelRoutes from '@/routes/inmopro/project-360/labels';
import panoramaRoutes from '@/routes/inmopro/project-360/panoramas';
import polygonRoutes from '@/routes/inmopro/project-360/polygons';
import sceneSettingsRoutes from '@/routes/inmopro/project-360/scene-settings';
import settingsRoutes from '@/routes/inmopro/project-360/settings';
import shareLinkRoutes from '@/routes/inmopro/project-360/share-links';
import startPanoramaRoutes from '@/routes/inmopro/project-360/start-panorama';
import type { BreadcrumbItem } from '@/types';
import type {
    Project360Hotspot,
    Project360Label,
    Project360HotspotShape,
    Project360LabelVisibility,
    Project360LotOption,
    Project360Polygon,
    Project360PolygonVertex,
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
    lotOptions: Project360LotOption[];
};

type UploadForm = {
    panorama_files: File[];
    panorama_titles: string[];
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

type PolygonDraft = {
    lot_id: number | null;
    title: string;
    description: string;
    vertices: Project360PolygonVertex[];
    color: string;
    hover_color: string;
    opacity: number;
};

type LabelDraft = {
    text: string;
    yaw: number;
    pitch: number;
    color: string;
    size: number;
};

type PolygonDrawingState = 'idle' | 'drawing' | 'closed';
type PolygonDraftTarget = 'create' | number | null;

type PlacementMode =
    | { type: 'create-hotspot' }
    | { type: 'reposition-hotspot'; hotspotId: number }
    | { type: 'create-label' }
    | { type: 'reposition-label'; labelId: number }
    | { type: 'draw-polygon' }
    | { type: 'redraw-polygon'; polygonId: number }
    | null;

type EditorTab =
    | 'panoramas'
    | 'hotspots'
    | 'labels'
    | 'polygons'
    | 'appearance'
    | 'share';

const editorTabs: { id: EditorTab; label: string }[] = [
    { id: 'panoramas', label: 'Panoramas' },
    { id: 'hotspots', label: 'Hotspots' },
    { id: 'labels', label: 'Etiquetas' },
    { id: 'polygons', label: 'Polígonos' },
    { id: 'appearance', label: 'Apariencia' },
    { id: 'share', label: 'Compartir' },
];

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

function polygonDraft(polygon: Project360Polygon): PolygonDraft {
    return {
        lot_id: polygon.lot_id,
        title: polygon.title,
        description: polygon.description ?? '',
        vertices: polygon.vertices,
        color: polygon.color,
        hover_color: polygon.hover_color,
        opacity: polygon.opacity,
    };
}

function labelDraft(label: Project360Label): LabelDraft {
    return {
        text: label.text,
        yaw: label.yaw,
        pitch: label.pitch,
        color: label.color,
        size: label.size,
    };
}

export default function Project360Show({
    project,
    tour,
    canManage,
    lotOptions,
}: PageProps) {
    const viewerRef = useRef<Project360ViewerHandle>(null);
    const initialPanoramaId =
        tour.start_panorama_id ?? tour.panoramas[0]?.id ?? null;
    const initialPanorama =
        tour.panoramas.find((item) => item.id === initialPanoramaId) ?? null;
    const [activeTab, setActiveTab] = useState<EditorTab>('panoramas');
    const [activePanoramaId, setActivePanoramaId] = useState<number | null>(
        initialPanoramaId,
    );
    const [placementMode, setPlacementMode] = useState<PlacementMode>(null);
    const [polygonDrawingState, setPolygonDrawingState] =
        useState<PolygonDrawingState>('idle');
    const [polygonDraftTarget, setPolygonDraftTarget] =
        useState<PolygonDraftTarget>(null);
    const [polygonDrawingError, setPolygonDrawingError] = useState<
        string | null
    >(null);
    const [createPointSelected, setCreatePointSelected] = useState(false);
    const [createLabelPointSelected, setCreateLabelPointSelected] =
        useState(false);
    const [selectedHotspotId, setSelectedHotspotId] = useState<number | null>(
        null,
    );
    const [selectedPolygonId, setSelectedPolygonId] = useState<number | null>(
        null,
    );
    const [selectedLabelId, setSelectedLabelId] = useState<number | null>(null);
    const [panoramaTitles, setPanoramaTitles] = useState(
        Object.fromEntries(
            tour.panoramas.map((panorama) => [panorama.id, panorama.title]),
        ),
    );
    const [hotspotDrafts, setHotspotDrafts] = useState<
        Record<number, HotspotDraft>
    >(
        Object.fromEntries(
            tour.hotspots.map((hotspot) => [hotspot.id, hotspotDraft(hotspot)]),
        ),
    );
    const [polygonDrafts, setPolygonDrafts] = useState<
        Record<number, PolygonDraft>
    >(
        Object.fromEntries(
            tour.polygons.map((polygon) => [polygon.id, polygonDraft(polygon)]),
        ),
    );
    const [labelDrafts, setLabelDrafts] = useState<Record<number, LabelDraft>>(
        Object.fromEntries(
            tour.labels.map((label) => [label.id, labelDraft(label)]),
        ),
    );
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
    const [sceneDraft, setSceneDraft] = useState({
        initial_yaw: initialPanorama?.initial_yaw ?? 0,
        initial_pitch: initialPanorama?.initial_pitch ?? 0,
    });

    const uploadForm = useForm<UploadForm>({
        panorama_files: [],
        panorama_titles: [],
    });
    const hotspotForm = useForm<HotspotDraft & { source_panorama_id: number }>({
        source_panorama_id: initialPanoramaId ?? 0,
        target_panorama_id:
            tour.panoramas.find((item) => item.id !== initialPanoramaId)?.id ??
            0,
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
    const labelForm = useForm<LabelDraft & { source_panorama_id: number }>({
        source_panorama_id: initialPanoramaId ?? 0,
        text: '',
        yaw: 0,
        pitch: 0,
        color: tour.settings.hotspot_text_color,
        size: 1,
    });
    const polygonForm = useForm<PolygonDraft & { source_panorama_id: number }>({
        source_panorama_id: initialPanoramaId ?? 0,
        lot_id: null,
        title: '',
        description: '',
        vertices: [],
        color: tour.settings.accent_color,
        hover_color: tour.settings.hotspot_hover_color,
        opacity: 0.28,
    });
    const themeForm = useForm({ ...tour.settings });
    const shareForm = useForm({ label: '' });

    const currentPanorama =
        tour.panoramas.find((item) => item.id === activePanoramaId) ??
        tour.panoramas[0] ??
        null;
    const currentPanoramaId = currentPanorama?.id ?? null;
    const currentHotspots = tour.hotspots.filter(
        (hotspot) => hotspot.source_panorama_id === currentPanoramaId,
    );
    const currentPolygons = tour.polygons.filter(
        (polygon) => polygon.source_panorama_id === currentPanoramaId,
    );
    const currentLabels = tour.labels.filter(
        (label) => label.source_panorama_id === currentPanoramaId,
    );
    const selectedHotspot = tour.hotspots.find(
        (hotspot) => hotspot.id === selectedHotspotId,
    );
    const selectedHotspotDraft = selectedHotspot
        ? hotspotDrafts[selectedHotspot.id]
        : null;
    const selectedPolygon = tour.polygons.find(
        (polygon) => polygon.id === selectedPolygonId,
    );
    const selectedPolygonDraft = selectedPolygon
        ? polygonDrafts[selectedPolygon.id]
        : null;
    const selectedLabel = tour.labels.find(
        (label) => label.id === selectedLabelId,
    );
    const selectedLabelDraft = selectedLabel
        ? labelDrafts[selectedLabel.id]
        : null;
    const activeLabelDraft =
        selectedLabelDraft ??
        (createLabelPointSelected ? labelForm.data : null);
    const previewLabel: Project360Label | null = activeLabelDraft
        ? {
              id: -2,
              source_panorama_id: currentPanoramaId ?? 0,
              ...activeLabelDraft,
          }
        : null;

    const previewPoint = useMemo(() => {
        if (selectedHotspotDraft) {
            return {
                yaw: Number(selectedHotspotDraft.yaw),
                pitch: Number(selectedHotspotDraft.pitch),
            };
        }

        if (createPointSelected) {
            return {
                yaw: Number(hotspotForm.data.yaw),
                pitch: Number(hotspotForm.data.pitch),
            };
        }

        return null;
    }, [
        createPointSelected,
        hotspotForm.data.pitch,
        hotspotForm.data.yaw,
        selectedHotspotDraft,
    ]);
    const draftStyle = useMemo(() => {
        const draft = selectedHotspotDraft ?? hotspotForm.data;

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
    }, [hotspotForm.data, selectedHotspotDraft, tour.settings]);
    const activePolygonDraft =
        polygonDraftTarget === 'create'
            ? polygonForm.data
            : typeof polygonDraftTarget === 'number'
              ? polygonDrafts[polygonDraftTarget]
              : null;
    const polygonDraftVertices = activePolygonDraft?.vertices ?? [];
    const polygonPreviewInvalid =
        polygonDrawingState === 'drawing'
            ? polylineHasSelfIntersection(polygonDraftVertices)
            : polygonHasSelfIntersection(polygonDraftVertices);
    const previewLot = activePolygonDraft?.lot_id
        ? (lotOptions.find((lot) => lot.id === activePolygonDraft.lot_id) ??
          null)
        : null;
    const closedPolygonPreview: Project360Polygon | null =
        polygonDrawingState === 'closed' && activePolygonDraft
            ? {
                  id: -1,
                  source_panorama_id: currentPanoramaId ?? 0,
                  lot_id: previewLot?.id ?? null,
                  lot: previewLot
                      ? {
                            id: previewLot.id,
                            number: previewLot.number,
                            status: previewLot.status,
                        }
                      : null,
                  title: previewLot
                      ? `Lote ${previewLot.number}`
                      : activePolygonDraft.title || 'Vista previa',
                  description: activePolygonDraft.description || null,
                  vertices: activePolygonDraft.vertices,
                  color: previewLot?.status?.color ?? activePolygonDraft.color,
                  hover_color:
                      previewLot?.status?.color ??
                      activePolygonDraft.hover_color,
                  opacity: activePolygonDraft.opacity,
              }
            : null;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Vista 360', href: project360.index().url },
        { title: project.name, href: project360.show(project.id).url },
    ];

    const handlePanoramaChange = (panoramaId: number) => {
        if (typeof polygonDraftTarget === 'number') {
            const polygon = tour.polygons.find(
                (item) => item.id === polygonDraftTarget,
            );
            if (polygon) {
                setPolygonDrafts((current) => ({
                    ...current,
                    [polygon.id]: polygonDraft(polygon),
                }));
            }
        }
        if (polygonDraftTarget === 'create') {
            polygonForm.setData('vertices', []);
        }
        setActivePanoramaId(panoramaId);
        setSelectedHotspotId(null);
        setSelectedLabelId(null);
        setSelectedPolygonId(null);
        setPlacementMode(null);
        setPolygonDrawingState('idle');
        setPolygonDraftTarget(null);
        setPolygonDrawingError(null);
        setCreatePointSelected(false);
        setCreateLabelPointSelected(false);
        const panorama = tour.panoramas.find((item) => item.id === panoramaId);
        const alternative = tour.panoramas.find(
            (item) => item.id !== panoramaId,
        );

        if (panorama) {
            setSceneDraft({
                initial_yaw: panorama.initial_yaw,
                initial_pitch: panorama.initial_pitch,
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
        polygonForm.setData('source_panorama_id', panoramaId);
        labelForm.setData('source_panorama_id', panoramaId);
    };

    const handlePlacement = (point: Project360PolygonVertex) => {
        if (placementMode?.type === 'reposition-hotspot') {
            updateHotspotDraft(placementMode.hotspotId, point);
            setPlacementMode(null);

            return;
        }

        if (placementMode?.type === 'create-hotspot') {
            hotspotForm.setData((current) => ({ ...current, ...point }));
            setCreatePointSelected(true);
            setPlacementMode(null);

            return;
        }

        if (placementMode?.type === 'reposition-label') {
            updateLabelDraft(placementMode.labelId, point);
            setPlacementMode(null);

            return;
        }

        if (placementMode?.type === 'create-label') {
            labelForm.setData((current) => ({ ...current, ...point }));
            setCreateLabelPointSelected(true);
            setPlacementMode(null);

            return;
        }

        if (placementMode?.type === 'redraw-polygon') {
            const polygonId = placementMode.polygonId;
            const vertices = polygonDrafts[polygonId]?.vertices ?? [];
            if (vertices.length >= 32) {
                setPolygonDrawingError(
                    'Llegaste al máximo de 32 vértices. Cierra el polígono o deshaz un punto.',
                );

                return;
            }
            const nextVertices = [...vertices, point];
            setPolygonDrafts((current) => ({
                ...current,
                [polygonId]: {
                    ...current[polygonId],
                    vertices: nextVertices,
                },
            }));
            setPolygonDrawingError(
                polylineHasSelfIntersection(nextVertices)
                    ? 'El trazado tiene lados cruzados. Deshaz el último punto.'
                    : null,
            );

            return;
        }

        if (placementMode?.type === 'draw-polygon') {
            if (polygonForm.data.vertices.length >= 32) {
                setPolygonDrawingError(
                    'Llegaste al máximo de 32 vértices. Cierra el polígono o deshaz un punto.',
                );

                return;
            }
            const nextVertices = [...polygonForm.data.vertices, point];
            polygonForm.setData((current) => ({
                ...current,
                vertices: nextVertices,
            }));
            setPolygonDrawingError(
                polylineHasSelfIntersection(nextVertices)
                    ? 'El trazado tiene lados cruzados. Deshaz el último punto.'
                    : null,
            );
        }
    };

    const closePolygonDrawing = () => {
        if (
            polygonDrawingState !== 'drawing' ||
            polygonDraftVertices.length < 3
        ) {
            return;
        }

        if (polygonHasSelfIntersection(polygonDraftVertices)) {
            setPolygonDrawingError(
                'No se puede cerrar porque alguno de sus lados se cruza.',
            );

            return;
        }

        setPolygonDrawingState('closed');
        setPolygonDrawingError(null);
        setPlacementMode(null);
    };

    const reopenPolygonDrawing = () => {
        if (polygonDraftTarget === 'create') {
            setPlacementMode({ type: 'draw-polygon' });
        } else if (typeof polygonDraftTarget === 'number') {
            setPlacementMode({
                type: 'redraw-polygon',
                polygonId: polygonDraftTarget,
            });
        }
        setPolygonDrawingState('drawing');
        setPolygonDrawingError(null);
    };

    const startPolygonDrawing = () => {
        polygonForm.setData('vertices', []);
        setSelectedHotspotId(null);
        setSelectedLabelId(null);
        setPolygonDraftTarget('create');
        setPolygonDrawingState('drawing');
        setPolygonDrawingError(null);
        setPlacementMode({ type: 'draw-polygon' });
    };

    const startPolygonRedraw = (polygon: Project360Polygon) => {
        updatePolygonDraft(polygon.id, { vertices: [] });
        setPolygonDraftTarget(polygon.id);
        setPolygonDrawingState('drawing');
        setPolygonDrawingError(null);
        setPlacementMode({
            type: 'redraw-polygon',
            polygonId: polygon.id,
        });
    };

    const captureHotspotOrientation = () => {
        const angles = viewerRef.current?.getViewAngles();
        if (!angles) {
            return;
        }

        if (selectedHotspot) {
            updateHotspotDraft(selectedHotspot.id, angles);
        } else {
            hotspotForm.setData((current) => ({ ...current, ...angles }));
            setCreatePointSelected(true);
        }

        setPlacementMode(null);
    };

    const captureLabelOrientation = () => {
        const angles = viewerRef.current?.getViewAngles();
        if (!angles) {
            return;
        }

        if (selectedLabel) {
            updateLabelDraft(selectedLabel.id, angles);
        } else {
            labelForm.setData((current) => ({ ...current, ...angles }));
            setCreateLabelPointSelected(true);
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
                setCreatePointSelected(false);
                setPlacementMode(null);
            },
        });
    };

    const updateHotspot = (hotspot: Project360Hotspot) => {
        router.put(
            hotspotRoutes.update({
                project: project.id,
                hotspot: hotspot.id,
            }).url,
            {
                source_panorama_id: hotspot.source_panorama_id,
                ...(hotspotDrafts[hotspot.id] ?? hotspotDraft(hotspot)),
            },
            {
                preserveScroll: true,
                onSuccess: () => setSelectedHotspotId(null),
            },
        );
    };

    const createLabel = (event: React.FormEvent) => {
        event.preventDefault();
        labelForm.transform((data) => ({
            ...data,
            source_panorama_id: currentPanoramaId,
        }));
        labelForm.post(labelRoutes.store(project.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                labelForm.reset('text', 'yaw', 'pitch');
                setCreateLabelPointSelected(false);
                setPlacementMode(null);
            },
        });
    };

    const updateLabel = (label: Project360Label) => {
        router.put(
            labelRoutes.update({
                project: project.id,
                label: label.id,
            }).url,
            {
                source_panorama_id: label.source_panorama_id,
                ...(labelDrafts[label.id] ?? labelDraft(label)),
            },
            {
                preserveScroll: true,
                onSuccess: () => setSelectedLabelId(null),
            },
        );
    };

    const createPolygon = (event: React.FormEvent) => {
        event.preventDefault();
        polygonForm.transform((data) => ({
            ...data,
            source_panorama_id: currentPanoramaId,
            description: data.description || null,
        }));
        polygonForm.post(polygonRoutes.store(project.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                polygonForm.reset('lot_id', 'title', 'description', 'vertices');
                setPlacementMode(null);
                setPolygonDrawingState('idle');
                setPolygonDraftTarget(null);
                setPolygonDrawingError(null);
            },
        });
    };

    const updatePolygon = (polygon: Project360Polygon) => {
        const draft = polygonDrafts[polygon.id] ?? polygonDraft(polygon);
        router.put(
            polygonRoutes.update({
                project: project.id,
                polygon: polygon.id,
            }).url,
            {
                source_panorama_id: polygon.source_panorama_id,
                ...draft,
                description: draft.description || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedPolygonId(null);
                    setPolygonDrawingState('idle');
                    setPolygonDraftTarget(null);
                    setPolygonDrawingError(null);
                },
            },
        );
    };

    const saveSceneSettings = () => {
        if (!currentPanoramaId) {
            return;
        }

        router.put(
            sceneSettingsRoutes.update(project.id).url,
            { panorama_id: currentPanoramaId, ...sceneDraft },
            { preserveScroll: true },
        );
    };

    const updateHotspotDraft = (
        hotspotId: number,
        changes: Partial<HotspotDraft>,
    ) => {
        setHotspotDrafts((current) => ({
            ...current,
            [hotspotId]: { ...current[hotspotId], ...changes },
        }));
    };

    const updatePolygonDraft = (
        polygonId: number,
        changes: Partial<PolygonDraft>,
    ) => {
        setPolygonDrafts((current) => ({
            ...current,
            [polygonId]: { ...current[polygonId], ...changes },
        }));
    };

    const updateLabelDraft = (
        labelId: number,
        changes: Partial<LabelDraft>,
    ) => {
        setLabelDrafts((current) => ({
            ...current,
            [labelId]: { ...current[labelId], ...changes },
        }));
    };

    const cancelPlacement = () => {
        if (placementMode?.type === 'reposition-label' && selectedLabel) {
            setLabelDrafts((current) => ({
                ...current,
                [selectedLabel.id]: labelDraft(selectedLabel),
            }));
        }

        if (typeof polygonDraftTarget === 'number' && selectedPolygon) {
            setPolygonDrafts((current) => ({
                ...current,
                [selectedPolygon.id]: polygonDraft(selectedPolygon),
            }));
        }

        if (polygonDraftTarget === 'create') {
            polygonForm.setData('vertices', []);
        }

        setPlacementMode(null);
        setPolygonDrawingState('idle');
        setPolygonDraftTarget(null);
        setPolygonDrawingError(null);
    };

    const undoPolygonVertex = () => {
        if (placementMode?.type === 'redraw-polygon') {
            const polygonId = placementMode.polygonId;
            updatePolygonDraft(polygonId, {
                vertices: polygonDrafts[polygonId]?.vertices.slice(0, -1) ?? [],
            });
        } else {
            polygonForm.setData(
                'vertices',
                polygonForm.data.vertices.slice(0, -1),
            );
        }
        setPolygonDrawingError(null);
    };

    const deleteHotspot = async (hotspot: Project360Hotspot) => {
        if (
            !(await confirmDelete(`¿Eliminar el hotspot "${hotspot.label}"?`))
        ) {
            return;
        }

        router.delete(
            hotspotRoutes.destroy({
                project: project.id,
                hotspot: hotspot.id,
            }).url,
            { preserveScroll: true },
        );
    };

    const deletePolygon = async (polygon: Project360Polygon) => {
        if (
            !(await confirmDelete(`¿Eliminar el polígono "${polygon.title}"?`))
        ) {
            return;
        }

        router.delete(
            polygonRoutes.destroy({
                project: project.id,
                polygon: polygon.id,
            }).url,
            { preserveScroll: true },
        );
    };

    const deleteLabel = async (label: Project360Label) => {
        if (!(await confirmDelete(`¿Eliminar la etiqueta "${label.text}"?`))) {
            return;
        }

        router.delete(
            labelRoutes.destroy({
                project: project.id,
                label: label.id,
            }).url,
            { preserveScroll: true },
        );
    };

    const copyLink = async (id: string, url: string) => {
        await navigator.clipboard.writeText(url);
        setCopiedLinkId(id);
        window.setTimeout(() => setCopiedLinkId(null), 1800);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Vista 360 - ${project.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
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
                            Configura escenas, navegación y zonas informativas
                            directamente sobre el panorama.
                        </p>
                    </div>
                </div>

                <div
                    className={`grid min-h-0 flex-1 gap-4 ${
                        canManage
                            ? 'xl:grid-cols-[minmax(0,1fr)_26rem]'
                            : 'grid-cols-1'
                    }`}
                >
                    <div className="min-h-[34rem] xl:sticky xl:top-4 xl:h-[calc(100vh-7.5rem)]">
                        <Project360Viewer
                            ref={viewerRef}
                            panoramas={tour.panoramas}
                            hotspots={tour.hotspots}
                            labels={tour.labels}
                            polygons={tour.polygons}
                            settings={tour.settings}
                            startPanoramaId={tour.start_panorama_id}
                            placementMode={placementMode !== null}
                            draftPoint={previewPoint}
                            draftStyle={draftStyle}
                            editingHotspotId={selectedHotspotId}
                            editingLabelId={selectedLabelId}
                            draftLabel={previewLabel}
                            polygonDraft={polygonDraftVertices}
                            polygonPreview={closedPolygonPreview}
                            polygonDrawing={polygonDrawingState === 'drawing'}
                            interactionLocked={polygonDrawingState !== 'idle'}
                            editingPolygonId={
                                typeof polygonDraftTarget === 'number'
                                    ? polygonDraftTarget
                                    : null
                            }
                            selectedPolygonId={selectedPolygonId}
                            onPlacement={handlePlacement}
                            onPolygonClose={closePolygonDrawing}
                            onPanoramaChange={handlePanoramaChange}
                            onPolygonSelect={(polygonId) => {
                                setSelectedPolygonId(polygonId);
                                if (polygonId !== null) {
                                    setActiveTab('polygons');
                                }
                            }}
                            className="h-full min-h-[34rem] w-full"
                        />
                    </div>

                    {canManage ? (
                        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-background shadow-sm xl:sticky xl:top-4 xl:h-[calc(100vh-7.5rem)]">
                            <div
                                role="tablist"
                                aria-label="Configuración del tour 360"
                                className="flex gap-1 overflow-x-auto border-b bg-slate-50 p-2"
                            >
                                {editorTabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={activeTab === tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            if (tab.id !== 'labels') {
                                                setSelectedLabelId(null);
                                            }
                                            if (tab.id !== 'hotspots') {
                                                setSelectedHotspotId(null);
                                            }
                                        }}
                                        className={`shrink-0 rounded-md px-3 py-2 text-xs font-medium transition ${
                                            activeTab === tab.id
                                                ? 'bg-slate-900 text-white shadow-sm'
                                                : 'text-slate-600 hover:bg-white hover:text-slate-950'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-20">
                                {activeTab === 'panoramas' ? (
                                    <PanoramasPanel
                                        project={project}
                                        tour={tour}
                                        currentPanorama={currentPanorama}
                                        panoramaTitles={panoramaTitles}
                                        setPanoramaTitles={setPanoramaTitles}
                                        uploadForm={uploadForm}
                                        submitPanoramas={submitPanoramas}
                                        sceneDraft={sceneDraft}
                                        setSceneDraft={setSceneDraft}
                                        viewerRef={viewerRef}
                                        saveSceneSettings={saveSceneSettings}
                                    />
                                ) : null}

                                {activeTab === 'hotspots' ? (
                                    <HotspotsPanel
                                        tour={tour}
                                        currentPanoramaId={currentPanoramaId}
                                        currentHotspots={currentHotspots}
                                        selectedHotspot={selectedHotspot}
                                        selectedDraft={selectedHotspotDraft}
                                        hotspotForm={hotspotForm}
                                        placementMode={placementMode}
                                        createPointSelected={
                                            createPointSelected
                                        }
                                        setCreatePointSelected={
                                            setCreatePointSelected
                                        }
                                        setPlacementMode={setPlacementMode}
                                        setSelectedHotspotId={
                                            setSelectedHotspotId
                                        }
                                        setSelectedPolygonId={
                                            setSelectedPolygonId
                                        }
                                        captureOrientation={
                                            captureHotspotOrientation
                                        }
                                        createHotspot={createHotspot}
                                        updateDraft={updateHotspotDraft}
                                        updateHotspot={updateHotspot}
                                        deleteHotspot={deleteHotspot}
                                        cancelPlacement={cancelPlacement}
                                    />
                                ) : null}

                                {activeTab === 'labels' ? (
                                    <LabelsPanel
                                        currentPanoramaId={currentPanoramaId}
                                        currentLabels={currentLabels}
                                        selectedLabel={selectedLabel}
                                        selectedDraft={selectedLabelDraft}
                                        labelForm={labelForm}
                                        placementMode={placementMode}
                                        createPointSelected={
                                            createLabelPointSelected
                                        }
                                        setCreatePointSelected={
                                            setCreateLabelPointSelected
                                        }
                                        setPlacementMode={setPlacementMode}
                                        setSelectedLabelId={setSelectedLabelId}
                                        setSelectedHotspotId={
                                            setSelectedHotspotId
                                        }
                                        setSelectedPolygonId={
                                            setSelectedPolygonId
                                        }
                                        captureOrientation={
                                            captureLabelOrientation
                                        }
                                        createLabel={createLabel}
                                        updateDraft={updateLabelDraft}
                                        updateLabel={updateLabel}
                                        deleteLabel={deleteLabel}
                                        cancelPlacement={cancelPlacement}
                                    />
                                ) : null}

                                {activeTab === 'polygons' ? (
                                    <PolygonsPanel
                                        lotOptions={lotOptions}
                                        usedLotIds={
                                            new Set(
                                                tour.polygons
                                                    .map(
                                                        (polygon) =>
                                                            polygon.lot_id,
                                                    )
                                                    .filter(
                                                        (
                                                            lotId,
                                                        ): lotId is number =>
                                                            lotId !== null,
                                                    ),
                                            )
                                        }
                                        currentPanoramaId={currentPanoramaId}
                                        currentPolygons={currentPolygons}
                                        selectedPolygon={selectedPolygon}
                                        selectedDraft={selectedPolygonDraft}
                                        polygonForm={polygonForm}
                                        polygonDrawingState={
                                            polygonDrawingState
                                        }
                                        polygonDraftTarget={polygonDraftTarget}
                                        polygonPreview={polygonDraftVertices}
                                        polygonPreviewInvalid={
                                            polygonPreviewInvalid
                                        }
                                        polygonDrawingError={
                                            polygonDrawingError
                                        }
                                        setSelectedPolygonId={
                                            setSelectedPolygonId
                                        }
                                        setSelectedHotspotId={
                                            setSelectedHotspotId
                                        }
                                        createPolygon={createPolygon}
                                        updateDraft={updatePolygonDraft}
                                        updatePolygon={updatePolygon}
                                        deletePolygon={deletePolygon}
                                        undoVertex={undoPolygonVertex}
                                        cancelPlacement={cancelPlacement}
                                        startDrawing={startPolygonDrawing}
                                        startRedraw={startPolygonRedraw}
                                        reopenDrawing={reopenPolygonDrawing}
                                    />
                                ) : null}

                                {activeTab === 'appearance' ? (
                                    <AppearancePanel
                                        themeForm={themeForm}
                                        projectId={project.id}
                                    />
                                ) : null}

                                {activeTab === 'share' ? (
                                    <SharePanel
                                        projectId={project.id}
                                        tour={tour}
                                        shareForm={shareForm}
                                        copiedLinkId={copiedLinkId}
                                        copyLink={copyLink}
                                    />
                                ) : null}
                            </div>
                        </aside>
                    ) : null}
                </div>
            </div>
        </AppLayout>
    );
}

type InertiaForm<T extends object> = InertiaFormProps<T>;

function PanoramasPanel({
    project,
    tour,
    currentPanorama,
    panoramaTitles,
    setPanoramaTitles,
    uploadForm,
    submitPanoramas,
    sceneDraft,
    setSceneDraft,
    viewerRef,
    saveSceneSettings,
}: {
    project: Project;
    tour: Project360Tour;
    currentPanorama: Project360Tour['panoramas'][number] | null;
    panoramaTitles: Record<number, string>;
    setPanoramaTitles: React.Dispatch<
        React.SetStateAction<Record<number, string>>
    >;
    uploadForm: InertiaForm<UploadForm>;
    submitPanoramas: (event: React.FormEvent) => void;
    sceneDraft: { initial_yaw: number; initial_pitch: number };
    setSceneDraft: React.Dispatch<
        React.SetStateAction<{ initial_yaw: number; initial_pitch: number }>
    >;
    viewerRef: React.RefObject<Project360ViewerHandle | null>;
    saveSceneSettings: () => void;
}) {
    return (
        <PanelSection
            title="Panoramas"
            description="Carga imágenes 2:1 y define la vista inicial de cada escena."
        >
            <form
                onSubmit={submitPanoramas}
                className="space-y-3 rounded-lg border bg-slate-50 p-3"
            >
                <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        uploadForm.setData({
                            panorama_files: files,
                            panorama_titles: files.map((file) =>
                                file.name.replace(/\.[^.]+$/, ''),
                            ),
                        });
                    }}
                />
                {uploadForm.data.panorama_titles.map((title, index) => (
                    <Input
                        key={`${uploadForm.data.panorama_files[index]?.name}-${index}`}
                        value={title}
                        onChange={(event) => {
                            const titles = [...uploadForm.data.panorama_titles];
                            titles[index] = event.target.value;
                            uploadForm.setData('panorama_titles', titles);
                        }}
                        placeholder={`Título ${index + 1}`}
                    />
                ))}
                <InputError message={uploadForm.errors.panorama_files} />
                <Button
                    type="submit"
                    size="sm"
                    disabled={
                        uploadForm.processing ||
                        uploadForm.data.panorama_files.length === 0
                    }
                >
                    <Upload className="h-4 w-4" /> Subir panoramas
                </Button>
            </form>

            <div className="space-y-2">
                {tour.panoramas.map((panorama) => (
                    <div
                        key={panorama.id}
                        className="flex items-center gap-2 rounded-lg border p-2"
                    >
                        <Input
                            value={
                                panoramaTitles[panorama.id] ?? panorama.title
                            }
                            onChange={(event) =>
                                setPanoramaTitles((current) => ({
                                    ...current,
                                    [panorama.id]: event.target.value,
                                }))
                            }
                        />
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            title="Guardar título"
                            onClick={() =>
                                router.patch(
                                    panoramaRoutes.update({
                                        project: project.id,
                                        panorama: panorama.id,
                                    }).url,
                                    { title: panoramaTitles[panorama.id] },
                                    { preserveScroll: true },
                                )
                            }
                        >
                            <Save className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant={
                                panorama.is_starting ? 'default' : 'outline'
                            }
                            title="Escena inicial"
                            onClick={() =>
                                router.put(
                                    startPanoramaRoutes.update(project.id).url,
                                    { panorama_id: panorama.id },
                                    { preserveScroll: true },
                                )
                            }
                        >
                            <Star className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            title="Eliminar panorama"
                            onClick={() =>
                                void (async () => {
                                    if (
                                        await confirmDelete(
                                            `¿Eliminar el panorama "${panorama.title}"?`,
                                        )
                                    ) {
                                        router.delete(
                                            panoramaRoutes.destroy({
                                                project: project.id,
                                                panorama: panorama.id,
                                            }).url,
                                            { preserveScroll: true },
                                        );
                                    }
                                })()
                            }
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

            {currentPanorama ? (
                <div className="space-y-3 rounded-lg border p-3">
                    <div>
                        <h3 className="text-sm font-semibold">
                            Orientación inicial
                        </h3>
                        <p className="text-xs text-slate-500">
                            Escena: {currentPanorama.title}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <NumberField
                            label="Yaw"
                            value={sceneDraft.initial_yaw}
                            min={-180}
                            max={180}
                            step={0.001}
                            onChange={(initial_yaw) =>
                                setSceneDraft((current) => ({
                                    ...current,
                                    initial_yaw,
                                }))
                            }
                        />
                        <NumberField
                            label="Pitch"
                            value={sceneDraft.initial_pitch}
                            min={-85}
                            max={85}
                            step={0.001}
                            onChange={(initial_pitch) =>
                                setSceneDraft((current) => ({
                                    ...current,
                                    initial_pitch,
                                }))
                            }
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                const angles =
                                    viewerRef.current?.getViewAngles();
                                if (angles) {
                                    setSceneDraft({
                                        initial_yaw: angles.yaw,
                                        initial_pitch: angles.pitch,
                                    });
                                }
                            }}
                        >
                            <Rotate3D className="h-4 w-4" /> Usar vista actual
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={saveSceneSettings}
                        >
                            <Save className="h-4 w-4" /> Guardar orientación
                        </Button>
                    </div>
                </div>
            ) : null}
        </PanelSection>
    );
}

function HotspotsPanel({
    tour,
    currentPanoramaId,
    currentHotspots,
    selectedHotspot,
    selectedDraft,
    hotspotForm,
    placementMode,
    createPointSelected,
    setCreatePointSelected,
    setPlacementMode,
    setSelectedHotspotId,
    setSelectedPolygonId,
    captureOrientation,
    createHotspot,
    updateDraft,
    updateHotspot,
    deleteHotspot,
    cancelPlacement,
}: {
    tour: Project360Tour;
    currentPanoramaId: number | null;
    currentHotspots: Project360Hotspot[];
    selectedHotspot: Project360Hotspot | undefined;
    selectedDraft: HotspotDraft | null;
    hotspotForm: InertiaForm<HotspotDraft & { source_panorama_id: number }>;
    placementMode: PlacementMode;
    createPointSelected: boolean;
    setCreatePointSelected: React.Dispatch<React.SetStateAction<boolean>>;
    setPlacementMode: React.Dispatch<React.SetStateAction<PlacementMode>>;
    setSelectedHotspotId: React.Dispatch<React.SetStateAction<number | null>>;
    setSelectedPolygonId: React.Dispatch<React.SetStateAction<number | null>>;
    captureOrientation: () => void;
    createHotspot: (event: React.FormEvent) => void;
    updateDraft: (id: number, changes: Partial<HotspotDraft>) => void;
    updateHotspot: (hotspot: Project360Hotspot) => void;
    deleteHotspot: (hotspot: Project360Hotspot) => Promise<void>;
    cancelPlacement: () => void;
}) {
    const inheritedStyle = {
        color: tour.settings.hotspot_color,
        hover_color: tour.settings.hotspot_hover_color,
        text_color: tour.settings.hotspot_text_color,
        size: tour.settings.hotspot_size,
        shape: tour.settings.hotspot_shape,
        label_visibility: tour.settings.hotspot_label_visibility,
        pulse_enabled: tour.settings.hotspot_pulse_enabled,
    };

    return (
        <PanelSection
            title="Hotspots visuales"
            description="Crea accesos entre panoramas y ajusta su posición con la vista actual."
        >
            {tour.panoramas.length < 2 ? (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    Añade al menos dos panoramas para crear navegación.
                </p>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                                setSelectedHotspotId(null);
                                setSelectedPolygonId(null);
                                setPlacementMode({ type: 'create-hotspot' });
                            }}
                            disabled={currentPanoramaId === null}
                        >
                            <MousePointer2 className="h-4 w-4" /> Añadir hotspot
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={captureOrientation}
                            disabled={currentPanoramaId === null}
                        >
                            <Crosshair className="h-4 w-4" /> Capturar
                            orientación actual
                        </Button>
                        {placementMode?.type.includes('hotspot') ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={cancelPlacement}
                            >
                                <X className="h-4 w-4" /> Cancelar
                            </Button>
                        ) : null}
                    </div>

                    {!selectedHotspot ? (
                        <form
                            onSubmit={createHotspot}
                            className="space-y-3 rounded-lg border p-3"
                        >
                            <div>
                                <Label>Etiqueta</Label>
                                <Input
                                    value={hotspotForm.data.label}
                                    onChange={(event) =>
                                        hotspotForm.setData(
                                            'label',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Ir a la sala"
                                />
                                <InputError
                                    message={hotspotForm.errors.label}
                                />
                            </div>
                            <SelectField
                                label="Destino"
                                value={String(
                                    hotspotForm.data.target_panorama_id,
                                )}
                                options={tour.panoramas
                                    .filter(
                                        (panorama) =>
                                            panorama.id !== currentPanoramaId,
                                    )
                                    .map((panorama) => [
                                        String(panorama.id),
                                        panorama.title,
                                    ])}
                                onChange={(value) =>
                                    hotspotForm.setData(
                                        'target_panorama_id',
                                        Number(value),
                                    )
                                }
                            />
                            <details className="rounded-lg border bg-slate-50 p-3">
                                <summary className="cursor-pointer text-sm font-medium">
                                    Ajuste fino
                                </summary>
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    <NumberField
                                        label="Yaw"
                                        value={hotspotForm.data.yaw}
                                        min={-180}
                                        max={180}
                                        step={0.001}
                                        onChange={(yaw) => {
                                            hotspotForm.setData('yaw', yaw);
                                            setCreatePointSelected(true);
                                        }}
                                    />
                                    <NumberField
                                        label="Pitch"
                                        value={hotspotForm.data.pitch}
                                        min={-85}
                                        max={85}
                                        step={0.001}
                                        onChange={(pitch) => {
                                            hotspotForm.setData('pitch', pitch);
                                            setCreatePointSelected(true);
                                        }}
                                    />
                                </div>
                            </details>
                            <HotspotStyleFields
                                value={hotspotForm.data}
                                inherited={inheritedStyle}
                                onChange={(changes) =>
                                    hotspotForm.setData((current) => ({
                                        ...current,
                                        ...changes,
                                    }))
                                }
                            />
                            <Button
                                type="submit"
                                size="sm"
                                disabled={
                                    hotspotForm.processing ||
                                    !hotspotForm.data.label ||
                                    !createPointSelected
                                }
                            >
                                <Plus className="h-4 w-4" /> Guardar hotspot
                            </Button>
                        </form>
                    ) : null}
                </>
            )}

            <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                    Hotspots de esta escena
                </h3>
                {currentHotspots.length === 0 ? (
                    <p className="text-sm text-slate-500">
                        Aún no hay hotspots en este panorama.
                    </p>
                ) : null}
                {currentHotspots.map((hotspot) => (
                    <button
                        key={hotspot.id}
                        type="button"
                        className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition ${
                            selectedHotspot?.id === hotspot.id
                                ? 'border-orange-400 bg-orange-50'
                                : 'hover:bg-slate-50'
                        }`}
                        onClick={() => setSelectedHotspotId(hotspot.id)}
                    >
                        <span>{hotspot.label}</span>
                        <span className="text-xs text-slate-500">
                            {hotspot.yaw.toFixed(1)}° /{' '}
                            {hotspot.pitch.toFixed(1)}°
                        </span>
                    </button>
                ))}
            </div>

            {selectedHotspot && selectedDraft ? (
                <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">
                            Editar hotspot
                        </h3>
                        <button
                            type="button"
                            onClick={() => setSelectedHotspotId(null)}
                            aria-label="Cerrar edición"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div>
                        <Label>Etiqueta</Label>
                        <Input
                            value={selectedDraft.label}
                            onChange={(event) =>
                                updateDraft(selectedHotspot.id, {
                                    label: event.target.value,
                                })
                            }
                        />
                    </div>
                    <SelectField
                        label="Destino"
                        value={String(selectedDraft.target_panorama_id)}
                        options={tour.panoramas
                            .filter(
                                (panorama) =>
                                    panorama.id !==
                                    selectedHotspot.source_panorama_id,
                            )
                            .map((panorama) => [
                                String(panorama.id),
                                panorama.title,
                            ])}
                        onChange={(value) =>
                            updateDraft(selectedHotspot.id, {
                                target_panorama_id: Number(value),
                            })
                        }
                    />
                    <details className="rounded-lg border bg-white p-3">
                        <summary className="cursor-pointer text-sm font-medium">
                            Ajuste fino
                        </summary>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <NumberField
                                label="Yaw"
                                value={selectedDraft.yaw}
                                min={-180}
                                max={180}
                                step={0.001}
                                onChange={(yaw) =>
                                    updateDraft(selectedHotspot.id, { yaw })
                                }
                            />
                            <NumberField
                                label="Pitch"
                                value={selectedDraft.pitch}
                                min={-85}
                                max={85}
                                step={0.001}
                                onChange={(pitch) =>
                                    updateDraft(selectedHotspot.id, { pitch })
                                }
                            />
                        </div>
                    </details>
                    <HotspotStyleFields
                        value={selectedDraft}
                        inherited={inheritedStyle}
                        onChange={(changes) =>
                            updateDraft(selectedHotspot.id, changes)
                        }
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                                setPlacementMode({
                                    type: 'reposition-hotspot',
                                    hotspotId: selectedHotspot.id,
                                })
                            }
                        >
                            <MousePointer2 className="h-4 w-4" /> Reposicionar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => updateHotspot(selectedHotspot)}
                        >
                            <Save className="h-4 w-4" /> Guardar
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            onClick={() => void deleteHotspot(selectedHotspot)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ) : null}
        </PanelSection>
    );
}

function LabelsPanel({
    currentPanoramaId,
    currentLabels,
    selectedLabel,
    selectedDraft,
    labelForm,
    placementMode,
    createPointSelected,
    setCreatePointSelected,
    setPlacementMode,
    setSelectedLabelId,
    setSelectedHotspotId,
    setSelectedPolygonId,
    captureOrientation,
    createLabel,
    updateDraft,
    updateLabel,
    deleteLabel,
    cancelPlacement,
}: {
    currentPanoramaId: number | null;
    currentLabels: Project360Label[];
    selectedLabel: Project360Label | undefined;
    selectedDraft: LabelDraft | null;
    labelForm: InertiaForm<LabelDraft & { source_panorama_id: number }>;
    placementMode: PlacementMode;
    createPointSelected: boolean;
    setCreatePointSelected: React.Dispatch<React.SetStateAction<boolean>>;
    setPlacementMode: React.Dispatch<React.SetStateAction<PlacementMode>>;
    setSelectedLabelId: React.Dispatch<React.SetStateAction<number | null>>;
    setSelectedHotspotId: React.Dispatch<React.SetStateAction<number | null>>;
    setSelectedPolygonId: React.Dispatch<React.SetStateAction<number | null>>;
    captureOrientation: () => void;
    createLabel: (event: React.FormEvent) => void;
    updateDraft: (id: number, changes: Partial<LabelDraft>) => void;
    updateLabel: (label: Project360Label) => void;
    deleteLabel: (label: Project360Label) => Promise<void>;
    cancelPlacement: () => void;
}) {
    return (
        <PanelSection
            title="Etiquetas informativas"
            description="Coloca textos independientes, sin navegación, en cualquier ángulo del panorama."
        >
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    size="sm"
                    disabled={currentPanoramaId === null}
                    onClick={() => {
                        setSelectedLabelId(null);
                        setSelectedHotspotId(null);
                        setSelectedPolygonId(null);
                        setCreatePointSelected(false);
                        setPlacementMode({ type: 'create-label' });
                    }}
                >
                    <MousePointer2 className="h-4 w-4" /> Colocar etiqueta
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={currentPanoramaId === null}
                    onClick={captureOrientation}
                >
                    <Crosshair className="h-4 w-4" /> Usar vista actual
                </Button>
                {placementMode?.type.includes('label') ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={cancelPlacement}
                    >
                        <X className="h-4 w-4" /> Cancelar
                    </Button>
                ) : null}
            </div>

            {!selectedLabel ? (
                <form
                    onSubmit={createLabel}
                    className="space-y-3 rounded-lg border p-3"
                >
                    <div>
                        <Label>Texto</Label>
                        <Input
                            value={labelForm.data.text}
                            maxLength={120}
                            placeholder="Área de recepción"
                            onChange={(event) =>
                                labelForm.setData('text', event.target.value)
                            }
                        />
                        <InputError message={labelForm.errors.text} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <ColorField
                            label="Color"
                            value={labelForm.data.color}
                            onChange={(color) =>
                                labelForm.setData('color', color)
                            }
                        />
                        <NumberField
                            label="Tamaño"
                            value={labelForm.data.size}
                            min={0.5}
                            max={3}
                            step={0.05}
                            onChange={(size) => labelForm.setData('size', size)}
                        />
                    </div>
                    <details className="rounded-lg border bg-slate-50 p-3">
                        <summary className="cursor-pointer text-sm font-medium">
                            Ángulos de posición
                        </summary>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <NumberField
                                label="Yaw"
                                value={labelForm.data.yaw}
                                min={-180}
                                max={180}
                                step={0.001}
                                onChange={(yaw) => {
                                    labelForm.setData('yaw', yaw);
                                    setCreatePointSelected(true);
                                }}
                            />
                            <NumberField
                                label="Pitch"
                                value={labelForm.data.pitch}
                                min={-85}
                                max={85}
                                step={0.001}
                                onChange={(pitch) => {
                                    labelForm.setData('pitch', pitch);
                                    setCreatePointSelected(true);
                                }}
                            />
                        </div>
                    </details>
                    <InputError
                        message={
                            labelForm.errors.yaw ??
                            labelForm.errors.pitch ??
                            labelForm.errors.color ??
                            labelForm.errors.size
                        }
                    />
                    <Button
                        type="submit"
                        size="sm"
                        disabled={
                            labelForm.processing ||
                            !labelForm.data.text.trim() ||
                            !createPointSelected
                        }
                    >
                        <Plus className="h-4 w-4" /> Guardar etiqueta
                    </Button>
                </form>
            ) : null}

            <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                    Etiquetas de esta escena
                </h3>
                {currentLabels.length === 0 ? (
                    <p className="text-sm text-slate-500">
                        Aún no hay etiquetas en este panorama.
                    </p>
                ) : null}
                {currentLabels.map((label) => (
                    <button
                        key={label.id}
                        type="button"
                        className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm transition ${
                            selectedLabel?.id === label.id
                                ? 'border-orange-400 bg-orange-50'
                                : 'hover:bg-slate-50'
                        }`}
                        onClick={() => {
                            setCreatePointSelected(false);
                            setPlacementMode(null);
                            setLabelDrafts((current) => ({
                                ...current,
                                [label.id]:
                                    current[label.id] ?? labelDraft(label),
                            }));
                            setSelectedLabelId(label.id);
                        }}
                    >
                        <span className="truncate">{label.text}</span>
                        <span className="shrink-0 text-xs text-slate-500">
                            {label.yaw.toFixed(1)}° / {label.pitch.toFixed(1)}°
                        </span>
                    </button>
                ))}
            </div>

            {selectedLabel && selectedDraft ? (
                <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">
                            Editar etiqueta
                        </h3>
                        <button
                            type="button"
                            onClick={() => setSelectedLabelId(null)}
                            aria-label="Cerrar edición"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div>
                        <Label>Texto</Label>
                        <Input
                            value={selectedDraft.text}
                            maxLength={120}
                            onChange={(event) =>
                                updateDraft(selectedLabel.id, {
                                    text: event.target.value,
                                })
                            }
                        />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <ColorField
                            label="Color"
                            value={selectedDraft.color}
                            onChange={(color) =>
                                updateDraft(selectedLabel.id, { color })
                            }
                        />
                        <NumberField
                            label="Tamaño"
                            value={selectedDraft.size}
                            min={0.5}
                            max={3}
                            step={0.05}
                            onChange={(size) =>
                                updateDraft(selectedLabel.id, { size })
                            }
                        />
                    </div>
                    <details className="rounded-lg border bg-white p-3">
                        <summary className="cursor-pointer text-sm font-medium">
                            Ángulos de posición
                        </summary>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <NumberField
                                label="Yaw"
                                value={selectedDraft.yaw}
                                min={-180}
                                max={180}
                                step={0.001}
                                onChange={(yaw) =>
                                    updateDraft(selectedLabel.id, { yaw })
                                }
                            />
                            <NumberField
                                label="Pitch"
                                value={selectedDraft.pitch}
                                min={-85}
                                max={85}
                                step={0.001}
                                onChange={(pitch) =>
                                    updateDraft(selectedLabel.id, { pitch })
                                }
                            />
                        </div>
                    </details>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                                setPlacementMode({
                                    type: 'reposition-label',
                                    labelId: selectedLabel.id,
                                })
                            }
                        >
                            <MousePointer2 className="h-4 w-4" /> Reposicionar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={!selectedDraft.text.trim()}
                            onClick={() => updateLabel(selectedLabel)}
                        >
                            <Save className="h-4 w-4" /> Guardar
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            onClick={() => void deleteLabel(selectedLabel)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ) : null}
        </PanelSection>
    );
}

function PolygonsPanel({
    lotOptions,
    usedLotIds,
    currentPanoramaId,
    currentPolygons,
    selectedPolygon,
    selectedDraft,
    polygonForm,
    polygonDrawingState,
    polygonDraftTarget,
    polygonPreview,
    polygonPreviewInvalid,
    polygonDrawingError,
    setSelectedPolygonId,
    setSelectedHotspotId,
    createPolygon,
    updateDraft,
    updatePolygon,
    deletePolygon,
    undoVertex,
    cancelPlacement,
    startDrawing,
    startRedraw,
    reopenDrawing,
}: {
    lotOptions: Project360LotOption[];
    usedLotIds: Set<number>;
    currentPanoramaId: number | null;
    currentPolygons: Project360Polygon[];
    selectedPolygon: Project360Polygon | undefined;
    selectedDraft: PolygonDraft | null;
    polygonForm: InertiaForm<PolygonDraft & { source_panorama_id: number }>;
    polygonDrawingState: PolygonDrawingState;
    polygonDraftTarget: PolygonDraftTarget;
    polygonPreview: Project360PolygonVertex[];
    polygonPreviewInvalid: boolean;
    polygonDrawingError: string | null;
    setSelectedPolygonId: React.Dispatch<React.SetStateAction<number | null>>;
    setSelectedHotspotId: React.Dispatch<React.SetStateAction<number | null>>;
    createPolygon: (event: React.FormEvent) => void;
    updateDraft: (id: number, changes: Partial<PolygonDraft>) => void;
    updatePolygon: (polygon: Project360Polygon) => void;
    deletePolygon: (polygon: Project360Polygon) => Promise<void>;
    undoVertex: () => void;
    cancelPlacement: () => void;
    startDrawing: () => void;
    startRedraw: (polygon: Project360Polygon) => void;
    reopenDrawing: () => void;
}) {
    const drawing = polygonDrawingState === 'drawing';
    const closed = polygonDrawingState === 'closed';
    const createLot = lotOptions.find(
        (lot) => lot.id === polygonForm.data.lot_id,
    );
    const selectedLot = lotOptions.find(
        (lot) => lot.id === selectedDraft?.lot_id,
    );
    const selectedPolygonBeingRedrawn =
        selectedPolygon && polygonDraftTarget === selectedPolygon.id;

    return (
        <PanelSection
            title="Polígonos informativos"
            description="Dibuja zonas independientes de los hotspots y añade información contextual."
        >
            <div className="flex flex-wrap gap-2">
                {!selectedPolygon && polygonDrawingState === 'idle' ? (
                    <Button
                        type="button"
                        size="sm"
                        onClick={startDrawing}
                        disabled={currentPanoramaId === null}
                    >
                        <Pentagon className="h-4 w-4" /> Dibujar polígono
                    </Button>
                ) : null}
                {drawing ? (
                    <>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={undoVertex}
                            disabled={polygonPreview.length === 0}
                        >
                            <Undo2 className="h-4 w-4" /> Deshacer punto
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={cancelPlacement}
                        >
                            <X className="h-4 w-4" /> Cancelar
                        </Button>
                    </>
                ) : null}
                {closed ? (
                    <>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={reopenDrawing}
                        >
                            <Pentagon className="h-4 w-4" /> Reabrir dibujo
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={cancelPlacement}
                        >
                            <X className="h-4 w-4" /> Cancelar dibujo
                        </Button>
                    </>
                ) : null}
            </div>

            {drawing ? (
                <div
                    className={`rounded-lg p-3 text-sm ${
                        polygonPreviewInvalid || polygonDrawingError
                            ? 'bg-red-50 text-red-700'
                            : 'bg-orange-50 text-orange-800'
                    }`}
                >
                    {polygonDrawingError ??
                        (polygonPreviewInvalid
                            ? 'Los lados se cruzan. Deshaz el último punto.'
                            : polygonPreview.length >= 3
                              ? `${polygonPreview.length} vértices. Agrega más o pulsa el primer punto para cerrar.`
                              : `${polygonPreview.length} vértice(s). Agrega al menos tres para poder cerrar.`)}
                </div>
            ) : null}

            {closed ? (
                <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                    Polígono cerrado con {polygonPreview.length} vértices. Ya
                    puedes guardarlo o reabrir el trazado.
                </div>
            ) : null}

            {!selectedPolygon ? (
                <form
                    onSubmit={createPolygon}
                    className="space-y-3 rounded-lg border p-3"
                >
                    <PolygonLotSelector
                        value={polygonForm.data.lot_id}
                        lotOptions={lotOptions}
                        usedLotIds={usedLotIds}
                        onChange={(lot_id) =>
                            polygonForm.setData('lot_id', lot_id)
                        }
                    />
                    <InputError message={polygonForm.errors.lot_id} />
                    {polygonForm.data.lot_id === null ? (
                        <div>
                            <Label>Título</Label>
                            <Input
                                value={polygonForm.data.title}
                                onChange={(event) =>
                                    polygonForm.setData(
                                        'title',
                                        event.target.value,
                                    )
                                }
                                placeholder="Área social"
                            />
                            <InputError message={polygonForm.errors.title} />
                        </div>
                    ) : (
                        <LinkedLotSummary lot={createLot ?? null} />
                    )}
                    <div>
                        <Label>Descripción</Label>
                        <textarea
                            value={polygonForm.data.description}
                            maxLength={500}
                            onChange={(event) =>
                                polygonForm.setData(
                                    'description',
                                    event.target.value,
                                )
                            }
                            className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                            placeholder="Información que verá el visitante."
                        />
                    </div>
                    {polygonForm.data.lot_id === null ? (
                        <PolygonStyleFields
                            value={polygonForm.data}
                            onChange={(changes) =>
                                polygonForm.setData((current) => ({
                                    ...current,
                                    ...changes,
                                }))
                            }
                        />
                    ) : (
                        <PolygonOpacityField
                            value={polygonForm.data.opacity}
                            onChange={(opacity) =>
                                polygonForm.setData('opacity', opacity)
                            }
                        />
                    )}
                    <InputError message={polygonForm.errors.vertices} />
                    <Button
                        type="submit"
                        size="sm"
                        disabled={
                            polygonForm.processing ||
                            polygonDraftTarget !== 'create' ||
                            !closed ||
                            (polygonForm.data.lot_id === null &&
                                !polygonForm.data.title) ||
                            polygonForm.data.vertices.length < 3 ||
                            polygonHasSelfIntersection(
                                polygonForm.data.vertices,
                            )
                        }
                    >
                        <Plus className="h-4 w-4" /> Guardar polígono
                    </Button>
                </form>
            ) : null}

            <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                    Polígonos de esta escena
                </h3>
                {currentPolygons.length === 0 ? (
                    <p className="text-sm text-slate-500">
                        Aún no hay zonas informativas.
                    </p>
                ) : null}
                {currentPolygons.map((polygon) => (
                    <button
                        key={polygon.id}
                        type="button"
                        className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition ${
                            selectedPolygon?.id === polygon.id
                                ? 'border-orange-400 bg-orange-50'
                                : 'hover:bg-slate-50'
                        }`}
                        disabled={polygonDrawingState !== 'idle'}
                        onClick={() => {
                            setSelectedHotspotId(null);
                            setSelectedPolygonId(polygon.id);
                        }}
                    >
                        <span className="flex items-center gap-2">
                            {polygon.lot?.status ? (
                                <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{
                                        backgroundColor:
                                            polygon.lot.status.color,
                                    }}
                                />
                            ) : null}
                            {polygon.title}
                        </span>
                        <span className="text-xs text-slate-500">
                            {polygon.vertices.length} vértices
                        </span>
                    </button>
                ))}
            </div>

            {selectedPolygon && selectedDraft ? (
                <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">
                            Editar polígono
                        </h3>
                        <button
                            type="button"
                            onClick={() => setSelectedPolygonId(null)}
                            disabled={polygonDrawingState !== 'idle'}
                            aria-label="Cerrar edición"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <PolygonLotSelector
                        value={selectedDraft.lot_id}
                        lotOptions={lotOptions}
                        usedLotIds={usedLotIds}
                        currentLotId={selectedPolygon.lot_id}
                        onChange={(lot_id) =>
                            updateDraft(selectedPolygon.id, { lot_id })
                        }
                    />
                    {selectedDraft.lot_id === null ? (
                        <div>
                            <Label>Título</Label>
                            <Input
                                value={selectedDraft.title}
                                onChange={(event) =>
                                    updateDraft(selectedPolygon.id, {
                                        title: event.target.value,
                                    })
                                }
                            />
                        </div>
                    ) : (
                        <LinkedLotSummary lot={selectedLot ?? null} />
                    )}
                    <div>
                        <Label>Descripción</Label>
                        <textarea
                            value={selectedDraft.description}
                            maxLength={500}
                            onChange={(event) =>
                                updateDraft(selectedPolygon.id, {
                                    description: event.target.value,
                                })
                            }
                            className="min-h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                        />
                    </div>
                    {selectedDraft.lot_id === null ? (
                        <PolygonStyleFields
                            value={selectedDraft}
                            onChange={(changes) =>
                                updateDraft(selectedPolygon.id, changes)
                            }
                        />
                    ) : (
                        <PolygonOpacityField
                            value={selectedDraft.opacity}
                            onChange={(opacity) =>
                                updateDraft(selectedPolygon.id, { opacity })
                            }
                        />
                    )}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => startRedraw(selectedPolygon)}
                            disabled={polygonDrawingState !== 'idle'}
                        >
                            <Pentagon className="h-4 w-4" /> Redibujar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={
                                (selectedPolygonBeingRedrawn && !closed) ||
                                (selectedDraft.lot_id === null &&
                                    !selectedDraft.title) ||
                                selectedDraft.vertices.length < 3 ||
                                polygonHasSelfIntersection(
                                    selectedDraft.vertices,
                                )
                            }
                            onClick={() => updatePolygon(selectedPolygon)}
                        >
                            <Save className="h-4 w-4" /> Guardar
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            disabled={polygonDrawingState !== 'idle'}
                            onClick={() => void deletePolygon(selectedPolygon)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ) : null}
        </PanelSection>
    );
}

function PolygonLotSelector({
    value,
    lotOptions,
    usedLotIds,
    currentLotId = null,
    onChange,
}: {
    value: number | null;
    lotOptions: Project360LotOption[];
    usedLotIds: Set<number>;
    currentLotId?: number | null;
    onChange: (lotId: number | null) => void;
}) {
    const [search, setSearch] = useState('');
    const normalizedSearch = search.trim().toLocaleLowerCase('es');
    const filteredLots = lotOptions.filter(
        (lot) =>
            lot.id === value ||
            `mz. ${lot.block} lote ${lot.number} ${lot.status?.name ?? ''} ${lot.status?.code ?? ''}`
                .toLocaleLowerCase('es')
                .includes(normalizedSearch),
    );

    return (
        <div className="space-y-2">
            <Label>Lote asociado (opcional)</Label>
            <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por manzana, lote o estado"
                aria-label="Buscar lote para asociar"
            />
            <select
                value={value ?? ''}
                onChange={(event) =>
                    onChange(
                        event.target.value === ''
                            ? null
                            : Number(event.target.value),
                    )
                }
                className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
            >
                <option value="">Sin lote · polígono informativo</option>
                {filteredLots.map((lot) => {
                    const unavailable =
                        usedLotIds.has(lot.id) && lot.id !== currentLotId;

                    return (
                        <option
                            key={lot.id}
                            value={lot.id}
                            disabled={unavailable}
                        >
                            Mz. {lot.block} · Lote {lot.number} —{' '}
                            {lot.status?.name ?? 'Sin estado'}
                            {unavailable ? ' · ya utilizado' : ''}
                        </option>
                    );
                })}
            </select>
            {normalizedSearch && filteredLots.length === 0 ? (
                <p className="text-xs text-slate-500">
                    No se encontraron lotes con ese criterio.
                </p>
            ) : null}
        </div>
    );
}

function LinkedLotSummary({ lot }: { lot: Project360LotOption | null }) {
    if (!lot) {
        return null;
    }

    return (
        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="font-semibold">Lote {lot.number}</p>
                    <p className="text-xs text-slate-500">
                        El título y el color se actualizarán desde el lote.
                    </p>
                </div>
                <span
                    className="rounded-full px-2 py-1 text-xs font-semibold text-white"
                    style={{
                        backgroundColor: lot.status?.color ?? '#94a3b8',
                    }}
                >
                    {lot.status?.name ?? 'Sin estado'}
                </span>
            </div>
        </div>
    );
}

function PolygonOpacityField({
    value,
    onChange,
}: {
    value: number;
    onChange: (opacity: number) => void;
}) {
    return (
        <div className="rounded-lg border bg-white p-3">
            <NumberField
                label="Opacidad"
                value={value}
                min={0.1}
                max={0.7}
                step={0.05}
                onChange={onChange}
            />
        </div>
    );
}

function AppearancePanel({
    themeForm,
    projectId,
}: {
    themeForm: InertiaForm<Project360Tour['settings']>;
    projectId: number;
}) {
    return (
        <PanelSection
            title="Apariencia"
            description="Define el estilo general y la animación de los hotspots."
        >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <ColorField
                    label="Acento"
                    value={themeForm.data.accent_color}
                    onChange={(value) =>
                        themeForm.setData('accent_color', value)
                    }
                />
                <ColorField
                    label="Hotspot"
                    value={themeForm.data.hotspot_color}
                    onChange={(value) =>
                        themeForm.setData('hotspot_color', value)
                    }
                />
                <ColorField
                    label="Hover"
                    value={themeForm.data.hotspot_hover_color}
                    onChange={(value) =>
                        themeForm.setData('hotspot_hover_color', value)
                    }
                />
                <ColorField
                    label="Texto"
                    value={themeForm.data.hotspot_text_color}
                    onChange={(value) =>
                        themeForm.setData('hotspot_text_color', value)
                    }
                />
                <NumberField
                    label="Tamaño"
                    value={themeForm.data.hotspot_size}
                    min={0.08}
                    max={0.5}
                    step={0.01}
                    onChange={(value) =>
                        themeForm.setData('hotspot_size', value)
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
                    value={themeForm.data.hotspot_label_visibility}
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
            </div>
            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <input
                    type="checkbox"
                    checked={themeForm.data.hotspot_pulse_enabled}
                    onChange={(event) =>
                        themeForm.setData(
                            'hotspot_pulse_enabled',
                            event.target.checked,
                        )
                    }
                />
                Activar halo animado
            </label>
            <Button
                type="button"
                onClick={() =>
                    themeForm.put(settingsRoutes.update(projectId).url, {
                        preserveScroll: true,
                    })
                }
                disabled={themeForm.processing}
            >
                <Save className="h-4 w-4" /> Guardar apariencia
            </Button>
        </PanelSection>
    );
}

function SharePanel({
    projectId,
    tour,
    shareForm,
    copiedLinkId,
    copyLink,
}: {
    projectId: number;
    tour: Project360Tour;
    shareForm: InertiaForm<{ label: string }>;
    copiedLinkId: string | null;
    copyLink: (id: string, url: string) => Promise<void>;
}) {
    return (
        <PanelSection
            title="Compartir"
            description="Genera enlaces firmados para mostrar el recorrido."
        >
            <form
                className="flex gap-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    shareForm.post(shareLinkRoutes.store(projectId).url, {
                        preserveScroll: true,
                        onSuccess: () => shareForm.reset(),
                    });
                }}
            >
                <Input
                    value={shareForm.data.label}
                    maxLength={100}
                    onChange={(event) =>
                        shareForm.setData('label', event.target.value)
                    }
                    placeholder="Cliente o campaña"
                />
                <Button
                    type="submit"
                    size="icon"
                    disabled={shareForm.processing}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </form>
            <InputError message={shareForm.errors.label} />

            <div className="space-y-2">
                {(tour.share_links ?? []).length === 0 ? (
                    <p className="text-sm text-slate-500">
                        Todavía no hay enlaces públicos.
                    </p>
                ) : null}
                {(tour.share_links ?? []).map((link) => (
                    <div
                        key={link.id}
                        className="space-y-2 rounded-lg border p-3"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                    {link.label || 'Enlace sin etiqueta'}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Último acceso:{' '}
                                    {link.last_accessed_at
                                        ? project360DateFormatter.format(
                                              new Date(link.last_accessed_at),
                                          )
                                        : 'Nunca'}
                                </p>
                            </div>
                            {link.revoked_at ? (
                                <Badge variant="secondary">Revocado</Badge>
                            ) : null}
                        </div>
                        {!link.revoked_at ? (
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={() =>
                                        void copyLink(link.id, link.url)
                                    }
                                    title="Copiar enlace"
                                >
                                    {copiedLinkId === link.id ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <Clipboard className="h-4 w-4" />
                                    )}
                                </Button>
                                <Button asChild size="icon" variant="outline">
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Abrir tour"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </Button>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="destructive"
                                    title="Revocar enlace"
                                    onClick={() =>
                                        router.patch(
                                            shareLinkRoutes.revoke({
                                                project: projectId,
                                                shareLink: link.id,
                                            }).url,
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <Link2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </PanelSection>
    );
}

function PanelSection({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
            {children}
        </section>
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

function PolygonStyleFields({
    value,
    onChange,
}: {
    value: Pick<PolygonDraft, 'color' | 'hover_color' | 'opacity'>;
    onChange: (changes: Partial<PolygonDraft>) => void;
}) {
    return (
        <details className="rounded-lg border bg-white p-3">
            <summary className="cursor-pointer text-sm font-medium">
                Apariencia del polígono
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <ColorField
                    label="Color"
                    value={value.color}
                    onChange={(color) => onChange({ color })}
                />
                <ColorField
                    label="Hover"
                    value={value.hover_color}
                    onChange={(hover_color) => onChange({ hover_color })}
                />
                <NumberField
                    label="Opacidad"
                    value={value.opacity}
                    min={0.1}
                    max={0.7}
                    step={0.05}
                    onChange={(opacity) => onChange({ opacity })}
                />
            </div>
        </details>
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
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
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
                        Halo animado
                    </label>
                </div>
            ) : null}
        </details>
    );
}
