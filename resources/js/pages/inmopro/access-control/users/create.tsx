import { Form, Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Role = { id: number; name: string };

export default function AccessControlUsersCreate({ roles }: { roles: Role[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Control de acceso', href: '/inmopro/access-control/users' },
        { title: 'Usuarios', href: '/inmopro/access-control/users' },
        { title: 'Nuevo usuario', href: '/inmopro/access-control/users/create' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo usuario - Control de acceso" />
            <div className="mx-auto max-w-lg space-y-6 p-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Nuevo usuario</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        El correo quedará verificado para que pueda entrar al panel de inmediato. Asigne roles Spatie si
                        aplica.
                    </p>
                </div>

                <Form
                    action="/inmopro/access-control/users"
                    method="post"
                    className="space-y-4 rounded-2xl border border-border bg-card text-card-foreground p-6 dark:border-slate-700 dark:bg-slate-950/40"
                >
                    {({ processing, errors }) => (
                        <>
                            <div>
                                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Nombre
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    required
                                    autoComplete="name"
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                                />
                                {errors.name ? <p className="mt-1 text-sm text-red-600">{errors.name}</p> : null}
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Correo
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                                />
                                {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email}</p> : null}
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Contraseña
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    autoComplete="new-password"
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                                />
                                {errors.password ? <p className="mt-1 text-sm text-red-600">{errors.password}</p> : null}
                            </div>
                            <div>
                                <label
                                    htmlFor="password_confirmation"
                                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                                >
                                    Confirmar contraseña
                                </label>
                                <input
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    type="password"
                                    required
                                    autoComplete="new-password"
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                                />
                            </div>
                            {roles.length > 0 ? (
                                <div>
                                    <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Roles</p>
                                    <ul className="space-y-2 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                                        {roles.map((r) => (
                                            <li key={r.id}>
                                                <label className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                    <input type="checkbox" name="role_ids[]" value={r.id} />
                                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                                        {r.name}
                                                    </span>
                                                </label>
                                            </li>
                                        ))}
                                    </ul>
                                    {errors.role_ids ? <p className="mt-1 text-sm text-red-600">{errors.role_ids}</p> : null}
                                </div>
                            ) : null}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    Crear usuario
                                </button>
                                <Link
                                    href="/inmopro/access-control/users"
                                    className="rounded-xl border border-slate-200 px-4 py-2 font-semibold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                                >
                                    Cancelar
                                </Link>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </AppLayout>
    );
}
