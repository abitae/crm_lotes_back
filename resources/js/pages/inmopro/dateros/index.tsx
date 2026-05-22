import { Head, router, useForm } from '@inertiajs/react';
import { Contact, Copy, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { confirmDelete } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

type CityOption = { id: number; name: string; department?: string | null };
type AdvisorOption = { id: number; name: string };
type AdvisorRef = { id: number; name: string };

type CityRef = { id: number; name: string; department?: string | null };

type DateroRow = {
    id: number;
    advisor_id: number;
    name: string;
    phone: string;
    email: string;
    dni: string;
    username: string;
    city_id: number;
    is_active: boolean;
    registration_url?: string | null;
    assigned_advisor?: AdvisorRef | null;
    city?: CityRef | null;
};

export default function DaterosIndex({
    dateros,
    cities,
    advisors,
    dateroForModal,
    openModal,
    filters,
}: {
    dateros: { data: DateroRow[]; links: PaginationLink[] };
    cities: CityOption[];
    advisors: AdvisorOption[];
    dateroForModal: DateroRow | null;
    openModal: string | null;
    filters: { search?: string };
}) {
    const items = dateros.data;
    const [modalCreate, setModalCreate] = useState(false);
    const [modalEdit, setModalEdit] = useState<DateroRow | null>(null);

    const createModalOpen = openModal === 'create_datero' || modalCreate;
    const editTarget = modalEdit ?? (openModal === 'edit_datero' ? dateroForModal : null);
    const editModalOpen = editTarget !== null;

    const clearModalQuery = () => {
        router.get('/inmopro/dateros', { search: filters.search || undefined }, { replace: true, preserveState: true });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Dateros', href: '/inmopro/dateros' },
    ];

    const handleDestroy = async (id: number, name: string) => {
        if (await confirmDelete(`Eliminar datero "${name}"?`)) {
            router.delete(`/inmopro/dateros/${id}`);
        }
    };

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const search = formData.get('search');
        router.get('/inmopro/dateros', { search: search || undefined }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dateros - Inmopro" />
            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Dateros</h2>
                        <p className="text-sm text-slate-500">Personal de campo asignado a un vendedor. Ciudad obligatoria.</p>
                    </div>
                    <Button onClick={() => setModalCreate(true)} className="flex items-center gap-2">
                        <Plus className="h-5 w-5" /> Nuevo
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Buscar</CardTitle>
                        <CardDescription>Por nombre, email, DNI o usuario.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input name="search" defaultValue={filters.search} className="pl-9" placeholder="Buscar…" />
                            </div>
                            <Button type="submit" variant="secondary">
                                Buscar
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
                    <table className="w-full">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Nombre</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">DNI</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Usuario</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Ciudad</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Vendedor</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Estado</th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-800">{row.name}</div>
                                        <div className="text-xs text-slate-500">{row.email}</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{row.dni}</td>
                                    <td className="px-4 py-3 font-mono text-sm text-slate-600">{row.username}</td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {row.city?.name ?? '—'}
                                        {row.city?.department ? (
                                            <span className="block text-xs text-slate-400">{row.city.department}</span>
                                        ) : null}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{row.assigned_advisor?.name ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                                        >
                                            {row.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setModalEdit(row)}
                                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDestroy(row.id, row.name)}
                                                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {items.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            <Contact className="mx-auto mb-2 h-10 w-10" />
                            <p>No hay dateros registrados.</p>
                        </div>
                    ) : (
                        <div className="border-t border-slate-100 px-4 py-3">
                            <Pagination links={dateros.links} />
                        </div>
                    )}
                </div>

                <CreateDateroModal
                    open={createModalOpen}
                    onOpenChange={(open) => {
                        setModalCreate(open);
                        if (!open && openModal === 'create_datero') {
                            clearModalQuery();
                        }
                    }}
                    cities={cities}
                    advisors={advisors}
                />

                {editTarget && (
                    <EditDateroModal
                        open={editModalOpen}
                        onOpenChange={(open) => {
                            if (!open) {
                                setModalEdit(null);
                                if (openModal === 'edit_datero') {
                                    clearModalQuery();
                                }
                            }
                        }}
                        datero={editTarget}
                        cities={cities}
                        advisors={advisors}
                    />
                )}
            </div>
        </AppLayout>
    );
}

