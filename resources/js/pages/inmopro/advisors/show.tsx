import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { formatCalendarDate } from '@/lib/date';
import type { BreadcrumbItem } from '@/types';

type Advisor = {
    id: number;
    name: string;
    email: string;
    phone: string;
    personal_quota: string;
    joined_at?: string | null;
    level?: { name: string };
    superior?: { name: string };
    lots?: Array<{ id: number; block: string; number: string; project?: { name: string } }>;
};

export default function AdvisorsShow({ advisor }: { advisor: Advisor }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Vendedores', href: '/inmopro/advisors' },
        { title: advisor.name, href: `/inmopro/advisors/${advisor.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${advisor.name} - Inmopro`} />
            <div className="p-4">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-800">{advisor.name}</h2>
                    <Link
                        href={`/inmopro/advisors/${advisor.id}/edit`}
                        className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white hover:bg-slate-800"
                    >
                        Editar
                    </Link>
                </div>
                <div className="space-y-2 text-slate-600">
                    <p>Nivel: {advisor.level?.name ?? '-'}</p>
                    <p>Superior: {advisor.superior?.name ?? 'Alta Gerencia'}</p>
                    <p>Email: {advisor.email}</p>
                    <p>Teléfono: {advisor.phone}</p>
                    <p>Cuota: S/ {Number(advisor.personal_quota).toLocaleString()}</p>
                    <p>
                        Fecha de ingreso:{' '}
                        {formatCalendarDate(advisor.joined_at, {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                        })}
                    </p>
                </div>
                {advisor.lots && advisor.lots.length > 0 && (
                    <div className="mt-8">
                        <h3 className="mb-4 text-lg font-bold text-slate-800">Lotes</h3>
                        <ul className="space-y-2">
                            {advisor.lots.map((lot) => (
                                <li key={lot.id} className="text-sm text-slate-600">
                                    {lot.block}-{lot.number} — {lot.project?.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
