import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type MembershipType = {
    id: number;
    name: string;
    months: number;
    amount: string;
};

export default function MembershipTypesEdit({ membershipType }: { membershipType: MembershipType }) {
    const { data, setData, put, processing, errors } = useForm({
        name: membershipType.name,
        months: String(membershipType.months),
        amount: String(membershipType.amount),
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Tipos de membresía', href: '/inmopro/membership-types' },
        { title: 'Editar', href: `/inmopro/membership-types/${membershipType.id}/edit` },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`/inmopro/membership-types/${membershipType.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${membershipType.name} - Inmopro`} />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">Editar tipo de membresía</h2>
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
                        Actualizar
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
