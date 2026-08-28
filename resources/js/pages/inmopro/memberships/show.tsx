import { Head, Link, router, useForm } from '@inertiajs/react';
import { Calendar, Pencil, Plus, Trash2, UserCheck } from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { calendarDateTimestamp, formatCalendarDate, todayIsoDate } from '@/lib/date';
import { confirmDelete } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

type Advisor = { id: number; name: string };
type Payment = { id: number; amount: string; paid_at: string; notes?: string | null };
type Membership = {
    id: number;
    advisor_id: number;
    year: number;
    amount: string;
    advisor?: Advisor;
    payments?: Payment[];
};

export default function MembershipsShow({
    membership,
    totalPaid,
    balanceDue,
    isPaid,
}: {
    membership: Membership;
    totalPaid: number;
    balanceDue: number;
    isPaid: boolean;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Vendedores', href: '/inmopro/advisors' },
        { title: 'Membresías', href: '/inmopro/advisor-memberships' },
        { title: `${membership.advisor?.name ?? 'Vendedor'} – ${membership.year}`, href: `/inmopro/advisor-memberships/${membership.id}` },
    ];

    const defaultDate = () => todayIsoDate();
    const paymentForm = useForm({
        amount: '',
        paid_at: defaultDate(),
        notes: '',
    });

    const submitPayment = (e: FormEvent) => {
        e.preventDefault();
        paymentForm.post(`/inmopro/advisor-memberships/${membership.id}/payments`, {
            onSuccess: () => paymentForm.reset('amount', 'paid_at', 'notes'),
        });
    };

    const handleDestroy = async () => {
        if (await confirmDelete(`¿Eliminar la membresía de ${membership.advisor?.name ?? 'este vendedor'} (${membership.year})? Se eliminarán también todos los abonos.`)) {
            router.delete(`/inmopro/advisor-memberships/${membership.id}`);
        }
    };

    const payments = membership.payments ?? [];
    const sortedPayments = [...payments].sort((a, b) => calendarDateTimestamp(b.paid_at) - calendarDateTimestamp(a.paid_at));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Membresía ${membership.year} - Inmopro`} />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Membresía {membership.year} – {membership.advisor?.name ?? 'Vendedor'}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Monto anual S/ {Number(membership.amount).toLocaleString('es-PE')}
                            {isPaid ? ' · Al día' : ` · Pendiente S/ ${balanceDue.toLocaleString('es-PE')}`}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/inmopro/advisor-memberships/${membership.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                                Editar monto
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDestroy} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                            Eliminar membresía
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-slate-600">Monto anual</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-slate-900">S/ {Number(membership.amount).toLocaleString('es-PE')}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-slate-600">Total abonado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-emerald-700">S/ {totalPaid.toLocaleString('es-PE')}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-slate-600">Saldo pendiente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className={`text-2xl font-bold ${balanceDue > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                                S/ {balanceDue.toLocaleString('es-PE')}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Registrar abono</CardTitle>
                        <CardDescription>Fecha de pago y monto del abono.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submitPayment} className="flex flex-wrap items-end gap-4">
                            <div className="min-w-[120px]">
                                <Label htmlFor="amount">Monto (S/)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={paymentForm.data.amount}
                                    onChange={(e) => paymentForm.setData('amount', e.target.value)}
                                    className="mt-1"
                                    placeholder="0.00"
                                    required
                                />
                                <InputError message={paymentForm.errors.amount} />
                            </div>
                            <div className="min-w-[140px]">
                                <Label htmlFor="paid_at">Fecha de pago</Label>
                                <Input
                                    id="paid_at"
                                    type="date"
                                    value={paymentForm.data.paid_at}
                                    onChange={(e) => paymentForm.setData('paid_at', e.target.value)}
                                    className="mt-1"
                                    required
                                />
                                <InputError message={paymentForm.errors.paid_at} />
                            </div>
                            <div className="min-w-[180px] flex-1">
                                <Label htmlFor="notes">Observaciones</Label>
                                <Input
                                    id="notes"
                                    value={paymentForm.data.notes}
                                    onChange={(e) => paymentForm.setData('notes', e.target.value)}
                                    className="mt-1"
                                    placeholder="Opcional"
                                />
                            </div>
                            <Button type="submit" disabled={paymentForm.processing}>
                                <Plus className="h-4 w-4" />
                                Agregar abono
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Abonos</CardTitle>
                        <CardDescription>{sortedPayments.length} pago(s) registrado(s).</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {sortedPayments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Calendar className="h-10 w-10 text-slate-300" />
                                <p className="mt-2 text-sm text-slate-500">Aún no hay abonos. Registre el primer pago arriba.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/80">
                                            <th className="px-4 py-3 text-left font-medium text-slate-600">Fecha</th>
                                            <th className="px-4 py-3 text-right font-medium text-slate-600">Monto</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-600">Observaciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {sortedPayments.map((p) => (
                                            <tr key={p.id} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3 text-slate-700">
                                                    {formatCalendarDate(p.paid_at, { dateStyle: 'long' })}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-slate-800">S/ {Number(p.amount).toLocaleString('es-PE')}</td>
                                                <td className="px-4 py-3 text-slate-600">{p.notes ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
