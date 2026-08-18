import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import {
    ProjectAdministrativeLocationFields,
    ProjectGoogleMapsCoordinatesField,
    ProjectWebPublicationFields,
    type CityOption,
} from '@/pages/inmopro/projects/project-form-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type ProjectAsset = {
    id: number;
    kind: 'image' | 'document' | 'video';
    title?: string | null;
    file_name: string;
    download_url: string;
    preview_url?: string | null;
};
type Project = {
    id: number;
    name: string;
    project_type_id?: number | null;
    city_id?: number | null;
    province?: string | null;
    district?: string | null;
    project_zone?: string | null;
    registry_status?: string | null;
    location?: string;
    total_lots?: number;
    blocks?: string[];
    is_active: boolean;
    image_portada?: string | null;
    is_web?: boolean;
    tipo_web?: string | null;
    descripcion?: string | null;
    precio_web?: number | string | null;
    assets?: ProjectAsset[];
};
type ProjectEditForm = {
    name: string;
    project_type_id: number | '';
    city_id: number | '';
    province: string;
    district: string;
    project_zone: string;
    registry_status: string;
    location: string;
    total_lots: number | '';
    blocks: string[];
    is_active: boolean;
    is_web: boolean;
    tipo_web: string;
    descripcion: string;
    precio_web: number | '';
    portada_file: File | null;
    remove_portada: boolean;
    image_files: File[];
    video_files: File[];
    document_files: File[];
    document_titles: string[];
    _method?: 'put';
};

