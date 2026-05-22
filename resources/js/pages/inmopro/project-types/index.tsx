import { Head, router, useForm } from '@inertiajs/react';
import { Edit, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { InmoproMetricCard } from '@/components/inmopro/metric-card';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { confirmDelete } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

type ProjectTypeRow = {
    id: number;
    name: string;
    code: string;
    description?: string | null;
    color?: string | null;
    sort_order?: number;
    is_active: boolean;
    projects_count?: number;
};

type PageProps = {
    projectTypes: { data: ProjectTypeRow[]; links: PaginationLink[] };
    filters: { search?: string };
    abilities: {
        create: boolean;
        update: boolean;
        delete: boolean;
    };
};

type ProjectTypeForm = {
    name: string;
    code: string;
    description: string;
    color: string;
    sort_order: number | '';
    is_active: boolean;
};

const emptyForm: ProjectTypeForm = {
    name: '',
    code: '',
    description: '',
    color: '',
    sort_order: 0,
    is_active: true,
};

const DEFAULT_PROJECT_TYPE_COLOR = '#16a34a';

function normalizeColorPickerValue(value: string): string {
    return /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_PROJECT_TYPE_COLOR;
}

export default function ProjectTypesIndex({ projectTypes, filters, abilities }: PageProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<ProjectTypeRow | null>(null);

    const createForm = useForm<ProjectTypeForm>(emptyForm);
    const editForm = useForm<ProjectTypeForm>(emptyForm);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Tipos de proyecto', href: '/inmopro/project-types' },
    ];

    const rows = projectTypes.data;
    const activeCount = useMemo(() => rows.filter((row) => row.is_active).length, [rows]);

    const applyFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/inmopro/project-types',
            { search: search.trim() || undefined },
            { preserveState: true, replace: true },
        );
    };

    const openEdit = (row: ProjectTypeRow) => {
        setEditing(row);
        editForm.setData({
            name: row.name,
            code: row.code,
            description: row.description ?? '',
            color: row.color ?? '',
            sort_order: row.sort_order ?? 0,
            is_active: row.is_active,
        });
        editForm.clearErrors();
    };

    const normalizePayload = (data: ProjectTypeForm) => ({
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description.trim() === '' ? null : data.description.trim(),
        color: data.color.trim() === '' ? null : data.color.trim(),
        sort_order: data.sort_order === '' ? 0 : Number(data.sort_order),
        is_active: Boolean(data.is_active),
    });

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.transform((data) => normalizePayload(data));
        createForm.post('/inmopro/project-types', {
            preserveScroll: true,
            onSuccess: () => {
                setCreateOpen(false);
                createForm.reset();
                createForm.clearErrors();
            },
            onError: () => {
                setCreateOpen(true);
            },
        });
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) {
            return;
        }

        editForm.transform((data) => normalizePayload(data));
        editForm.put(`/inmopro/project-types/${editing.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditing(null);
                editForm.reset();
                editForm.clearErrors();
            },
            onError: () => {
                if (editing) {
                    setEditing(editing);
                }
            },
        });
    };

    const removeRow = async (row: ProjectTypeRow) => {
        if (await confirmDelete(`Eliminar tipo de proyecto "${row.name}"?`)) {
            router.delete(`/inmopro/project-types/${row.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tipos de proyecto - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tipos de proyecto</h1>
                        <p className="mt-1 text-sm text-slate-500">Catalogo para clasificar y filtrar proyectos comerciales.</p>
                    </div>
                    {abilities.create ? (
                        <Button type="button" onClick={() => setCreateOpen(true)}>
                            <Plus className="h-4 w-4" />
                            Nuevo tipo
                        </Button>
                    ) : (
                        <p className="text-sm text-slate-500">No tienes permiso para crear tipos de proyecto.</p>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard label="Registros visibles" value={String(rows.length)} />
                    <MetricCard label="Tipos activos" value={String(activeCount)} tone="emerald" />
                    <MetricCard label="Total proyectos asociados" value={String(rows.reduce((sum, row) => sum + (row.projects_count ?? 0), 0))} tone="blue" />
                </div>

                <form onSubmit={applyFilter} className="flex gap-2 rounded-2xl border border-border bg-card text-card-foreground p-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre o codigo"
                            className="pl-9"
                        />
                    </div>
                    <Button type="submit" variant="secondary">
                        Buscar
                    </Button>
                </form>

                <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
                    <table className="w-full text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50/80">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Tipo</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Codigo</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Orden</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Proyectos</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50/70">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="inline-block h-3.5 w-3.5 rounded-full border border-slate-200"
                                                style={{ backgroundColor: row.color ?? '#64748b' }}
                                            />
                                            <div>
                                                <p className="font-semibold text-slate-900">{row.name}</p>
                                                <p className="text-xs text-slate-500">{row.description?.trim() || 'Sin descripcion'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.code}</td>
                                    <td className="px-4 py-3 text-slate-700">{row.sort_order ?? 0}</td>
                                    <td className="px-4 py-3 text-slate-700">{row.projects_count ?? 0}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                row.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {row.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-1">
                                            {abilities.update ? (
                                                <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)} title="Editar tipo">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            ) : null}
                                            {abilities.delete ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                    onClick={() => removeRow(row)}
                                                    title="Eliminar tipo"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {rows.length === 0 ? (
                        <div className="px-4 py-12 text-center text-sm text-slate-500">No hay tipos de proyecto registrados.</div>
                    ) : (
                        <div className="border-t border-slate-100 px-4 py-3">
                            <Pagination links={projectTypes.links} />
                        </div>
                    )}
                </div>
            </div>

            {abilities.create ? (
                <ProjectTypeModal
                    key="create-project-type-modal"
                    open={createOpen}
                    onOpenChange={(open) => {
                        setCreateOpen(open);
                        if (!open) {
                            createForm.reset();
                            createForm.clearErrors();
                        }
                    }}
                    title="Nuevo tipo de proyecto"
                    description="Cree un nuevo tipo para clasificar proyectos."
                    form={createForm}
                    onSubmit={submitCreate}
                    submitLabel="Crear"
                    idPrefix="create"
                />
            ) : null}

            {abilities.update ? (
                <ProjectTypeModal
                    key={editing ? `edit-project-type-modal-${editing.id}` : 'edit-project-type-modal'}
                    open={!!editing}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditing(null);
                            editForm.reset();
                            editForm.clearErrors();
                        }
                    }}
                    title={editing ? `Editar tipo: ${editing.name}` : 'Editar tipo'}
                    description="Actualice el catalogo de tipos de proyecto."
                    form={editForm}
                    onSubmit={submitEdit}
                    submitLabel="Guardar cambios"
                    idPrefix="edit"
                />
            ) : null}
        </AppLayout>
    );
}

