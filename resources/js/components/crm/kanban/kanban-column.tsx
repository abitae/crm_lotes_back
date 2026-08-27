import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { KanbanCard, type KanbanClient } from '@/components/crm/kanban/kanban-card';

export type KanbanStatus = {
    id: number;
    code: string;
    name: string;
    color: string | null;
};

export function KanbanColumn({
    status,
    clients,
    onEditClient,
}: {
    status: KanbanStatus;
    clients: KanbanClient[];
    onEditClient: (client: KanbanClient) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: status.id });

    return (
        <div className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/40">
            <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                    <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: status.color ?? '#94a3b8' }}
                    />
                    <span className="truncate text-sm font-semibold">{status.name}</span>
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
                    <KanbanCard key={client.id} client={client} onEdit={onEditClient} />
                ))}
                {clients.length === 0 && (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                        Sin clientes en este estado.
                    </p>
                )}
            </div>
        </div>
    );
}
