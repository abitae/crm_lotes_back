import { Head, Link, router } from '@inertiajs/react';
import { Calendar, Eye, Plus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
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

type Paginated<T> = { data: T[]; links: unknown[]; current_page: number; last_page: number };

export default function MembershipsIndex({
    memberships,
    advisors,
    filters,
}: {
    memberships: Paginated<Membership>;
    advisors: Advisor[];
    filters: { advisor_id?: string; year?: string };
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Vendedores', href: '/inmopro/advisors' },
        { title: 'Membresías', href: '/inmopro/advisor-memberships' },
    ];

    const totalPaid = (m: Membership) =>
        (m.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    const balanceDue = (m: Membership) => Math.max(0, Number(m.amount) - totalPaid(m));
    const isPaid = (m: Membership) => balanceDue(m) <= 0;

    const applyFilters = (newFilters: Record<string, string | undefined>) => {
        router.get('/inmopro/advisor-memberships', { ...filters, ...newFilters }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Membresías - Vendedores - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Membresías anuales</h1>
                        <p className="mt-1 text-sm text-slate-500">Control de pago de membresía y abonos por vendedor y año.</p>
                    </div>
                    <Button size="sm" asChild>
                        <Link href="/inmopro/advisor-memberships/create">
                            <Plus className="h-4 w-4" />
                            Nueva membresía
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filtros</CardTitle>
                        <CardDescription>Vendedor y año.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-600">Vendedor</label>
                            <select
                                value={filters.advisor_id ?? ''}
                                onChange={(e) => applyFilters({ advisor_id: e.target.value || undefined })}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">Todos</option>
                                {advisors.map((a) => (
                                    <option key={a.id} value={String(a.id)}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-600">Año</label>
                            <select
                                value={filters.year ?? ''}
                                onChange={(e) => applyFilters({ year: e.target.value || undefined })}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">Todos</option>
                                {[2026, 2025, 2024, 2023].map((y) => (
                                    <option key={y} value={String(y)}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Listado</CardTitle>
                        <CardDescription>{memberships.data.length} membresía(s).</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {memberships.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <UserCheck className="h-10 w-10 text-slate-400" />
                                <p className="mt-4 font-medium text-slate-700">Sin membresías</p>
                                <p className="mt-1 text-sm text-slate-500">Registre una membresía anual para un vendedor.</p>
                                <Button className="mt-4" variant="outline" asChild>
                                    <Link href="/inmopro/advisor-memberships/create">Nueva membresía</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/80">
                                            <th className="px-4 py-3 text-left font-medium text-slate-600">Vendedor</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-600">Año</th>
                                            <th className="px-4 py-3 text-right font-medium text-slate-600">Monto anual</th>
                                            <th className="px-4 py-3 text-right font-medium text-slate-600">Abonado</th>
                                            <th className="px-4 py-3 text-right font-medium text-slate-600">Estado</th>
                                            <th className="px-4 py-3 text-right font-medium text-slate-600">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {memberships.data.map((m) => (
                                            <tr key={m.id} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-medium text-slate-800">{m.advisor?.name ?? '—'}</td>
                                                <td className="px-4 py-3 text-slate-700">{m.year}</td>
                                                <td className="px-4 py-3 text-right text-slate-700">S/ {Number(m.amount).toLocaleString('es-PE')}</td>
                                                <td className="px-4 py-3 text-right text-slate-700">S/ {totalPaid(m).toLocaleString('es-PE')}</td>
                                                <td className="px-4 py-3 text-right">
                                                    {isPaid(m) ? (
                                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Al día</span>
                                                    ) : (
                                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Pendiente</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                        <Link href={`/inmopro/advisor-memberships/${m.id}`}>
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </td>
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
