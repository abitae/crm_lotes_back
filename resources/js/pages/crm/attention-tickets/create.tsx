import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CrmLayout from '@/layouts/crm/crm-layout';
import attentionTickets from '@/routes/crm/attention-tickets';
import type { BreadcrumbItem } from '@/types';

type Option = { id: number; name: string };
type ClientOption = { id: number; name: string; dni: string | null };

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Tickets de atención', href: '/crm/attention-tickets' },
    { title: 'Nuevo', href: '#' },
];

export default function CrmAttentionTicketsCreate({
    clients,
    projects,
    ticketTypes,
}: {
    clients: ClientOption[];
    projects: Option[];
    ticketTypes: Option[];
}) {
    const { data, setData, post, processing, errors } = useForm({
        client_id: clients[0]?.id ?? '',
        project_id: projects[0]?.id ?? '',
        attention_ticket_type_id: ticketTypes[0]?.id ?? '',
        notes: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(attentionTickets.store().url);
    };

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo ticket de atención" />

            <div className="p-6">
                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle>Nuevo ticket de atención</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <Label htmlFor="client_id">Cliente</Label>
                                <select
                                    id="client_id"
                                    value={data.client_id}
                                    onChange={(e) => setData('client_id', Number(e.target.value))}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
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
                                <Label htmlFor="project_id">Proyecto</Label>
                                <select
                                    id="project_id"
                                    value={data.project_id}
                                    onChange={(e) => setData('project_id', Number(e.target.value))}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
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
                                <Label htmlFor="attention_ticket_type_id">Tipo de ticket</Label>
                                <select
                                    id="attention_ticket_type_id"
                                    value={data.attention_ticket_type_id}
                                    onChange={(e) => setData('attention_ticket_type_id', Number(e.target.value))}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
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
                                <Label htmlFor="notes">Notas (opcional)</Label>
                                <Input
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    className="mt-1"
                                />
                                <InputError message={errors.notes} />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={processing}>
                                    Registrar ticket
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
