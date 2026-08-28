import { Head, router, useForm, type InertiaFormProps } from '@inertiajs/react';
import {
    Check,
    Clipboard,
    Crosshair,
    ExternalLink,
    Link2,
    LoaderCircle,
    MousePointer2,
    Pencil,
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
    polygonCentroid,
    polygonHasSelfIntersection,
    polylineHasSelfIntersection,
} from '@/lib/project-360-geometry';
import {
    PROJECT_360_LABEL_FONTS,
    PROJECT_360_LABEL_SHAPES,
    PROJECT_360_LABEL_STYLE_DEFAULTS,
    PROJECT_360_LABEL_VISIBILITIES,
    project360LabelBadgePreviewStyle,
    type Project360BadgeVisibility,
    type Project360LabelFont,
    type Project360LabelShape,
    type Project360LabelStyle,
} from '@/lib/project-360-label-style';
import {
    analyzePanoramaFiles,
    formatBytes,
    formatRatio,
    PROJECT_360_PANORAMA_RULES,
    type PanoramaFileReport,
    type PanoramaSelectionAnalysis,
} from '@/lib/project-360-panorama-validation';
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
    tour_360_url?: string | null;
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
    label_text: string;
    label_color: string;
    label_background_color: string;
    label_border_color: string;
    label_border_width: number;
    label_font: Project360LabelFont;
    label_size: number;
    label_width: number;
    label_height: number;
    label_rotation: number;
    label_shape: Project360LabelShape;
    label_visibility: Project360BadgeVisibility;
    label_yaw: number | null;
    label_pitch: number | null;
};

type LabelDraft = {
    text: string;
    yaw: number;
    pitch: number;
} & Project360LabelStyle;

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

