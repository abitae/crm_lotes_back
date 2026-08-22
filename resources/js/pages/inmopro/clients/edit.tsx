import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEvent } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { clientsListingQuerySuffix } from '@/lib/inmopro-listing-query';
import type { BreadcrumbItem } from '@/types';

type ClientType = { id: number; name: string; color?: string };
type City = { id: number; name: string; department?: string | null };
type Advisor = { id: number; name: string; team?: { name: string } | null };
type Client = {
    id: number;
    name: string;
    dni: string;
    phone: string;
    email?: string;
    referred_by?: string;
    client_type_id?: number | null;
    client_status_id?: number | null;
    city_id?: number | null;
    advisor_id?: number | null;
    tags?: Array<{ id: number }>;
};

export default function ClientsEdit({
    client,
    clientTypes,
    clientStatuses,
    clientTags,
    cities,
    advisors,
}: {
    client: Client;
    clientTypes: ClientType[];
    clientStatuses: ClientType[];
    clientTags: ClientType[];
    cities: City[];
    advisors: Advisor[];
}) {
    const listQs = clientsListingQuerySuffix(usePage().url);
    const { data, setData, put, processing, errors } = useForm({
        name: client.name,
        dni: client.dni,
        phone: client.phone,
        email: client.email ?? '',
        referred_by: client.referred_by ?? '',
        client_type_id: client.client_type_id ?? clientTypes[0]?.id ?? 0,
        client_status_id: client.client_status_id ? String(client.client_status_id) : '',
        tag_ids: (client.tags ?? []).map((tag) => tag.id),
        city_id: client.city_id ? String(client.city_id) : '',
        advisor_id: client.advisor_id ?? advisors[0]?.id ?? 0,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Clientes', href: '/inmopro/clients' },
        { title: 'Editar', href: `/inmopro/clients/${client.id}/edit` },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`/inmopro/clients/${client.id}${listQs}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${client.name} - Inmopro`} />
            <div className="p-4">
                <h2 className="mb-6 text-2xl font-black text-slate-800">
                    Editar cliente
                </h2>
                <form onSubmit={submit} className="max-w-2xl space-y-4">
                    <InputError
                        message={
                            (errors as Record<string, string>)
                                .duplicate_registration
                        }
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
                            <Label htmlFor="client_type_id">
                                Tipo de cliente
                            </Label>
                            <select
                                id="client_type_id"
                                value={data.client_type_id}
                                onChange={(e) =>
                                    setData(
                                        'client_type_id',
                                        Number(e.target.value),
                                    )
                                }
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                            >
                                {clientTypes.map((clientType) => (
                                    <option
                                        key={clientType.id}
                                        value={clientType.id}
                                    >
                                        {clientType.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.client_type_id} />
                        </div>
                        <div>
                            <Label htmlFor="advisor_id">
                                Vendedor responsable
                            </Label>
                            <select
                                id="advisor_id"
                                value={data.advisor_id}
                                onChange={(e) =>
                                    setData(
                                        'advisor_id',
                                        Number(e.target.value),
                                    )
                                }
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                            >
                                {advisors.map((advisor) => (
                                    <option key={advisor.id} value={advisor.id}>
                                        {advisor.name}
                                        {advisor.team
                                            ? ` · ${advisor.team.name}`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.advisor_id} />
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label htmlFor="client_status_id">Estado CRM</Label>
                            <select
                                id="client_status_id"
                                value={data.client_status_id}
                                onChange={(e) => setData('client_status_id', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                            >
                                <option value="">Sin estado</option>
                                {clientStatuses.map((status) => (
                                    <option key={status.id} value={String(status.id)}>
                                        {status.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.client_status_id} />
                        </div>
                        <div>
                            <Label>Etiquetas CRM</Label>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {clientTags.map((tag) => {
                                    const selected = (data.tag_ids as number[]).includes(tag.id);
                                    return (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => {
                                                const current = data.tag_ids as number[];
                                                setData(
                                                    'tag_ids',
                                                    selected
                                                        ? current.filter((id) => id !== tag.id)
                                                        : [...current, tag.id],
                                                );
                                            }}
                                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                                                selected
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-slate-100 text-slate-700'
                                            }`}
                                        >
                                            {tag.name}
                                        </button>
                                    );
                                })}
                            </div>
                            <InputError message={errors.tag_ids} />
                        </div>
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
                                onChange={(e) =>
                                    setData('phone', e.target.value)
                                }
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
                                onChange={(e) =>
                                    setData('email', e.target.value)
                                }
                                className="mt-1"
                            />
                            <InputError message={errors.email} />
                        </div>
                        <div>
                            <Label htmlFor="city_id">
                                Ciudad de procedencia *
                            </Label>
                            <select
                                id="city_id"
                                value={data.city_id}
                                onChange={(e) =>
                                    setData('city_id', e.target.value)
                                }
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                                required
                            >
                                <option value="">Seleccionar…</option>
                                {cities.map((city) => (
                                    <option
                                        key={city.id}
                                        value={String(city.id)}
                                    >
                                        {city.name}
                                        {city.department
                                            ? ` · ${city.department}`
                                            : ''}
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
                            onChange={(e) =>
                                setData('referred_by', e.target.value)
                            }
                            className="mt-1"
                        />
                    </div>
                    <Button type="submit" disabled={processing}>
                        Actualizar
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
