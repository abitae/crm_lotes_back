import { Link, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDateTime } from '@/lib/crm-format';
import { cn } from '@/lib/utils';
import reminders from '@/routes/crm/reminders';
import type { PendingRemindersShared } from '@/types/auth';

export function CrmRemindersBell() {
    const { pendingReminders } = usePage<{
        pendingReminders?: PendingRemindersShared;
    }>().props;
    const count = pendingReminders?.count ?? 0;
    const items = pendingReminders?.items ?? [];
    const label =
        count === 1
            ? '1 recordatorio pendiente'
            : `${count.toLocaleString('es-PE')} recordatorios pendientes`;
    const listUrl = reminders.index.url({ query: { period: 'pendientes' } });

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="relative size-8 shrink-0 rounded-full"
                    title={label}
                    aria-label={label}
                >
                    <Bell className="h-4 w-4" />
                    {count > 0 ? (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                            {count > 99 ? '99+' : count}
                        </span>
                    ) : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                <DropdownMenuLabel className="px-3 py-2">
                    Recordatorios pendientes
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="m-0" />
                {items.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No tienes recordatorios pendientes.
                    </p>
                ) : (
                    <div className="max-h-80 overflow-y-auto py-1">
                        {items.map((item) => {
                            const overdue =
                                item.remind_at !== null &&
                                new Date(item.remind_at).getTime() < Date.now();

                            return (
                                <DropdownMenuItem key={item.id} asChild className="cursor-pointer items-start px-3 py-2">
                                    <Link href={listUrl}>
                                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <span className="truncate font-medium">{item.title}</span>
                                            <span className="truncate text-xs text-muted-foreground">
                                                {item.client?.name ?? 'Sin cliente'}
                                            </span>
                                            <span
                                                className={cn(
                                                    'text-xs',
                                                    overdue
                                                        ? 'font-medium text-destructive'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {overdue ? 'Vencido · ' : ''}
                                                {formatDateTime(item.remind_at)}
                                            </span>
                                        </span>
                                    </Link>
                                </DropdownMenuItem>
                            );
                        })}
                    </div>
                )}
                <DropdownMenuSeparator className="m-0" />
                <DropdownMenuItem asChild className="cursor-pointer justify-center py-2.5 text-sm font-medium">
                    <Link href={listUrl}>Ver todos</Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
