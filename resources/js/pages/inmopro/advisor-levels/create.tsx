import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

export default function AdvisorLevelsCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        code: '',
        direct_rate: '',
        pyramid_rate: '',
        color: '#10b981',
        sort_order: '0',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Niveles de asesor', href: '/inmopro/advisor-levels' },
        { title: 'Nuevo', href: '/inmopro/advisor-levels/create' },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/inmopro/advisor-levels');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo nivel - Inmopro" />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">Nuevo nivel de asesor</h2>
                <form onSubmit={submit} className="max-w-md space-y-4">
                    <div>
                        <Label htmlFor="name">Nombre</Label>
                        <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} className="mt-1" />
                        <InputError message={errors.name} />
                    </div>
                    <div>
                        <Label htmlFor="code">Codigo (opcional)</Label>
                        <Input id="code" value={data.code} onChange={(e) => setData('code', e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <Label htmlFor="direct_rate">Comision directa %</Label>
                        <Input id="direct_rate" type="number" min={0} max={100} value={data.direct_rate} onChange={(e) => setData('direct_rate', e.target.value)} className="mt-1" />
                        <InputError message={errors.direct_rate} />
                    </div>
                    <div>
                        <Label htmlFor="pyramid_rate">Comision piramidal %</Label>
                        <Input id="pyramid_rate" type="number" min={0} max={100} value={data.pyramid_rate} onChange={(e) => setData('pyramid_rate', e.target.value)} className="mt-1" />
                        <InputError message={errors.pyramid_rate} />
                    </div>
                    <div>
                        <Label htmlFor="color">Color</Label>
                        <Input id="color" value={data.color} onChange={(e) => setData('color', e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <Label htmlFor="sort_order">Orden</Label>
                        <Input id="sort_order" type="number" min={0} value={data.sort_order} onChange={(e) => setData('sort_order', e.target.value)} className="mt-1" />
                    </div>
                    <Button type="submit" disabled={processing}>Guardar</Button>
                </form>
            </div>
        </AppLayout>
    );
}
