import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CrmLayout from '@/layouts/crm/crm-layout';
import reminders from '@/routes/crm/reminders';
import type { BreadcrumbItem } from '@/types';

type ReminderRow = {
    id: number;
    title: string;
    notes: string | null;
    remind_at: string;
    completed_at: string | null;
    client: { id: number; name: string } | null;
};

type ClientOption = { id: number; name: string };

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Recordatorios', href: '/crm/reminders' }];

export default function CrmRemindersIndex({
    reminders: reminderList,
    clients,
}: {
    reminders: ReminderRow[];
    clients: ClientOption[];
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        client_id: clients[0]?.id ?? '',
        title: '',
        notes: '',
        remind_at: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(reminders.store().url, { onSuccess: () => reset('title', 'notes', 'remind_at') });
    };

    const complete = (id: number) => router.post(reminders.complete(id).url);
    const remove = (id: number) => {
        if (confirm('¿Eliminar este recordatorio?')) {
            router.delete(reminders.destroy(id).url);
        }
    };

    const pending = reminderList.filter((r) => !r.completed_at);
    const completed = reminderList.filter((r) => r.completed_at);

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Recordatorios" />

            <div className="grid gap-6 p-6 lg:grid-cols-3">
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pendientes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {pending.map((reminder) => (
                                <div
                                    key={reminder.id}
                                    className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3"
                                >
                                    <div>
                                        <p className="font-medium">{reminder.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {reminder.client?.name} ·{' '}
                                            {new Date(reminder.remind_at).toLocaleString()}
                                        </p>
                                        {reminder.notes && (
                                            <p className="mt-1 text-sm text-muted-foreground">{reminder.notes}</p>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        <Button size="icon" variant="ghost" onClick={() => complete(reminder.id)}>
                                            <CheckCircle2 className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => remove(reminder.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {pending.length === 0 && (
                                <p className="text-sm text-muted-foreground">No tienes recordatorios pendientes.</p>
                            )}
                        </CardContent>
                    </Card>

                    {completed.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Completados</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {completed.map((reminder) => (
                                    <div
                                        key={reminder.id}
                                        className="rounded-lg border border-border px-4 py-3 opacity-60"
                                    >
                                        <p className="font-medium line-through">{reminder.title}</p>
                                        <p className="text-xs text-muted-foreground">{reminder.client?.name}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Nuevo recordatorio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-3">
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
                                            {client.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.client_id} />
                            </div>

                            <div>
                                <Label htmlFor="title">Título</Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className="mt-1"
                                />
                                <InputError message={errors.title} />
                            </div>

                            <div>
                                <Label htmlFor="remind_at">Fecha y hora</Label>
                                <Input
                                    id="remind_at"
                                    type="datetime-local"
                                    value={data.remind_at}
                                    onChange={(e) => setData('remind_at', e.target.value)}
                                    className="mt-1"
                                />
                                <InputError message={errors.remind_at} />
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

                            <Button type="submit" disabled={processing} className="w-full">
                                Crear recordatorio
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </CrmLayout>
    );
}
