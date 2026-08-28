import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

export default function MembershipTypesCreate() {
    const currentYear = new Date().getFullYear();
    const { data, setData, post, processing, errors } = useForm({
        name: `Membresía ${currentYear}`,
        months: '12',
        amount: '0',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Tipos de membresía', href: '/inmopro/membership-types' },
        { title: 'Nuevo', href: '/inmopro/membership-types/create' },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/inmopro/membership-types');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo tipo de membresía - Inmopro" />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">Nuevo tipo de membresía</h2>
                <p className="mb-4 text-sm text-slate-600">
                    Defina la duración en meses y el monto. Al asignar a un vendedor se elegirá la fecha de inicio y se calculará la fecha de vencimiento.
                </p>
                <form onSubmit={submit} className="max-w-md space-y-4">
                    <div>
                        <Label htmlFor="name">Nombre</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1"
                            placeholder="Ej. Membresía anual"
                        />
                        <InputError message={errors.name} />
                    </div>
                    <div>
                        <Label htmlFor="months">Duración (meses)</Label>
                        <Input
                            id="months"
                            type="number"
                            min={1}
                            max={120}
                            value={data.months}
                            onChange={(e) => setData('months', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={errors.months} />
                    </div>
                    <div>
                        <Label htmlFor="amount">Monto (S/)</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.amount}
                            onChange={(e) => setData('amount', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={errors.amount} />
                    </div>
                    <Button type="submit" disabled={processing}>
                        Guardar
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
