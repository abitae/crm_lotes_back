import { useDroppable } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { KanbanCard, type KanbanClient } from '@/components/crm/kanban/kanban-card';
import { StatusBadge } from '@/components/crm/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type KanbanStatus = {
    id: number;
    code: string;
    name: string;
    color: string | null;
};

export function KanbanColumn({
    status,
    clients,
    availableTags = [],
    onViewClient,
    onEditClient,
    onCreateReminder,
    onCreateTicket,
    onToggleTag,
    droppable = true,
    emptyLabel = 'Sin clientes en este estado.',
    totalCount,
}: {
    status: KanbanStatus;
    clients: KanbanClient[];
    availableTags?: { id: number; name: string; color: string | null }[];
    onViewClient?: (client: KanbanClient) => void;
    onEditClient: (client: KanbanClient) => void;
    onCreateReminder: (client: KanbanClient) => void;
    onCreateTicket: (client: KanbanClient) => void;
    onToggleTag?: (client: KanbanClient, tagId: number) => void;
    droppable?: boolean;
    emptyLabel?: string;
    totalCount?: number;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: status.id, disabled: !droppable });
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'flex shrink-0 flex-col rounded-xl bg-muted/40 transition-[width] duration-200',
                collapsed ? 'w-12' : 'w-72',
                !droppable && 'border border-dashed border-border bg-transparent',
                isOver && 'bg-primary/5 outline-2 outline-dashed outline-primary/40',
            )}
        >
            <div className={cn('flex gap-2 px-2 py-2.5', collapsed ? 'flex-1 flex-col items-center' : 'items-center justify-between')}>
                <div className={cn('min-w-0', collapsed && 'flex flex-1 flex-col items-center gap-2')}>
                    <StatusBadge color={status.color} className="bg-transparent px-0">
                        <span className={cn('text-sm font-semibold', collapsed ? '[writing-mode:vertical-rl]' : 'truncate')}>
                            {status.name}
                        </span>
                    </StatusBadge>
                    {collapsed ? (
                        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {totalCount ?? clients.length}
                        </span>
                    ) : null}
                </div>
                <div className={cn('flex shrink-0 items-center', collapsed && 'flex-col-reverse gap-1')}>
                    {!collapsed ? (
                        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {totalCount ?? clients.length}
                        </span>
                    ) : null}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={`${collapsed ? 'Expandir' : 'Colapsar'} columna ${status.name}`}
                        aria-expanded={!collapsed}
                        onClick={() => setCollapsed((value) => !value)}
                    >
                        {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
                    </Button>
                </div>
            </div>

            {!collapsed ? (
                <div
                    className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto rounded-b-xl p-2 transition-colors"
                    style={{ maxHeight: 'calc(100vh - 20rem)' }}
                >
                    {clients.map((client) => (
                        <KanbanCard
                            key={client.id}
                            client={client}
                            availableTags={availableTags}
                            onView={onViewClient}
                            onEdit={onEditClient}
                            onCreateReminder={onCreateReminder}
                            onCreateTicket={onCreateTicket}
                            onToggleTag={onToggleTag}
                        />
                    ))}
                    {clients.length === 0 && (
                        <p className="px-2 py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
                    )}
                </div>
            ) : null}
        </div>
    );
}
