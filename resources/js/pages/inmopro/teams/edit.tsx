import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Team = {
    id: number;
    name: string;
    code: string;
    description?: string | null;
    color?: string | null;
    sort_order?: number;
    is_active: boolean;
    group_sales_goal?: string | number;
};

export default function TeamsEdit({ team }: { team: Team }) {
    const { data, setData, put, processing, errors } = useForm({
        name: team.name,
        code: team.code,
        description: team.description ?? '',
        color: team.color ?? '#0f766e',
        sort_order: team.sort_order ?? 0,
        is_active: team.is_active,
        group_sales_goal: Number(team.group_sales_goal ?? 0),
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Teams comerciales', href: '/inmopro/teams' },
        { title: 'Editar', href: `/inmopro/teams/${team.id}/edit` },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`/inmopro/teams/${team.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${team.name} - Inmopro`} />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">Editar Team</h2>
                <form onSubmit={submit} className="max-w-md space-y-4">
                    <div>
                        <Label htmlFor="name">Nombre</Label>
                        <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} className="mt-1" />
                        <InputError message={errors.name} />
                    </div>
                    <div>
                        <Label htmlFor="code">Codigo</Label>
                        <Input id="code" value={data.code} onChange={(e) => setData('code', e.target.value.toUpperCase())} className="mt-1" />
                        <InputError message={errors.code} />
                    </div>
                    <div>
                        <Label htmlFor="description">Descripcion</Label>
                        <Input id="description" value={data.description} onChange={(e) => setData('description', e.target.value)} className="mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="color">Color</Label>
                            <Input id="color" value={data.color} onChange={(e) => setData('color', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="sort_order">Orden</Label>
                            <Input id="sort_order" type="number" min={0} value={data.sort_order} onChange={(e) => setData('sort_order', Number(e.target.value))} className="mt-1" />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="group_sales_goal">Meta grupal (S/)</Label>
                        <Input
                            id="group_sales_goal"
                            type="number"
                            min={0}
                            step="0.01"
                            value={data.group_sales_goal}
                            onChange={(e) => setData('group_sales_goal', Number(e.target.value))}
                            className="mt-1"
                        />
                        <p className="mt-1 text-xs text-slate-500">Si es 0, en reportes se usa la suma de cuotas personales del equipo.</p>
                        <InputError message={errors.group_sales_goal} />
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        Team activo
                    </label>
                    <Button type="submit" disabled={processing}>Actualizar</Button>
                </form>
            </div>
        </AppLayout>
    );
}
