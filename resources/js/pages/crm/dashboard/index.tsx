import { Head } from '@inertiajs/react';
import {
    CalendarClock,
    LifeBuoy,
    MapPin,
    Users,
} from 'lucide-react';
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

function MetricCard({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: number;
    icon: React.ElementType;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
}

export default function CrmDashboard({ kpis }: { kpis: Kpis }) {
    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex flex-col gap-6 p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        label="Mis clientes"
                        value={kpis.clients.total}
                        icon={Users}
                    />
                    <MetricCard
                        label="Pre-reservas activas"
                        value={kpis.pre_reservations.active}
                        icon={MapPin}
                    />
                    <MetricCard
                        label="Tickets pendientes"
                        value={kpis.attention_tickets_pending}
                        icon={LifeBuoy}
                    />
                    <MetricCard
                        label="Recordatorios pendientes"
                        value={kpis.reminders_pending}
                        icon={CalendarClock}
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Clientes por estado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {kpis.clients_by_status.map((status) => (
                                <div
                                    key={status.id}
                                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                                >
                                    <span className="flex items-center gap-2 text-sm font-medium">
                                        <span
                                            className="size-2.5 rounded-full"
                                            style={{
                                                backgroundColor:
                                                    status.color ?? '#94a3b8',
                                            }}
                                        />
                                        {status.name}
                                    </span>
                                    <span className="text-sm font-semibold">
                                        {status.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pre-reservas</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <p className="text-lg font-bold">
                                    {kpis.pre_reservations.pending}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Pendientes
                                </p>
                            </div>
                            <div>
                                <p className="text-lg font-bold">
                                    {kpis.pre_reservations.approved}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Aprobadas
                                </p>
                            </div>
                            <div>
                                <p className="text-lg font-bold">
                                    {kpis.pre_reservations.rejected}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Rechazadas
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Mis lotes</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2 text-center">
                            <div>
                                <p className="text-lg font-bold">
                                    {kpis.lots.pre_reservation}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Pre-reserva
                                </p>
                            </div>
                            <div>
                                <p className="text-lg font-bold">
                                    {kpis.lots.reserved}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Reservados
                                </p>
                            </div>
                            <div>
                                <p className="text-lg font-bold">
                                    {kpis.lots.transferred}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Transferidos
                                </p>
                            </div>
                            <div>
                                <p className="text-lg font-bold">
                                    {kpis.lots.installments}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    En cuotas
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </CrmLayout>
    );
}