export default function ProjectsEdit({
    project,
    projectTypes,
    cities,
}: {
    project: Project;
    projectTypes: Array<{ id: number; name: string; code: string }>;
    cities: CityOption[];
}) {
    const blocks = project.blocks ?? [];
    const [blockInput, setBlockInput] = useState('');
    const [blocksList, setBlocksList] = useState<string[]>(blocks);
    const { data, setData, post, processing, errors, transform } =
        useForm<ProjectEditForm>({
            name: project.name,
            project_type_id: project.project_type_id ?? '',
            city_id: project.city_id ?? '',
            province: project.province ?? '',
            district: project.district ?? '',
            project_zone: project.project_zone ?? '',
            registry_status: project.registry_status ?? '',
            location: project.location ?? '',
            total_lots: project.total_lots ?? ('' as number | ''),
            blocks: blocksList,
            is_active: project.is_active ?? true,
            is_web: project.is_web ?? false,
            tipo_web: project.tipo_web ?? '',
            descripcion: project.descripcion ?? '',
            precio_web:
                project.precio_web != null && project.precio_web !== ''
                    ? Number(project.precio_web)
                    : ('' as number | ''),
            portada_file: null,
            remove_portada: false,
            image_files: [],
            video_files: [],
            document_files: [],
            document_titles: [],
        });

    const existingImages = useMemo(
        () => (project.assets ?? []).filter((asset) => asset.kind === 'image'),
        [project.assets],
    );
    const existingDocuments = useMemo(
        () =>
            (project.assets ?? []).filter((asset) => asset.kind === 'document'),
        [project.assets],
    );
    const existingVideos = useMemo(
        () => (project.assets ?? []).filter((asset) => asset.kind === 'video'),
        [project.assets],
    );

    const pendingImagePreviews = useMemo(
        () =>
            data.image_files.map((file) => ({
                name: file.name,
                url: URL.createObjectURL(file),
            })),
        [data.image_files],
    );

    useEffect(() => {
        return () => {
            pendingImagePreviews.forEach((preview) =>
                URL.revokeObjectURL(preview.url),
            );
        };
    }, [pendingImagePreviews]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Proyectos', href: '/inmopro/projects' },
        { title: 'Editar', href: `/inmopro/projects/${project.id}/edit` },
    ];

    const addBlock = () => {
        const v = blockInput.trim().toUpperCase();
        if (v && !blocksList.includes(v)) {
            const next = [...blocksList, v];
            setBlocksList(next);
            setData('blocks', next);
            setBlockInput('');
        }
    };

    const removeBlock = (letter: string) => {
        const next = blocksList.filter((b) => b !== letter);
        setBlocksList(next);
        setData('blocks', next);
    };

    const handleDocumentFilesChange = (files: File[]) => {
        setData((current) => ({
            ...current,
            document_files: files,
            document_titles: files.map((file, index) => {
                const existing = current.document_titles[index]?.trim();
                if (existing) {
                    return existing;
                }

                return file.name.replace(/\.[^.]+$/, '');
            }),
        }));
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((formData) => ({
            ...formData,
            project_type_id:
                formData.project_type_id === ''
                    ? null
                    : Number(formData.project_type_id),
            city_id: formData.city_id === '' ? null : Number(formData.city_id),
            total_lots:
                formData.total_lots === '' ? null : Number(formData.total_lots),
            is_web: formData.is_web ? 1 : 0,
            tipo_web: formData.is_web ? formData.tipo_web : null,
            precio_web:
                formData.precio_web === '' ? null : Number(formData.precio_web),
            remove_portada: formData.remove_portada ? 1 : 0,
            _method: 'put',
        }));
        post('/inmopro/projects/' + project.id, { forceFormData: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${project.name} - Inmopro`} />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">
                    Editar Proyecto
                </h2>
                <form onSubmit={submit} className="max-w-2xl space-y-4">
                    <div>
                        <Label htmlFor="name">Nombre</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={errors.name} />
                    </div>
                    <div>
                        <Label htmlFor="project_type_id">
                            Tipo de proyecto
                        </Label>
                        <select
                            id="project_type_id"
                            value={data.project_type_id}
                            onChange={(e) =>
                                setData(
                                    'project_type_id',
                                    e.target.value === ''
                                        ? ''
                                        : Number(e.target.value),
                                )
                            }
                            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                        >
                            <option value="">Sin tipo</option>
                            {projectTypes.map((type) => (
                                <option key={type.id} value={type.id}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.project_type_id} />
                    </div>
                    <ProjectAdministrativeLocationFields
                        cities={cities}
                        cityId={data.city_id}
                        province={data.province}
                        district={data.district}
                        projectZone={data.project_zone}
                        registryStatus={data.registry_status}
                        errors={errors}
                        onCityIdChange={(value) => setData('city_id', value)}
                        onProvinceChange={(value) => setData('province', value)}
                        onDistrictChange={(value) => setData('district', value)}
                        onProjectZoneChange={(value) =>
                            setData('project_zone', value)
                        }
                        onRegistryStatusChange={(value) =>
                            setData('registry_status', value)
                        }
                    />
                    <ProjectGoogleMapsCoordinatesField
                        location={data.location}
                        errors={errors}
                        onLocationChange={(value) => setData('location', value)}
                    />
                    <div className="flex items-center gap-2">
                        <input
                            id="is_active"
                            type="checkbox"
                            checked={data.is_active}
                            onChange={(e) =>
                                setData('is_active', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        <Label htmlFor="is_active" className="cursor-pointer">
                            Proyecto activo (visible en dashboard y apps)
                        </Label>
                    </div>
                    <InputError message={errors.is_active} />
                    <ProjectWebPublicationFields
                        isWeb={data.is_web}
                        tipoWeb={data.tipo_web}
                        descripcion={data.descripcion}
                        precioWeb={data.precio_web}
                        imagePortada={project.image_portada ?? null}
                        portadaFile={data.portada_file}
                        removePortada={data.remove_portada}
                        errors={errors}
                        onIsWebChange={(value) => {
                            setData((current) => ({
                                ...current,
                                is_web: value,
                                tipo_web: value ? current.tipo_web : '',
                            }));
                        }}
                        onTipoWebChange={(value) => setData('tipo_web', value)}
                        onDescripcionChange={(value) =>
                            setData('descripcion', value)
                        }
                        onPrecioWebChange={(value) =>
                            setData(
                                'precio_web',
                                value === '' ? '' : Number(value),
                            )
                        }
                        onPortadaFileChange={(file) =>
                            setData('portada_file', file)
                        }
                        onRemovePortadaChange={(value) =>
                            setData('remove_portada', value)
                        }
                    />
                    <div>
                        <Label htmlFor="total_lots">
                            Total de lotes (opcional)
                        </Label>
                        <Input
                            id="total_lots"
                            type="number"
                            min={0}
                            value={data.total_lots}
                            onChange={(e) =>
                                setData(
                                    'total_lots',
                                    e.target.value === ''
                                        ? ''
                                        : Number(e.target.value),
                                )
                            }
                            className="mt-1"
                        />
                        <InputError message={errors.total_lots} />
                    </div>
                    <div>
                        <Label>Manzanas / Bloques</Label>
                        <div className="mt-1 flex gap-2">
                            <Input
                                value={blockInput}
                                onChange={(e) => setBlockInput(e.target.value)}
                                placeholder="Ej. A"
                                onKeyDown={(e) =>
                                    e.key === 'Enter' &&
                                    (e.preventDefault(), addBlock())
                                }
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addBlock}
                            >
                                Añadir
                            </Button>
                        </div>
                        {blocksList.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {blocksList.map((b) => (
                                    <span
                                        key={b}
                                        className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-sm font-medium"
                                    >
                                        {b}
                                        <button
                                            type="button"
                                            onClick={() => removeBlock(b)}
                                            className="text-slate-500 hover:text-slate-700"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="image_files">Añadir imágenes</Label>
                        <Input
                            id="image_files"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) =>
                                setData(
                                    'image_files',
                                    Array.from(e.target.files ?? []),
                                )
                            }
                            className="mt-1"
                        />
                        <InputError
                            message={
                                errors.image_files || errors['image_files.0']
                            }
                        />
                        {pendingImagePreviews.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {pendingImagePreviews.map((preview) => (
                                    <div
                                        key={preview.url}
                                        className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                                    >
                                        <img
                                            src={preview.url}
                                            alt={preview.name}
                                            className="aspect-video w-full object-cover"
                                        />
                                        <p className="truncate px-2 py-1 text-xs text-slate-600">
                                            {preview.name}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="video_files">Añadir vídeos</Label>
                        <Input
                            id="video_files"
                            type="file"
                            multiple
                            accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
                            onChange={(e) =>
                                setData(
                                    'video_files',
                                    Array.from(e.target.files ?? []),
                                )
                            }
                            className="mt-1"
                        />
                        <InputError
                            message={
                                errors.video_files || errors['video_files.0']
                            }
                        />
                        {data.video_files.length > 0 && (
                            <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
                                {data.video_files.map((file) => (
                                    <li key={file.name}>{file.name}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="document_files">
                            Añadir documentos
                        </Label>
                        <Input
                            id="document_files"
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                            onChange={(e) =>
                                handleDocumentFilesChange(
                                    Array.from(e.target.files ?? []),
                                )
                            }
                            className="mt-1"
                        />
                        <InputError
                            message={
                                errors.document_files ||
                                errors['document_files.0']
                            }
                        />
                        {data.document_files.length > 0 && (
                            <div className="mt-3 space-y-3">
                                {data.document_files.map((file, index) => (
                                    <div
                                        key={`${file.name}-${index}`}
                                        className="rounded-lg border border-slate-200 p-3"
                                    >
                                        <p className="mb-2 truncate text-xs text-slate-500">
                                            {file.name}
                                        </p>
                                        <Label
                                            htmlFor={`document_title_${index}`}
                                        >
                                            Nombre del documento
                                        </Label>
                                        <Input
                                            id={`document_title_${index}`}
                                            value={
                                                data.document_titles[index] ??
                                                ''
                                            }
                                            onChange={(e) => {
                                                const titles = [
                                                    ...data.document_titles,
                                                ];
                                                titles[index] = e.target.value;
                                                setData(
                                                    'document_titles',
                                                    titles,
                                                );
                                            }}
                                            className="mt-1"
                                            required
                                        />
                                        <InputError
                                            message={
                                                errors[
                                                    `document_titles.${index}`
                                                ] || errors.document_titles
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {existingImages.length > 0 && (
                        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                            <h3 className="text-sm font-bold tracking-wide text-slate-500 uppercase">
                                Imágenes actuales
                            </h3>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {existingImages.map((asset) => (
                                    <div
                                        key={asset.id}
                                        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                                    >
                                        {asset.preview_url ? (
                                            <a
                                                href={asset.preview_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block"
                                            >
                                                <img
                                                    src={asset.preview_url}
                                                    alt={
                                                        asset.title ||
                                                        asset.file_name
                                                    }
                                                    className="aspect-video w-full object-cover"
                                                />
                                            </a>
                                        ) : (
                                            <div className="flex aspect-video items-center justify-center bg-slate-100 text-xs text-slate-500">
                                                Sin vista previa
                                            </div>
                                        )}
                                        <div className="space-y-2 p-2">
                                            <p className="truncate text-xs font-medium text-slate-800">
                                                {asset.title || asset.file_name}
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() =>
                                                        window.open(
                                                            asset.download_url,
                                                            '_blank',
                                                        )
                                                    }
                                                >
                                                    Descargar
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                        router.delete(
                                                            `/inmopro/projects/${project.id}/assets/${asset.id}`,
                                                        )
                                                    }
                                                >
                                                    Eliminar
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {existingVideos.length > 0 && (
                        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                            <h3 className="text-sm font-bold tracking-wide text-slate-500 uppercase">
                                Vídeos actuales
                            </h3>
                            <div className="space-y-2">
                                {existingVideos.map((asset) => (
                                    <div
                                        key={asset.id}
                                        className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                                    >
                                        <div>
                                            <p className="font-medium text-slate-800">
                                                {asset.title || asset.file_name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Vídeo
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            {asset.preview_url && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        window.open(
                                                            asset.preview_url!,
                                                            '_blank',
                                                        )
                                                    }
                                                >
                                                    Ver
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    window.open(
                                                        asset.download_url,
                                                        '_blank',
                                                    )
                                                }
                                            >
                                                Descargar
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={() =>
                                                    router.delete(
                                                        `/inmopro/projects/${project.id}/assets/${asset.id}`,
                                                    )
                                                }
                                            >
                                                Eliminar
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {existingDocuments.length > 0 && (
                        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                            <h3 className="text-sm font-bold tracking-wide text-slate-500 uppercase">
                                Documentos actuales
                            </h3>
                            <div className="space-y-2">
                                {existingDocuments.map((asset) => (
                                    <div
                                        key={asset.id}
                                        className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                                    >
                                        <div>
                                            <p className="font-medium text-slate-800">
                                                {asset.title || asset.file_name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Documento
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    window.open(
                                                        asset.download_url,
                                                        '_blank',
                                                    )
                                                }
                                            >
                                                Descargar
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={() =>
                                                    router.delete(
                                                        `/inmopro/projects/${project.id}/assets/${asset.id}`,
                                                    )
                                                }
                                            >
                                                Eliminar
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button type="submit" disabled={processing}>
                        Actualizar
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
