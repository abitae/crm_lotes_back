import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import type { BreadcrumbItem } from '@/types';

export default function ClientTagsCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        code: '',
        description: '',
        color: '#22c55e',
        sort_order: 0,
        is_active: true,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Etiquetas CRM', href: '/inmopro/client-tags' },
        { title: 'Nueva', href: '/inmopro/client-tags/create' },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/inmopro/client-tags');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nueva Etiqueta CRM - Inmopro" />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">Nueva etiqueta CRM</h2>
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
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        Etiqueta activa
                    </label>
                    <Button type="submit" disabled={processing}>Guardar</Button>
                </form>
            </div>
        </AppLayout>
    );
}
