import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import type { BreadcrumbItem } from '@/types';

type Advisor = { id: number; name: string };

export default function MembershipsCreate({ advisors }: { advisors: Advisor[] }) {
    const currentYear = new Date().getFullYear();
    const { data, setData, post, processing, errors } = useForm({
        advisor_id: '',
        year: String(currentYear),
        amount: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Vendedores', href: '/inmopro/advisors' },
        { title: 'Membresías', href: '/inmopro/advisor-memberships' },
        { title: 'Nueva', href: '/inmopro/advisor-memberships/create' },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/inmopro/advisor-memberships');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nueva membresía - Inmopro" />
            <div className="p-4 md:p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nueva membresía anual</h1>
                    <p className="mt-1 text-sm text-slate-500">Registre la membresía de un vendedor para un año. Luego podrá agregar abonos.</p>
                </div>
                <Card className="max-w-lg">
                    <CardHeader>
                        <CardTitle>Datos de la membresía</CardTitle>
                        <CardDescription>Vendedor, año y monto total a pagar.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <Label htmlFor="advisor_id">Vendedor</Label>
                                <select
                                    id="advisor_id"
                                    value={data.advisor_id}
                                    onChange={(e) => setData('advisor_id', e.target.value)}
                                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    required
                                >
                                    <option value="">— Seleccione —</option>
                                    {advisors.map((a) => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                                <InputError message={errors.advisor_id} />
                            </div>
                            <div>
                                <Label htmlFor="year">Año</Label>
                                <Input
                                    id="year"
                                    type="number"
                                    min={2020}
                                    max={2100}
                                    value={data.year}
                                    onChange={(e) => setData('year', e.target.value)}
                                    className="mt-1"
                                    required
                                />
                                <InputError message={errors.year} />
                            </div>
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
                                    placeholder="0.00"
                                    required
                                />
                                <InputError message={errors.amount} />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={processing}>
                                    Crear membresía
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <a href="/inmopro/advisor-memberships">Cancelar</a>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
