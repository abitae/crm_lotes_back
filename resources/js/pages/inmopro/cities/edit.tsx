import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type City = {
    id: number;
    name: string;
    code: string;
    department?: string | null;
    sort_order?: number;
    is_active: boolean;
};

export default function CitiesEdit({ city }: { city: City }) {
    const { data, setData, put, processing, errors } = useForm({
        name: city.name,
        code: city.code,
        department: city.department ?? '',
        sort_order: city.sort_order ?? 0,
        is_active: city.is_active,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Ciudades', href: '/inmopro/cities' },
        { title: 'Editar', href: `/inmopro/cities/${city.id}/edit` },
    ];

    const submit = (event: FormEvent) => {
        event.preventDefault();
        put(`/inmopro/cities/${city.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${city.name} - Inmopro`} />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">Editar ciudad</h2>
                <form onSubmit={submit} className="max-w-md space-y-4">
                    <div>
                        <Label htmlFor="name">Nombre</Label>
                        <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} className="mt-1" />
                        <InputError message={errors.name} />
                    </div>
                    <div>
                        <Label htmlFor="code">Código</Label>
                        <Input id="code" value={data.code} onChange={(e) => setData('code', e.target.value.toUpperCase())} className="mt-1" />
                        <InputError message={errors.code} />
                    </div>
                    <div>
                        <Label htmlFor="department">Departamento</Label>
                        <Input id="department" value={data.department} onChange={(e) => setData('department', e.target.value)} className="mt-1" />
                        <InputError message={errors.department} />
                    </div>
                    <div>
                        <Label htmlFor="sort_order">Orden</Label>
                        <Input id="sort_order" type="number" min={0} value={data.sort_order} onChange={(e) => setData('sort_order', Number(e.target.value))} className="mt-1" />
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        Ciudad activa
                    </label>
                    <Button type="submit" disabled={processing}>Actualizar</Button>
                </form>
            </div>
        </AppLayout>
    );
}
