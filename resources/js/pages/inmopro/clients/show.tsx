import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { clientsListingQuerySuffix } from '@/lib/inmopro-listing-query';
import type { BreadcrumbItem } from '@/types';

type Client = {
    id: number;
    name: string;
    dni: string;
    phone: string;
    email?: string;
    referred_by?: string;
    type?: { name: string; color?: string };
    city?: { name: string; department?: string | null };
    advisor?: { name: string; team?: { name: string } | null };
    lots?: Array<{ id: number; block: string; number: string; project?: { name: string }; status?: { code: string } }>;
};

export default function ClientsShow({ client }: { client: Client }) {
    const listQs = clientsListingQuerySuffix(usePage().url);
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Clientes', href: `/inmopro/clients${listQs}` },
        { title: client.name, href: `/inmopro/clients/${client.id}${listQs}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${client.name} - Inmopro`} />
            <div className="p-4">
                <div className="mb-6 flex items-center justify-between">
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
                    <p>Teléfono: {client.phone}</p>
                    <p>Email: {client.email ?? '-'}</p>
                    <p>Ciudad: {client.city?.name ?? '-'}{client.city?.department ? ` · ${client.city.department}` : ''}</p>
                    <p>Vendedor: {client.advisor?.name ?? '-'}{client.advisor?.team?.name ? ` · ${client.advisor.team.name}` : ''}</p>
                    <p>Referido por: {client.referred_by ?? '-'}</p>
                </div>
                {client.lots && client.lots.length > 0 && (
                    <div className="mt-8">
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
