import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type AdvisorLevel = { id: number; name: string; code?: string; direct_rate?: string; pyramid_rate?: string; color?: string; sort_order?: number };
type AdvisorLevelForm = {
    name: string;
    code: string;
    direct_rate: string;
    pyramid_rate: string;
    color: string;
    sort_order: string;
};

export default function AdvisorLevelsEdit({ advisorLevel }: { advisorLevel: AdvisorLevel }) {
    const { data, setData, put, processing, errors, transform } = useForm<AdvisorLevelForm>({
        name: advisorLevel.name,
        code: advisorLevel.code ?? '',
        direct_rate: advisorLevel.direct_rate ?? '',
        pyramid_rate: advisorLevel.pyramid_rate ?? '',
        color: advisorLevel.color ?? '#10b981',
        sort_order: String(advisorLevel.sort_order ?? 0),
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Niveles de asesor', href: '/inmopro/advisor-levels' },
        { title: 'Editar', href: '/inmopro/advisor-levels/' + advisorLevel.id + '/edit' },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((formData) => ({
            ...formData,
            direct_rate: formData.direct_rate ? Number(formData.direct_rate) : null,
            pyramid_rate: formData.pyramid_rate ? Number(formData.pyramid_rate) : null,
            sort_order: Number(formData.sort_order) || 0,
        }));
        put('/inmopro/advisor-levels/' + advisorLevel.id);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={'Editar ' + advisorLevel.name + ' - Inmopro'} />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">Editar nivel de asesor</h2>
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
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="direct_rate">Comision directa %</Label>
                            <Input id="direct_rate" type="number" min={0} max={100} step="0.01" value={data.direct_rate} onChange={(e) => setData('direct_rate', e.target.value)} className="mt-1" />
                            <InputError message={errors.direct_rate} />
                        </div>
                        <div>
                            <Label htmlFor="pyramid_rate">Comision piramidal %</Label>
                            <Input id="pyramid_rate" type="number" min={0} max={100} step="0.01" value={data.pyramid_rate} onChange={(e) => setData('pyramid_rate', e.target.value)} className="mt-1" />
                            <InputError message={errors.pyramid_rate} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="color">Color</Label>
                        <Input id="color" value={data.color} onChange={(e) => setData('color', e.target.value)} className="mt-1" />
                        <InputError message={errors.color} />
                    </div>
                    <div>
                        <Label htmlFor="sort_order">Orden</Label>
                        <Input id="sort_order" type="number" min={0} value={data.sort_order} onChange={(e) => setData('sort_order', e.target.value)} className="mt-1" />
                        <InputError message={errors.sort_order} />
                    </div>
                    <Button type="submit" disabled={processing}>Actualizar</Button>
                </form>
            </div>
        </AppLayout>
    );
}
