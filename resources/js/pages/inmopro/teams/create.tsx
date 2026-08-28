import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

export default function TeamsCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        code: '',
        description: '',
        color: '#0f766e',
        sort_order: 0,
        is_active: true,
        group_sales_goal: 0,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Teams comerciales', href: '/inmopro/teams' },
        { title: 'Nuevo', href: '/inmopro/teams/create' },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/inmopro/teams');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo Team - Inmopro" />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">Nuevo Team</h2>
                <TeamForm data={data} setData={setData} errors={errors} processing={processing} onSubmit={submit} submitLabel="Guardar" />
            </div>
        </AppLayout>
    );
}

function TeamForm({ data, setData, errors, processing, onSubmit, submitLabel }: any) {
    return (
        <form onSubmit={onSubmit} className="max-w-md space-y-4">
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
            <div>
                <Label htmlFor="color-hex">Color</Label>
                <div className="mt-1 flex gap-2">
                    <input
                        type="color"
                        aria-label="Selector de color"
                        value={/^#[0-9A-Fa-f]{6}$/.test(data.color) ? data.color : '#0f766e'}
                        onChange={(e) => setData('color', e.target.value)}
                        className="h-10 w-14 shrink-0 cursor-pointer rounded border border-slate-200"
                    />
                    <Input
                        id="color-hex"
                        value={data.color}
                        onChange={(e) => setData('color', e.target.value)}
                        placeholder="#0f766e"
                        className="flex-1"
                    />
                </div>
                <InputError message={errors.color} />
            </div>
            <div>
                <Label htmlFor="sort_order">Orden</Label>
                <Input id="sort_order" type="number" min={0} value={data.sort_order} onChange={(e) => setData('sort_order', Number(e.target.value))} className="mt-1" />
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
            <Button type="submit" disabled={processing}>{submitLabel}</Button>
        </form>
    );
}
