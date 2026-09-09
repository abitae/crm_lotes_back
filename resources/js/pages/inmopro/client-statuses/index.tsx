import { Head, Link } from '@inertiajs/react';
import { Tags, Eye } from 'lucide-react';
import Pagination, { type PaginationLink } from '@/components/pagination';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type ClientStatus = {
    id: number;
    name: string;
    code: string;
    color?: string | null;
    is_active: boolean;
    clients_count?: number;
    advisor?: { id: number; name: string } | null;
};

export default function ClientStatusesIndex({
    clientStatuses,
}: {
    clientStatuses: { data: ClientStatus[]; links: PaginationLink[] };
}) {
    const items = clientStatuses.data;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Estados CRM', href: '/inmopro/client-statuses' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Estados CRM - Inmopro" />
            <div className="space-y-6 p-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Estados CRM</h2>
                    <p className="text-sm text-slate-500">
                        Cada vendedor gestiona sus estados desde el CRM. Aquí solo puedes
                        consultarlos.
                    </p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
                    <table className="w-full">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Estado</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Vendedor</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Codigo</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Clientes</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Activo</th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((clientStatus) => (
                                <tr key={clientStatus.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-800">
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="inline-block h-4 w-4 rounded-full"
                                                style={{ backgroundColor: clientStatus.color ?? '#475569' }}
                                            />
                                            {clientStatus.name}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {clientStatus.advisor?.name ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{clientStatus.code}</td>
                                    <td className="px-4 py-3 text-slate-600">{clientStatus.clients_count ?? 0}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                                clientStatus.is_active
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {clientStatus.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                href={`/inmopro/client-statuses/${clientStatus.id}`}
                                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {items.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            <Tags className="mx-auto mb-2 h-10 w-10" />
                            <p>No hay estados CRM registrados.</p>
                        </div>
                    ) : (
                        <div className="border-t border-slate-100 px-4 py-3">
                            <Pagination links={clientStatuses.links} />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
