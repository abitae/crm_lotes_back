import { Head, Link, usePage } from '@inertiajs/react';
import { Home, Phone, UserPlus, Users } from 'lucide-react';
import type { ElementType } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { CrmPage } from '@/components/crm/crm-page';
import { EmptyState } from '@/components/crm/empty-state';
import { StatusBadge } from '@/components/crm/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInitials } from '@/hooks/use-initials';
import CrmLayout from '@/layouts/crm/crm-layout';
import { formatDateTime } from '@/lib/crm-format';
import { cn } from '@/lib/utils';
import clients from '@/routes/crm/clients';
import { mine as myLots } from '@/routes/crm/lots';
import pipeline from '@/routes/crm/pipeline';
import reminders from '@/routes/crm/reminders';
import type { Auth, PendingRemindersShared } from '@/types';

type ClientStatusCount = {
    id: number;
    code: string;
    name: string;
    color: string | null;
    count: number;
};

type LatestClient = {
    id: number;
    name: string;
    phone: string | null;
    status: { name: string; color: string | null } | null;
};

type MonthCount = {
    month: string;
    count: number;
};

type Kpis = {
    clients: { total: number; propio: number; datero: number };
    clients_by_status: ClientStatusCount[];
    lots: {
        total: number;
        pre_reservation: number;
        reserved: number;
        transferred: number;
        installments: number;
    };
    reminders_pending: number;
};

const FUNNEL_FALLBACK = ['#f5c542', '#f0a030', '#e87850', '#c44a4a', '#8b2e3a', '#64748b'];
const TEAL_BAR = '#14b8c4';
const dashboardCardClass = 'rounded-2xl border-0 bg-white shadow-sm dark:bg-card';

function MetricCard({
    label,
    value,
    icon: Icon,
    href,
    iconClassName,
}: {
    label: string;
    value: number;
    icon: ElementType;
    href: string;
    iconClassName: string;
}) {
    return (
        <Link href={href} className="block">
            <Card className={cn(dashboardCardClass, 'h-full py-5 transition-shadow hover:shadow-md')}>
                <CardContent className="flex items-center gap-4 px-5">
                    <div
                        className={cn(
                            'flex size-12 shrink-0 items-center justify-center rounded-full',
                            iconClassName,
                        )}
                    >
                        <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="text-2xl font-bold tracking-tight">{value.toLocaleString('es-PE')}</p>
                    </div>
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
    payload?: { value: number; payload: { month?: string; name?: string } }[];
}) {
    if (!active || !payload?.length) {
        return null;
    }

    const item = payload[0];
    const label = item.payload.month ?? item.payload.name ?? '';

    return (
        <div className="rounded-md border border-border bg-popover px-3 py-1.5 text-xs shadow-md">
            <p className="font-medium text-popover-foreground">{label}</p>
            <p className="text-muted-foreground">{item.value.toLocaleString('es-PE')}</p>
        </div>
    );
}

