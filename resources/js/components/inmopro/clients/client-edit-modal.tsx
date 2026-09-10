import { useForm } from '@inertiajs/react';
import type { FormEvent} from 'react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
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
import { Spinner } from '@/components/ui/spinner';
import { MASKED_CLIENT_PHONE, useCanViewClientPhone } from '@/lib/inmopro-permissions';

type ClientType = { id: number; name: string; color?: string; advisor_id?: number };
type City = { id: number; name: string; department?: string | null };
type Advisor = { id: number; name: string; team?: { name: string } | null };

export type InmoproClientEditValues = {
    id: number;
    name: string;
    dni: string;
    phone: string | null;
    email?: string;
    referred_by?: string;
    client_type_id?: number | null;
    client_status_id?: number | null;
    city_id?: number | null;
    advisor_id?: number | null;
    tags?: Array<{ id: number }>;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client: InmoproClientEditValues | null;
    clientTypes: ClientType[];
    clientStatuses: ClientType[];
    clientTags: ClientType[];
    cities: City[];
    advisors: Advisor[];
    listQs: string;
};

export function ClientEditModal({
    open,
    onOpenChange,
    client,
    clientTypes,
    clientStatuses,
    clientTags,
    cities,
    advisors,
    listQs,
}: Props) {
    const canViewPhone = useCanViewClientPhone();
    const { data, setData, put, processing, errors, clearErrors } = useForm({
        name: '',
        dni: '',
        phone: '',
        email: '',
        referred_by: '',
        client_type_id: clientTypes[0]?.id ?? 0,
        client_status_id: '',
        tag_ids: [] as number[],
        city_id: '',
        advisor_id: advisors[0]?.id ?? 0,
    });

    const advisorId = Number(data.advisor_id);
    const visibleStatuses = clientStatuses.filter(
        (status) => status.advisor_id == null || status.advisor_id === advisorId,
    );
    const visibleTags = clientTags.filter(
        (tag) => tag.advisor_id == null || tag.advisor_id === advisorId,
    );

    useEffect(() => {
        if (!open || !client) {
            return;
        }

        clearErrors();
        setData({
            name: client.name,
            dni: client.dni,
            phone: client.phone ?? '',
            email: client.email ?? '',
            referred_by: client.referred_by ?? '',
            client_type_id: client.client_type_id ?? clientTypes[0]?.id ?? 0,
            client_status_id: client.client_status_id ? String(client.client_status_id) : '',
            tag_ids: (client.tags ?? []).map((tag) => tag.id),
            city_id: client.city_id ? String(client.city_id) : '',
            advisor_id: client.advisor_id ?? advisors[0]?.id ?? 0,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, client?.id]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!client) {
            return;
        }

        put(`/inmopro/clients/${client.id}${listQs}`, {
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Editar cliente</DialogTitle>
                    <DialogDescription>
                        {client ? `Actualiza los datos de ${client.name}.` : 'Cargando cliente…'}
                    </DialogDescription>
                </DialogHeader>

                {client ? (
                    <form onSubmit={submit} className="space-y-4">
                        <InputError
                            message={(errors as Record<string, string>).duplicate_registration}
                            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                        />
                        <div>
                            <Label htmlFor="modal-client-name">Nombre</Label>
                            <Input
                                id="modal-client-name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="mt-1"
                                autoFocus
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label htmlFor="modal-client-type">Tipo de cliente</Label>
                                <select
                                    id="modal-client-type"
                                    value={data.client_type_id}
                                    onChange={(e) => setData('client_type_id', Number(e.target.value))}
                                    className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
                                >
                                    {clientTypes.map((clientType) => (
                                        <option key={clientType.id} value={clientType.id}>
                                            {clientType.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.client_type_id} />
                            </div>
                            <div>
                                <Label htmlFor="modal-client-advisor">Vendedor responsable</Label>
                                <select
                                    id="modal-client-advisor"
                                    value={data.advisor_id}
                                    onChange={(e) => {
                                        setData({
                                            advisor_id: Number(e.target.value),
                                            client_status_id: '',
                                            tag_ids: [],
                                        });
                                    }}
                                    className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
                                >
                                    {advisors.map((advisor) => (
                                        <option key={advisor.id} value={advisor.id}>
                                            {advisor.name}
                                            {advisor.team ? ` · ${advisor.team.name}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.advisor_id} />
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label htmlFor="modal-client-status">Estado CRM</Label>
                                <select
                                    id="modal-client-status"
                                    value={data.client_status_id}
                                    onChange={(e) => setData('client_status_id', e.target.value)}
                                    className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
                                >
                                    <option value="">Sin estado</option>
                                    {visibleStatuses.map((status) => (
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
                                    {visibleTags.map((tag) => {
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
                                <Label htmlFor="modal-client-dni">DNI (opcional)</Label>
                                <Input
                                    id="modal-client-dni"
                                    value={data.dni}
                                    onChange={(e) => setData('dni', e.target.value)}
                                    className="mt-1"
                                />
                                <InputError message={errors.dni} />
                            </div>
                            <div>
                                <Label htmlFor="modal-client-phone">Teléfono</Label>
                                <Input
                                    id="modal-client-phone"
                                    value={canViewPhone ? data.phone : MASKED_CLIENT_PHONE}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    disabled={!canViewPhone}
                                    placeholder={canViewPhone ? undefined : 'Sin permiso'}
                                    className="mt-1"
                                />
                                <InputError message={errors.phone} />
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label htmlFor="modal-client-email">Email</Label>
                                <Input
                                    id="modal-client-email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="mt-1"
                                />
                                <InputError message={errors.email} />
                            </div>
                            <div>
                                <Label htmlFor="modal-client-city">Ciudad de procedencia *</Label>
                                <select
                                    id="modal-client-city"
                                    value={data.city_id}
                                    onChange={(e) => setData('city_id', e.target.value)}
                                    className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
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
                            <Label htmlFor="modal-client-referred">Referido por</Label>
                            <Input
                                id="modal-client-referred"
                                value={data.referred_by}
                                onChange={(e) => setData('referred_by', e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing && <Spinner />}
                                Actualizar
                            </Button>
                        </DialogFooter>
                    </form>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
