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
import clients from '@/routes/crm/clients';

type City = { id: number; name: string; department: string | null };

export type ClientFormValues = {
    id?: number;
    name: string;
    dni: string | null;
    phone: string;
    email: string | null;
    referred_by: string | null;
    city_id: number | null;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client: ClientFormValues | null;
    cities: City[];
};

export function ClientFormModal({ open, onOpenChange, client, cities }: Props) {
    const mode = client?.id ? 'edit' : 'create';

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        dni: '',
        phone: '',
        email: '',
        referred_by: '',
        city_id: '',
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        setData({
            name: client?.name ?? '',
            dni: client?.dni ?? '',
            phone: client?.phone ?? '',
            email: client?.email ?? '',
            referred_by: client?.referred_by ?? '',
            city_id: client?.city_id ? String(client.city_id) : '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, client?.id]);

    const submit = (e: FormEvent) => {
        e.preventDefault();

        const onSuccess = () => {
            reset();
            onOpenChange(false);
        };

        if (mode === 'edit' && client?.id) {
            put(clients.update(client.id).url, { onSuccess });
        } else {
            post(clients.store().url, { onSuccess });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{mode === 'edit' ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'edit'
                            ? 'Actualiza los datos de contacto del cliente.'
                            : 'Registra un nuevo cliente en tu cartera.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <InputError
                        message={(errors as Record<string, string>).duplicate_registration}
                        className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                    />

                    <div>
                        <Label htmlFor="modal-name">Nombre</Label>
                        <Input
                            id="modal-name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1"
                            autoFocus
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="modal-dni">DNI (opcional)</Label>
                            <Input
                                id="modal-dni"
                                value={data.dni}
                                onChange={(e) => setData('dni', e.target.value)}
                                className="mt-1"
                            />
                            <InputError message={errors.dni} />
                        </div>
                        <div>
                            <Label htmlFor="modal-phone">Teléfono</Label>
                            <Input
                                id="modal-phone"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                className="mt-1"
                            />
                            <InputError message={errors.phone} />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="modal-email">Email</Label>
                            <Input
                                id="modal-email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="mt-1"
                            />
                            <InputError message={errors.email} />
                        </div>
                        <div>
                            <Label htmlFor="modal-city_id">Ciudad *</Label>
                            <select
                                id="modal-city_id"
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
                        <Label htmlFor="modal-referred_by">Referido por</Label>
                        <Input
                            id="modal-referred_by"
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
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
