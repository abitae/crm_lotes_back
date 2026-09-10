import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Bell,
    IdCard,
    LandPlot,
    LifeBuoy,
    Mail,
    MapPin,
    MessageCircle,
    Pencil,
    Phone,
    UserRound,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AttentionTicketFormModal } from '@/components/crm/attention-tickets/attention-ticket-form-modal';
import { ClientTagToggles, toggleTagId } from '@/components/crm/clients/client-tag-toggles';
import { CrmPage } from '@/components/crm/crm-page';
import { EmptyState } from '@/components/crm/empty-state';
import { ReminderFormModal } from '@/components/crm/reminders/reminder-form-modal';
import { StatusBadge } from '@/components/crm/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useInitials } from '@/hooks/use-initials';
import CrmLayout from '@/layouts/crm/crm-layout';
import { formatArea, formatDate, formatMoney } from '@/lib/crm-format';
import { crmSelectClass } from '@/lib/crm-ui';
import { cn } from '@/lib/utils';
import clients from '@/routes/crm/clients';
import clientsCrm from '@/routes/crm/clients/crm';
import lots from '@/routes/crm/lots';
import type { BreadcrumbItem } from '@/types';

type Lot = {
    id: number;
    block: string | null;
    number: string | null;
    area: number | string | null;
    price: number | string | null;
    project: { id: number; name: string } | null;
    status: { code: string; name: string; color: string | null } | null;
};

type ClientDetail = {
    id: number;
    name: string;
    dni: string | null;
    phone: string;
    email: string | null;
    referred_by: string | null;
    created_at: string | null;
    type: { code: string; name: string } | null;
    status: { id: number; code: string; name: string; color: string | null } | null;
    tags: { id: number; name: string; color: string | null }[];
    city: { id: number; name: string; department: string | null } | null;
    lots: Lot[];
};

type CatalogOption = { id: number; code?: string; name: string; color?: string | null };

const panelClass = 'rounded-2xl border-0 bg-white shadow-sm dark:bg-card';

function whatsappHref(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');

    if (digits.length < 9) {
        return null;
    }

    const withCountry = digits.length === 9 ? `51${digits}` : digits;

    return `https://wa.me/${withCountry}`;
}

function DetailItem({
    icon: Icon,
    label,
    children,
}: {
    icon: typeof Phone;
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="flex gap-3 rounded-xl px-1 py-2">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e8f6f8] text-[#0c3d4d] dark:bg-teal-950 dark:text-teal-200">
                <Icon className="size-4" />
            </span>
            <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
                <div className="mt-0.5 text-sm font-medium text-foreground">{children}</div>
            </div>
        </div>
    );
}

