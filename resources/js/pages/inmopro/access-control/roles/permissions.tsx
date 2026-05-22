import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Role = { id: number; name: string };
type Perm = { id: number; name: string };
type Group = { label: string; permissions: Perm[] };

export default function AccessControlRolePermissions({
    role,
    permissionGroups,
    assignedIds,
}: {
    role: Role;
    permissionGroups: Group[];
    assignedIds: number[];
}) {
    const { data, setData, put, processing } = useForm({
        permission_ids: [...assignedIds],
    });

    const toggle = (id: number) => {
        const set = new Set(data.permission_ids);
        if (set.has(id)) {
            set.delete(id);
        } else {
            set.add(id);
        }
        setData('permission_ids', [...set]);
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Control de acceso', href: '/inmopro/access-control/roles' },
        { title: 'Roles', href: '/inmopro/access-control/roles' },
        { title: `${role.name} — permisos`, href: '#' },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`/inmopro/access-control/roles/${role.id}/permissions`, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Permisos: ${role.name}`} />
            <div className="space-y-6 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                            Permisos del rol «{role.name}»
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Marque las rutas Inmopro que este rol puede ejecutar.
                        </p>
                    </div>
                    <Link
                        href="/inmopro/access-control/roles"
                        className="text-sm font-semibold text-emerald-600 hover:underline"
                    >
                        Volver a roles
                    </Link>
                </div>

                <form onSubmit={submit} className="space-y-8">
                    {permissionGroups.map((group) => (
                        <div
                            key={group.label}
                            className="rounded-2xl border border-border bg-card text-card-foreground p-4 dark:border-slate-700 dark:bg-slate-950/40"
                        >
                            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                {group.label}
                            </h3>
                            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {group.permissions.map((p) => (
                                    <li key={p.id}>
                                        <label className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <input
                                                type="checkbox"
                                                className="mt-1"
                                                checked={data.permission_ids.includes(p.id)}
                                                onChange={() => toggle(p.id)}
                                            />
                                            <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{p.name}</span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-xl bg-emerald-600 px-6 py-2.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                        Guardar permisos
                    </button>
                </form>
            </div>
        </AppLayout>
    );
}
