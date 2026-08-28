import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

export default function CommissionStatusesCreate() {
    const { data, setData, post, processing, errors, transform } = useForm({
        name: '',
        code: '',
        color: '#10b981',
        sort_order: '0',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Estados de comision', href: '/inmopro/commission-statuses' },
        { title: 'Nuevo', href: '/inmopro/commission-statuses/create' },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((formData) => ({ ...formData, sort_order: Number(formData.sort_order) || 0 }));
        post('/inmopro/commission-statuses');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo estado - Inmopro" />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">Nuevo estado de comision</h2>
                <form onSubmit={submit} className="max-w-md space-y-4">
                    <div>
                        <Label htmlFor="name">Nombre</Label>
                        <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} className="mt-1" />
                        <InputError message={errors.name} />
                    </div>
                    <div>
                        <Label htmlFor="code">Codigo</Label>
                        <Input id="code" value={data.code} onChange={(e) => setData('code', e.target.value)} className="mt-1" />
                        <InputError message={errors.code} />
                    </div>
                    <div>
                        <Label htmlFor="color">Color</Label>
                        <Input id="color" value={data.color} onChange={(e) => setData('color', e.target.value)} className="mt-1" />
                        <InputError message={errors.color} />
                    </div>
                    <div>
                        <Label htmlFor="sort_order">Orden</Label>
                        <Input id="sort_order" type="number" min={0} value={data.sort_order} onChange={(e) => setData('sort_order', e.target.value)} className="mt-1" />
                        <InputError message={errors.sort_order} />
                    </div>
                    <Button type="submit" disabled={processing}>Guardar</Button>
                </form>
            </div>
        </AppLayout>
    );
}
