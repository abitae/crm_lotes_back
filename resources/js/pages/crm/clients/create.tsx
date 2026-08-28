import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CrmLayout from '@/layouts/crm/crm-layout';
import clients from '@/routes/crm/clients';
import type { BreadcrumbItem } from '@/types';

type City = { id: number; name: string; department: string | null };

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Clientes', href: '/crm/clients' },
    { title: 'Nuevo', href: '/crm/clients/create' },
];

export default function CrmClientsCreate({ cities }: { cities: City[] }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        dni: '',
        phone: '',
        email: '',
        referred_by: '',
        city_id: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(clients.store().url);
    };

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo cliente" />

            <div className="p-6">
                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>Nuevo cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <InputError
                                message={(errors as Record<string, string>).duplicate_registration}
                                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                            />

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

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <Label htmlFor="dni">DNI (opcional)</Label>
                                    <Input
                                        id="dni"
                                        value={data.dni}
                                        onChange={(e) => setData('dni', e.target.value)}
                                        className="mt-1"
                                    />
                                    <InputError message={errors.dni} />
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
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
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
                                    <Label htmlFor="city_id">Ciudad de procedencia *</Label>
                                    <select
                                        id="city_id"
                                        value={data.city_id}
                                        onChange={(e) => setData('city_id', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                                        required
                                    >
                                        <option value="">Seleccionar…</option>
                                        {cities.map((city) => (
                                            <option key={city.id} value={String(city.id)}>
                                                {city.name}
                                                {city.department ? ` · ${city.department}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.city_id} />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="referred_by">Referido por</Label>
                                <Input
                                    id="referred_by"
                                    value={data.referred_by}
                                    onChange={(e) => setData('referred_by', e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={processing}>
                                    Guardar
                                </Button>
                                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </CrmLayout>
    );
}
