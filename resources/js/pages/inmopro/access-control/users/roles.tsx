import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Role = { id: number; name: string };
type TargetUser = { id: number; name: string; email: string };

export default function AccessControlUserRoles({
    targetUser,
    roles,
    assignedRoleIds,
}: {
    targetUser: TargetUser;
    roles: Role[];
    assignedRoleIds: number[];
}) {
    const { data, setData, put, processing } = useForm({
        role_ids: [...assignedRoleIds],
    });

    const toggle = (id: number) => {
        const set = new Set(data.role_ids);
        if (set.has(id)) {
            set.delete(id);
        } else {
            set.add(id);
        }
        setData('role_ids', [...set]);
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Control de acceso', href: '/inmopro/access-control/users' },
        { title: 'Usuarios', href: '/inmopro/access-control/users' },
        { title: targetUser.name, href: '#' },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`/inmopro/access-control/users/${targetUser.id}/roles`, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Roles: ${targetUser.name}`} />
            <div className="mx-auto max-w-xl space-y-6 p-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Roles del usuario</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {targetUser.name} — {targetUser.email}
                    </p>
                </div>

                <form
                    onSubmit={submit}
                    className="space-y-4 rounded-2xl border border-border bg-card text-card-foreground p-6 dark:border-slate-700 dark:bg-slate-950/40"
                >
                    <ul className="space-y-2">
                        {roles.map((r) => (
                            <li key={r.id}>
                                <label className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                    <input
                                        type="checkbox"
                                        checked={data.role_ids.includes(r.id)}
                                        onChange={() => toggle(r.id)}
                                    />
                                    <span className="font-medium text-slate-800 dark:text-slate-100">{r.name}</span>
                                </label>
                            </li>
                        ))}
                    </ul>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            Guardar
                        </button>
                        <Link
                            href="/inmopro/access-control/users"
                            className="rounded-xl border border-slate-200 px-4 py-2 font-semibold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                        >
                            Volver
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