export default function CrmClientsShow({
    client,
    statuses,
    tags,
    projects,
    ticketTypes,
}: {
    client: ClientDetail;
    statuses: CatalogOption[];
    tags: CatalogOption[];
    projects: { id: number; name: string }[];
    ticketTypes: { id: number; name: string }[];
}) {
    const getInitials = useInitials();
    const [reminderOpen, setReminderOpen] = useState(false);
    const [ticketOpen, setTicketOpen] = useState(false);
    const selectedTagIds = client.tags.map((tag) => tag.id);
    const whatsapp = whatsappHref(client.phone);
    const cityLabel = client.city
        ? [client.city.name, client.city.department].filter(Boolean).join(', ')
        : null;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Clientes', href: '/crm/clients' },
        { title: client.name, href: `/crm/clients/${client.id}` },
    ];

    const updateCrm = (payload: Record<string, unknown>) => {
        router.patch(clientsCrm.update(client.id).url, payload, { preserveScroll: true });
    };

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title={client.name} />

            <CrmPage>
                <div className={cn(panelClass, 'p-5 md:p-6')}>
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#0c3d4d] text-lg font-semibold text-white">
                                {getInitials(client.name)}
                            </span>
                            <div className="min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-2xl font-bold tracking-tight text-[#0c3d4d] dark:text-foreground">
                                        {client.name}
                                    </h1>
                                    {client.status ? (
                                        <StatusBadge color={client.status.color}>{client.status.name}</StatusBadge>
                                    ) : (
                                        <StatusBadge>Sin estado</StatusBadge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {client.type?.name ?? 'Cliente'}
                                    {cityLabel ? ` · ${cityLabel}` : ''}
                                    {client.created_at ? ` · Desde ${formatDate(client.created_at)}` : ''}
                                </p>
                                <div className="flex flex-wrap gap-3 text-sm">
                                    <a href={`tel:${client.phone}`} className="font-medium text-[#0c3d4d] hover:underline dark:text-teal-200">
                                        {client.phone}
                                    </a>
                                    {client.email ? (
                                        <a
                                            href={`mailto:${client.email}`}
                                            className="truncate text-muted-foreground hover:text-foreground hover:underline"
                                        >
                                            {client.email}
                                        </a>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button asChild variant="outline" size="sm">
                                <Link href={clients.index()}>
                                    <ArrowLeft className="mr-1.5 size-4" />
                                    Clientes
                                </Link>
                            </Button>
                            {whatsapp ? (
                                <Button asChild variant="outline" size="sm">
                                    <a href={whatsapp} target="_blank" rel="noreferrer">
                                        <MessageCircle className="mr-1.5 size-4" />
                                        WhatsApp
                                    </a>
                                </Button>
                            ) : null}
                            <Button type="button" variant="outline" size="sm" onClick={() => setReminderOpen(true)}>
                                <Bell className="mr-1.5 size-4" />
                                Recordatorio
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setTicketOpen(true)}>
                                <LifeBuoy className="mr-1.5 size-4" />
                                Ticket
                            </Button>
                            <Button asChild size="sm" className="bg-[#1aa8b5] text-white hover:bg-[#1599a6]">
                                <Link href={clients.edit(client.id)}>
                                    <Pencil className="mr-1.5 size-4" />
                                    Editar
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card className={cn(panelClass, 'py-5')}>
                        <CardHeader className="px-6">
                            <CardTitle className="text-base">Datos de contacto</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-1 px-5 sm:grid-cols-2">
                            <DetailItem icon={IdCard} label="DNI">
                                {client.dni || '—'}
                            </DetailItem>
                            <DetailItem icon={Phone} label="Teléfono">
                                <a href={`tel:${client.phone}`} className="hover:underline">
                                    {client.phone}
                                </a>
                            </DetailItem>
                            <DetailItem icon={Mail} label="Correo">
                                {client.email ? (
                                    <a href={`mailto:${client.email}`} className="break-all hover:underline">
                                        {client.email}
                                    </a>
                                ) : (
                                    '—'
                                )}
                            </DetailItem>
                            <DetailItem icon={MapPin} label="Ciudad">
                                {cityLabel || '—'}
                            </DetailItem>
                            <DetailItem icon={UserRound} label="Referido por">
                                {client.referred_by || '—'}
                            </DetailItem>
                        </CardContent>
                    </Card>

                    <Card className={cn(panelClass, 'py-5')}>
                        <CardHeader className="px-6">
                            <CardTitle className="text-base">Seguimiento</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 px-6">
                            <div className="grid gap-2">
                                <Label htmlFor="client-status">Estado del pipeline</Label>
                                <select
                                    id="client-status"
                                    value={client.status?.id ?? ''}
                                    onChange={(event) => {
                                        if (event.target.value) {
                                            updateCrm({ client_status_id: Number(event.target.value) });
                                        }
                                    }}
                                    className={crmSelectClass}
                                >
                                    <option value="">Sin estado</option>
                                    {statuses.map((status) => (
                                        <option key={status.id} value={status.id}>
                                            {status.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Etiquetas</Label>
                                <ClientTagToggles
                                    tags={tags}
                                    selectedIds={selectedTagIds}
                                    onToggle={(tagId) => updateCrm({ tag_ids: toggleTagId(selectedTagIds, tagId) })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className={cn(panelClass, 'py-5')}>
                    <CardHeader className="px-6">
                        <CardTitle className="text-base">Lotes relacionados</CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 md:px-4">
                        {client.lots.length === 0 ? (
                            <EmptyState
                                icon={LandPlot}
                                title="Sin lotes relacionados"
                                description="Cuando este cliente tenga un lote o una pre-reserva, aparecerá aquí."
                                className="py-8"
                            />
                        ) : (
                            <ul className="divide-y divide-border/70">
                                {client.lots.map((lot) => (
                                    <li key={lot.id}>
                                        <Link
                                            href={lots.show(lot.id)}
                                            className="flex flex-col gap-2 rounded-xl px-4 py-3 transition-colors hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-medium">
                                                    {lot.project?.name ?? 'Proyecto'} · Mz. {lot.block ?? '—'} Lt.{' '}
                                                    {lot.number ?? '—'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatArea(lot.area)} · {formatMoney(lot.price)}
                                                </p>
                                            </div>
                                            {lot.status ? (
                                                <StatusBadge color={lot.status.color}>{lot.status.name}</StatusBadge>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">Sin estado</span>
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </CrmPage>

            <ReminderFormModal
                open={reminderOpen}
                onOpenChange={setReminderOpen}
                reminder={{
                    client_id: client.id,
                    title: '',
                    notes: null,
                    remind_at: '',
                }}
                clients={[{ id: client.id, name: client.name }]}
            />

            <AttentionTicketFormModal
                open={ticketOpen}
                onOpenChange={setTicketOpen}
                clients={[{ id: client.id, name: client.name, dni: client.dni }]}
                projects={projects}
                ticketTypes={ticketTypes}
                defaultClientId={client.id}
            />
        </CrmLayout>
    );
}
