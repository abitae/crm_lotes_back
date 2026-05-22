import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type ProjectAsset = {
    id: number;
    kind: 'image' | 'document';
    title?: string | null;
    file_name: string;
    download_url: string;
    preview_url?: string | null;
};
type Project = {
    id: number;
    name: string;
    project_type_id?: number | null;
    location?: string;
    total_lots?: number;
    blocks?: string[];
    is_active: boolean;
    assets?: ProjectAsset[];
};
type ProjectEditForm = {
    name: string;
    project_type_id: number | '';
    location: string;
    total_lots: number | '';
    blocks: string[];
    is_active: boolean;
    image_files: File[];
    document_files: File[];
    _method?: 'put';
};

export default function ProjectsEdit({
    project,
    projectTypes,
}: {
    project: Project;
    projectTypes: Array<{ id: number; name: string; code: string }>;
}) {
    const blocks = project.blocks ?? [];
    const [blockInput, setBlockInput] = useState('');
    const [blocksList, setBlocksList] = useState<string[]>(blocks);
    const { data, setData, post, processing, errors, transform } = useForm<ProjectEditForm>({
        name: project.name,
        project_type_id: project.project_type_id ?? '',
        location: project.location ?? '',
        total_lots: project.total_lots ?? ('' as number | ''),
        blocks: blocksList,
        is_active: project.is_active ?? true,
        image_files: [],
        document_files: [],
    });

    const existingImages = useMemo(
        () => (project.assets ?? []).filter((asset) => asset.kind === 'image'),
        [project.assets],
    );
    const existingDocuments = useMemo(
        () => (project.assets ?? []).filter((asset) => asset.kind === 'document'),
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
            pendingImagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
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

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((formData) => ({
            ...formData,
            project_type_id: formData.project_type_id === '' ? null : Number(formData.project_type_id),
            total_lots: formData.total_lots === '' ? null : Number(formData.total_lots),
            _method: 'put',
        }));
        post('/inmopro/projects/' + project.id, { forceFormData: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${project.name} - Inmopro`} />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">Editar Proyecto</h2>
                <form onSubmit={submit} className="max-w-2xl space-y-4">
                    <div>
                        <Label htmlFor="name">Nombre</Label>
                        <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} className="mt-1" />
                        <InputError message={errors.name} />
                    </div>
                    <div>
                        <Label htmlFor="project_type_id">Tipo de proyecto</Label>
                        <select
                            id="project_type_id"
                            value={data.project_type_id}
                            onChange={(e) => setData('project_type_id', e.target.value === '' ? '' : Number(e.target.value))}
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
                    <div>
                        <Label htmlFor="location">Ubicación</Label>
                        <Input id="location" value={data.location} onChange={(e) => setData('location', e.target.value)} className="mt-1" />
                        <InputError message={errors.location} />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            id="is_active"
                            type="checkbox"
                            checked={data.is_active}
                            onChange={(e) => setData('is_active', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        <Label htmlFor="is_active" className="cursor-pointer">
                            Proyecto activo (visible en dashboard y apps)
                        </Label>
                    </div>
                    <InputError message={errors.is_active} />
                    <div>
                        <Label htmlFor="total_lots">Total de lotes (opcional)</Label>
                        <Input
                            id="total_lots"
                            type="number"
                            min={0}
                            value={data.total_lots}
                            onChange={(e) => setData('total_lots', e.target.value === '' ? '' : Number(e.target.value))}
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
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBlock())}
                            />
                            <Button type="button" variant="outline" onClick={addBlock}>
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
                                        <button type="button" onClick={() => removeBlock(b)} className="text-slate-500 hover:text-slate-700">
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
                            onChange={(e) => setData('image_files', Array.from(e.target.files ?? []))}
                            className="mt-1"
                        />
                        <InputError message={errors.image_files || errors['image_files.0']} />
                        {pendingImagePreviews.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {pendingImagePreviews.map((preview) => (
                                    <div key={preview.url} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                        <img src={preview.url} alt={preview.name} className="aspect-video w-full object-cover" />
                                        <p className="truncate px-2 py-1 text-xs text-slate-600">{preview.name}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="document_files">Añadir documentos</Label>
                        <Input
                            id="document_files"
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                            onChange={(e) => setData('document_files', Array.from(e.target.files ?? []))}
                            className="mt-1"
                        />
                        <InputError message={errors.document_files || errors['document_files.0']} />
                    </div>

                    {existingImages.length > 0 && (
                        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Imágenes actuales</h3>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {existingImages.map((asset) => (
                                    <div key={asset.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                        {asset.preview_url ? (
                                            <a href={asset.preview_url} target="_blank" rel="noreferrer" className="block">
                                                <img
                                                    src={asset.preview_url}
                                                    alt={asset.title || asset.file_name}
                                                    className="aspect-video w-full object-cover"
                                                />
                                            </a>
                                        ) : (
                                            <div className="flex aspect-video items-center justify-center bg-slate-100 text-xs text-slate-500">
                                                Sin vista previa
                                            </div>
                                        )}
                                        <div className="space-y-2 p-2">
                                            <p className="truncate text-xs font-medium text-slate-800">{asset.title || asset.file_name}</p>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => window.open(asset.download_url, '_blank')}
                                                >
                                                    Descargar
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => router.delete(`/inmopro/projects/${project.id}/assets/${asset.id}`)}
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

                    {existingDocuments.length > 0 && (
                        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Documentos actuales</h3>
                            <div className="space-y-2">
                                {existingDocuments.map((asset) => (
                                    <div key={asset.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                                        <div>
                                            <p className="font-medium text-slate-800">{asset.title || asset.file_name}</p>
                                            <p className="text-xs text-slate-500">Documento</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button type="button" variant="outline" onClick={() => window.open(asset.download_url, '_blank')}>
                                                Descargar
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={() => router.delete(`/inmopro/projects/${project.id}/assets/${asset.id}`)}
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
