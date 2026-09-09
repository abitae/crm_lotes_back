import { Head, Link } from '@inertiajs/react';
import { CalendarClock, LifeBuoy, MapPin, Users } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { CrmPage, CrmPageHeader } from '@/components/crm/crm-page';
import { EmptyState } from '@/components/crm/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
import type { BreadcrumbItem } from '@/types';

type ClientStatusCount = {
    id: number;
    code: string;
    name: string;
    color: string | null;
    count: number;
};

type Kpis = {
    clients: { total: number; propio: number; datero: number };
    clients_by_status: ClientStatusCount[];
    pre_reservations: {
        active: number;
        pending: number;
        approved: number;
        rejected: number;
    };
    lots: {
        pre_reservation: number;
        reserved: number;
        transferred: number;
        installments: number;
    };
    attention_tickets_pending: number;
    reminders_pending: number;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/crm/dashboard' }];

const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
const STATUS = { good: '#0ca30c', warning: '#fab219', critical: '#d03b3b' };
const MUTED_FALLBACK = '#898781';
const chartMargin = { top: 4, right: 28, bottom: 4, left: 0 };

function MetricCard({
    label,
    value,
    icon: Icon,
    href,
    hint,
}: {
    label: string;
    value: number;
    icon: React.ElementType;
    href: string;
    hint?: string;
}) {
    return (
        <Link href={href} className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-semibold">{value.toLocaleString('es-PE')}</div>
                    {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
                </CardContent>
            </Card>
        </Link>
    );
}

function ChartTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: { value: number; payload: { name: string } }[];
}) {
    if (!active || !payload?.length) {
        return null;
    }
    const item = payload[0];
    return (
        <div className="rounded-md border border-border bg-popover px-3 py-1.5 text-xs shadow-md">
            <p className="font-medium text-popover-foreground">{item.payload.name}</p>
            <p className="text-muted-foreground">{item.value.toLocaleString('es-PE')}</p>
        </div>
    );
}

export default function CrmDashboard({ kpis }: { kpis: Kpis }) {
    const preReservationData = [
        { name: 'Pendientes', value: kpis.pre_reservations.pending, fill: STATUS.warning },
        { name: 'Aprobadas', value: kpis.pre_reservations.approved, fill: STATUS.good },
        { name: 'Rechazadas', value: kpis.pre_reservations.rejected, fill: STATUS.critical },
    ];

    const lotsData = [
        { name: 'Pre-reserva', value: kpis.lots.pre_reservation, fill: CATEGORICAL[0] },
        { name: 'Reservados', value: kpis.lots.reserved, fill: CATEGORICAL[1] },
        { name: 'Transferidos', value: kpis.lots.transferred, fill: CATEGORICAL[2] },
        { name: 'En cuotas', value: kpis.lots.installments, fill: CATEGORICAL[3] },
    ];

    const statusData = kpis.clients_by_status.map((status) => ({
        name: status.name,
        value: status.count,
        fill: status.color ?? MUTED_FALLBACK,
    }));

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <CrmPage>
                <CrmPageHeader
                    title="Dashboard"
                    description="Resumen de tu cartera, seguimientos y lotes."
                />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        label="Mis clientes"
                        value={kpis.clients.total}
                        icon={Users}
                        href="/crm/clients"
                        hint={`${kpis.clients.propio} propios · ${kpis.clients.datero} de datero`}
                    />
                    <MetricCard
                        label="Pre-reservas activas"
                        value={kpis.pre_reservations.active}
                        icon={MapPin}
                        href="/crm/pre-reservations"
                        hint={`${kpis.pre_reservations.pending} pendientes`}
                    />
                    <MetricCard
                        label="Tickets pendientes"
                        value={kpis.attention_tickets_pending}
                        icon={LifeBuoy}
                        href="/crm/attention-tickets?status=pendiente"
                    />
                    <MetricCard
                        label="Recordatorios pendientes"
                        value={kpis.reminders_pending}
                        icon={CalendarClock}
                        href="/crm/reminders"
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Clientes por estado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {statusData.length === 0 ? (
                            <EmptyState
                                icon={Users}
                                title="Aún no hay estados"
                                description="Crea etapas en Estados y etiquetas para ver tu pipeline aquí."
                            />
                        ) : (
                            <div style={{ height: Math.max(statusData.length * 40, 120) }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={statusData} layout="vertical" margin={chartMargin}>
                                        <CartesianGrid
                                            horizontal={false}
                                            strokeDasharray="0"
                                            stroke="var(--border)"
                                        />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            width={140}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                        />
                                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
                                            {statusData.map((entry, index) => (
                                                <Cell key={index} fill={entry.fill} />
                                            ))}
                                            <LabelList
                                                dataKey="value"
                                                position="right"
                                                style={{ fill: 'var(--foreground)', fontSize: 12 }}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pre-reservas por estado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={preReservationData} margin={chartMargin}>
                                        <CartesianGrid vertical={false} stroke="var(--border)" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                        />
                                        <YAxis hide />
                                        <Tooltip
                                            content={<ChartTooltip />}
                                            cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                                            {preReservationData.map((entry, index) => (
                                                <Cell key={index} fill={entry.fill} />
                                            ))}
                                            <LabelList
                                                dataKey="value"
                                                position="top"
                                                style={{ fill: 'var(--foreground)', fontSize: 12 }}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Mis lotes por estado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={lotsData} margin={chartMargin}>
                                        <CartesianGrid vertical={false} stroke="var(--border)" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                        />
                                        <YAxis hide />
                                        <Tooltip
                                            content={<ChartTooltip />}
                                            cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                                            {lotsData.map((entry, index) => (
                                                <Cell key={index} fill={entry.fill} />
                                            ))}
                                            <LabelList
                                                dataKey="value"
                                                position="top"
                                                style={{ fill: 'var(--foreground)', fontSize: 12 }}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </CrmPage>
        </CrmLayout>
    );
}
