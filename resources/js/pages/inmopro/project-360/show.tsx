import { Head, router, useForm } from '@inertiajs/react';
import {
    Check,
    Clipboard,
    ExternalLink,
    Link2,
    MapPinned,
    Plus,
    Save,
    Star,
    Trash2,
    Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
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
import { confirmDelete } from '@/lib/swal';
import project360 from '@/routes/inmopro/project-360';
import hotspotRoutes from '@/routes/inmopro/project-360/hotspots';
import panoramaRoutes from '@/routes/inmopro/project-360/panoramas';
import shareLinkRoutes from '@/routes/inmopro/project-360/share-links';
import startPanoramaRoutes from '@/routes/inmopro/project-360/start-panorama';
import type { BreadcrumbItem } from '@/types';
import type { Project360Hotspot, Project360Tour } from '@/types/project-360';

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

type HotspotDraft = {
    label: string;
    target_panorama_id: number;
};

const project360DateFormatter = new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Lima',
});

export default function Project360Show({
    project,
    tour,
    canManage,
}: PageProps) {
    const viewerRef = useRef<Project360ViewerHandle>(null);
    const [activePanoramaId, setActivePanoramaId] = useState<number | null>(
        tour.start_panorama_id ?? tour.panoramas[0]?.id ?? null,
    );
    const [panoramaTitles, setPanoramaTitles] = useState(
        Object.fromEntries(
            tour.panoramas.map((panorama) => [panorama.id, panorama.title]),
        ),
    );
    const [hotspotDrafts, setHotspotDrafts] = useState<
        Record<number, HotspotDraft>
    >(
        Object.fromEntries(
            tour.hotspots.map((hotspot) => [
                hotspot.id,
                {
                    label: hotspot.label,
                    target_panorama_id: hotspot.target_panorama_id,
                },
            ]),
        ),
    );
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
    const uploadForm = useForm<UploadForm>({
        panorama_files: [],
        panorama_titles: [],
    });
    const hotspotForm = useForm({
        source_panorama_id: activePanoramaId ?? 0,
        target_panorama_id:
            tour.panoramas.find((panorama) => panorama.id !== activePanoramaId)
                ?.id ?? 0,
        label: '',
        yaw: 0,
        pitch: 0,
    });
    const shareForm = useForm({ label: '' });

    const currentPanoramaId = tour.panoramas.some(
        (panorama) => panorama.id === activePanoramaId,
    )
        ? activePanoramaId
        : (tour.start_panorama_id ?? tour.panoramas[0]?.id ?? null);
    const currentTargetPanoramaId = tour.panoramas.some(
        (panorama) =>
            panorama.id === hotspotForm.data.target_panorama_id &&
            panorama.id !== currentPanoramaId,
    )
        ? hotspotForm.data.target_panorama_id
        : (tour.panoramas.find((panorama) => panorama.id !== currentPanoramaId)
              ?.id ?? 0);

    const handlePanoramaChange = (panoramaId: number) => {
        setActivePanoramaId(panoramaId);
        const alternative = tour.panoramas.find(
            (panorama) => panorama.id !== panoramaId,
        );
        hotspotForm.setData((current) => ({
            ...current,
            source_panorama_id: panoramaId,
            target_panorama_id:
                current.target_panorama_id === panoramaId
                    ? (alternative?.id ?? 0)
                    : current.target_panorama_id,
        }));
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Vista 360', href: project360.index().url },
        { title: project.name, href: project360.show(project.id).url },
    ];

    const handleFiles = (files: File[]) => {
        uploadForm.setData((current) => ({
            ...current,
            panorama_files: files,
            panorama_titles: files.map(
                (file, index) =>
                    current.panorama_titles[index] ||
                    file.name.replace(/\.[^.]+$/, ''),
            ),
        }));
    };

    const submitPanoramas = (event: React.FormEvent) => {
        event.preventDefault();
        uploadForm.post(panoramaRoutes.store(project.id).url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => uploadForm.reset(),
        });
    };

    const savePanoramaTitle = (panoramaId: number) => {
        router.patch(
            panoramaRoutes.update({
                project: project.id,
                panorama: panoramaId,
            }).url,
            { title: panoramaTitles[panoramaId] },
            { preserveScroll: true },
        );
    };

    const setStartingPanorama = (panoramaId: number) => {
        router.put(
            startPanoramaRoutes.update(project.id).url,
            { panorama_id: panoramaId },
            { preserveScroll: true },
        );
    };

    const deletePanorama = async (panoramaId: number, title: string) => {
        if (
            await confirmDelete(
                `¿Eliminar el panorama "${title}"? También se eliminarán sus hotspots relacionados.`,
            )
        ) {
            router.delete(
                panoramaRoutes.destroy({
                    project: project.id,
                    panorama: panoramaId,
                }).url,
                { preserveScroll: true },
            );
        }
    };

    const createHotspot = (event: React.FormEvent) => {
        event.preventDefault();
        const angles = viewerRef.current?.getViewAngles() ?? {
            yaw: 0,
            pitch: 0,
        };
        hotspotForm.transform((data) => ({
            ...data,
            source_panorama_id: currentPanoramaId,
            target_panorama_id: currentTargetPanoramaId,
            yaw: angles.yaw,
            pitch: angles.pitch,
        }));
        hotspotForm.post(hotspotRoutes.store(project.id).url, {
            preserveScroll: true,
            onSuccess: () => hotspotForm.setData('label', ''),
        });
    };

    const updateHotspot = (hotspot: Project360Hotspot, reposition = false) => {
        const draft = hotspotDrafts[hotspot.id] ?? {
            label: hotspot.label,
            target_panorama_id: hotspot.target_panorama_id,
        };
        const angles = reposition
            ? (viewerRef.current?.getViewAngles() ?? hotspot)
            : hotspot;

        router.put(
            hotspotRoutes.update({
                project: project.id,
                hotspot: hotspot.id,
            }).url,
            {
                source_panorama_id: hotspot.source_panorama_id,
                target_panorama_id: draft.target_panorama_id,
                label: draft.label,
                yaw: angles.yaw,
                pitch: angles.pitch,
            },
            { preserveScroll: true },
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

    const createShareLink = (event: React.FormEvent) => {
        event.preventDefault();
        shareForm.post(shareLinkRoutes.store(project.id).url, {
            preserveScroll: true,
            onSuccess: () => shareForm.reset(),
        });
    };

    const copyShareLink = async (id: string, url: string) => {
        await navigator.clipboard.writeText(url);
        setCopiedLinkId(id);
        window.setTimeout(() => setCopiedLinkId(null), 1800);
    };

    const currentHotspots = tour.hotspots.filter(
        (hotspot) => hotspot.source_panorama_id === currentPanoramaId,
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Vista 360 de ${project.name} - Inmopro`} />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                {project.name}
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
                            Tour inmersivo, hotspots y enlaces públicos.
                        </p>
                    </div>
                </div>

                <Project360Viewer
                    ref={viewerRef}
                    panoramas={tour.panoramas}
                    hotspots={tour.hotspots}
                    startPanoramaId={tour.start_panorama_id}
                    onPanoramaChange={handlePanoramaChange}
                    className="h-[62vh] min-h-[28rem]"
                />

                {!canManage ? (
                    <div className="rounded-xl border bg-white p-4 text-sm text-slate-600">
                        Tienes permiso de visualización. La edición del tour
                        está reservada a usuarios con permiso de administración
                        360.
                    </div>
                ) : (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle>Panoramas</CardTitle>
                                <CardDescription>
                                    Imágenes 2:1 en JPG, PNG o WebP, hasta 20
                                    MB.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <form
                                    onSubmit={submitPanoramas}
                                    className="space-y-3 rounded-lg border border-dashed p-4"
                                >
                                    <Label htmlFor="panorama_files">
                                        Añadir panoramas
                                    </Label>
                                    <Input
                                        id="panorama_files"
                                        type="file"
                                        multiple
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={(event) =>
                                            handleFiles(
                                                Array.from(
                                                    event.target.files ?? [],
                                                ),
                                            )
                                        }
                                    />
                                    <InputError
                                        message={
                                            uploadForm.errors.panorama_files ||
                                            uploadForm.errors[
                                                'panorama_files.0'
                                            ]
                                        }
                                    />
                                    {uploadForm.data.panorama_files.map(
                                        (file, index) => (
                                            <div
                                                key={`${file.name}-${index}`}
                                                className="grid gap-2 sm:grid-cols-[1fr_1fr] sm:items-end"
                                            >
                                                <p className="truncate text-sm text-slate-500">
                                                    {file.name}
                                                </p>
                                                <div>
                                                    <Label
                                                        htmlFor={`panorama_title_${index}`}
                                                    >
                                                        Título
                                                    </Label>
                                                    <Input
                                                        id={`panorama_title_${index}`}
                                                        value={
                                                            uploadForm.data
                                                                .panorama_titles[
                                                                index
                                                            ] ?? ''
                                                        }
                                                        onChange={(event) => {
                                                            const titles = [
                                                                ...uploadForm
                                                                    .data
                                                                    .panorama_titles,
                                                            ];
                                                            titles[index] =
                                                                event.target.value;
                                                            uploadForm.setData(
                                                                'panorama_titles',
                                                                titles,
                                                            );
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ),
                                    )}
                                    <InputError
                                        message={
                                            uploadForm.errors.panorama_titles
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

                                <div className="space-y-3">
                                    {tour.panoramas.map((panorama) => (
                                        <div
                                            key={panorama.id}
                                            className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[1fr_auto] lg:items-center"
                                        >
                                            <div className="flex min-w-0 items-center gap-2">
                                                {panorama.is_starting ? (
                                                    <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" />
                                                ) : null}
                                                <Input
                                                    value={
                                                        panoramaTitles[
                                                            panorama.id
                                                        ] ?? panorama.title
                                                    }
                                                    onChange={(event) =>
                                                        setPanoramaTitles(
                                                            (current) => ({
                                                                ...current,
                                                                [panorama.id]:
                                                                    event.target
                                                                        .value,
                                                            }),
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        savePanoramaTitle(
                                                            panorama.id,
                                                        )
                                                    }
                                                >
                                                    <Save className="h-4 w-4" />
                                                    Guardar
                                                </Button>
                                                {!panorama.is_starting ? (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setStartingPanorama(
                                                                panorama.id,
                                                            )
                                                        }
                                                    >
                                                        <Star className="h-4 w-4" />
                                                        Marcar inicio
                                                    </Button>
                                                ) : null}
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() =>
                                                        void deletePanorama(
                                                            panorama.id,
                                                            panorama.title,
                                                        )
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Editor de hotspots</CardTitle>
                                <CardDescription>
                                    Orienta la cámara al punto deseado y crea
                                    una conexión desde el panorama actual.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {tour.panoramas.length < 2 ? (
                                    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                                        Añade al menos dos panoramas para crear
                                        hotspots de navegación.
                                    </p>
                                ) : (
                                    <form
                                        onSubmit={createHotspot}
                                        className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
                                    >
                                        <div>
                                            <Label htmlFor="hotspot_label">
                                                Etiqueta
                                            </Label>
                                            <Input
                                                id="hotspot_label"
                                                value={hotspotForm.data.label}
                                                onChange={(event) =>
                                                    hotspotForm.setData(
                                                        'label',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Ir a sala de ventas"
                                            />
                                            <InputError
                                                message={
                                                    hotspotForm.errors.label
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="hotspot_target">
                                                Panorama destino
                                            </Label>
                                            <select
                                                id="hotspot_target"
                                                value={currentTargetPanoramaId}
                                                onChange={(event) =>
                                                    hotspotForm.setData(
                                                        'target_panorama_id',
                                                        Number(
                                                            event.target.value,
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
                                                            key={panorama.id}
                                                            value={panorama.id}
                                                        >
                                                            {panorama.title}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={hotspotForm.processing}
                                        >
                                            <MapPinned className="h-4 w-4" />
                                            Añadir hotspot aquí
                                        </Button>
                                    </form>
                                )}

                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-800">
                                        Hotspots del panorama actual
                                    </h3>
                                    {currentHotspots.length === 0 ? (
                                        <p className="text-sm text-slate-500">
                                            No hay hotspots en esta escena.
                                        </p>
                                    ) : (
                                        currentHotspots.map((hotspot) => {
                                            const draft = hotspotDrafts[
                                                hotspot.id
                                            ] ?? {
                                                label: hotspot.label,
                                                target_panorama_id:
                                                    hotspot.target_panorama_id,
                                            };

                                            return (
                                                <div
                                                    key={hotspot.id}
                                                    className="grid gap-2 rounded-lg border p-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end"
                                                >
                                                    <div>
                                                        <Label>Etiqueta</Label>
                                                        <Input
                                                            value={draft.label}
                                                            onChange={(event) =>
                                                                setHotspotDrafts(
                                                                    (
                                                                        current,
                                                                    ) => ({
                                                                        ...current,
                                                                        [hotspot.id]:
                                                                            {
                                                                                ...draft,
                                                                                label: event
                                                                                    .target
                                                                                    .value,
                                                                            },
                                                                    }),
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>Destino</Label>
                                                        <select
                                                            value={
                                                                draft.target_panorama_id
                                                            }
                                                            onChange={(event) =>
                                                                setHotspotDrafts(
                                                                    (
                                                                        current,
                                                                    ) => ({
                                                                        ...current,
                                                                        [hotspot.id]:
                                                                            {
                                                                                ...draft,
                                                                                target_panorama_id:
                                                                                    Number(
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                    ),
                                                                            },
                                                                    }),
                                                                )
                                                            }
                                                            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                                                        >
                                                            {tour.panoramas
                                                                .filter(
                                                                    (
                                                                        panorama,
                                                                    ) =>
                                                                        panorama.id !==
                                                                        hotspot.source_panorama_id,
                                                                )
                                                                .map(
                                                                    (
                                                                        panorama,
                                                                    ) => (
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
                                                                    ),
                                                                )}
                                                        </select>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                updateHotspot(
                                                                    hotspot,
                                                                )
                                                            }
                                                        >
                                                            <Save className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                updateHotspot(
                                                                    hotspot,
                                                                    true,
                                                                )
                                                            }
                                                            title="Mover a la orientación actual"
                                                        >
                                                            <MapPinned className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() =>
                                                                void deleteHotspot(
                                                                    hotspot,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Enlaces públicos</CardTitle>
                                <CardDescription>
                                    Permanecen activos hasta que sean revocados.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <form
                                    onSubmit={createShareLink}
                                    className="flex flex-col gap-3 sm:flex-row"
                                >
                                    <div className="flex-1">
                                        <Label htmlFor="share_label">
                                            Etiqueta opcional
                                        </Label>
                                        <Input
                                            id="share_label"
                                            value={shareForm.data.label}
                                            onChange={(event) =>
                                                shareForm.setData(
                                                    'label',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Cliente o campaña"
                                        />
                                        <InputError
                                            message={shareForm.errors.label}
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

                                <div className="space-y-3">
                                    {(tour.share_links ?? []).map((link) => (
                                        <div
                                            key={link.id}
                                            className="flex flex-col gap-3 rounded-lg border p-3 lg:flex-row lg:items-center lg:justify-between"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                                                    <p className="truncate font-medium text-slate-800">
                                                        {link.label ||
                                                            'Enlace sin etiqueta'}
                                                    </p>
                                                    <Badge
                                                        variant={
                                                            link.revoked_at
                                                                ? 'secondary'
                                                                : 'default'
                                                        }
                                                    >
                                                        {link.revoked_at
                                                            ? 'Revocado'
                                                            : 'Activo'}
                                                    </Badge>
                                                </div>
                                                <p className="mt-1 truncate text-xs text-slate-500">
                                                    Creado por{' '}
                                                    {link.created_by ||
                                                        'usuario eliminado'}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Último acceso:{' '}
                                                    {link.last_accessed_at
                                                        ? project360DateFormatter.format(
                                                              new Date(
                                                                  link.last_accessed_at,
                                                              ),
                                                          )
                                                        : 'Aún no visitado'}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {!link.revoked_at ? (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                void copyShareLink(
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
                                                            {copiedLinkId ===
                                                            link.id
                                                                ? 'Copiado'
                                                                : 'Copiar'}
                                                        </Button>
                                                        <Button
                                                            asChild
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            <a
                                                                href={link.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                                Abrir
                                                            </a>
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
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
                                                            Revocar
                                                        </Button>
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
