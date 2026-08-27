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
import { KanbanCard, type KanbanClient } from '@/components/crm/kanban/kanban-card';
import { KanbanColumn, type KanbanStatus } from '@/components/crm/kanban/kanban-column';
import clientsCrm from '@/routes/crm/clients/crm';

type ColumnsState = Record<number, KanbanClient[]>;

function groupByStatus(clients: KanbanClient[], statuses: KanbanStatus[]): ColumnsState {
    const columns: ColumnsState = {};
    for (const status of statuses) {
        columns[status.id] = [];
    }
    for (const client of clients) {
        if (client.client_status_id !== null && columns[client.client_status_id]) {
            columns[client.client_status_id].push(client);
        }
    }
    return columns;
}

export function KanbanBoard({
    clients,
    statuses,
    onEditClient,
}: {
    clients: KanbanClient[];
    statuses: KanbanStatus[];
    onEditClient: (client: KanbanClient) => void;
}) {
    const [columns, setColumns] = useState<ColumnsState>(() => groupByStatus(clients, statuses));
    const [activeClient, setActiveClient] = useState<KanbanClient | null>(null);
    const snapshotRef = useRef<ColumnsState | null>(null);

    useEffect(() => {
        setColumns(groupByStatus(clients, statuses));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clients, statuses]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveClient((event.active.data.current?.client as KanbanClient) ?? null);
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

        if (!client || client.client_status_id === targetStatusId) {
            return;
        }

        snapshotRef.current = columns;

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

        router.patch(
            clientsCrm.update(clientId).url,
            { client_status_id: targetStatusId },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => {
                    if (snapshotRef.current) {
                        setColumns(snapshotRef.current);
                    }
                },
            },
        );
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-2">
                {statuses.map((status) => (
                    <KanbanColumn
                        key={status.id}
                        status={status}
                        clients={columns[status.id] ?? []}
                        onEditClient={onEditClient}
                    />
                ))}
            </div>
            <DragOverlay>
                {activeClient && <KanbanCard client={activeClient} onEdit={() => {}} />}
            </DragOverlay>
        </DndContext>
    );
}
