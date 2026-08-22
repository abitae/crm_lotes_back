import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type ClientTag = {
    id: number;
    name: string;
    code: string;
    description?: string | null;
    sort_order?: number;
    is_active: boolean;
    clients_count?: number;
};

export default function ClientTagsShow({ clientTag }: { clientTag: ClientTag }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Etiquetas CRM', href: '/inmopro/client-tags' },
        { title: clientTag.name, href: `/inmopro/client-tags/${clientTag.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${clientTag.name} - Inmopro`} />
            <div className="p-4">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-800">{clientTag.name}</h2>
                    <Link
                        href={`/inmopro/client-tags/${clientTag.id}/edit`}
                        className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white hover:bg-slate-800"
                    >
                        Editar
                    </Link>
                </div>
                <div className="space-y-2 text-slate-600">
                    <p>Codigo: {clientTag.code}</p>
                    <p>Descripcion: {clientTag.description ?? '-'}</p>
                    <p>Orden: {clientTag.sort_order ?? 0}</p>
                    <p>Clientes: {clientTag.clients_count ?? 0}</p>
                    <p>Estado: {clientTag.is_active ? 'Activo' : 'Inactivo'}</p>
                </div>
            </div>
        </AppLayout>
    );
}
