import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Search, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import Pagination, { type PaginationLink } from '@/components/pagination';
import type { BreadcrumbItem } from '@/types';

type Role = { id: number; name: string };
type UserRow = {
    id: number;
    name: string;
    email: string;
    roles?: Role[];
};

export default function AccessControlUsersIndex({
    users,
    filters,
}: {
    users: { data: UserRow[]; links: PaginationLink[] };
    filters: { search?: string };
}) {
    const [search, setSearch] = useState(filters.search ?? '');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Control de acceso', href: '/inmopro/access-control/roles' },
        { title: 'Usuarios', href: '/inmopro/access-control/users' },
    ];

    const applySearch = () => {
        router.get('/inmopro/access-control/users', { search: search || undefined }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Usuarios - Control de acceso" />
            <div className="space-y-6 p-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Usuarios y roles</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Asigne roles Spatie a cada usuario del panel.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href="/inmopro/access-control/users/create"
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                        <UserPlus className="h-4 w-4" />
                        Nuevo usuario
                    </Link>
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                        placeholder="Nombre o email..."
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
                                    Usuario
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300">
                                    Roles
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-slate-600 dark:text-slate-300">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {users.data.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                                            <Users className="h-4 w-4 text-slate-400" />
                                            <div>
                                                <div>{u.name}</div>
                                                <div className="text-xs text-slate-500">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                        {(u.roles ?? []).map((r) => r.name).join(', ') || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Link
                                            href={`/inmopro/access-control/users/${u.id}/roles`}
                                            className="inline-flex rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination links={users.links} />
            </div>
        </AppLayout>
    );
}
