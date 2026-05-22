import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import type { BreadcrumbItem } from '@/types';

type Advisor = { id: number; name: string };
type Project = { id: number; name: string; location?: string | null };
type Client = { id: number; name: string; advisor_id: number; advisor?: { id: number; name: string } | null };

export default function AttentionTicketsCreate({
    advisors,
    clients,
    projects,
}: {
    advisors: Advisor[];
    clients: Client[];
    projects: Project[];
}) {
    const { data, setData, post, processing, errors } = useForm({
        advisor_id: '',
        client_id: '',
        project_id: '',
        notes: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Operaciones', href: '/inmopro/attention-tickets' },
        { title: 'Tickets de atención', href: '/inmopro/attention-tickets' },
        { title: 'Nuevo', href: '/inmopro/attention-tickets/create' },
    ];

    const visibleClients = data.advisor_id
        ? clients.filter((client) => String(client.advisor_id) === data.advisor_id)
        : clients;

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post('/inmopro/attention-tickets');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo ticket de atención - Operaciones - Inmopro" />
            <div className="p-4 md:p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nuevo ticket de atención</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Registra la solicitud por proyecto. El ticket inicia en pendiente y se agenda desde administración.
                    </p>
                </div>
                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>Datos de la solicitud</CardTitle>
                        <CardDescription>Selecciona vendedor, cliente y proyecto. El agendado se realiza después.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-1">
                                <Label htmlFor="advisor_id">Vendedor</Label>
                                <select
                                    id="advisor_id"
                                    value={data.advisor_id}
                                    onChange={(event) => {
                                        const nextAdvisorId = event.target.value;
                                        setData('advisor_id', nextAdvisorId);

                                        if (
                                            data.client_id &&
                                            !clients.some(
                                                (client) =>
                                                    String(client.id) === data.client_id &&
                                                    String(client.advisor_id) === nextAdvisorId,
                                            )
                                        ) {
                                            setData('client_id', '');
                                        }
                                    }}
                                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    required
                                >
                                    <option value="">Seleccione</option>
                                    {advisors.map((advisor) => (
                                        <option key={advisor.id} value={advisor.id}>
                                            {advisor.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.advisor_id} />
                            </div>

                            <div className="md:col-span-1">
                                <Label htmlFor="client_id">Cliente</Label>
                                <select
                                    id="client_id"
                                    value={data.client_id}
                                    onChange={(event) => setData('client_id', event.target.value)}
                                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    required
                                >
                                    <option value="">Seleccione</option>
                                    {visibleClients.map((client) => (
                                        <option key={client.id} value={client.id}>
                                            {client.name}
                                            {client.advisor?.name ? ` · ${client.advisor.name}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.client_id} />
                            </div>

                            <div className="md:col-span-2">
                                <Label htmlFor="project_id">Proyecto</Label>
                                <select
                                    id="project_id"
                                    value={data.project_id}
                                    onChange={(event) => setData('project_id', event.target.value)}
                                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    required
                                >
                                    <option value="">Seleccione</option>
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                            {project.location ? ` · ${project.location}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.project_id} />
                            </div>

                            <div className="md:col-span-2">
                                <Label htmlFor="notes">Observaciones</Label>
                                <textarea
                                    id="notes"
                                    value={data.notes}
                                    onChange={(event) => setData('notes', event.target.value)}
                                    className="mt-1 flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    rows={4}
                                />
                                <InputError message={errors.notes} />
                            </div>

                            <div className="flex gap-2 pt-2 md:col-span-2">
                                <Button type="submit" disabled={processing}>
                                    Crear ticket
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <a href="/inmopro/attention-tickets">Cancelar</a>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
