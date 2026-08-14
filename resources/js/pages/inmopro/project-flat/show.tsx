import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Check,
    Map,
    MousePointer2,
    Pentagon,
    Trash2,
    Undo2,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ProjectFlatViewer } from '@/components/inmopro/project-flat-viewer';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import {
    hasDuplicateAdjacentVertices,
    lightenHex,
    polygonHasSelfIntersection,
    type ProjectFlatVertex,
} from '@/lib/project-flat-geometry';
import projectFlat from '@/routes/inmopro/project-flat';
import polygonRoutes from '@/routes/inmopro/project-flat/polygons';
import type { BreadcrumbItem } from '@/types';
import {
    isLibreLot,
    type ProjectFlatLot,
    type ProjectFlatMapsCenter,
    type ProjectFlatPolygon,
} from '@/types/project-flat';

type PageProps = {
    project: {
        id: number;
        name: string;
        location: string | null;
        is_active: boolean;
    };
    polygons: ProjectFlatPolygon[];
    mapsCenter: ProjectFlatMapsCenter | null;
    googleMapsApiKey: string | null;
    canManage: boolean;
    lotOptions: ProjectFlatLot[];
};

type DrawingState = 'idle' | 'drawing' | 'closed';

const COLOR_SWATCHES = [
    '#f97316',
    '#22c55e',
    '#2563eb',
    '#eab308',
    '#dc2626',
    '#7c3aed',
    '#0d9488',
    '#64748b',
];

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

function polygonFormData(polygon?: ProjectFlatPolygon) {
    return {
        lot_id: polygon?.lot_id ?? null,
        title: polygon?.title ?? '',
        description: polygon?.description ?? '',
        vertices: polygon?.vertices ?? [],
        color: polygon?.color ?? '#f97316',
        hover_color: polygon?.hover_color ?? '#fb923c',
        opacity: polygon?.opacity ?? 0.35,
    };
}

