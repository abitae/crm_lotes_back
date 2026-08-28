import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Advisor = { id: number; name: string };
type Membership = { id: number; year: number; amount: string; advisor?: Advisor };

export default function MembershipsEdit({ membership }: { membership: Membership }) {
    const { data, setData, put, processing, errors } = useForm({
        amount: String(membership.amount),
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Vendedores', href: '/inmopro/advisors' },
        { title: 'Membresías', href: '/inmopro/advisor-memberships' },
        { title: `${membership.advisor?.name ?? 'Vendedor'} – ${membership.year}`, href: `/inmopro/advisor-memberships/${membership.id}` },
        { title: 'Editar', href: `/inmopro/advisor-memberships/${membership.id}/edit` },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`/inmopro/advisor-memberships/${membership.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar membresía ${membership.year} - Inmopro`} />
            <div className="p-4 md:p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Editar monto de membresía</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {membership.advisor?.name ?? 'Vendedor'} – Año {membership.year}
                    </p>
                </div>
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Monto anual (S/)</CardTitle>
                        <CardDescription>Modifique el monto total a pagar por esta membresía.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <Label htmlFor="amount">Monto anual (S/)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                    className="mt-1"
                                    required
                                />
                                <InputError message={errors.amount} />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={processing}>
                                    Guardar
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <a href={`/inmopro/advisor-memberships/${membership.id}`}>Cancelar</a>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
