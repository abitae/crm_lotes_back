import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

export default function ReportSettings({ config }: { config: { general_sales_goal: number } }) {
    const { data, setData, put, processing, errors } = useForm({
        general_sales_goal: config.general_sales_goal,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Reportes', href: '/inmopro/reports' },
        { title: 'Meta general', href: '/inmopro/report-settings' },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put('/inmopro/report-settings');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Meta general de reportes - Inmopro" />
            <div className="p-4 md:p-6">
                <h2 className="mb-2 text-2xl font-black text-slate-800">Meta general de reportes</h2>
                <p className="mb-6 max-w-xl text-sm text-slate-600">
                    Este monto es la meta usada en la tarjeta <strong>Meta</strong> del resumen en la página de reportes (todas las
                    vistas). No se calcula sumando las metas de cada fila.
                </p>
                <form onSubmit={submit} className="max-w-md space-y-4">
                    <div>
                        <Label htmlFor="general_sales_goal">Meta general (S/)</Label>
                        <Input
                            id="general_sales_goal"
                            type="number"
                            min={0}
                            step="0.01"
                            value={data.general_sales_goal}
                            onChange={(e) => setData('general_sales_goal', Number(e.target.value))}
                            className="mt-1"
                        />
                        <InputError message={errors.general_sales_goal} />
                    </div>
                    <Button type="submit" disabled={processing}>
                        Guardar
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
