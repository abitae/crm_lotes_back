import { useForm } from '@inertiajs/react';
import { FormEvent, useEffect } from 'react';
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
import attentionTickets from '@/routes/crm/attention-tickets';

type Option = { id: number; name: string };
type ClientOption = { id: number; name: string; dni: string | null };

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clients: ClientOption[];
    projects: Option[];
    ticketTypes: Option[];
    defaultClientId?: number | null;
};

export function AttentionTicketFormModal({
    open,
    onOpenChange,
    clients,
    projects,
    ticketTypes,
    defaultClientId,
}: Props) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        client_id: clients[0]?.id ?? '',
        project_id: projects[0]?.id ?? '',
        attention_ticket_type_id: ticketTypes[0]?.id ?? '',
        notes: '',
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        setData({
            client_id: defaultClientId ?? clients[0]?.id ?? '',
            project_id: projects[0]?.id ?? '',
            attention_ticket_type_id: ticketTypes[0]?.id ?? '',
            notes: '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, defaultClientId]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(attentionTickets.store().url, {
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Nuevo ticket de atención</DialogTitle>
                    <DialogDescription>Registra una solicitud de atención para un cliente.</DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label htmlFor="ticket-client_id">Cliente</Label>
                        <select
                            id="ticket-client_id"
                            value={data.client_id}
                            onChange={(e) => setData('client_id', Number(e.target.value))}
                            className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
                            required
                        >
                            <option value="">Seleccionar…</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.name} {client.dni ? `· ${client.dni}` : ''}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.client_id} />
                    </div>

                    <div>
                        <Label htmlFor="ticket-project_id">Proyecto</Label>
                        <select
                            id="ticket-project_id"
                            value={data.project_id}
                            onChange={(e) => setData('project_id', Number(e.target.value))}
                            className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
                            required
                        >
                            <option value="">Seleccionar…</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.project_id} />
                    </div>

                    <div>
                        <Label htmlFor="ticket-type_id">Tipo de ticket</Label>
                        <select
                            id="ticket-type_id"
                            value={data.attention_ticket_type_id}
                            onChange={(e) => setData('attention_ticket_type_id', Number(e.target.value))}
                            className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
                            required
                        >
                            <option value="">Seleccionar…</option>
                            {ticketTypes.map((type) => (
                                <option key={type.id} value={type.id}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.attention_ticket_type_id} />
                    </div>

                    <div>
                        <Label htmlFor="ticket-notes">Notas (opcional)</Label>
                        <Input
                            id="ticket-notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={errors.notes} />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Registrar ticket
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
