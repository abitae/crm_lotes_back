import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Advisor = {
    id: number;
    name: string;
    email: string;
    phone: string;
    personal_quota: string;
    advisor_level_id: number;
    superior_id?: number;
    level?: { name: string };
};
type AdvisorLevel = { id: number; name: string };
type AdvisorOption = { id: number; name: string };

export default function AdvisorsEdit({
    advisor,
    advisorLevels,
    advisors,
}: {
    advisor: Advisor;
    advisorLevels: AdvisorLevel[];
    advisors: AdvisorOption[];
}) {
    const { data, setData, put, processing, errors } = useForm({
        name: advisor.name,
        phone: advisor.phone,
        email: advisor.email,
        advisor_level_id: advisor.advisor_level_id,
        superior_id: advisor.superior_id ?? (null as number | null),
        personal_quota: Number(advisor.personal_quota),
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Vendedores', href: '/inmopro/advisors' },
        { title: 'Editar', href: `/inmopro/advisors/${advisor.id}/edit` },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`/inmopro/advisors/${advisor.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${advisor.name} - Inmopro`} />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">Editar Asesor</h2>
                <form onSubmit={submit} className="max-w-md space-y-4">
                    <div>
                        <Label htmlFor="name">Nombre</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={errors.name} />
                    </div>
                    <div>
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                            id="phone"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={errors.phone} />
                    </div>
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={errors.email} />
                    </div>
                    <div>
                        <Label htmlFor="advisor_level_id">Nivel</Label>
                        <select
                            id="advisor_level_id"
                            value={data.advisor_level_id}
                            onChange={(e) => setData('advisor_level_id', Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                        >
                            {advisorLevels.map((l) => (
                                <option key={l.id} value={l.id}>
                                    {l.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.advisor_level_id} />
                    </div>
                    <div>
                        <Label htmlFor="superior_id">Superior</Label>
                        <select
                            id="superior_id"
                            value={data.superior_id ?? ''}
                            onChange={(e) =>
                                setData('superior_id', e.target.value ? Number(e.target.value) : null)
                            }
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                        >
                            <option value="">— Ninguno —</option>
                            {advisors.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="personal_quota">Cuota personal</Label>
                        <Input
                            id="personal_quota"
                            type="number"
                            min={0}
                            value={data.personal_quota}
                            onChange={(e) => setData('personal_quota', Number(e.target.value))}
                            className="mt-1"
                        />
                        <InputError message={errors.personal_quota} />
                    </div>
                    <Button type="submit" disabled={processing}>
                        Actualizar
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