function CreateDateroModal({
    open,
    onOpenChange,
    cities,
    advisors,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cities: CityOption[];
    advisors: AdvisorOption[];
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        advisor_id: advisors[0]?.id ?? 0,
        name: '',
        phone: '',
        email: '',
        city_id: cities[0]?.id ?? 0,
        dni: '',
        username: '',
        pin: '',
        is_active: true,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/inmopro/dateros', {
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Nuevo datero</DialogTitle>
                    <DialogDescription>Ciudad obligatoria. Usuario único (no igual a un vendedor).</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label htmlFor="d-advisor">Vendedor asignado</Label>
                        <select
                            id="d-advisor"
                            value={data.advisor_id}
                            onChange={(e) => setData('advisor_id', Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                        >
                            {advisors.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.advisor_id} />
                    </div>
                    <div>
                        <Label htmlFor="d-city">Ciudad</Label>
                        <select
                            id="d-city"
                            value={data.city_id}
                            onChange={(e) => setData('city_id', Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                        >
                            {cities.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                    {c.department ? ` · ${c.department}` : ''}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.city_id} />
                    </div>
                    <div>
                        <Label htmlFor="d-name">Nombre completo</Label>
                        <Input id="d-name" value={data.name} onChange={(e) => setData('name', e.target.value)} className="mt-1" />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="d-dni">DNI</Label>
                            <Input id="d-dni" value={data.dni} onChange={(e) => setData('dni', e.target.value)} className="mt-1" />
                            <InputError message={errors.dni} />
                        </div>
                        <div>
                            <Label htmlFor="d-phone">Teléfono</Label>
                            <Input id="d-phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} className="mt-1" />
                            <InputError message={errors.phone} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="d-email">Correo</Label>
                        <Input id="d-email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className="mt-1" />
                        <InputError message={errors.email} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="d-user">Usuario</Label>
                            <Input id="d-user" value={data.username} onChange={(e) => setData('username', e.target.value)} className="mt-1" />
                            <InputError message={errors.username} />
                        </div>
                        <div>
                            <Label htmlFor="d-pin">PIN (6 dígitos)</Label>
                            <Input
                                id="d-pin"
                                type="password"
                                inputMode="numeric"
                                autoComplete="new-password"
                                maxLength={6}
                                value={data.pin}
                                onChange={(e) => setData('pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="mt-1"
                            />
                            <InputError message={errors.pin} />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        Activo
                    </label>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditDateroModal({
    open,
    onOpenChange,
    datero,
    cities,
    advisors,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    datero: DateroRow;
    cities: CityOption[];
    advisors: AdvisorOption[];
}) {
    const { data, setData, put, processing, errors } = useForm({
        advisor_id: datero.advisor_id,
        name: datero.name,
        phone: datero.phone,
        email: datero.email,
        city_id: datero.city_id,
        dni: datero.dni,
        username: datero.username,
        pin: '',
        is_active: datero.is_active,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`/inmopro/dateros/${datero.id}`, { onSuccess: () => onOpenChange(false) });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar datero</DialogTitle>
                    <DialogDescription>Deje el PIN en blanco si no desea cambiarlo.</DialogDescription>
                </DialogHeader>
                {datero.registration_url ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/40">
                        <p className="font-medium text-slate-700 dark:text-slate-200">Enlace de registro de clientes (QR)</p>
                        <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{datero.registration_url}</p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2 gap-1"
                            onClick={() => void navigator.clipboard.writeText(datero.registration_url ?? '')}
                        >
                            <Copy className="h-3.5 w-3.5" />
                            Copiar enlace
                        </Button>
                    </div>
                ) : null}
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label htmlFor="de-advisor">Vendedor asignado</Label>
                        <select
                            id="de-advisor"
                            value={data.advisor_id}
                            onChange={(e) => setData('advisor_id', Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                        >
                            {advisors.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.advisor_id} />
                    </div>
                    <div>
                        <Label htmlFor="de-city">Ciudad</Label>
                        <select
                            id="de-city"
                            value={data.city_id}
                            onChange={(e) => setData('city_id', Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                        >
                            {cities.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                    {c.department ? ` · ${c.department}` : ''}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.city_id} />
                    </div>
                    <div>
                        <Label htmlFor="de-name">Nombre completo</Label>
                        <Input id="de-name" value={data.name} onChange={(e) => setData('name', e.target.value)} className="mt-1" />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="de-dni">DNI</Label>
                            <Input id="de-dni" value={data.dni} onChange={(e) => setData('dni', e.target.value)} className="mt-1" />
                            <InputError message={errors.dni} />
                        </div>
                        <div>
                            <Label htmlFor="de-phone">Teléfono</Label>
                            <Input id="de-phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} className="mt-1" />
                            <InputError message={errors.phone} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="de-email">Correo</Label>
                        <Input id="de-email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className="mt-1" />
                        <InputError message={errors.email} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="de-user">Usuario</Label>
                            <Input id="de-user" value={data.username} onChange={(e) => setData('username', e.target.value)} className="mt-1" />
                            <InputError message={errors.username} />
                        </div>
                        <div>
                            <Label htmlFor="de-pin">Nuevo PIN</Label>
                            <Input
                                id="de-pin"
                                type="password"
                                inputMode="numeric"
                                autoComplete="new-password"
                                maxLength={6}
                                value={data.pin}
                                onChange={(e) => setData('pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="mt-1"
                                placeholder="Opcional"
                            />
                            <InputError message={errors.pin} />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        Activo
                    </label>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Actualizar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
