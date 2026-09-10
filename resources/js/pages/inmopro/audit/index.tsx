import { Head, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/date';
import type { BreadcrumbItem } from '@/types';

type AuditLog = {
    id: number;
    user_name: string | null;
    action: string;
    method: string;
    route_name: string | null;
    url: string;
    ip_address: string | null;
    created_at: string;
    user?: { id: number; name: string } | null;
};

type Filters = {
    user_id?: string | number | null;
    action?: string | null;
    from?: string | null;
    to?: string | null;
};

export default function InmoproAuditIndex({
    logs,
    filters,
    users,
    actions,
}: {
    logs: { data: AuditLog[]; links: PaginationLink[] };
    filters: Filters;
    users: Array<{ id: number; name: string }>;
    actions: string[];
}) {
    const [userId, setUserId] = useState(filters.user_id ? String(filters.user_id) : '');
    const [action, setAction] = useState(filters.action ?? '');
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Auditoría', href: '/inmopro/audit' },
    ];

    const applyFilters = () => {
        router.get(
            '/inmopro/audit',
            {
                user_id: userId || undefined,
                action: action || undefined,
                from: from || undefined,
                to: to || undefined,
            },
            { preserveState: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Auditoría - Inmopro" />
            <div className="space-y-6 p-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                        Auditoría
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Registro de cambios, exportaciones y acceso a fichas de
                        clientes en Inmopro.
                    </p>
                </div>

                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5 dark:border-slate-700 dark:bg-slate-950/40">
                    <div>
                        <Label htmlFor="audit-from">Desde</Label>
                        <Input
                            id="audit-from"
                            type="date"
                            value={from}
                            onChange={(event) => setFrom(event.target.value)}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="audit-to">Hasta</Label>
                        <Input
                            id="audit-to"
                            type="date"
                            value={to}
                            onChange={(event) => setTo(event.target.value)}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="audit-user">Usuario</Label>
                        <select
                            id="audit-user"
                            value={userId}
                            onChange={(event) => setUserId(event.target.value)}
                            className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                        >
                            <option value="">Todos</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="audit-action">Acción</Label>
                        <Input
                            id="audit-action"
                            list="audit-actions"
                            value={action}
                            onChange={(event) => setAction(event.target.value)}
                            placeholder="Ej. clients.updated"
                            className="mt-1"
                        />
                        <datalist id="audit-actions">
                            {actions.map((name) => (
                                <option key={name} value={name} />
                            ))}
                        </datalist>
                    </div>
                    <div className="flex items-end">
                        <Button type="button" onClick={applyFilters} className="w-full">
                            <Search className="h-4 w-4" />
                            Filtrar
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground dark:border-slate-700 dark:bg-slate-950/40">
                    <table className="w-full text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">
                                    Fecha y hora
                                </th>
                                <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">
                                    Usuario
                                </th>
                                <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">
                                    Acción
                                </th>
                                <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">
                                    Ruta
                                </th>
                                <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">
                                    IP
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {logs.data.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-8 text-center text-slate-500"
                                    >
                                        No hay registros para los filtros
                                        aplicados.
                                    </td>
                                </tr>
                            ) : (
                                logs.data.map((log) => (
                                    <tr key={log.id}>
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-200">
                                            {formatDateTime(log.created_at)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                                            {log.user?.name ?? log.user_name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-100">
                                            {log.action}
                                        </td>
                                        <td className="max-w-[18rem] truncate px-4 py-3 font-mono text-xs text-slate-500" title={log.route_name ?? log.url}>
                                            {log.route_name ?? log.url}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                            {log.ip_address ?? '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination links={logs.links} />
            </div>
        </AppLayout>
    );
}