function ProjectTypeModal({
    open,
    onOpenChange,
    title,
    description,
    form,
    onSubmit,
    submitLabel,
    idPrefix,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    form: ReturnType<typeof useForm<ProjectTypeForm>>;
    onSubmit: (e: React.FormEvent) => void;
    submitLabel: string;
    idPrefix: string;
}) {
    const formRef = useRef<HTMLFormElement | null>(null);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-3">
                    <div>
                        <Label htmlFor={`project-type-name-${idPrefix}`}>Nombre</Label>
                        <Input
                            id={`project-type-name-${idPrefix}`}
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            className="mt-1"
                            required
                        />
                        <InputError message={form.errors.name} />
                    </div>
                    <div>
                        <Label htmlFor={`project-type-code-${idPrefix}`}>Codigo</Label>
                        <Input
                            id={`project-type-code-${idPrefix}`}
                            value={form.data.code}
                            onChange={(e) => form.setData('code', e.target.value.toUpperCase())}
                            className="mt-1"
                            required
                        />
                        <InputError message={form.errors.code} />
                    </div>
                    <div>
                        <Label htmlFor={`project-type-description-${idPrefix}`}>Descripcion</Label>
                        <Input
                            id={`project-type-description-${idPrefix}`}
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={form.errors.description} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor={`project-type-color-${idPrefix}`}>Color</Label>
                            <div className="mt-1 flex items-center gap-3">
                                <input
                                    id={`project-type-color-${idPrefix}`}
                                    type="color"
                                    value={normalizeColorPickerValue(form.data.color)}
                                    onChange={(e) => form.setData('color', e.target.value)}
                                    className="h-10 w-14 cursor-pointer rounded-md border border-slate-200 bg-white p-1"
                                />
                                <Input
                                    value={form.data.color}
                                    onChange={(e) => form.setData('color', e.target.value)}
                                    placeholder="#16a34a"
                                    className="flex-1"
                                />
                            </div>
                            <InputError message={form.errors.color} />
                        </div>
                        <div>
                            <Label htmlFor={`project-type-sort-${idPrefix}`}>Orden</Label>
                            <Input
                                id={`project-type-sort-${idPrefix}`}
                                type="number"
                                min={0}
                                value={form.data.sort_order}
                                onChange={(e) => form.setData('sort_order', e.target.value === '' ? '' : Number(e.target.value))}
                                className="mt-1"
                            />
                            <InputError message={form.errors.sort_order} />
                        </div>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                            type="checkbox"
                            checked={form.data.is_active}
                            onChange={(e) => form.setData('is_active', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        Activo
                    </label>
                    <InputError message={form.errors.is_active} />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            disabled={form.processing}
                            onClick={() => {
                                formRef.current?.requestSubmit();
                            }}
                        >
                            {submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function MetricCard({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'emerald' | 'blue' }) {
    return <InmoproMetricCard label={label} value={value} tone={tone} size="md" />;
}
