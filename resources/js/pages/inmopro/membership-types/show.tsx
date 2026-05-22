import { Head, Link } from '@inertiajs/react';
import { UserPlus, Pencil } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type MembershipType = {
    id: number;
    name: string;
    months: number;
    amount: string;
    advisor_memberships_count?: number;
};

export default function MembershipTypesShow({ membershipType }: { membershipType: MembershipType }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Tipos de membresía', href: '/inmopro/membership-types' },
        { title: membershipType.name, href: `/inmopro/membership-types/${membershipType.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${membershipType.name} - Inmopro`} />
            <div className="space-y-6 p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">{membershipType.name}</h2>
                        <p className="text-sm text-slate-500">Duración: {membershipType.months} meses</p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={`/inmopro/membership-types/${membershipType.id}/bulk-assign`}
                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-700"
                        >
                            <UserPlus className="h-5 w-5" /> Asignar masivamente
                        </Link>
                        <Link
                            href={`/inmopro/membership-types/${membershipType.id}/edit`}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50"
                        >
                            <Pencil className="h-5 w-5" /> Editar
                        </Link>
                    </div>
                </div>
                <div className="rounded-2xl border border-border bg-card text-card-foreground p-6">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <dt className="text-sm font-medium text-slate-500">Duración</dt>
                            <dd className="mt-1 text-xl font-bold text-slate-800">{membershipType.months} meses</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-slate-500">Monto</dt>
                            <dd className="mt-1 text-xl font-bold text-slate-800">
                                S/ {Number(membershipType.amount).toLocaleString('es-PE')}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-slate-500">Vendedores asignados</dt>
                            <dd className="mt-1 text-xl font-bold text-slate-800">{membershipType.advisor_memberships_count ?? 0}</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </AppLayout>
    );
}
