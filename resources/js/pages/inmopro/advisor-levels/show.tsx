import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type AdvisorLevel = { id: number; name: string; code?: string; direct_rate?: string; pyramid_rate?: string; color?: string; advisors_count?: number };

export default function AdvisorLevelsShow({ advisorLevel }: { advisorLevel: AdvisorLevel }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Niveles de asesor', href: '/inmopro/advisor-levels' },
        { title: advisorLevel.name, href: '/inmopro/advisor-levels/' + advisorLevel.id },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={advisorLevel.name + ' - Inmopro'} />
            <div className="space-y-6 p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">{advisorLevel.name}</h2>
                        <p className="text-sm text-slate-500">Comision directa: {advisorLevel.direct_rate ?? '—'}% | Piramidal: {advisorLevel.pyramid_rate ?? '—'}%</p>
                    </div>
                    <Link href={'/inmopro/advisor-levels/' + advisorLevel.id + '/edit'} className="rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-700">Editar</Link>
                </div>
                <div className="rounded-2xl border border-border bg-card text-card-foreground p-4">
                    <p className="text-slate-600">Asesores en este nivel: <strong>{advisorLevel.advisors_count ?? 0}</strong></p>
                </div>
            </div>
        </AppLayout>
    );
}
