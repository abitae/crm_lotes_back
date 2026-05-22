import { Head, Link } from '@inertiajs/react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { TrendingUp, Users, CheckCircle2, Clock, LayoutGrid, ArrowRightLeft, Landmark } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BreadcrumbItem } from '@/types';

const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#64748b', '#6366f1'];

export default function InmoproDashboard({
    stats,
    chartData,
    pieData,
    recentReservations,
}: {
    stats: { total: number; libre: number; prereserva: number; reservado: number; transferido: number; cuotas: number };
    chartData: Array<{ name: string; Libre: number; PreReserva: number; Reservado: number; Transferido: number; Cuotas: number }>;
    pieData: Array<{ name: string; value: number }>;
    recentReservations: Array<{
        id: number;
        block: string;
        number: number;
        price: string;
        project?: { name: string };
        client?: { name: string };
        status?: { code: string };
    }>;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Dashboard', href: '/inmopro/dashboard' },
    ];

    const statCards = [
        { label: 'Lotes Totales', value: stats.total, icon: TrendingUp, className: 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300' },
        { label: 'Disponibles', value: stats.libre, icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300' },
        { label: 'Pre-reserva', value: stats.prereserva, icon: ArrowRightLeft, className: 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300' },
        { label: 'Reservados', value: stats.reservado, icon: Clock, className: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300' },
        { label: 'Transferidos', value: stats.transferido, icon: Users, className: 'bg-muted text-muted-foreground' },
        { label: 'Cuotas', value: stats.cuotas, icon: Landmark, className: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard - Inmopro" />
            <div className="space-y-8 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Resumen del inventario y reservas recientes.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                    {statCards.map((stat) => (
                        <Card key={stat.label} className="overflow-hidden">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                        <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{stat.value}</p>
                                    </div>
                                    <div className={`rounded-xl p-3 ${stat.className}`}>
                                        <stat.icon className="h-6 w-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Estado por proyecto</CardTitle>
                            <CardDescription>Lotes por estado comercial y operativo por proyecto.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ fill: '#f1f5f9' }}
                                            contentStyle={{
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                            }}
                                        />
                                        <Bar dataKey="Transferido" stackId="a" fill="#64748b" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="Cuotas" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="Reservado" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="PreReserva" stackId="a" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="Libre" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Distribución global</CardTitle>
                            <CardDescription>Total por estado.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {pieData.map((_, index) => (
                                                <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 space-y-2.5">
                                {pieData.map((d, i) => (
                                    <div key={d.name} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-2.5 w-2.5 rounded-full"
                                                style={{ backgroundColor: COLORS[i] }}
                                            />
                                            <span className="text-slate-600">{d.name}</span>
                                        </div>
                                        <span className="font-semibold text-slate-900">{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle>Reservas recientes</CardTitle>
                            <CardDescription>Últimas reservas registradas.</CardDescription>
                        </div>
                        <Link
                            href="/inmopro/lots"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                        >
                            <LayoutGrid className="h-4 w-4" />
                            Ver inventario
                        </Link>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-lg border border-slate-100">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/80">
                                        <th className="px-4 py-3 font-medium text-slate-600">Lote</th>
                                        <th className="px-4 py-3 font-medium text-slate-600">Proyecto</th>
                                        <th className="px-4 py-3 font-medium text-slate-600">Cliente</th>
                                        <th className="px-4 py-3 font-medium text-slate-600">Monto</th>
                                        <th className="px-4 py-3 text-right font-medium text-slate-600">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {recentReservations.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                                                No hay reservas recientes.
                                            </td>
                                        </tr>
                                    ) : (
                                        recentReservations.map((lot) => (
                                            <tr key={lot.id} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-medium text-slate-900">
                                                    {lot.block}-{lot.number}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">{lot.project?.name ?? '—'}</td>
                                                <td className="px-4 py-3 text-slate-600">{lot.client?.name ?? '—'}</td>
                                                <td className="px-4 py-3 font-medium text-slate-700">
                                                    S/ {Number(lot.price).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                                        Reservado
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
