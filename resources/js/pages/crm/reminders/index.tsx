import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ReminderFormModal, type ReminderFormValues } from '@/components/crm/reminders/reminder-form-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    client_id: number;
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
    const [modalOpen, setModalOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState<ReminderFormValues | null>(null);

    const openCreateModal = () => {
        setEditingReminder(null);
        setModalOpen(true);
    };

    const openEditModal = (reminder: ReminderRow) => {
        setEditingReminder({
            id: reminder.id,
            client_id: reminder.client_id,
            title: reminder.title,
            notes: reminder.notes,
            remind_at: reminder.remind_at,
        });
        setModalOpen(true);
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

            <div className="flex flex-col gap-4 p-6">
                <div className="flex justify-end">
                    <Button onClick={openCreateModal}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nuevo recordatorio
                    </Button>
                </div>

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
                                <div className="min-w-0">
                                    <p className="font-medium">{reminder.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {reminder.client?.name} · {new Date(reminder.remind_at).toLocaleString()}
                                    </p>
                                    {reminder.notes && (
                                        <p className="mt-1 text-sm text-muted-foreground">{reminder.notes}</p>
                                    )}
                                </div>
                                <div className="flex shrink-0 gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => openEditModal(reminder)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
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
                                <div key={reminder.id} className="rounded-lg border border-border px-4 py-3 opacity-60">
                                    <p className="font-medium line-through">{reminder.title}</p>
                                    <p className="text-xs text-muted-foreground">{reminder.client?.name}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>

            <ReminderFormModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                reminder={editingReminder}
                clients={clients}
            />
        </CrmLayout>
    );
}
