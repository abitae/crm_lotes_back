import { Form, Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

export default function AccessControlRolesCreate() {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Control de acceso', href: '/inmopro/access-control/roles' },
        { title: 'Roles', href: '/inmopro/access-control/roles' },
        { title: 'Nuevo', href: '/inmopro/access-control/roles/create' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo rol" />
            <div className="mx-auto max-w-lg space-y-6 p-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Nuevo rol</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Nombre único en el guard web.</p>
                </div>

                <Form
                    action="/inmopro/access-control/roles"
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
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                                />
                                {errors.name ? <p className="mt-1 text-sm text-red-600">{errors.name}</p> : null}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    Guardar
                                </button>
                                <Link
                                    href="/inmopro/access-control/roles"
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