function PanoramaRequirementReport({ report }: { report: PanoramaFileReport }) {
    const { inspection } = report;
    const failed = report.checks.filter((check) => !check.ok);
    const summary = [
        inspection.width && inspection.height
            ? `${inspection.width}×${inspection.height}`
            : 'sin resolución',
        formatBytes(inspection.size),
        inspection.width && inspection.height
            ? formatRatio(inspection.width, inspection.height)
            : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <div
            className={`space-y-2 rounded-md border p-2 text-xs ${
                report.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-red-200 bg-red-50 text-red-950'
            }`}
        >
            <p className="font-medium">
                {report.ok ? 'Cumple los requisitos' : 'No se puede subir'}
                <span className="ml-1 font-normal opacity-80">
                    {report.fileName} · {summary}
                </span>
            </p>
            {failed.length > 0 ? (
                <div className="rounded border border-red-200 bg-white/80 p-2">
                    <p className="mb-1 font-semibold text-red-800">
                        Errores de validación ({failed.length})
                    </p>
                    <ul className="space-y-1">
                        {failed.map((check) => (
                            <li key={check.id} className="flex gap-1.5">
                                <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                                <span>
                                    <span className="font-medium">
                                        {check.label}:{' '}
                                    </span>
                                    {check.detail}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
            <ul className="space-y-1">
                {report.checks
                    .filter((check) => check.ok)
                    .map((check) => (
                        <li key={check.id} className="flex gap-1.5">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span>
                                <span className="font-medium">
                                    {check.label}:{' '}
                                </span>
                                {check.detail}
                            </span>
                        </li>
                    ))}
            </ul>
        </div>
    );
}

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
        label_text: polygon.label_text ?? '',
        label_color: polygon.label_color,
        label_background_color: polygon.label_background_color,
        label_border_color: polygon.label_border_color,
        label_border_width: polygon.label_border_width,
        label_font: polygon.label_font,
        label_size: polygon.label_size,
        label_width: polygon.label_width,
        label_height: polygon.label_height,
        label_rotation: polygon.label_rotation,
        label_shape: polygon.label_shape,
        label_visibility: polygon.label_visibility,
        label_yaw: polygon.label_yaw,
        label_pitch: polygon.label_pitch,
    };
}

function labelDraft(label: Project360Label): LabelDraft {
    return {
        text: label.text,
        yaw: label.yaw,
        pitch: label.pitch,
        color: label.color,
        background_color: label.background_color,
        border_color: label.border_color,
        border_width: label.border_width,
        font: label.font,
        size: label.size,
        width: label.width,
        height: label.height,
        rotation: label.rotation,
        shape: label.shape,
        visibility: label.visibility,
    };
}

function lotNumberLabel(lot: Project360LotOption | null | undefined): string {
    return lot ? String(lot.number) : '';
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
    const [panoramaAnalysis, setPanoramaAnalysis] =
        useState<PanoramaSelectionAnalysis | null>(null);
    const [analyzingPanoramas, setAnalyzingPanoramas] = useState(false);
    const panoramaAnalysisSeq = useRef(0);
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
        ...PROJECT_360_LABEL_STYLE_DEFAULTS,
        color: tour.settings.hotspot_text_color,
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
        label_text: '',
        label_color: PROJECT_360_LABEL_STYLE_DEFAULTS.color,
        label_background_color:
            PROJECT_360_LABEL_STYLE_DEFAULTS.background_color,
        label_border_color: PROJECT_360_LABEL_STYLE_DEFAULTS.border_color,
        label_border_width: PROJECT_360_LABEL_STYLE_DEFAULTS.border_width,
        label_font: PROJECT_360_LABEL_STYLE_DEFAULTS.font,
        label_size: PROJECT_360_LABEL_STYLE_DEFAULTS.size,
        label_width: PROJECT_360_LABEL_STYLE_DEFAULTS.width,
        label_height: PROJECT_360_LABEL_STYLE_DEFAULTS.height,
        label_rotation: PROJECT_360_LABEL_STYLE_DEFAULTS.rotation,
        label_shape: PROJECT_360_LABEL_STYLE_DEFAULTS.shape,
        label_visibility: PROJECT_360_LABEL_STYLE_DEFAULTS.visibility,
        label_yaw: null,
        label_pitch: null,
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
        ? (polygonDrafts[selectedPolygon.id] ?? polygonDraft(selectedPolygon))
        : null;
    const selectedLabel = tour.labels.find(
        (label) => label.id === selectedLabelId,
    );
    const selectedLabelDraft = selectedLabel
        ? (labelDrafts[selectedLabel.id] ?? labelDraft(selectedLabel))
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
                  label_text: previewLot
                      ? lotNumberLabel(previewLot)
                      : activePolygonDraft.label_text.trim() || null,
                  label_color: activePolygonDraft.label_color,
                  label_background_color:
                      activePolygonDraft.label_background_color,
                  label_border_color: activePolygonDraft.label_border_color,
                  label_border_width: activePolygonDraft.label_border_width,
                  label_font: activePolygonDraft.label_font,
                  label_size: activePolygonDraft.label_size,
                  label_width: activePolygonDraft.label_width,
                  label_height: activePolygonDraft.label_height,
                  label_rotation: activePolygonDraft.label_rotation,
                  label_shape: activePolygonDraft.label_shape,
                  label_visibility: activePolygonDraft.label_visibility,
                  label_yaw: activePolygonDraft.label_yaw,
                  label_pitch: activePolygonDraft.label_pitch,
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

    const analyzeSelectedPanoramas = async (files: File[]) => {
        const seq = ++panoramaAnalysisSeq.current;
        uploadForm.clearErrors();

        if (files.length === 0) {
            setPanoramaAnalysis(null);
            setAnalyzingPanoramas(false);
            uploadForm.setData({
                panorama_files: [],
                panorama_titles: [],
            });

            return;
        }

        setAnalyzingPanoramas(true);
        setPanoramaAnalysis(null);

        const analysis = await analyzePanoramaFiles(files);
        if (seq !== panoramaAnalysisSeq.current) {
            return;
        }

        setPanoramaAnalysis(analysis);
        setAnalyzingPanoramas(false);

        const errorMap: Record<string, string> = {};
        analysis.batchErrors.forEach((message, index) => {
            errorMap[
                index === 0 ? 'panorama_files' : `panorama_files.batch.${index}`
            ] = message;
        });
        if (Object.keys(errorMap).length > 0) {
            uploadForm.setError(errorMap);
        }

        uploadForm.setData({
            panorama_files: files,
            panorama_titles: files.map((file) =>
                file.name.replace(/\.[^.]+$/, ''),
            ),
        });
    };

    const submitPanoramas = (event: React.FormEvent) => {
        event.preventDefault();

        if (analyzingPanoramas) {
            return;
        }

        const analysis = panoramaAnalysis;
        if (
            !analysis ||
            !analysis.ok ||
            uploadForm.data.panorama_files.length === 0
        ) {
            const errorMap: Record<string, string> = {};
            if (uploadForm.data.panorama_files.length === 0) {
                errorMap.panorama_files =
                    'Selecciona al menos una imagen panorámica.';
            }
            analysis?.batchErrors.forEach((message, index) => {
                errorMap[
                    index === 0
                        ? 'panorama_files'
                        : `panorama_files.batch.${index}`
                ] = message;
            });
            analysis?.reports.forEach((report, index) => {
                if (!report.ok) {
                    errorMap[`panorama_files.${index}`] =
                        report.errors.join(' ');
                }
            });
            uploadForm.setError(errorMap);

            return;
        }

        uploadForm.post(panoramaRoutes.store(project.id).url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                panoramaAnalysisSeq.current += 1;
                uploadForm.reset();
                uploadForm.clearErrors();
                setPanoramaAnalysis(null);
            },
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
            label_text: data.lot_id
                ? lotNumberLabel(
                      lotOptions.find((lot) => lot.id === data.lot_id) ?? null,
                  )
                : data.label_text.trim() || null,
        }));
        polygonForm.post(polygonRoutes.store(project.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                polygonForm.reset(
                    'lot_id',
                    'title',
                    'description',
                    'vertices',
                    'label_text',
                );
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
                label_text: draft.lot_id
                    ? lotNumberLabel(
                          lotOptions.find((lot) => lot.id === draft.lot_id) ??
                              null,
                      )
                    : draft.label_text.trim() || null,
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
        setPolygonDrafts((current) => {
            const original = tour.polygons.find(
                (item) => item.id === polygonId,
            );
            const base =
                current[polygonId] ??
                (original ? polygonDraft(original) : null);

            if (!base) {
                return current;
            }

            return {
                ...current,
                [polygonId]: { ...base, ...changes },
            };
        });
    };

    const updateLabelDraft = (
        labelId: number,
        changes: Partial<LabelDraft>,
    ) => {
        setLabelDrafts((current) => {
            const original = tour.labels.find((item) => item.id === labelId);
            const base =
                current[labelId] ?? (original ? labelDraft(original) : null);

            if (!base) {
                return current;
            }

            return {
                ...current,
                [labelId]: { ...base, ...changes },
            };
        });
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
            {
                preserveScroll: true,
                onSuccess: () => setSelectedPolygonId(null),
            },
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
            {
                preserveScroll: true,
                onSuccess: () => setSelectedLabelId(null),
            },
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
                            ? 'lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]'
                            : 'grid-cols-1'
                    }`}
                >
                    <div className="min-h-[32rem] lg:sticky lg:top-4 lg:h-[calc(100vh-7.5rem)]">
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
                            selectedLabelId={selectedLabelId}
                            onPlacement={handlePlacement}
                            onPolygonClose={closePolygonDrawing}
                            onPanoramaChange={handlePanoramaChange}
                            onPolygonSelect={(polygonId) => {
                                setSelectedPolygonId(polygonId);
                                if (polygonId !== null) {
                                    setActiveTab('polygons');
                                    setSelectedLabelId(null);
                                    setSelectedHotspotId(null);
                                    setPlacementMode(null);
                                }
                            }}
                            onLabelSelect={(labelId) => {
                                setSelectedLabelId(labelId);
                                if (labelId !== null) {
                                    setActiveTab('labels');
                                    setSelectedPolygonId(null);
                                    setSelectedHotspotId(null);
                                    setCreateLabelPointSelected(false);
                                    setPlacementMode(null);
                                }
                            }}
                            className="h-full min-h-[32rem] w-full"
                        />
                    </div>

                    {canManage ? (
                        <aside className="flex flex-col rounded-xl border bg-background shadow-sm lg:sticky lg:top-4 lg:h-[calc(100vh-7.5rem)] lg:min-h-0 lg:overflow-hidden">
                            <div
                                role="tablist"
                                aria-label="Configuración del tour 360"
                                className="flex shrink-0 gap-1 overflow-x-auto border-b bg-slate-50 p-2"
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
                            <div className="p-4 pb-20 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                                {activeTab === 'panoramas' ? (
                                    <PanoramasPanel
                                        project={project}
                                        tour={tour}
                                        currentPanorama={currentPanorama}
                                        panoramaTitles={panoramaTitles}
                                        setPanoramaTitles={setPanoramaTitles}
                                        uploadForm={uploadForm}
                                        submitPanoramas={submitPanoramas}
                                        panoramaAnalysis={panoramaAnalysis}
                                        analyzingPanoramas={analyzingPanoramas}
                                        onPanoramaFilesChosen={
                                            analyzeSelectedPanoramas
                                        }
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
                                        setSelectedLabelId={setSelectedLabelId}
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
                                        publicUrl={project.tour_360_url ?? null}
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
    panoramaAnalysis,
    analyzingPanoramas,
    onPanoramaFilesChosen,
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
    panoramaAnalysis: PanoramaSelectionAnalysis | null;
    analyzingPanoramas: boolean;
    onPanoramaFilesChosen: (files: File[]) => void;
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
            description="Carga imágenes equirectangulares (~2:1) y define la vista inicial de cada escena."
        >
            <form
                onSubmit={submitPanoramas}
                className="space-y-3 rounded-lg border bg-slate-50 p-3"
            >
                <ul className="space-y-1 text-xs text-slate-600">
                    <li>Formato: JPG, PNG o WebP.</li>
                    <li>
                        Peso: máximo{' '}
                        {PROJECT_360_PANORAMA_RULES.maxBytes / (1024 * 1024)}{' '}
                        MB.
                    </li>
                    <li>
                        Resolución: entre {PROJECT_360_PANORAMA_RULES.minWidth}×
                        {PROJECT_360_PANORAMA_RULES.minHeight} y{' '}
                        {PROJECT_360_PANORAMA_RULES.maxWidth}×
                        {PROJECT_360_PANORAMA_RULES.maxHeight} px.
                    </li>
                    <li>
                        Proporción: ~2:1 equirectangular (±5 %, de 1.90:1 a
                        2.10:1).
                    </li>
                    <li>
                        Cantidad: hasta {PROJECT_360_PANORAMA_RULES.maxFiles}{' '}
                        archivos por carga.
                    </li>
                </ul>
                <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={analyzingPanoramas || uploadForm.processing}
                    onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        void onPanoramaFilesChosen(files);
                    }}
                />
                {analyzingPanoramas ? (
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Analizando requisitos de cada imagen…
                    </p>
                ) : null}
                {panoramaAnalysis &&
                !panoramaAnalysis.ok &&
                !analyzingPanoramas ? (
                    <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-sm text-red-800">
                        Corrige los errores de validación antes de subir. El
                        archivo no se enviará al servidor hasta que cumpla todos
                        los requisitos.
                    </p>
                ) : null}
                {panoramaAnalysis?.batchErrors.map((message) => (
                    <InputError key={message} message={message} />
                ))}
                {uploadForm.errors.panorama_files &&
                !panoramaAnalysis?.batchErrors.includes(
                    uploadForm.errors.panorama_files,
                ) ? (
                    <InputError message={uploadForm.errors.panorama_files} />
                ) : null}
                {uploadForm.data.panorama_titles.map((title, index) => (
                    <div
                        key={`${uploadForm.data.panorama_files[index]?.name}-${index}`}
                        className="space-y-2 rounded-md border bg-white p-2"
                    >
                        <Input
                            value={title}
                            onChange={(event) => {
                                const titles = [
                                    ...uploadForm.data.panorama_titles,
                                ];
                                titles[index] = event.target.value;
                                uploadForm.setData('panorama_titles', titles);
                            }}
                            placeholder={`Título ${index + 1}`}
                        />
                        <InputError
                            message={
                                uploadForm.errors[`panorama_titles.${index}`]
                            }
                        />
                        {panoramaAnalysis?.reports[index] ? (
                            <PanoramaRequirementReport
                                report={panoramaAnalysis.reports[index]}
                            />
                        ) : null}
                    </div>
                ))}
                <InputError message={uploadForm.errors.panorama_titles} />
                <Button
                    type="submit"
                    size="sm"
                    disabled={
                        uploadForm.processing ||
                        analyzingPanoramas ||
                        uploadForm.data.panorama_files.length === 0 ||
                        panoramaAnalysis?.ok !== true
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
                            <fieldset className="space-y-3 rounded-lg border bg-white p-3">
                                <legend className="px-1 text-sm font-medium">
                                    Posición
                                </legend>
                                <div className="grid grid-cols-2 gap-3">
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
                            </fieldset>
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
                    <fieldset className="space-y-3 rounded-lg border bg-white p-3">
                        <legend className="px-1 text-sm font-medium">
                            Posición
                        </legend>
                        <div className="grid grid-cols-2 gap-3">
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
                    </fieldset>
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
            description="Coloca textos, edítalos o elimínalos. Ajusta forma, colores, borde, tamaño y si se ven siempre o al hacer clic."
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
                    <LabelStyleFields
                        value={labelForm.data}
                        previewText={labelForm.data.text}
                        onChange={(changes) =>
                            labelForm.setData((current) => ({
                                ...current,
                                ...changes,
                            }))
                        }
                    />
                    <fieldset className="space-y-3 rounded-lg border bg-white p-3">
                        <legend className="px-1 text-sm font-medium">
                            Posición
                        </legend>
                        <div className="grid grid-cols-2 gap-3">
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
                    </fieldset>
                    <InputError
                        message={
                            labelForm.errors.yaw ??
                            labelForm.errors.pitch ??
                            labelForm.errors.color ??
                            labelForm.errors.background_color ??
                            labelForm.errors.border_color ??
                            labelForm.errors.border_width ??
                            labelForm.errors.font ??
                            labelForm.errors.size ??
                            labelForm.errors.width ??
                            labelForm.errors.height ??
                            labelForm.errors.rotation ??
                            labelForm.errors.shape ??
                            labelForm.errors.visibility
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
                    <div
                        key={label.id}
                        className={`flex items-center gap-2 rounded-lg border p-2 ${
                            selectedLabel?.id === label.id
                                ? 'border-orange-400 bg-orange-50'
                                : 'bg-white'
                        }`}
                    >
                        <button
                            type="button"
                            className="min-w-0 flex-1 rounded-md px-1 py-1 text-left text-sm hover:bg-slate-50"
                            onClick={() => {
                                setCreatePointSelected(false);
                                setPlacementMode(null);
                                setSelectedLabelId(label.id);
                                setSelectedPolygonId(null);
                                setSelectedHotspotId(null);
                            }}
                        >
                            <span className="flex items-center gap-2">
                                <span
                                    className="h-4 w-4 shrink-0 rounded-sm border"
                                    style={{
                                        backgroundColor: label.background_color,
                                        borderColor: label.border_color,
                                        color: label.color,
                                    }}
                                />
                                <span className="block min-w-0 truncate font-medium">
                                    {label.text}
                                </span>
                            </span>
                            <span className="text-xs text-slate-500">
                                {label.visibility === 'click'
                                    ? 'Al hacer clic · '
                                    : ''}
                                {label.yaw.toFixed(1)}° /{' '}
                                {label.pitch.toFixed(1)}°
                            </span>
                        </button>
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            aria-label={`Editar etiqueta ${label.text}`}
                            onClick={() => {
                                setCreatePointSelected(false);
                                setPlacementMode(null);
                                setSelectedLabelId(label.id);
                                setSelectedPolygonId(null);
                                setSelectedHotspotId(null);
                            }}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            aria-label={`Eliminar etiqueta ${label.text}`}
                            onClick={() => void deleteLabel(label)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
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
                    <LabelStyleFields
                        value={selectedDraft}
                        previewText={selectedDraft.text}
                        onChange={(changes) =>
                            updateDraft(selectedLabel.id, changes)
                        }
                    />
                    <fieldset className="space-y-3 rounded-lg border bg-white p-3">
                        <legend className="px-1 text-sm font-medium">
                            Posición
                        </legend>
                        <div className="grid grid-cols-2 gap-3">
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
                    </fieldset>
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
    setSelectedLabelId,
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
    setSelectedLabelId: React.Dispatch<React.SetStateAction<number | null>>;
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
            description="Dibuja zonas, edítalas o elimínalas. La etiqueta del polígono usa el mismo editor de estilo y puede mostrarse siempre o al hacer clic."
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
                            polygonForm.setData((current) => ({
                                ...current,
                                lot_id,
                                label_text: lot_id
                                    ? lotNumberLabel(
                                          lotOptions.find(
                                              (lot) => lot.id === lot_id,
                                          ) ?? null,
                                      )
                                    : current.label_text,
                            }))
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
                    <PolygonLabelFields
                        value={polygonForm.data}
                        vertices={polygonForm.data.vertices}
                        lotLocked={polygonForm.data.lot_id !== null}
                        onChange={(changes) =>
                            polygonForm.setData((current) => ({
                                ...current,
                                ...changes,
                            }))
                        }
                    />
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
                    <div
                        key={polygon.id}
                        className={`flex items-center gap-2 rounded-lg border p-2 ${
                            selectedPolygon?.id === polygon.id
                                ? 'border-orange-400 bg-orange-50'
                                : 'bg-white'
                        }`}
                    >
                        <button
                            type="button"
                            className="min-w-0 flex-1 rounded-md px-1 py-1 text-left text-sm hover:bg-slate-50 disabled:opacity-60"
                            disabled={polygonDrawingState !== 'idle'}
                            onClick={() => {
                                setSelectedHotspotId(null);
                                setSelectedLabelId(null);
                                setSelectedPolygonId(polygon.id);
                            }}
                        >
                            <span className="flex items-center gap-2 font-medium">
                                {polygon.lot?.status ? (
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{
                                            backgroundColor:
                                                polygon.lot.status.color,
                                        }}
                                    />
                                ) : null}
                                <span className="truncate">
                                    {polygon.title}
                                </span>
                            </span>
                            <span className="text-xs text-slate-500">
                                {polygon.label_text
                                    ? `Etiqueta: ${polygon.label_text}${
                                          polygon.label_visibility === 'click'
                                              ? ' (al clic)'
                                              : ''
                                      } · `
                                    : ''}
                                {polygon.vertices.length} vértices
                            </span>
                        </button>
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            aria-label={`Editar polígono ${polygon.title}`}
                            disabled={polygonDrawingState !== 'idle'}
                            onClick={() => {
                                setSelectedHotspotId(null);
                                setSelectedLabelId(null);
                                setSelectedPolygonId(polygon.id);
                            }}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            aria-label={`Eliminar polígono ${polygon.title}`}
                            disabled={polygonDrawingState !== 'idle'}
                            onClick={() => void deletePolygon(polygon)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
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
                        onChange={(lot_id) => {
                            const lot = lotOptions.find(
                                (item) => item.id === lot_id,
                            );
                            updateDraft(selectedPolygon.id, {
                                lot_id,
                                ...(lot_id
                                    ? { label_text: lotNumberLabel(lot) }
                                    : {}),
                            });
                        }}
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
                    <PolygonLabelFields
                        value={selectedDraft}
                        vertices={selectedDraft.vertices}
                        lotLocked={selectedDraft.lot_id !== null}
                        onChange={(changes) =>
                            updateDraft(selectedPolygon.id, changes)
                        }
                    />
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
                        El título y la etiqueta del 360 usarán el número del
                        lote.
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
            <SliderField
                label="Opacidad"
                value={value}
                min={0.1}
                max={0.7}
                step={0.05}
                format={(current) => current.toFixed(2)}
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
                        ['pin', 'Pin (Google Maps)'],
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
    publicUrl,
    shareForm,
    copiedLinkId,
    copyLink,
}: {
    projectId: number;
    tour: Project360Tour;
    publicUrl: string | null;
    shareForm: InertiaForm<{ label: string }>;
    copiedLinkId: string | null;
    copyLink: (id: string, url: string) => Promise<void>;
}) {
    return (
        <PanelSection
            title="Compartir"
            description="El enlace estable abre el recorrido público. Los enlaces firmados siguen disponibles para campañas puntuales."
        >
            {publicUrl ? (
                <div className="space-y-2 rounded-lg border p-3">
                    <p className="text-sm font-medium">
                        Enlace público del proyecto
                    </p>
                    <p className="text-xs break-all text-slate-500">
                        {publicUrl}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => void copyLink('public', publicUrl)}
                            title="Copiar enlace público"
                        >
                            {copiedLinkId === 'public' ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                <Clipboard className="h-4 w-4" />
                            )}
                        </Button>
                        <Button asChild size="icon" variant="outline">
                            <a
                                href={publicUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </Button>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-slate-500">
                    Sube al menos un panorama activo para generar el enlace
                    público.
                </p>
            )}
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
                        Todavía no hay enlaces firmados.
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
            <Label className="text-xs text-slate-600">{label}</Label>
            <Input
                type="number"
                value={value}
                min={min}
                max={max}
                step={step}
                className="h-8"
                onChange={(event) => onChange(Number(event.target.value))}
            />
        </div>
    );
}

function SliderField({
    label,
    value,
    min,
    max,
    step,
    onChange,
    format = (current) => String(current),
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    format?: (value: number) => string;
}) {
    return (
        <div>
            <div className="mb-1 flex items-center justify-between gap-2">
                <Label className="text-xs text-slate-600">{label}</Label>
                <span className="font-mono text-[11px] text-slate-500">
                    {format(value)}
                </span>
            </div>
            <input
                type="range"
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={(event) => onChange(Number(event.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-orange-500"
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
        <div className="min-w-0">
            <Label className="text-xs text-slate-600">{label}</Label>
            <div className="mt-1 flex items-center gap-1.5">
                <input
                    type="color"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5"
                    aria-label={label}
                />
                <Input
                    value={value}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    onChange={(event) => onChange(event.target.value)}
                    className="h-8 font-mono text-xs uppercase"
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
    options: readonly (readonly [string, string])[];
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <Label className="text-xs text-slate-600">{label}</Label>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-input bg-white px-2 text-sm"
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

function ChoicePills({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: readonly (readonly [string, string])[];
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <Label className="mb-1.5 block text-xs text-slate-600">
                {label}
            </Label>
            <div className="flex flex-wrap gap-1">
                {options.map(([optionValue, optionLabel]) => {
                    const active = value === optionValue;

                    return (
                        <button
                            key={optionValue}
                            type="button"
                            onClick={() => onChange(optionValue)}
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                                active
                                    ? 'border-orange-500 bg-orange-500 text-white'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:bg-orange-50'
                            }`}
                        >
                            {optionLabel}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function LabelBadgePreview({
    text,
    style,
}: {
    text: string;
    style: Project360LabelStyle;
}) {
    const preview = project360LabelBadgePreviewStyle(style);

    return (
        <div className="flex min-h-16 items-center justify-center overflow-hidden rounded-lg bg-[radial-gradient(circle_at_center,#1e293b,transparent_70%),linear-gradient(135deg,#0f172a,#334155)] p-3">
            <span style={preview} className="max-w-[90%] truncate shadow-lg">
                {text.trim() || 'Etiqueta'}
            </span>
        </div>
    );
}

function LabelStyleFields({
    value,
    onChange,
    previewText,
}: {
    value: Project360LabelStyle;
    onChange: (changes: Partial<Project360LabelStyle>) => void;
    previewText: string;
}) {
    return (
        <fieldset className="space-y-3 rounded-lg border bg-white p-3">
            <legend className="px-1 text-sm font-medium">Apariencia</legend>
            <LabelBadgePreview text={previewText} style={value} />
            <ChoicePills
                label="Visibilidad"
                value={value.visibility}
                options={PROJECT_360_LABEL_VISIBILITIES}
                onChange={(visibility) =>
                    onChange({
                        visibility: visibility as Project360BadgeVisibility,
                    })
                }
            />
            {value.visibility === 'click' ? (
                <p className="text-xs text-slate-500">
                    Solo aparece al seleccionarla en el panorama (las de
                    polígono, al pulsar la zona).
                </p>
            ) : null}
            <ChoicePills
                label="Forma"
                value={value.shape}
                options={PROJECT_360_LABEL_SHAPES}
                onChange={(shape) =>
                    onChange({ shape: shape as Project360LabelShape })
                }
            />
            <div className="grid grid-cols-3 gap-2">
                <ColorField
                    label="Texto"
                    value={value.color}
                    onChange={(color) => onChange({ color })}
                />
                <ColorField
                    label="Fondo"
                    value={value.background_color}
                    onChange={(background_color) =>
                        onChange({ background_color })
                    }
                />
                <ColorField
                    label="Borde"
                    value={value.border_color}
                    onChange={(border_color) => onChange({ border_color })}
                />
            </div>
            <SliderField
                label="Grosor del borde"
                value={value.border_width}
                min={0}
                max={0.16}
                step={0.01}
                format={(current) => current.toFixed(2)}
                onChange={(border_width) => onChange({ border_width })}
            />
            <div className="grid grid-cols-2 gap-2">
                <SelectField
                    label="Tipo de letra"
                    value={value.font}
                    options={PROJECT_360_LABEL_FONTS}
                    onChange={(font) =>
                        onChange({ font: font as Project360LabelFont })
                    }
                />
                <SliderField
                    label="Tamaño del texto"
                    value={value.size}
                    min={0.5}
                    max={3}
                    step={0.05}
                    format={(current) => current.toFixed(2)}
                    onChange={(size) => onChange({ size })}
                />
                <SliderField
                    label="Ancho"
                    value={value.width}
                    min={0.5}
                    max={4}
                    step={0.05}
                    format={(current) => current.toFixed(2)}
                    onChange={(width) => onChange({ width })}
                />
                <SliderField
                    label="Largo"
                    value={value.height}
                    min={0.18}
                    max={1.5}
                    step={0.02}
                    format={(current) => current.toFixed(2)}
                    onChange={(height) => onChange({ height })}
                />
            </div>
            <SliderField
                label="Ángulo"
                value={value.rotation}
                min={-180}
                max={180}
                step={1}
                format={(current) => `${Math.round(current)}°`}
                onChange={(rotation) => onChange({ rotation })}
            />
        </fieldset>
    );
}

function polygonLabelAppearance(
    value: Pick<
        PolygonDraft,
        | 'label_color'
        | 'label_background_color'
        | 'label_border_color'
        | 'label_border_width'
        | 'label_font'
        | 'label_size'
        | 'label_width'
        | 'label_height'
        | 'label_rotation'
        | 'label_shape'
        | 'label_visibility'
    >,
): Project360LabelStyle {
    return {
        color: value.label_color,
        background_color: value.label_background_color,
        border_color: value.label_border_color,
        border_width: value.label_border_width,
        font: value.label_font,
        size: value.label_size,
        width: value.label_width,
        height: value.label_height,
        rotation: value.label_rotation,
        shape: value.label_shape,
        visibility: value.label_visibility,
    };
}

function appearanceToPolygonFields(
    changes: Partial<Project360LabelStyle>,
): Partial<PolygonDraft> {
    const mapped: Partial<PolygonDraft> = {};

    if (changes.color !== undefined) {
        mapped.label_color = changes.color;
    }
    if (changes.background_color !== undefined) {
        mapped.label_background_color = changes.background_color;
    }
    if (changes.border_color !== undefined) {
        mapped.label_border_color = changes.border_color;
    }
    if (changes.border_width !== undefined) {
        mapped.label_border_width = changes.border_width;
    }
    if (changes.font !== undefined) {
        mapped.label_font = changes.font;
    }
    if (changes.size !== undefined) {
        mapped.label_size = changes.size;
    }
    if (changes.width !== undefined) {
        mapped.label_width = changes.width;
    }
    if (changes.height !== undefined) {
        mapped.label_height = changes.height;
    }
    if (changes.rotation !== undefined) {
        mapped.label_rotation = changes.rotation;
    }
    if (changes.shape !== undefined) {
        mapped.label_shape = changes.shape;
    }
    if (changes.visibility !== undefined) {
        mapped.label_visibility = changes.visibility;
    }

    return mapped;
}

function PolygonLabelFields({
    value,
    vertices,
    onChange,
    lotLocked = false,
}: {
    value: Pick<
        PolygonDraft,
        | 'label_text'
        | 'label_color'
        | 'label_background_color'
        | 'label_border_color'
        | 'label_border_width'
        | 'label_font'
        | 'label_size'
        | 'label_width'
        | 'label_height'
        | 'label_rotation'
        | 'label_shape'
        | 'label_visibility'
        | 'label_yaw'
        | 'label_pitch'
    >;
    vertices: Project360PolygonVertex[];
    onChange: (changes: Partial<PolygonDraft>) => void;
    lotLocked?: boolean;
}) {
    const centered = value.label_yaw === null || value.label_pitch === null;

    return (
        <div className="space-y-3">
            <fieldset className="space-y-3 rounded-lg border bg-white p-3">
                <legend className="px-1 text-sm font-medium">
                    {lotLocked ? 'Etiqueta del lote' : 'Etiqueta'}
                </legend>
                <div>
                    <Label className="text-xs text-slate-600">
                        Texto en el panorama
                    </Label>
                    <Input
                        value={value.label_text}
                        maxLength={120}
                        readOnly={lotLocked}
                        className="mt-1 h-8"
                        placeholder={
                            lotLocked
                                ? 'Número del lote'
                                : 'Vacío = sin etiqueta en el 360'
                        }
                        onChange={(event) =>
                            onChange({ label_text: event.target.value })
                        }
                    />
                    {lotLocked ? (
                        <p className="mt-1 text-xs text-slate-500">
                            Ligado al lote: el texto es el número del lote.
                        </p>
                    ) : (
                        <p className="mt-1 text-xs text-slate-500">
                            Si dejas el texto vacío, el polígono no mostrará
                            etiqueta.
                        </p>
                    )}
                </div>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={centered}
                        onChange={(event) => {
                            if (event.target.checked) {
                                onChange({
                                    label_yaw: null,
                                    label_pitch: null,
                                });

                                return;
                            }

                            const center =
                                vertices.length >= 3
                                    ? polygonCentroid(vertices)
                                    : { yaw: 0, pitch: 0 };
                            onChange({
                                label_yaw: center.yaw,
                                label_pitch: center.pitch,
                            });
                        }}
                    />
                    Centrar en el polígono
                </label>
                {!centered ? (
                    <div className="grid grid-cols-2 gap-2">
                        <NumberField
                            label="Yaw"
                            value={value.label_yaw ?? 0}
                            min={-180}
                            max={180}
                            step={0.001}
                            onChange={(label_yaw) => onChange({ label_yaw })}
                        />
                        <NumberField
                            label="Pitch"
                            value={value.label_pitch ?? 0}
                            min={-85}
                            max={85}
                            step={0.001}
                            onChange={(label_pitch) =>
                                onChange({ label_pitch })
                            }
                        />
                    </div>
                ) : null}
            </fieldset>
            <LabelStyleFields
                value={polygonLabelAppearance(value)}
                previewText={value.label_text}
                onChange={(changes) =>
                    onChange(appearanceToPolygonFields(changes))
                }
            />
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
        <fieldset className="space-y-3 rounded-lg border bg-white p-3">
            <legend className="px-1 text-sm font-medium">
                Apariencia del polígono
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
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
                <SliderField
                    label="Opacidad"
                    value={value.opacity}
                    min={0.1}
                    max={0.7}
                    step={0.05}
                    format={(current) => current.toFixed(2)}
                    onChange={(opacity) => onChange({ opacity })}
                />
            </div>
        </fieldset>
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
        <fieldset className="space-y-3 rounded-lg border bg-white p-3">
            <legend className="px-1 text-sm font-medium">
                Estilo del hotspot
            </legend>
            <label className="flex items-center gap-2 text-sm">
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
                            ['pin', 'Pin (Google Maps)'],
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
        </fieldset>
    );
}
