import { Head, router, useForm } from '@inertiajs/react';
import { Edit, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
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

type TicketType = {
    id: number;
    name: string;
    code: string;
    description?: string | null;
    color?: string | null;
    allows_overlap: boolean;
    is_active: boolean;
    sort_order?: number;
    tickets_count?: number;
};

type TicketTypeForm = {
    name: string;
    code: string;
    description: string;
    color: string;
    allows_overlap: boolean;
    is_active: boolean;
    sort_order: number | '';
};

type PageProps = {
    types: { data: TicketType[]; links: PaginationLink[] };
    filters: { search?: string };
    abilities: { create: boolean; update: boolean; delete: boolean };
};

const emptyForm: TicketTypeForm = {
    name: '',
    code: '',
    description: '',
    color: '#64748b',
    allows_overlap: true,
    is_active: true,
    sort_order: 0,
};

function normalizeColor(value: string): string {
    return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#64748b';
}

function normalizePayload(data: TicketTypeForm) {
    return {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description.trim() === '' ? null : data.description.trim(),
        color: data.color.trim() === '' ? null : data.color.trim(),
        allows_overlap: Boolean(data.allows_overlap),
        is_active: Boolean(data.is_active),
        sort_order: data.sort_order === '' ? 0 : Number(data.sort_order),
    };
}

export default function AttentionTicketTypesIndex({ types, filters, abilities }: PageProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<TicketType | null>(null);
    const createForm = useForm<TicketTypeForm>(emptyForm);
    const editForm = useForm<TicketTypeForm>(emptyForm);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Tipos de ticket', href: '/inmopro/attention-ticket-types' },
    ];

    const applyFilter = (event: React.FormEvent) => {
        event.preventDefault();
        router.get('/inmopro/attention-ticket-types', { search: search.trim() || undefined }, { preserveState: true, replace: true });
    };

    const submitCreate = (event: React.FormEvent) => {
        event.preventDefault();
        createForm.transform((data) => normalizePayload(data));
        createForm.post('/inmopro/attention-ticket-types', {
            preserveScroll: true,
            onSuccess: () => {
                setCreateOpen(false);
                createForm.reset();
                createForm.clearErrors();
            },
        });
    };

    const openEdit = (type: TicketType) => {
        setEditing(type);
        editForm.setData({
            name: type.name,
            code: type.code,
            description: type.description ?? '',
            color: type.color ?? '#64748b',
            allows_overlap: type.allows_overlap,
            is_active: type.is_active,
            sort_order: type.sort_order ?? 0,
        });
        editForm.clearErrors();
    };

    const submitEdit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!editing) {
            return;
        }

        editForm.transform((data) => normalizePayload(data));
        editForm.put(`/inmopro/attention-ticket-types/${editing.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditing(null);
                editForm.reset();
                editForm.clearErrors();
            },
        });
    };

    const removeType = async (type: TicketType) => {
        if (await confirmDelete(`Eliminar tipo de ticket "${type.name}"?`)) {
            router.delete(`/inmopro/attention-ticket-types/${type.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tipos de ticket - Inmopro" />
            <div className="space-y-5 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tipos de ticket</h1>
                        <p className="mt-1 text-sm text-slate-500">Catálogo para separar calendarios y reglas de horario.</p>
                    </div>
                    {abilities.create ? (
                        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                            <Plus className="h-4 w-4" />
                            Nuevo tipo
                        </Button>
                    ) : null}
                </div>

                <form onSubmit={applyFilter} className="flex gap-2 rounded-lg border border-border bg-card p-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o código" className="pl-9" />
                    </div>
                    <Button type="submit" variant="secondary" size="sm">Buscar</Button>
                </form>

                <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50/80">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Tipo</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Código</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Agenda</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Tickets</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
                                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {types.data.map((type) => (
                                    <tr key={type.id} className="hover:bg-slate-50/70">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="h-3.5 w-3.5 rounded-full border border-slate-200" style={{ backgroundColor: type.color ?? '#64748b' }} />
                                                <div>
                                                    <p className="font-semibold text-slate-900">{type.name}</p>
                                                    <p className="text-xs text-slate-500">{type.description?.trim() || 'Sin descripción'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-slate-700">{type.code}</td>
                                        <td className="px-4 py-3 text-slate-700">{type.allows_overlap ? 'Permite cruces' : 'Sin cruces'}</td>
                                        <td className="px-4 py-3 text-slate-700">{type.tickets_count ?? 0}</td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${type.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {type.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                {abilities.update ? (
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(type)} title="Editar tipo">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                ) : null}
                                                {abilities.delete ? (
                                                    <Button type="button" variant="ghost" size="icon" className="text-slate-500 hover:bg-red-50 hover:text-red-600" onClick={() => removeType(type)} title="Eliminar tipo">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {types.data.length === 0 ? <div className="px-4 py-12 text-center text-sm text-slate-500">No hay tipos de ticket registrados.</div> : null}
                    <div className="border-t border-slate-100 px-4 py-3">
                        <Pagination links={types.links} />
                    </div>
                </div>
            </div>

            <TicketTypeModal open={createOpen} onOpenChange={setCreateOpen} title="Nuevo tipo de ticket" form={createForm} onSubmit={submitCreate} submitLabel="Crear" idPrefix="create" />
            <TicketTypeModal open={!!editing} onOpenChange={(open) => !open && setEditing(null)} title={editing ? `Editar tipo: ${editing.name}` : 'Editar tipo'} form={editForm} onSubmit={submitEdit} submitLabel="Guardar" idPrefix="edit" />
        </AppLayout>
    );
}

function TicketTypeModal({
    open,
    onOpenChange,
    title,
    form,
    onSubmit,
    submitLabel,
    idPrefix,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    form: ReturnType<typeof useForm<TicketTypeForm>>;
    onSubmit: (event: React.FormEvent) => void;
    submitLabel: string;
    idPrefix: string;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>Configure nombre, color y regla de superposición.</DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <Label htmlFor={`${idPrefix}-name`}>Nombre</Label>
                            <Input id={`${idPrefix}-name`} value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} className="mt-1" required />
                            <InputError message={form.errors.name} />
                        </div>
                        <div>
                            <Label htmlFor={`${idPrefix}-code`}>Código</Label>
                            <Input id={`${idPrefix}-code`} value={form.data.code} onChange={(event) => form.setData('code', event.target.value.toUpperCase())} className="mt-1" required />
                            <InputError message={form.errors.code} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor={`${idPrefix}-description`}>Descripción</Label>
                        <Input id={`${idPrefix}-description`} value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} className="mt-1" />
                        <InputError message={form.errors.description} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <Label htmlFor={`${idPrefix}-color`}>Color</Label>
                            <div className="mt-1 flex gap-2">
                                <input id={`${idPrefix}-color`} type="color" value={normalizeColor(form.data.color)} onChange={(event) => form.setData('color', event.target.value)} className="h-9 w-12 rounded-md border border-slate-200 bg-white p-1" />
                                <Input value={form.data.color} onChange={(event) => form.setData('color', event.target.value)} placeholder="#64748b" />
                            </div>
                            <InputError message={form.errors.color} />
                        </div>
                        <div>
                            <Label htmlFor={`${idPrefix}-sort`}>Orden</Label>
                            <Input id={`${idPrefix}-sort`} type="number" min={0} value={form.data.sort_order} onChange={(event) => form.setData('sort_order', event.target.value === '' ? '' : Number(event.target.value))} className="mt-1" />
                            <InputError message={form.errors.sort_order} />
                        </div>
                    </div>
                    <div className="grid gap-2 rounded-lg border border-slate-100 p-3 text-sm">
                        <label className="flex items-center gap-2 text-slate-700">
                            <input type="checkbox" checked={form.data.allows_overlap} onChange={(event) => form.setData('allows_overlap', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                            Permite horarios superpuestos
                        </label>
                        <label className="flex items-center gap-2 text-slate-700">
                            <input type="checkbox" checked={form.data.is_active} onChange={(event) => form.setData('is_active', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                            Activo
                        </label>
                        <InputError message={form.errors.allows_overlap} />
                        <InputError message={form.errors.is_active} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={form.processing}>{submitLabel}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
