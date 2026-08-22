import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import type { BreadcrumbItem } from '@/types';

type ClientStatus = {
    id: number;
    name: string;
    code: string;
    description?: string | null;
    color?: string | null;
    sort_order?: number;
    is_active: boolean;
};

export default function ClientStatusesEdit({ clientStatus }: { clientStatus: ClientStatus }) {
    const { data, setData, put, processing, errors } = useForm({
        name: clientStatus.name,
        code: clientStatus.code,
        description: clientStatus.description ?? '',
        color: clientStatus.color ?? '#64748b',
        sort_order: clientStatus.sort_order ?? 0,
        is_active: clientStatus.is_active,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Estados CRM', href: '/inmopro/client-statuses' },
        { title: 'Editar', href: `/inmopro/client-statuses/${clientStatus.id}/edit` },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`/inmopro/client-statuses/${clientStatus.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${clientStatus.name} - Inmopro`} />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">Editar estado CRM</h2>
                <form onSubmit={submit} className="max-w-md space-y-4">
                    <div>
                        <Label htmlFor="name">Nombre</Label>
                        <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} className="mt-1" />
                        <InputError message={errors.name} />
                    </div>
                    <div>
                        <Label htmlFor="code">Codigo</Label>
                        <Input id="code" value={data.code} onChange={(e) => setData('code', e.target.value.toUpperCase())} className="mt-1" />
                        <InputError message={errors.code} />
                    </div>
                    <div>
                        <Label htmlFor="description">Descripcion</Label>
                        <Input id="description" value={data.description} onChange={(e) => setData('description', e.target.value)} className="mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="color">Color</Label>
                            <Input id="color" value={data.color} onChange={(e) => setData('color', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="sort_order">Orden</Label>
                            <Input id="sort_order" type="number" min={0} value={data.sort_order} onChange={(e) => setData('sort_order', Number(e.target.value))} className="mt-1" />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        Estado activo
                    </label>
                    <Button type="submit" disabled={processing}>Actualizar</Button>
                </form>
            </div>
        </AppLayout>
    );
}
