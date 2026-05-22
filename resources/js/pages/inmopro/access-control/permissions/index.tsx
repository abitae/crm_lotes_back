import { Head, Link, router } from '@inertiajs/react';
import { RefreshCw, Search } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import Pagination, { type PaginationLink } from '@/components/pagination';
import type { BreadcrumbItem } from '@/types';

type Perm = { id: number; name: string };

export default function AccessControlPermissionsIndex({
    permissions,
    filters,
}: {
    permissions: { data: Perm[]; links: PaginationLink[] };
    filters: { search?: string };
}) {
    const [search, setSearch] = useState(filters.search ?? '');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Control de acceso', href: '/inmopro/access-control/roles' },
        { title: 'Permisos', href: '/inmopro/access-control/permissions' },
    ];

    const applySearch = () => {
        router.get('/inmopro/access-control/permissions', { search: search || undefined }, { preserveState: true });
    };

    const syncRoutes = () => {
        router.post('/inmopro/access-control/permissions/sync-routes', {}, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Permisos - Control de acceso" />
            <div className="space-y-6 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Permisos</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Cada permiso coincide con el nombre de ruta Inmopro (inmopro.*).
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={syncRoutes}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 font-bold text-white hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                    >
                        <RefreshCw className="h-5 w-5" /> Sincronizar desde rutas
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                        placeholder="Filtrar por nombre..."
                        className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                    <button
                        type="button"
                        onClick={applySearch}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                    >
                        <Search className="h-4 w-4" /> Buscar
                    </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground dark:border-slate-700 dark:bg-slate-950/40">
                    <table className="w-full">
                        <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300">
                                    Nombre (ruta)
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-sm dark:divide-slate-800">
                            {permissions.data.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                    <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{p.name}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination links={permissions.links} />

                <p className="text-xs text-slate-500 dark:text-slate-400">
                    <Link href="/inmopro/access-control/roles" className="text-emerald-600 hover:underline">
                        Volver a roles
                    </Link>
                </p>
            </div>
        </AppLayout>
    );
}
