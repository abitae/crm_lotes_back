import { Head, Link } from '@inertiajs/react';
import {
    ArrowRightLeft,
    CheckCircle2,
    Clock,
    Landmark,
    LayoutGrid,
    TrendingUp,
    Users,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { InmoproMetricCard } from '@/components/inmopro/metric-card';
import { Badge } from '@/components/ui/badge';
import { inmoproUi } from '@/lib/inmopro-ui';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#64748b', '#6366f1'];

export default function InmoproDashboard({
    stats,
    chartData,
    pieData,
    recentReservations,
}: {
    stats: {
        total: number;
        libre: number;
        prereserva: number;
        reservado: number;
        transferido: number;
        cuotas: number;
    };
    chartData: Array<{
        name: string;
        Libre: number;
        PreReserva: number;
        Reservado: number;
        Transferido: number;
        Cuotas: number;
    }>;
    pieData: Array<{ name: string; value: number }>;
    recentReservations: Array<{
        id: number;
        block: string;
        number: string;
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
        {
            label: 'Lotes totales',
            value: stats.total,
            icon: TrendingUp,
            tone: 'blue' as const,
        },
        {
            label: 'Disponibles',
            value: stats.libre,
            icon: CheckCircle2,
            tone: 'emerald' as const,
        },
        {
            label: 'Pre-reserva',
            value: stats.prereserva,
            icon: ArrowRightLeft,
            tone: 'sky' as const,
        },
        {
            label: 'Reservados',
            value: stats.reservado,
            icon: Clock,
            tone: 'amber' as const,
        },
        {
            label: 'Transferidos',
            value: stats.transferido,
            icon: Users,
            tone: 'slate' as const,
        },
        {
            label: 'Cuotas',
            value: stats.cuotas,
            icon: Landmark,
            tone: 'violet' as const,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard - Inmopro" />
            <div className={inmoproUi.page}>
                <div className={inmoproUi.pageInner}>
                    <section className={inmoproUi.hero}>
                        <p className={inmoproUi.eyebrow}>Panel comercial</p>
                        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <h1 className={inmoproUi.pageTitle}>
                                    Dashboard
                                </h1>
                                <p className={inmoproUi.pageSubtitle}>
                                    Resumen del inventario y reservas recientes.
                                </p>
                            </div>
                            <Link
                                href="/inmopro/lots"
                                className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#001b44] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#002f6f] dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                            >
                                <LayoutGrid className="h-4 w-4" />
                                Ver inventario
                            </Link>
                        </div>
                    </section>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                        {statCards.map((stat) => (
                            <InmoproMetricCard
                                key={stat.label}
                                label={stat.label}
                                value={String(stat.value)}
                                icon={stat.icon}
                                tone={stat.tone}
                            />
                        ))}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <section className={`${inmoproUi.panel} p-5 lg:col-span-2`}>
                            <div className="mb-5">
                                <h2 className={inmoproUi.sectionTitle}>
                                    Estado por proyecto
                                </h2>
                                <p className={inmoproUi.pageSubtitle}>
                                    Lotes por estado comercial y operativo por
                                    proyecto.
                                </p>
                            </div>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            vertical={false}
                                            stroke="#e2e8f0"
                                        />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f1f5f9' }}
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: '1px solid #e2e8f0',
                                                boxShadow:
                                                    '0 18px 45px rgb(15 23 42 / 0.14)',
                                            }}
                                        />
                                        <Bar
                                            dataKey="Transferido"
                                            stackId="a"
                                            fill="#64748b"
                                        />
                                        <Bar
                                            dataKey="Cuotas"
                                            stackId="a"
                                            fill="#6366f1"
                                        />
                                        <Bar
                                            dataKey="Reservado"
                                            stackId="a"
                                            fill="#f59e0b"
                                        />
                                        <Bar
                                            dataKey="PreReserva"
                                            stackId="a"
                                            fill="#0ea5e9"
                                        />
                                        <Bar
                                            dataKey="Libre"
                                            stackId="a"
                                            fill="#10b981"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </section>

                        <section className={`${inmoproUi.panel} p-5`}>
                            <div className="mb-5">
                                <h2 className={inmoproUi.sectionTitle}>
                                    Distribución global
                                </h2>
                                <p className={inmoproUi.pageSubtitle}>
                                    Total por estado.
                                </p>
                            </div>
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
                                                <Cell
                                                    key={index}
                                                    fill={
                                                        COLORS[
                                                            index %
                                                                COLORS.length
                                                        ]
                                                    }
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 space-y-2.5">
                                {pieData.map((item, index) => (
                                    <div
                                        key={item.name}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        COLORS[
                                                            index %
                                                                COLORS.length
                                                        ],
                                                }}
                                            />
                                            <span className="text-slate-600 dark:text-slate-300">
                                                {item.name}
                                            </span>
                                        </div>
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                            {item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <section className={inmoproUi.tableShell}>
                        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                            <div>
                                <h2 className={inmoproUi.sectionTitle}>
                                    Reservas recientes
                                </h2>
                                <p className={inmoproUi.pageSubtitle}>
                                    Últimas reservas registradas.
                                </p>
                            </div>
                            <Link
                                href="/inmopro/lots"
                                className="inline-flex items-center gap-1.5 text-sm font-black text-emerald-600 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200"
                            >
                                <LayoutGrid className="h-4 w-4" />
                                Ver inventario
                            </Link>
                        </div>

                        <div className="p-5">
                            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950">
                                            <th className={`px-4 py-3 ${inmoproUi.tableHeadCell}`}>
                                                Lote
                                            </th>
                                            <th className={`px-4 py-3 ${inmoproUi.tableHeadCell}`}>
                                                Proyecto
                                            </th>
                                            <th className={`px-4 py-3 ${inmoproUi.tableHeadCell}`}>
                                                Cliente
                                            </th>
                                            <th className={`px-4 py-3 ${inmoproUi.tableHeadCell}`}>
                                                Monto
                                            </th>
                                            <th className={`px-4 py-3 text-right ${inmoproUi.tableHeadCell}`}>
                                                Estado
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className={inmoproUi.divide}>
                                        {recentReservations.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                                                >
                                                    No hay reservas recientes.
                                                </td>
                                            </tr>
                                        ) : (
                                            recentReservations.map((lot) => (
                                                <tr
                                                    key={lot.id}
                                                    className={
                                                        inmoproUi.tableRowHover
                                                    }
                                                >
                                                    <td className="px-4 py-3 font-black text-slate-900 dark:text-white">
                                                        {lot.block}-{lot.number}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                                        {lot.project?.name ??
                                                            '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                                        {lot.client?.name ??
                                                            '—'}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">
                                                        S/{' '}
                                                        {Number(
                                                            lot.price,
                                                        ).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-200"
                                                        >
                                                            Reservado
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
