import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { toggleTagId } from '@/components/crm/clients/client-tag-toggles';
import { KanbanCard, type KanbanClient } from '@/components/crm/kanban/kanban-card';
import { KanbanColumn, type KanbanStatus } from '@/components/crm/kanban/kanban-column';
import clientsCrm from '@/routes/crm/clients/crm';

type ColumnsState = Record<number, KanbanClient[]>;

// Los clientes recién creados no tienen estado asignado (client_status_id
// nulo) hasta que se les mueve manualmente a una etapa. Sentinel seguro:
// los IDs reales de ClientStatus son autoincrementales desde 1.
const UNASSIGNED_COLUMN_ID = 0;

const UNASSIGNED_STATUS: KanbanStatus = {
    id: UNASSIGNED_COLUMN_ID,
    code: 'SIN_ESTADO',
    name: 'Sin estado',
    color: '#94a3b8',
};

function groupByStatus(clients: KanbanClient[], statuses: KanbanStatus[]): ColumnsState {
    const columns: ColumnsState = { [UNASSIGNED_COLUMN_ID]: [] };
    for (const status of statuses) {
        columns[status.id] = [];
    }
    for (const client of clients) {
        const key = client.client_status_id !== null && columns[client.client_status_id]
            ? client.client_status_id
            : UNASSIGNED_COLUMN_ID;
        columns[key].push(client);
    }
    return columns;
}

export function KanbanBoard({
    clients,
    statuses,
    availableTags = [],
    counts,
    onViewClient,
    onEditClient,
    onCreateReminder,
    onCreateTicket,
    onToggleTag,
}: {
    clients: KanbanClient[];
    statuses: KanbanStatus[];
    availableTags?: { id: number; name: string; color: string | null }[];
    counts?: Record<number, number>;
    onViewClient?: (client: KanbanClient) => void;
    onEditClient: (client: KanbanClient) => void;
    onCreateReminder: (client: KanbanClient) => void;
    onCreateTicket: (client: KanbanClient) => void;
    onToggleTag?: (client: KanbanClient, tagId: number) => void;
}) {
    const [columns, setColumns] = useState<ColumnsState>(() => groupByStatus(clients, statuses));
    const [columnCounts, setColumnCounts] = useState<Record<number, number>>(() => counts ?? {});
    const [activeClient, setActiveClient] = useState<KanbanClient | null>(null);
    const snapshotRef = useRef<{ columns: ColumnsState; counts: Record<number, number> } | null>(null);

    useEffect(() => {
        setColumns(groupByStatus(clients, statuses));
        setColumnCounts(counts ?? {});
    }, [clients, statuses, counts]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveClient((event.active.data.current?.client as KanbanClient) ?? null);
    };

    const handleToggleTag = (client: KanbanClient, tagId: number) => {
        const nextIds = toggleTagId(client.tags.map((tag) => tag.id), tagId);
        const nextTags = availableTags.filter((tag) => nextIds.includes(tag.id));
        const updated = { ...client, tags: nextTags };

        setColumns((prev) => {
            const next: ColumnsState = {};
            for (const [statusId, list] of Object.entries(prev)) {
                next[Number(statusId)] = list.map((item) => (item.id === client.id ? updated : item));
            }
            return next;
        });

        onToggleTag?.(client, tagId);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveClient(null);

        const { active, over } = event;
        if (!over) {
            return;
        }

        const clientId = Number(active.id);
        const targetStatusId = Number(over.id);
        const client = active.data.current?.client as KanbanClient | undefined;

        if (!client || targetStatusId === UNASSIGNED_COLUMN_ID || client.client_status_id === targetStatusId) {
            return;
        }

        snapshotRef.current = { columns, counts: columnCounts };

        setColumns((prev) => {
            const next: ColumnsState = {};
            for (const [statusId, list] of Object.entries(prev)) {
                next[Number(statusId)] = list.filter((c) => c.id !== clientId);
            }
            next[targetStatusId] = [
                ...(next[targetStatusId] ?? []),
                { ...client, client_status_id: targetStatusId },
            ];
            return next;
        });

        const sourceStatusId = client.client_status_id ?? UNASSIGNED_COLUMN_ID;
        setColumnCounts((prev) => ({
            ...prev,
            [sourceStatusId]: Math.max(0, (prev[sourceStatusId] ?? 0) - 1),
            [targetStatusId]: (prev[targetStatusId] ?? 0) + 1,
        }));

        router.patch(
            clientsCrm.update(clientId).url,
            { client_status_id: targetStatusId },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => {
                    if (snapshotRef.current) {
                        setColumns(snapshotRef.current.columns);
                        setColumnCounts(snapshotRef.current.counts);
                    }
                },
            },
        );
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-2">
                {((columnCounts[UNASSIGNED_COLUMN_ID] ?? 0) > 0 ||
                    (columns[UNASSIGNED_COLUMN_ID]?.length ?? 0) > 0) && (
                    <KanbanColumn
                        status={UNASSIGNED_STATUS}
                        clients={columns[UNASSIGNED_COLUMN_ID] ?? []}
                        totalCount={columnCounts[UNASSIGNED_COLUMN_ID]}
                        availableTags={availableTags}
                        onViewClient={onViewClient}
                        onEditClient={onEditClient}
                        onCreateReminder={onCreateReminder}
                        onCreateTicket={onCreateTicket}
                        onToggleTag={handleToggleTag}
                        droppable={false}
                        emptyLabel="Hay clientes sin etapa que no caben en este tablero. Usa la búsqueda o la vista tabla."
                    />
                )}
                {statuses.map((status) => (
                    <KanbanColumn
                        key={status.id}
                        status={status}
                        clients={columns[status.id] ?? []}
                        totalCount={columnCounts[status.id]}
                        availableTags={availableTags}
                        onViewClient={onViewClient}
                        onEditClient={onEditClient}
                        onCreateReminder={onCreateReminder}
                        onCreateTicket={onCreateTicket}
                        onToggleTag={handleToggleTag}
                    />
                ))}
            </div>
            <DragOverlay>
                {activeClient && (
                    <KanbanCard
                        client={activeClient}
                        availableTags={availableTags}
                        onView={() => {}}
                        onEdit={() => {}}
                        onCreateReminder={() => {}}
                        onCreateTicket={() => {}}
                    />
                )}
            </DragOverlay>
        </DndContext>
    );
}
