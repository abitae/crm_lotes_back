import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type ProjectCreateForm = {
    name: string;
    project_type_id: number | '';
    location: string;
    total_lots: string | number;
    blocks: string[];
    is_active: boolean;
    image_files: File[];
    document_files: File[];
    document_titles: string[];
};

export default function ProjectsCreate({ projectTypes }: { projectTypes: Array<{ id: number; name: string; code: string }> }) {
    const [blockInput, setBlockInput] = useState('');
    const [blocks, setBlocks] = useState<string[]>([]);
    const { data, setData, post, processing, errors, transform } = useForm<ProjectCreateForm>({
            name: '',
            project_type_id: '',
            location: '',
            total_lots: '' as string | number,
            blocks: [] as string[],
            is_active: true,
            image_files: [],
            document_files: [],
            document_titles: [],
        });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Proyectos', href: '/inmopro/projects' },
        { title: 'Nuevo', href: '/inmopro/projects/create' },
    ];

    const addBlock = () => {
        const v = blockInput.trim().toUpperCase();
        if (v && !blocks.includes(v)) {
            const next = [...blocks, v];
            setBlocks(next);
            setData('blocks', next);
            setBlockInput('');
        }
    };

    const removeBlock = (letter: string) => {
        const next = blocks.filter((b) => b !== letter);
        setBlocks(next);
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
            project_type_id: formData.project_type_id === '' ? null : Number(formData.project_type_id),
            total_lots: formData.total_lots === '' ? null : Number(formData.total_lots),
        }));
        post('/inmopro/projects', { forceFormData: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo Proyecto - Inmopro" />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">Nuevo Proyecto</h2>
                <form onSubmit={submit} className="max-w-md space-y-4">
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
                        <Input
                            id="location"
                            value={data.location}
                            onChange={(e) => setData('location', e.target.value)}
                            className="mt-1"
                        />
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
                            onChange={(e) => setData('total_lots', e.target.value === '' ? '' : e.target.value)}
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
                        {blocks.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {blocks.map((b) => (
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
                        <Label htmlFor="image_files">Imágenes del proyecto</Label>
                        <Input
                            id="image_files"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => setData('image_files', Array.from(e.target.files ?? []))}
                            className="mt-1"
                        />
                        <InputError message={errors.image_files || errors['image_files.0']} />
                    </div>
                    <div>
                        <Label htmlFor="document_files">Documentos del proyecto</Label>
                        <Input
                            id="document_files"
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                            onChange={(e) => handleDocumentFilesChange(Array.from(e.target.files ?? []))}
                            className="mt-1"
                        />
                        <InputError message={errors.document_files || errors['document_files.0']} />
                        {data.document_files.length > 0 && (
                            <div className="mt-3 space-y-3">
                                {data.document_files.map((file, index) => (
                                    <div key={`${file.name}-${index}`} className="rounded-lg border border-slate-200 p-3">
                                        <p className="mb-2 truncate text-xs text-slate-500">{file.name}</p>
                                        <Label htmlFor={`document_title_${index}`}>Nombre del documento</Label>
                                        <Input
                                            id={`document_title_${index}`}
                                            value={data.document_titles[index] ?? ''}
                                            onChange={(e) => {
                                                const titles = [...data.document_titles];
                                                titles[index] = e.target.value;
                                                setData('document_titles', titles);
                                            }}
                                            className="mt-1"
                                            required
                                        />
                                        <InputError message={errors[`document_titles.${index}`] || errors.document_titles} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <Button type="submit" disabled={processing}>
                        Guardar
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
