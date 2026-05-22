import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { todayIsoDate } from '@/lib/date';
import type { BreadcrumbItem } from '@/types';

type MembershipType = {
    id: number;
    name: string;
    months: number;
    amount: string;
};

type Advisor = { id: number; name: string; email: string };

type PageProps = {
    membershipType: MembershipType;
    advisors: Advisor[];
    alreadyAssignedIds: number[];
};

export default function MembershipTypesBulkAssign({ membershipType, advisors, alreadyAssignedIds }: PageProps) {
    const [search, setSearch] = useState('');
    const today = todayIsoDate();
    const { data, setData, post, processing, errors } = useForm({
        advisor_ids: [] as number[],
        start_date: today,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Tipos de membresía', href: '/inmopro/membership-types' },
        { title: membershipType.name, href: `/inmopro/membership-types/${membershipType.id}` },
        { title: 'Asignar masivamente', href: `/inmopro/membership-types/${membershipType.id}/bulk-assign` },
    ];

    const filtered = advisors.filter(
        (a) =>
            a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
    );
    const assignable = filtered.filter((a) => !alreadyAssignedIds.includes(a.id));

    const toggleAdvisor = (id: number) => {
        if (alreadyAssignedIds.includes(id)) return;
        setData(
            'advisor_ids',
            data.advisor_ids.includes(id) ? data.advisor_ids.filter((x) => x !== id) : [...data.advisor_ids, id]
        );
    };

    const toggleAllAssignable = () => {
        const ids = assignable.map((a) => a.id);
        const allSelected = ids.every((id) => data.advisor_ids.includes(id));
        setData('advisor_ids', allSelected ? [] : ids);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(`/inmopro/membership-types/${membershipType.id}/bulk-assign`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Asignar ${membershipType.name} - Inmopro`} />
            <div className="space-y-6 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Asignar membresía masivamente</h2>
                        <p className="text-sm text-slate-500">
                            {membershipType.name} · {membershipType.months} meses · S/{' '}
                            {Number(membershipType.amount).toLocaleString('es-PE')}
                        </p>
                    </div>
                    <Link
                        href="/inmopro/membership-types"
                        className="text-sm font-medium text-slate-600 hover:text-slate-800"
                    >
                        ← Volver a tipos
                    </Link>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="rounded-xl border border-border bg-card text-card-foreground p-4">
                        <Label htmlFor="start_date">Fecha de inicio de la membresía</Label>
                        <p className="mt-1 text-sm text-slate-500">
                            La fecha de vencimiento se calculará automáticamente ({membershipType.months} meses después).
                        </p>
                        <Input
                            id="start_date"
                            type="date"
                            value={data.start_date}
                            onChange={(e) => setData('start_date', e.target.value)}
                            className="mt-2 max-w-xs"
                            required
                        />
                        <InputError message={errors.start_date} />
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Buscar vendedor por nombre o email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        {assignable.length > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={toggleAllAssignable}
                                className="shrink-0"
                            >
                                {assignable.every((a) => data.advisor_ids.includes(a.id))
                                    ? 'Desmarcar todos'
                                    : 'Marcar todos los visibles'}
                            </Button>
                        )}
                    </div>

                    <InputError message={errors.advisor_ids} />

                    <div className="rounded-2xl border border-border bg-card text-card-foreground">
                        <div className="max-h-[50vh] overflow-y-auto">
                            {filtered.length === 0 ? (
                                <div className="py-8 text-center text-slate-500">No hay vendedores que coincidan.</div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {filtered.map((advisor) => {
                                        const isAssigned = alreadyAssignedIds.includes(advisor.id);
                                        const isSelected = data.advisor_ids.includes(advisor.id);
                                        return (
                                            <li
                                                key={advisor.id}
                                                className={`flex items-center gap-3 px-4 py-3 ${isAssigned ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    id={`adv-${advisor.id}`}
                                                    checked={isAssigned || isSelected}
                                                    disabled={isAssigned}
                                                    onChange={() => toggleAdvisor(advisor.id)}
                                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <label
                                                    htmlFor={`adv-${advisor.id}`}
                                                    className={`flex-1 cursor-pointer ${isAssigned ? 'text-slate-400' : ''}`}
                                                >
                                                    <span className="font-medium">{advisor.name}</span>
                                                    <span className="ml-2 text-sm text-slate-500">{advisor.email}</span>
                                                    {isAssigned && (
                                                        <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
                                                            Ya asignado
                                                        </span>
                                                    )}
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                            <p className="text-sm text-slate-600">
                                <strong>{data.advisor_ids.length}</strong> vendedor(es) seleccionado(s)
                                {alreadyAssignedIds.length > 0 && (
                                    <span className="ml-2 text-slate-500">
                                        · {alreadyAssignedIds.length} ya tenían esta membresía
                                    </span>
                                )}
                            </p>
                            <Button type="submit" disabled={processing || data.advisor_ids.length === 0}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Asignar membresía
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
