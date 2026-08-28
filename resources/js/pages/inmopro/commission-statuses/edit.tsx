import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type CommissionStatus = { id: number; name: string; code: string; color?: string; sort_order?: number };

export default function CommissionStatusesEdit({ commissionStatus }: { commissionStatus: CommissionStatus }) {
    const { data, setData, put, processing, errors, transform } = useForm({
        name: commissionStatus.name,
        code: commissionStatus.code,
        color: commissionStatus.color ?? '#10b981',
        sort_order: String(commissionStatus.sort_order ?? 0),
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Estados de comision', href: '/inmopro/commission-statuses' },
        { title: 'Editar', href: '/inmopro/commission-statuses/' + commissionStatus.id + '/edit' },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((formData) => ({ ...formData, sort_order: formData.sort_order ? Number(formData.sort_order) : 0 }));
        put('/inmopro/commission-statuses/' + commissionStatus.id);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={'Editar ' + commissionStatus.name + ' - Inmopro'} />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">Editar estado de comision</h2>
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
                        <Label htmlFor="color">Color</Label>
                        <div className="mt-1 flex gap-2">
                            <input type="color" value={data.color} onChange={(e) => setData('color', e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-slate-200" />
                            <Input id="color" value={data.color} onChange={(e) => setData('color', e.target.value)} className="flex-1" />
                        </div>
                        <InputError message={errors.color} />
                    </div>
                    <div>
                        <Label htmlFor="sort_order">Orden</Label>
                        <Input id="sort_order" type="number" min={0} value={data.sort_order} onChange={(e) => setData('sort_order', e.target.value)} className="mt-1" />
                        <InputError message={errors.sort_order} />
                    </div>
                    <Button type="submit" disabled={processing}>Actualizar</Button>
                </form>
            </div>
        </AppLayout>
    );
}
