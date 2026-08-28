import { Head, Link, router } from '@inertiajs/react';
import { KeyRound, Pencil, Plus, Search, Shield, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Pagination, { type PaginationLink } from '@/components/pagination';
import AppLayout from '@/layouts/app-layout';
import { confirmDelete } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

type RoleRow = {
    id: number;
    name: string;
    permissions_count?: number;
};

export default function AccessControlRolesIndex({
    roles,
    filters,
}: {
    roles: { data: RoleRow[]; links: PaginationLink[] };
    filters: { search?: string };
}) {
    const [search, setSearch] = useState(filters.search ?? '');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Control de acceso', href: '/inmopro/access-control/roles' },
        { title: 'Roles', href: '/inmopro/access-control/roles' },
    ];

    const applySearch = () => {
        router.get('/inmopro/access-control/roles', { search: search || undefined }, { preserveState: true });
    };

    const destroyRole = async (id: number, name: string) => {
        if (await confirmDelete(`Eliminar rol "${name}"?`)) {
            router.delete(`/inmopro/access-control/roles/${id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles - Control de acceso" />
            <div className="space-y-6 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Roles</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Agrupe permisos y asígnelos a usuarios.
                        </p>
                    </div>
                    <Link
                        href="/inmopro/access-control/roles/create"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-700"
                    >
                        <Plus className="h-5 w-5" /> Nuevo rol
                    </Link>
                </div>

                <div className="flex flex-wrap gap-2">
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                        placeholder="Buscar por nombre..."
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
                                    Rol
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300">
                                    Permisos
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-slate-600 dark:text-slate-300">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {roles.data.map((role) => (
                                <tr key={role.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                                        <span className="inline-flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-emerald-600" />
                                            {role.name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                        {role.permissions_count ?? 0}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                href={`/inmopro/access-control/roles/${role.id}/permissions`}
                                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                title="Permisos"
                                            >
                                                <KeyRound className="h-4 w-4" />
                                            </Link>
                                            <Link
                                                href={`/inmopro/access-control/roles/${role.id}/edit`}
                                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            {role.name !== 'super-admin' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => destroyRole(role.id, role.name)}
                                                    className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination links={roles.links} />
            </div>
        </AppLayout>
    );
}
