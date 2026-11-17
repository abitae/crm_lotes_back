import { Head, router, useForm } from '@inertiajs/react';
import { ListTodo, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { confirmDelete } from '@/lib/swal';
import type { BreadcrumbItem } from '@/types';

type Person = { id: number; name: string };

type TaskRow = {
    id: number;
    title: string;
    description?: string | null;
    created_by: number;
    assigned_to: number;
    completed_at?: string | null;
    creator?: Person | null;
    assignee?: Person | null;
    completer?: Person | null;
};

type Filters = {
    search?: string;
    created_by?: string;
    assigned_to?: string;
    status?: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inmopro', href: '/inmopro/dashboard' },
    { title: 'Tareas', href: '/inmopro/tasks' },
];

export default function TasksIndex({
    tasks,
    users,
    filters,
}: {
    tasks: { data: TaskRow[]; links: PaginationLink[] };
    users: Person[];
    filters: Filters;
}) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<TaskRow | null>(null);
    const createForm = useForm({
        title: '',
        description: '',
        assigned_to: '',
        created_by: '',
    });
    const editForm = useForm({
        title: '',
        description: '',
        assigned_to: '',
        created_by: '',
    });

    const applyFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        router.get(
            '/inmopro/tasks',
            {
                search: formData.get('search') || undefined,
                created_by: formData.get('created_by') || undefined,
                assigned_to: formData.get('assigned_to') || undefined,
                status: formData.get('status') || undefined,
            },
            { preserveState: true },
        );
    };

    const openEdit = (task: TaskRow) => {
        editForm.setData({
            title: task.title,
            description: task.description ?? '',
            assigned_to: String(task.assigned_to),
            created_by: String(task.created_by),
        });
        setEditing(task);
    };

    const destroyTask = async (task: TaskRow) => {
        if (await confirmDelete(`Eliminar la tarea "${task.title}"?`)) {
            router.delete(`/inmopro/tasks/${task.id}`);
        }
    };

    const toggleCompletion = (task: TaskRow) => {
        router.patch(`/inmopro/tasks/${task.id}/completion`, { completed: !task.completed_at }, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tareas - Inmopro" />
            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Tareas</h2>
                        <p className="text-sm text-slate-500">Administra las tareas de los usuarios del sistema.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-700"
                    >
                        <Plus className="h-5 w-5" /> Nueva
                    </button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filtrar</CardTitle>
                        <CardDescription>Por título, creador, asignado o estado.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={applyFilters} className="grid gap-2 md:grid-cols-5">
                            <div className="relative md:col-span-2">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input name="search" defaultValue={filters.search ?? ''} className="pl-9" placeholder="Buscar título" />
                            </div>
                            <select name="created_by" defaultValue={filters.created_by ?? ''} className="h-9 rounded-md border border-slate-200 px-3 text-sm">
                                <option value="">Creador</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                            <select name="assigned_to" defaultValue={filters.assigned_to ?? ''} className="h-9 rounded-md border border-slate-200 px-3 text-sm">
                                <option value="">Asignado</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                            <div className="flex gap-2">
                                <select name="status" defaultValue={filters.status ?? ''} className="h-9 flex-1 rounded-md border border-slate-200 px-3 text-sm">
                                    <option value="">Estado</option>
                                    <option value="pendiente">Pendiente</option>
                                    <option value="hecha">Hecha</option>
                                </select>
                                <Button type="submit" variant="secondary">
                                    Buscar
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Tarea</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Creador</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Asignado</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Estado</th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tasks.data.map((task) => (
                                <tr key={task.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-slate-800">{task.title}</p>
                                        {task.description ? <p className="text-sm text-slate-500">{task.description}</p> : null}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{task.creator?.name ?? '-'}</td>
                                    <td className="px-4 py-3 text-slate-600">{task.assignee?.name ?? '-'}</td>
                                    <td className="px-4 py-3">
                                        <button type="button" onClick={() => toggleCompletion(task)} className="text-left">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${task.completed_at ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                                            >
                                                {task.completed_at ? 'Hecha' : 'Pendiente'}
                                            </span>
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <button type="button" onClick={() => openEdit(task)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button type="button" onClick={() => destroyTask(task)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {tasks.data.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            <ListTodo className="mx-auto mb-2 h-10 w-10" />
                            <p>No hay tareas.</p>
                        </div>
                    ) : (
                        <div className="border-t border-slate-100 px-4 py-3">
                            <Pagination links={tasks.links} />
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nueva tarea</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            createForm.post('/inmopro/tasks', {
                                preserveScroll: true,
                                onSuccess: () => {
                                    createForm.reset();
                                    setCreateOpen(false);
                                },
                            });
                        }}
                        className="space-y-4"
                    >
                        <TaskFields
                            title={createForm.data.title}
                            description={createForm.data.description}
                            assignedTo={createForm.data.assigned_to}
                            createdBy={createForm.data.created_by}
                            users={users}
                            errors={createForm.errors}
                            onChange={(key, value) => createForm.setData(key, value)}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={createForm.processing}>
                                Guardar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar tarea</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (!editing) {
                                return;
                            }
                            editForm.put(`/inmopro/tasks/${editing.id}`, {
                                preserveScroll: true,
                                onSuccess: () => setEditing(null),
                            });
                        }}
                        className="space-y-4"
                    >
                        <TaskFields
                            title={editForm.data.title}
                            description={editForm.data.description}
                            assignedTo={editForm.data.assigned_to}
                            createdBy={editForm.data.created_by}
                            users={users}
                            errors={editForm.errors}
                            onChange={(key, value) => editForm.setData(key, value)}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={editForm.processing}>
                                Guardar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

function TaskFields({
    title,
    description,
    assignedTo,
    createdBy,
    users,
    errors,
    onChange,
}: {
    title: string;
    description: string;
    assignedTo: string;
    createdBy: string;
    users: Person[];
    errors: Partial<Record<'title' | 'description' | 'assigned_to' | 'created_by', string>>;
    onChange: (key: 'title' | 'description' | 'assigned_to' | 'created_by', value: string) => void;
}) {
    return (
        <>
            <div>
                <Label htmlFor="task-title">Título</Label>
                <Input id="task-title" value={title} onChange={(event) => onChange('title', event.target.value)} className="mt-1" />
                <InputError message={errors.title} />
            </div>
            <div>
                <Label htmlFor="task-description">Descripción</Label>
                <textarea
                    id="task-description"
                    value={description}
                    onChange={(event) => onChange('description', event.target.value)}
                    className="border-input mt-1 min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                />
                <InputError message={errors.description} />
            </div>
            <div>
                <Label htmlFor="task-creator">Creador</Label>
                <select
                    id="task-creator"
                    value={createdBy}
                    onChange={(event) => onChange('created_by', event.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                >
                    <option value="">Usuario actual</option>
                    {users.map((user) => (
                        <option key={user.id} value={user.id}>
                            {user.name}
                        </option>
                    ))}
                </select>
                <InputError message={errors.created_by} />
            </div>
            <div>
                <Label htmlFor="task-assignee">Asignada a</Label>
                <select
                    id="task-assignee"
                    value={assignedTo}
                    onChange={(event) => onChange('assigned_to', event.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                >
                    <option value="">Selecciona un usuario</option>
                    {users.map((user) => (
                        <option key={user.id} value={user.id}>
                            {user.name}
                        </option>
                    ))}
                </select>
                <InputError message={errors.assigned_to} />
            </div>
        </>
    );
}
