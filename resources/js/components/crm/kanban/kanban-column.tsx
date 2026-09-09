import { useDroppable } from '@dnd-kit/core';
import { KanbanCard, type KanbanClient } from '@/components/crm/kanban/kanban-card';
import { StatusBadge } from '@/components/crm/status-badge';
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
}) {
    const { setNodeRef, isOver } = useDroppable({ id: status.id, disabled: !droppable });

    return (
        <div
            className={cn(
                'flex w-72 shrink-0 flex-col rounded-xl bg-muted/40',
                !droppable && 'border border-dashed border-border bg-transparent',
            )}
        >
            <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0">
                    <StatusBadge color={status.color} className="bg-transparent px-0">
                        <span className="truncate text-sm font-semibold">{status.name}</span>
                    </StatusBadge>
                </div>
                <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {clients.length}
                </span>
            </div>

            <div
                ref={setNodeRef}
                className={cn(
                    'flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto rounded-b-xl p-2 transition-colors',
                    isOver && 'bg-primary/5 outline-2 outline-dashed outline-primary/40',
                )}
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
        </div>
    );
}
