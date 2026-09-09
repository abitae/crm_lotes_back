import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect } from 'react';
import { ClientSearchSelect } from '@/components/crm/clients/client-search-select';
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
import reminders from '@/routes/crm/reminders';

type ClientOption = { id: number; name: string };

export type ReminderFormValues = {
    id?: number;
    client_id: number | null;
    title: string;
    notes: string | null;
    remind_at: string;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reminder: ReminderFormValues | null;
    clients: ClientOption[];
    extraFooterAction?: { label: string; onClick: () => void };
};

function toDatetimeLocal(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ReminderFormModal({
    open,
    onOpenChange,
    reminder,
    clients,
    extraFooterAction,
}: Props) {
    const mode = reminder?.id ? 'edit' : 'create';

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            client_id: clients[0]?.id ?? ('' as number | ''),
            title: '',
            notes: '',
            remind_at: '',
        });

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        setData({
            client_id: reminder
                ? (reminder.client_id ?? '')
                : (clients[0]?.id ?? ''),
            title: reminder?.title ?? '',
            notes: reminder?.notes ?? '',
            remind_at: reminder?.remind_at
                ? toDatetimeLocal(reminder.remind_at)
                : '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, reminder?.id]);

    const submit = (e: FormEvent) => {
        e.preventDefault();

        const onSuccess = () => {
            reset('title', 'notes', 'remind_at');
            onOpenChange(false);
        };

        if (mode === 'edit' && reminder?.id) {
            put(reminders.update(reminder.id).url, { onSuccess });
        } else {
            post(reminders.store().url, { onSuccess });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'edit'
                            ? 'Editar recordatorio'
                            : 'Nuevo recordatorio'}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'edit'
                            ? 'Actualiza la fecha o los detalles del recordatorio.'
                            : 'Programa un recordatorio para un cliente.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label htmlFor="reminder-client_id">Cliente</Label>
                        <div className="mt-1">
                            <ClientSearchSelect
                                id="reminder-client_id"
                                clients={clients}
                                value={data.client_id}
                                onChange={(next) => setData('client_id', next)}
                                allowEmpty={mode === 'edit'}
                                emptyLabel={
                                    mode === 'edit'
                                        ? 'Sin cliente (Google)'
                                        : 'Seleccionar…'
                                }
                                placeholder="Buscar cliente…"
                                required={mode === 'create'}
                            />
                        </div>
                        <InputError message={errors.client_id} />
                    </div>

                    <div>
                        <Label htmlFor="reminder-title">Título</Label>
                        <Input
                            id="reminder-title"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={errors.title} />
                    </div>

                    <div>
                        <Label htmlFor="reminder-remind_at">Fecha y hora</Label>
                        <Input
                            id="reminder-remind_at"
                            type="datetime-local"
                            value={data.remind_at}
                            onChange={(e) =>
                                setData('remind_at', e.target.value)
                            }
                            className="mt-1"
                        />
                        <InputError message={errors.remind_at} />
                    </div>

                    <div>
                        <Label htmlFor="reminder-notes">Notas (opcional)</Label>
                        <Input
                            id="reminder-notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={errors.notes} />
                    </div>

                    <DialogFooter className="flex-wrap gap-2 sm:justify-between">
                        {extraFooterAction ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={extraFooterAction.onClick}
                            >
                                {extraFooterAction.label}
                            </Button>
                        ) : (
                            <span />
                        )}
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing && <Spinner />}
                                {mode === 'edit'
                                    ? 'Guardar cambios'
                                    : 'Crear recordatorio'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
