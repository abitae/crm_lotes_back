import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AppLayout from '@/layouts/app-layout';
import { clientsListingQuerySuffix } from '@/lib/inmopro-listing-query';
import { formatClientPhone, useCanViewClientPhone } from '@/lib/inmopro-permissions';
import type { BreadcrumbItem } from '@/types';

type Option = { id: number; name: string; color?: string | null };
type Lot = { id: number; block: string; number: string; project?: { name: string }; status?: { code: string } };
type Reminder = { id: number; title: string; remind_at: string };
type CrmEvent = {
    id: number;
    action: string;
    label: string;
    source: string;
    created_at?: string;
    meta?: {
        preview?: string;
        kind?: string;
        from_status?: string | null;
        to_status?: string | null;
    } | null;
    advisor?: { name: string } | null;
};
type Client = {
    id: number;
    name: string;
    dni: string;
    phone: string | null;
    email?: string;
    referred_by?: string;
    type?: { name: string; color?: string };
    status?: { id: number; name: string; color?: string | null } | null;
    tags?: Array<{ id: number; name: string; color?: string | null }>;
    city?: { name: string; department?: string | null };
    advisor?: { name: string; team?: { name: string } | null };
    lots?: Lot[];
    reminders?: Reminder[];
    crm_events?: CrmEvent[];
};

export default function ClientsShow({
    client,
    clientStatuses,
    clientTags,
}: {
    client: Client;
    clientStatuses: Option[];
    clientTags: Option[];
}) {
    const listQs = clientsListingQuerySuffix(usePage().url);
    const canViewPhone = useCanViewClientPhone();
    const { data, setData, patch, processing } = useForm({
        client_status_id: client.status?.id ?? '',
        tag_ids: (client.tags ?? []).map((tag) => tag.id),
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Clientes', href: `/inmopro/clients${listQs}` },
        { title: client.name, href: `/inmopro/clients/${client.id}${listQs}` },
    ];

    const submitCrm = (e: FormEvent) => {
        e.preventDefault();
        patch(`/inmopro/clients/${client.id}/crm`, {
            preserveScroll: true,
        });
    };

    const toggleTag = (tagId: number) => {
        const current = data.tag_ids as number[];
        if (current.includes(tagId)) {
            setData(
                'tag_ids',
                current.filter((id) => id !== tagId),
            );
            return;
        }
        setData('tag_ids', [...current, tagId]);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${client.name} - Inmopro`} />
            <div className="space-y-8 p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-800">{client.name}</h2>
                    <Link
                        href={`/inmopro/clients/${client.id}/edit${listQs}`}
                        className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white hover:bg-slate-800"
                    >
                        Editar
                    </Link>
                </div>

                <div className="space-y-2 text-slate-600">
                    <p>Tipo: {client.type?.name ?? '-'}</p>
                    <p>DNI: {client.dni}</p>
                    <p>Teléfono: {formatClientPhone(client.phone, canViewPhone)}</p>
                    <p>Email: {client.email ?? '-'}</p>
                    <p>
                        Ciudad: {client.city?.name ?? '-'}
                        {client.city?.department ? ` · ${client.city.department}` : ''}
                    </p>
                    <p>
                        Vendedor: {client.advisor?.name ?? '-'}
                        {client.advisor?.team?.name ? ` · ${client.advisor.team.name}` : ''}
                    </p>
                    <p>Referido por: {client.referred_by ?? '-'}</p>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="mb-4 text-lg font-bold text-slate-800">Seguimiento CRM</h3>
                    <form onSubmit={submitCrm} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
                            <select
                                value={data.client_status_id === '' ? '' : String(data.client_status_id)}
                                onChange={(e) =>
                                    setData(
                                        'client_status_id',
                                        e.target.value === '' ? '' : Number(e.target.value),
                                    )
                                }
                                className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2"
                            >
                                <option value="">Sin estado</option>
                                {clientStatuses.map((status) => (
                                    <option key={status.id} value={status.id}>
                                        {status.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">Etiquetas</label>
                            <div className="flex flex-wrap gap-2">
                                {clientTags.map((tag) => {
                                    const selected = (data.tag_ids as number[]).includes(tag.id);
                                    return (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => toggleTag(tag.id)}
                                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                                                selected
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-slate-100 text-slate-700'
                                            }`}
                                        >
                                            {tag.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                            Guardar seguimiento
                        </button>
                    </form>

                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div>
                            <h4 className="mb-2 font-bold text-slate-800">Recordatorios pendientes</h4>
                            {(client.reminders ?? []).length === 0 ? (
                                <p className="text-sm text-slate-500">Sin recordatorios pendientes.</p>
                            ) : (
                                <ul className="space-y-2 text-sm text-slate-600">
                                    {(client.reminders ?? []).map((reminder) => (
                                        <li key={reminder.id}>
                                            {reminder.title} · {reminder.remind_at}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div>
                            <h4 className="mb-2 font-bold text-slate-800">Historial</h4>
                            {(client.crm_events ?? []).length === 0 ? (
                                <p className="text-sm text-slate-500">Sin eventos de seguimiento aún.</p>
                            ) : (
                                <ul className="space-y-3 text-sm text-slate-600">
                                    {(client.crm_events ?? []).map((event) => (
                                        <li key={event.id} className="border-b border-slate-100 pb-2 last:border-0">
                                            <div className="font-medium text-slate-800">{event.label}</div>
                                            {event.action === 'client.status_changed' ? (
                                                <div>
                                                    {(event.meta?.from_status ?? 'Sin estado')} →{' '}
                                                    {(event.meta?.to_status ?? 'Sin estado')}
                                                </div>
                                            ) : null}
                                            {event.action === 'whatsapp.message' && event.meta?.preview ? (
                                                <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">
                                                    {event.meta.preview}
                                                </p>
                                            ) : null}
                                            <div className="mt-1 text-xs text-slate-400">
                                                {event.created_at ?? ''}
                                                {event.advisor?.name ? ` · ${event.advisor.name}` : ''}
                                                {event.source ? ` · ${event.source}` : ''}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </section>

                {client.lots && client.lots.length > 0 && (
                    <div>
                        <h3 className="mb-4 text-lg font-bold text-slate-800">Lotes</h3>
                        <ul className="space-y-2">
                            {client.lots.map((lot) => (
                                <li key={lot.id} className="text-sm text-slate-600">
                                    {lot.block}-{lot.number} - {lot.project?.name} - {lot.status?.code}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
