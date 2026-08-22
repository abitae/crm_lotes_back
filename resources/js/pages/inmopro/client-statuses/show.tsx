import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type ClientStatus = {
    id: number;
    name: string;
    code: string;
    description?: string | null;
    sort_order?: number;
    is_active: boolean;
    clients_count?: number;
};

export default function ClientStatusesShow({ clientStatus }: { clientStatus: ClientStatus }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Estados CRM', href: '/inmopro/client-statuses' },
        { title: clientStatus.name, href: `/inmopro/client-statuses/${clientStatus.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${clientStatus.name} - Inmopro`} />
            <div className="p-4">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-800">{clientStatus.name}</h2>
                    <Link
                        href={`/inmopro/client-statuses/${clientStatus.id}/edit`}
                        className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white hover:bg-slate-800"
                    >
                        Editar
                    </Link>
                </div>
                <div className="space-y-2 text-slate-600">
                    <p>Codigo: {clientStatus.code}</p>
                    <p>Descripcion: {clientStatus.description ?? '-'}</p>
                    <p>Orden: {clientStatus.sort_order ?? 0}</p>
                    <p>Clientes: {clientStatus.clients_count ?? 0}</p>
                    <p>Estado: {clientStatus.is_active ? 'Activo' : 'Inactivo'}</p>
                </div>
            </div>
        </AppLayout>
    );
}
