import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Pencil, PlusCircle, Tags, Trash2 } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { EmptyState } from '@/components/crm/empty-state';
import { StatusBadge } from '@/components/crm/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Spinner } from '@/components/ui/spinner';
import CrmLayout from '@/layouts/crm/crm-layout';
import { confirmDelete } from '@/lib/swal';
import pipeline from '@/routes/crm/pipeline';
import type { BreadcrumbItem } from '@/types';

type CatalogItem = {
    id: number;
    name: string;
    code: string;
    color: string | null;
    sort_order: number;
    is_active: boolean;
    clients_count: number;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Estados y etiquetas', href: '/crm/pipeline' }];

type Kind = 'status' | 'tag';

export default function CrmPipelineIndex({
    statuses,
    tags,
}: {
    statuses: CatalogItem[];
    tags: CatalogItem[];
}) {
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [modal, setModal] = useState<{ kind: Kind; item: CatalogItem | null } | null>(null);

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Estados y etiquetas" />

            <div className="flex flex-col gap-6 p-6">
                <p className="text-sm text-muted-foreground">
                    Estos estados y etiquetas son solo tuyos. El kanban de clientes usa los estados
                    activos.
                </p>
                {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
                {errors.tag && <p className="text-sm text-destructive">{errors.tag}</p>}

                <div className="grid gap-6 lg:grid-cols-2">
                    <CatalogList
                        title="Estados"
                        items={statuses}
                        emptyTitle="Aún no tienes estados"
                        emptyDescription="Crea etapas para armar tu kanban."
                        onCreate={() => setModal({ kind: 'status', item: null })}
                        onEdit={(item) => setModal({ kind: 'status', item })}
                    />
                    <CatalogList
                        title="Etiquetas"
                        items={tags}
                        emptyTitle="Aún no tienes etiquetas"
                        emptyDescription="Crea etiquetas para clasificar a tus clientes."
                        onCreate={() => setModal({ kind: 'tag', item: null })}
                        onEdit={(item) => setModal({ kind: 'tag', item })}
                    />
                </div>
            </div>

            {modal && (
                <CatalogItemModal
                    kind={modal.kind}
                    item={modal.item}
                    onClose={() => setModal(null)}
                />
            )}
        </CrmLayout>
    );
}

function CatalogList({
    title,
    items,
    emptyTitle,
    emptyDescription,
    onCreate,
    onEdit,
}: {
    title: string;
    items: CatalogItem[];
    emptyTitle: string;
    emptyDescription: string;
    onCreate: () => void;
    onEdit: (item: CatalogItem) => void;
}) {
    const kind = title === 'Estados' ? 'status' : 'tag';

    const remove = async (item: CatalogItem) => {
        const confirmed = await confirmDelete(`¿Eliminar "${item.name}"?`);

        if (!confirmed) {
            return;
        }

        if (kind === 'status') {
            router.delete(pipeline.statuses.destroy(item.id).url);
        } else {
            router.delete(pipeline.tags.destroy(item.id).url);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>{title}</CardTitle>
                <Button size="sm" onClick={onCreate}>
                    <PlusCircle className="mr-1.5 h-4 w-4" />
                    Nuevo
                </Button>
            </CardHeader>
            <CardContent className="space-y-1 p-0 pb-2">
                {items.length === 0 && (
                    <EmptyState icon={Tags} title={emptyTitle} description={emptyDescription} />
                )}
                {items.map((item) => (
                    <div
                        key={item.id}
                        className={`flex items-center gap-3 px-4 py-2 ${item.is_active ? '' : 'opacity-50'}`}
                    >
                        <StatusBadge color={item.color}>{item.name}</StatusBadge>
                        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                            {item.clients_count} cliente{item.clients_count === 1 ? '' : 's'}
                        </span>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            aria-label={`Editar ${item.name}`}
                            onClick={() => onEdit(item)}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            aria-label={`Eliminar ${item.name}`}
                            onClick={() => remove(item)}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function CatalogItemModal({
    kind,
    item,
    onClose,
}: {
    kind: Kind;
    item: CatalogItem | null;
    onClose: () => void;
}) {
    const isEdit = item !== null;
    const { data, setData, post, put, processing, errors } = useForm({
        name: item?.name ?? '',
        description: '',
        color: item?.color ?? '#64748b',
        is_active: item?.is_active ?? true,
    });

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const options = { onSuccess: onClose };

        if (isEdit && kind === 'status') {
            put(pipeline.statuses.update(item.id).url, options);
        } else if (isEdit && kind === 'tag') {
            put(pipeline.tags.update(item.id).url, options);
        } else if (kind === 'status') {
            post(pipeline.statuses.store().url, options);
        } else {
            post(pipeline.tags.store().url, options);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit
                            ? `Editar ${kind === 'status' ? 'estado' : 'etiqueta'}`
                            : `Nuevo ${kind === 'status' ? 'estado' : 'etiqueta'}`}
                    </DialogTitle>
                    <DialogDescription>
                        El código se genera automáticamente a partir del nombre.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label htmlFor="catalog-name">Nombre</Label>
                        <Input
                            id="catalog-name"
                            value={data.name}
                            onChange={(event) => setData('name', event.target.value)}
                            className="mt-1"
                        />
                        <InputError message={errors.name} />
                    </div>
                    <div>
                        <Label htmlFor="catalog-color">Color</Label>
                        <Input
                            id="catalog-color"
                            type="color"
                            value={data.color || '#64748b'}
                            onChange={(event) => setData('color', event.target.value)}
                            className="mt-1 h-9 w-20 p-1"
                        />
                    </div>
                    {isEdit && (
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(event) => setData('is_active', event.target.checked)}
                            />
                            Activo (visible en el kanban)
                        </label>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