function SalesFunnel({ data }: { data: { name: string; value: number; fill: string }[] }) {
    const steps = data.length;

    return (
        <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-center">
            <div className="mx-auto flex w-full max-w-xs flex-col lg:mx-0 lg:flex-1">
                {data.map((item, index) => {
                    const topInset = 6 + (index / Math.max(steps, 1)) * 28;
                    const bottomInset = 6 + ((index + 1) / Math.max(steps, 1)) * 28;

                    return (
                        <div
                            key={item.name}
                            className="relative flex h-11 items-center justify-center text-sm font-semibold text-white"
                            style={{
                                backgroundColor: item.fill,
                                clipPath: `polygon(${topInset}% 0%, ${100 - topInset}% 0%, ${100 - bottomInset}% 100%, ${bottomInset}% 100%)`,
                                marginTop: index === 0 ? 0 : -1,
                            }}
                        >
                            {item.value.toLocaleString('es-PE')}
                        </div>
                    );
                })}
            </div>
            <ul className="grid min-w-[10rem] gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {data.map((item) => (
                    <li key={item.name} className="flex items-center gap-2 text-sm">
                        <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.fill }}
                        />
                        <span className="truncate text-muted-foreground">{item.name}</span>
                        <span className="ml-auto font-semibold tabular-nums">{item.value}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function CrmDashboard({
    kpis,
    latestClients,
    clientsByMonth,
}: {
    kpis: Kpis;
    latestClients: LatestClient[];
    clientsByMonth: MonthCount[];
}) {
    const { auth, pendingReminders } = usePage<{
        auth: Auth;
        pendingReminders?: PendingRemindersShared;
    }>().props;
    const getInitials = useInitials();
    const firstName = auth.advisor?.name?.trim().split(/\s+/)[0];
    const upcomingFollowUps = (pendingReminders?.items ?? []).slice(0, 5);

    const funnelData = kpis.clients_by_status.map((status, index) => ({
        name: status.name,
        value: status.count,
        fill: status.color || FUNNEL_FALLBACK[index % FUNNEL_FALLBACK.length],
    }));

    return (
        <CrmLayout breadcrumbs={[]}>
            <Head title="Dashboard" />

            <CrmPage>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#0c3d4d] dark:text-foreground">
                        ¡Hola{firstName ? `, ${firstName}` : ''}!
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">Aquí está el resumen de tu CRM</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Clientes"
                        value={kpis.clients.total}
                        icon={Users}
                        href="/crm/clients"
                        iconClassName="bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300"
                    />
                    <MetricCard
                        label="Leads"
                        value={kpis.clients.datero}
                        icon={UserPlus}
                        href="/crm/clients?client_type=DATERO"
                        iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300"
                    />
                    <MetricCard
                        label="Lotes"
                        value={kpis.lots.total}
                        icon={Home}
                        href={myLots.url()}
                        iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"
                    />
                    <MetricCard
                        label="Seguimientos"
                        value={kpis.reminders_pending}
                        icon={Phone}
                        href="/crm/reminders?period=pendientes"
                        iconClassName="bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300"
                    />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card className={cn(dashboardCardClass, 'py-5')}>
                        <CardHeader className="px-6">
                            <CardTitle className="text-base">Embudo de ventas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {funnelData.length === 0 ? (
                                <EmptyState
                                    icon={Users}
                                    title="Aún no hay estados"
                                    description="Crea etapas en Estados y etiquetas para ver tu pipeline aquí."
                                    action={
                                        <Link
                                            href={pipeline.index()}
                                            className="text-sm font-medium text-sky-700 underline-offset-4 hover:underline dark:text-sky-300"
                                        >
                                            Ir a estados
                                        </Link>
                                    }
                                    className="py-8"
                                />
                            ) : (
                                <SalesFunnel data={funnelData} />
                            )}
                        </CardContent>
                    </Card>

                    <Card className={cn(dashboardCardClass, 'py-5')}>
                        <CardHeader className="px-6">
                            <CardTitle className="text-base">Clientes por mes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={clientsByMonth} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="month"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                        />
                                        <YAxis hide />
                                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
                                        <Bar
                                            dataKey="count"
                                            name="Clientes"
                                            fill={TEAL_BAR}
                                            radius={[6, 6, 0, 0]}
                                            maxBarSize={42}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card className={cn(dashboardCardClass, 'py-5')}>
                        <CardHeader className="px-6">
                            <CardTitle className="text-base">Últimos clientes</CardTitle>
                        </CardHeader>
                        <CardContent className="px-2">
                            {latestClients.length === 0 ? (
                                <EmptyState
                                    icon={Users}
                                    title="Todavía no tienes clientes"
                                    description="Cuando registres clientes, aparecerán aquí."
                                    className="py-8"
                                />
                            ) : (
                                <ul className="divide-y divide-border/70">
                                    {latestClients.map((client) => (
                                        <li key={client.id}>
                                            <Link
                                                href={clients.show(client.id)}
                                                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-muted/60"
                                            >
                                                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                                                    {getInitials(client.name)}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium">{client.name}</p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {client.phone || 'Sin teléfono'}
                                                    </p>
                                                </div>
                                                {client.status ? (
                                                    <StatusBadge color={client.status.color}>
                                                        {client.status.name}
                                                    </StatusBadge>
                                                ) : (
                                                    <StatusBadge>Sin estado</StatusBadge>
                                                )}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    <Card className={cn(dashboardCardClass, 'py-5')}>
                        <CardHeader className="px-6">
                            <CardTitle className="text-base">Próximos seguimientos</CardTitle>
                        </CardHeader>
                        <CardContent className="px-2">
                            {upcomingFollowUps.length === 0 ? (
                                <EmptyState
                                    icon={Phone}
                                    title="No hay seguimientos pendientes"
                                    description="Los recordatorios no completados aparecerán aquí."
                                    className="py-8"
                                />
                            ) : (
                                <ul className="divide-y divide-border/70">
                                    {upcomingFollowUps.map((item) => (
                                        <li key={item.id}>
                                            <Link
                                                href={
                                                    item.client
                                                        ? clients.show(item.client.id)
                                                        : '/crm/reminders?period=pendientes'
                                                }
                                                className="flex items-start gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-muted/60"
                                            >
                                                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                                                    <Phone className="size-4" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium">{item.title}</p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {item.client?.name ?? 'Sin cliente'}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        {formatDateTime(item.remind_at)}
                                                    </p>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {upcomingFollowUps.length > 0 ? (
                                <div className="px-4 pt-2">
                                    <Link
                                        href={reminders.index()}
                                        className="text-xs font-medium text-sky-700 underline-offset-4 hover:underline dark:text-sky-300"
                                    >
                                        Ver todos los recordatorios
                                    </Link>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                </div>
            </CrmPage>
        </CrmLayout>
    );
}
