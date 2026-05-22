import { Head, Link, router } from '@inertiajs/react';
import { Plus, Eye, Pencil, Trash2, UserPlus } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { confirmDelete } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

type MembershipTypeRow = {
    id: number;
    name: string;
    months: number;
    amount: string;
    advisor_memberships_count?: number;
};

export default function MembershipTypesIndex({
    membershipTypes,
}: {
    membershipTypes: { data: MembershipTypeRow[]; links: PaginationLink[] };
}) {
    const items = membershipTypes.data;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Tipos de membresía', href: '/inmopro/membership-types' },
    ];

    const handleDestroy = async (id: number, name: string) => {
        if (await confirmDelete(`¿Eliminar tipo de membresía "${name}"?`)) {
            router.delete(`/inmopro/membership-types/${id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tipos de membresía - Inmopro" />
            <div className="space-y-6 p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Tipos de membresía</h2>
                        <p className="text-sm text-slate-500">Duración en meses. Al asignar a un vendedor se define la fecha de inicio y se calcula el vencimiento.</p>
                    </div>
                    <Link
                        href="/inmopro/membership-types/create"
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-700"
                    >
                        <Plus className="h-5 w-5" /> Nuevo tipo
                    </Link>
                </div>
                <div className="rounded-2xl border border-border bg-card text-card-foreground overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Nombre</th>
                                <th className="px-4 py-3 text-center text-sm font-bold text-slate-600">Duración</th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-slate-600">Monto</th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-slate-600">Asignados</th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((row) => (
                                <tr key={row.id}>
                                    <td className="px-4 py-3 font-medium">{row.name}</td>
                                    <td className="px-4 py-3 text-center text-slate-600">{row.months} meses</td>
                                    <td className="px-4 py-3 text-right font-medium">S/ {Number(row.amount).toLocaleString('es-PE')}</td>
                                    <td className="px-4 py-3 text-right">{row.advisor_memberships_count ?? 0}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                href={`/inmopro/membership-types/${row.id}/bulk-assign`}
                                                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                                title="Asignar masivamente a vendedores"
                                            >
                                                <UserPlus className="h-4 w-4" /> Asignar
                                            </Link>
                                            <Link href={`/inmopro/membership-types/${row.id}`} className="text-slate-500 hover:text-slate-700">
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                            <Link href={`/inmopro/membership-types/${row.id}/edit`} className="text-slate-500 hover:text-slate-700">
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => handleDestroy(row.id, row.name)}
                                                className="text-slate-400 hover:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {items.length === 0 && (
                        <div className="py-12 text-center text-slate-500">
                            No hay tipos de membresía. Cree uno (duración en meses) y asígnelo masivamente a vendedores.
                        </div>
                    )}
                    {items.length > 0 && (
                        <div className="border-t border-slate-100 px-4 py-3">
                            <Pagination links={membershipTypes.links} />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