export default function ProjectFlatShow({
    project,
    polygons,
    mapsCenter,
    googleMapsApiKey,
    canManage,
    lotOptions,
}: PageProps) {
    const pageErrors = usePage<{ errors?: Record<string, string> }>().props
        .errors;
    const [drawingState, setDrawingState] = useState<DrawingState>('idle');
    const [draftVertices, setDraftVertices] = useState<ProjectFlatVertex[]>([]);
    const [selectedPolygonId, setSelectedPolygonId] = useState<number | null>(
        null,
    );
    const [hoveredPolygonId, setHoveredPolygonId] = useState<number | null>(
        null,
    );
    const [editingPolygonId, setEditingPolygonId] = useState<number | null>(
        null,
    );
    const [drawingError, setDrawingError] = useState<string | null>(null);
    const form = useForm(polygonFormData());

    const selectedPolygon = polygons.find(
        (polygon) => polygon.id === selectedPolygonId,
    );
    const selectedLot = selectedPolygon?.lot ?? null;
    const selectedLotIsLibre = isLibreLot(selectedLot);
    const linkedLotIds = useMemo(
        () =>
            new Set(
                polygons
                    .filter((polygon) => polygon.lot_id)
                    .map((polygon) => polygon.lot_id),
            ),
        [polygons],
    );
    const availableLots = lotOptions.filter(
        (lot) => !linkedLotIds.has(lot.id) || lot.id === form.data.lot_id,
    );
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Vista plana', href: projectFlat.index().url },
        { title: project.name, href: projectFlat.show(project.id).url },
    ];
    const isEditingShape = drawingState !== 'idle';
    const draftLabel =
        form.data.title.trim() ||
        (form.data.lot_id
            ? `Lote ${lotOptions.find((lot) => lot.id === form.data.lot_id)?.number ?? ''}`
            : 'Nuevo');

    const applyColor = (color: string) => {
        form.setData({
            ...form.data,
            color,
            hover_color: lightenHex(color),
        });
    };

    const startDrawing = (polygon?: ProjectFlatPolygon) => {
        if (!canManage) {
            return;
        }

        setDrawingError(null);
        setDrawingState('drawing');
        setDraftVertices(polygon?.vertices ?? []);
        setEditingPolygonId(polygon?.id ?? null);
        setSelectedPolygonId(polygon?.id ?? null);
        form.setData(polygonFormData(polygon));
        form.clearErrors();
    };

    const cancelDrawing = () => {
        setDrawingState('idle');
        setDraftVertices([]);
        setEditingPolygonId(null);
        setDrawingError(null);
        form.reset();
        form.clearErrors();

        if (selectedPolygon) {
            form.setData(polygonFormData(selectedPolygon));
        }
    };

    const handleMapClick = (vertex: ProjectFlatVertex) => {
        if (!canManage || drawingState !== 'drawing') {
            return;
        }

        const next = [...draftVertices, vertex];
        setDraftVertices(next);
        setDrawingError(null);
        form.setData('vertices', next);
    };

    const handleVertexDrag = (index: number, vertex: ProjectFlatVertex) => {
        if (!canManage || drawingState === 'idle') {
            return;
        }

        setDraftVertices((current) => {
            const next = current.map((item, currentIndex) =>
                currentIndex === index ? vertex : item,
            );
            form.setData('vertices', next);

            return next;
        });
    };

    const undoVertex = () => {
        const next = draftVertices.slice(0, -1);
        setDraftVertices(next);
        form.setData('vertices', next);
        setDrawingState('drawing');
        setDrawingError(null);
    };

    const closeDraft = () => {
        if (draftVertices.length < 3) {
            setDrawingError('Dibuja al menos tres vértices.');

            return false;
        }

        if (hasDuplicateAdjacentVertices(draftVertices)) {
            setDrawingError('Hay vértices consecutivos repetidos.');

            return false;
        }

        if (polygonHasSelfIntersection(draftVertices)) {
            setDrawingError('Los lados del polígono no pueden cruzarse.');

            return false;
        }

        setDrawingState('closed');
        form.setData('vertices', draftVertices);
        setDrawingError(null);

        return true;
    };

    const submitPolygon = (event: React.FormEvent) => {
        event.preventDefault();

        if (drawingState === 'drawing' && !closeDraft()) {
            return;
        }

        const payload = {
            lot_id: form.data.lot_id || null,
            title: form.data.title,
            description: form.data.description,
            vertices: draftVertices,
            color: form.data.color,
            hover_color: lightenHex(form.data.color),
            opacity: form.data.opacity,
        };

        if (editingPolygonId) {
            form.transform(() => payload);
            form.put(polygonRoutes.update([project.id, editingPolygonId]).url, {
                preserveScroll: true,
                onSuccess: () => {
                    form.transform((data) => data);
                    cancelDrawing();
                },
            });

            return;
        }

        form.transform(() => payload);
        form.post(polygonRoutes.store(project.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                form.transform((data) => data);
                cancelDrawing();
            },
        });
    };

    const saveSelectedStyle = (event: React.FormEvent) => {
        event.preventDefault();

        if (!selectedPolygon || isEditingShape) {
            return;
        }

        const payload = {
            lot_id: form.data.lot_id || selectedPolygon.lot_id,
            title: form.data.title,
            description: form.data.description,
            vertices: selectedPolygon.vertices,
            color: form.data.color,
            hover_color: lightenHex(form.data.color),
            opacity: form.data.opacity,
        };

        form.transform(() => payload);
        form.put(polygonRoutes.update([project.id, selectedPolygon.id]).url, {
            preserveScroll: true,
            onSuccess: () => form.transform((data) => data),
        });
    };

    const deletePolygon = (polygon: ProjectFlatPolygon) => {
        if (!canManage) {
            return;
        }

        router.delete(polygonRoutes.destroy([project.id, polygon.id]).url, {
            preserveScroll: true,
            onSuccess: () => {
                if (selectedPolygonId === polygon.id) {
                    setSelectedPolygonId(null);
                    form.reset();
                }
            },
        });
    };

    const handleLotChange = (lotId: string) => {
        const parsed = lotId === '' ? null : Number(lotId);
        const lot = lotOptions.find((option) => option.id === parsed) ?? null;
        const nextTitle =
            form.data.title.trim() === '' && lot
                ? `Lote ${lot.number}`
                : form.data.title;

        form.setData({
            ...form.data,
            lot_id: parsed,
            title: nextTitle,
        });
    };

    const selectPolygon = (polygonId: number | null) => {
        if (isEditingShape) {
            return;
        }

        setSelectedPolygonId(polygonId);
        const polygon = polygons.find((item) => item.id === polygonId);
        form.setData(polygonFormData(polygon));
        form.clearErrors();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Vista plana · ${project.name}`} />
            <div className="space-y-4 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                            <Map className="h-7 w-7 text-orange-500" />
                            {project.name}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Dibuja los lotes sobre el mapa híbrido de Google
                            Maps.
                        </p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href={projectFlat.index()}>Volver</Link>
                    </Button>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <ProjectFlatViewer
                        apiKey={googleMapsApiKey}
                        center={mapsCenter}
                        polygons={polygons}
                        draftVertices={draftVertices}
                        draftColor={form.data.color}
                        draftLabel={draftLabel}
                        hiddenPolygonId={editingPolygonId}
                        selectedPolygonId={selectedPolygonId}
                        hoveredPolygonId={hoveredPolygonId}
                        drawing={drawingState === 'drawing'}
                        onMapClick={handleMapClick}
                        onVertexDrag={handleVertexDrag}
                        onCloseRequest={() => {
                            closeDraft();
                        }}
                        onHoverPolygon={setHoveredPolygonId}
                        onSelectPolygon={selectPolygon}
                        className="min-h-[70vh]"
                    />

                    <div className="space-y-4">
                        {canManage ? (
                            <div className="rounded-xl border bg-white p-4 shadow-sm">
                                <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                                    <Pentagon className="h-4 w-4 text-orange-500" />
                                    Dibujar lote
                                </h2>
                                {drawingState === 'idle' ? (
                                    <Button
                                        type="button"
                                        className="w-full"
                                        onClick={() => startDrawing()}
                                        disabled={
                                            !mapsCenter || !googleMapsApiKey
                                        }
                                    >
                                        <MousePointer2 className="h-4 w-4" />
                                        Nuevo polígono
                                    </Button>
                                ) : (
                                    <form
                                        className="space-y-3"
                                        onSubmit={submitPolygon}
                                    >
                                        <p className="text-sm text-slate-500">
                                            {drawingState === 'drawing'
                                                ? 'Clic para añadir vértices. Arrástralos para ajustar. Clic en el primero o doble clic para cerrar.'
                                                : 'Ajusta etiqueta y color, o arrastra los vértices antes de guardar.'}
                                        </p>
                                        <p className="text-xs font-medium text-slate-600">
                                            {draftVertices.length} vértice
                                            {draftVertices.length === 1
                                                ? ''
                                                : 's'}
                                            {draftVertices.length >= 3
                                                ? ' · listo para cerrar'
                                                : ''}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={undoVertex}
                                                disabled={
                                                    draftVertices.length === 0
                                                }
                                            >
                                                <Undo2 className="h-4 w-4" />
                                                Deshacer
                                            </Button>
                                            {drawingState === 'drawing' ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => closeDraft()}
                                                    disabled={
                                                        draftVertices.length < 3
                                                    }
                                                >
                                                    <Check className="h-4 w-4" />
                                                    Cerrar
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setDrawingState(
                                                            'drawing',
                                                        )
                                                    }
                                                >
                                                    Seguir dibujando
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={cancelDrawing}
                                            >
                                                <X className="h-4 w-4" />
                                                Cancelar
                                            </Button>
                                        </div>
                                        <PolygonStyleFields
                                            form={form}
                                            availableLots={availableLots}
                                            onLotChange={handleLotChange}
                                            onColorChange={applyColor}
                                        />
                                        {(drawingError ||
                                            form.errors.vertices ||
                                            pageErrors?.vertices) && (
                                            <p className="text-sm text-red-600">
                                                {drawingError ||
                                                    form.errors.vertices ||
                                                    pageErrors?.vertices}
                                            </p>
                                        )}
                                        <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={
                                                draftVertices.length < 3 ||
                                                form.processing
                                            }
                                        >
                                            Guardar polígono
                                        </Button>
                                    </form>
                                )}
                            </div>
                        ) : null}

                        <div className="rounded-xl border bg-white p-4 shadow-sm">
                            <h2 className="mb-3 font-semibold text-slate-900">
                                Lote seleccionado
                            </h2>
                            {selectedPolygon ? (
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-medium text-slate-900">
                                            {selectedPolygon.title}
                                        </p>
                                        {selectedLot?.status ? (
                                            <Badge
                                                style={{
                                                    backgroundColor:
                                                        selectedLot.status
                                                            .color,
                                                }}
                                                className="text-white"
                                            >
                                                {selectedLot.status.name}
                                            </Badge>
                                        ) : null}
                                    </div>
                                    {selectedLot ? (
                                        <>
                                            <p>
                                                Manzana {selectedLot.block} ·
                                                Lote {selectedLot.number}
                                            </p>
                                            {selectedLotIsLibre ? (
                                                <>
                                                    <p>
                                                        Área:{' '}
                                                        {selectedLot.area ??
                                                            '—'}{' '}
                                                        m²
                                                    </p>
                                                    <p>
                                                        Precio:{' '}
                                                        {formatMoney(
                                                            selectedLot.price,
                                                        )}
                                                    </p>
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full"
                                                    >
                                                        <Link
                                                            href={`/inmopro/lots/${selectedLot.id}`}
                                                        >
                                                            Ver ficha del lote
                                                        </Link>
                                                    </Button>
                                                </>
                                            ) : (
                                                <p className="text-slate-500">
                                                    Este lote no está
                                                    disponible. Área, precio y
                                                    ficha se muestran solo
                                                    cuando está libre.
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-slate-500">
                                            Polígono informativo, sin lote
                                            ligado.
                                        </p>
                                    )}
                                    {canManage && !isEditingShape ? (
                                        <form
                                            className="space-y-3 border-t pt-3"
                                            onSubmit={saveSelectedStyle}
                                        >
                                            <PolygonStyleFields
                                                form={form}
                                                availableLots={availableLots}
                                                onLotChange={handleLotChange}
                                                onColorChange={applyColor}
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    className="flex-1"
                                                    disabled={form.processing}
                                                >
                                                    Guardar estilo
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        startDrawing(
                                                            selectedPolygon,
                                                        )
                                                    }
                                                >
                                                    Redibujar
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                        deletePolygon(
                                                            selectedPolygon,
                                                        )
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </form>
                                    ) : canManage ? (
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() =>
                                                    deletePolygon(
                                                        selectedPolygon,
                                                    )
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">
                                    Haz clic en un polígono del mapa para ver el
                                    lote.
                                </p>
                            )}
                        </div>

                        <div className="rounded-xl border bg-white p-4 shadow-sm">
                            <h2 className="mb-3 font-semibold text-slate-900">
                                Polígonos ({polygons.length})
                            </h2>
                            {polygons.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    Aún no hay lotes dibujados en este proyecto.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {polygons.map((polygon) => (
                                        <li key={polygon.id}>
                                            <button
                                                type="button"
                                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                                                    selectedPolygonId ===
                                                    polygon.id
                                                        ? 'bg-orange-50 text-orange-900'
                                                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                                                }`}
                                                onClick={() =>
                                                    selectPolygon(polygon.id)
                                                }
                                            >
                                                <span>{polygon.title}</span>
                                                <span
                                                    className="h-3 w-3 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            polygon.color,
                                                    }}
                                                />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function PolygonStyleFields({
    form,
    availableLots,
    onLotChange,
    onColorChange,
}: {
    form: ReturnType<typeof useForm<ReturnType<typeof polygonFormData>>>;
    availableLots: ProjectFlatLot[];
    onLotChange: (lotId: string) => void;
    onColorChange: (color: string) => void;
}) {
    return (
        <>
            <div className="space-y-1">
                <Label htmlFor="flat-lot">Lote ligado</Label>
                <select
                    id="flat-lot"
                    value={form.data.lot_id ?? ''}
                    onChange={(event) => onLotChange(event.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                    <option value="">Sin lote</option>
                    {availableLots.map((lot) => (
                        <option key={lot.id} value={lot.id}>
                            Mz {lot.block} · Lote {lot.number}
                            {lot.status ? ` · ${lot.status.name}` : ''}
                        </option>
                    ))}
                </select>
                <InputError message={form.errors.lot_id} />
            </div>
            <div className="space-y-1">
                <Label htmlFor="flat-title">Etiqueta</Label>
                <Input
                    id="flat-title"
                    value={form.data.title}
                    placeholder="Ej. Lote 12"
                    onChange={(event) =>
                        form.setData('title', event.target.value)
                    }
                />
                <InputError message={form.errors.title} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="flat-color">Color</Label>
                <div className="flex items-center gap-2">
                    <input
                        id="flat-color"
                        type="color"
                        value={form.data.color}
                        onChange={(event) => onColorChange(event.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border border-input bg-white p-1"
                    />
                    <Input
                        value={form.data.color}
                        onChange={(event) => onColorChange(event.target.value)}
                        className="font-mono uppercase"
                        maxLength={7}
                    />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {COLOR_SWATCHES.map((color) => (
                        <button
                            key={color}
                            type="button"
                            aria-label={`Color ${color}`}
                            className={`h-6 w-6 rounded-full border ${
                                form.data.color.toLowerCase() === color
                                    ? 'ring-2 ring-slate-900 ring-offset-1'
                                    : 'border-white shadow'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => onColorChange(color)}
                        />
                    ))}
                </div>
                <InputError message={form.errors.color} />
            </div>
        </>
    );
}
