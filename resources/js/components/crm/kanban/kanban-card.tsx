import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type KanbanClient = {
    id: number;
    name: string;
    dni: string | null;
    phone: string;
    email: string | null;
    referred_by: string | null;
    client_type_id: number;
    client_status_id: number | null;
    city_id: number | null;
    type: { code: string; name: string } | null;
    status: { id: number; code: string; name: string; color: string | null } | null;
    tags: { id: number; name: string; color: string | null }[];
};

export function KanbanCard({
    client,
    onEdit,
}: {
    client: KanbanClient;
    onEdit: (client: KanbanClient) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: client.id,
        data: { client },
    });

    const style = transform
        ? { transform: CSS.Translate.toString(transform) }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => onEdit(client)}
            className={cn(
                'cursor-grab touch-none rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow select-none active:cursor-grabbing',
                isDragging ? 'opacity-40' : 'hover:shadow-md',
            )}
        >
            <p className="truncate text-sm font-semibold text-card-foreground">{client.name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="size-3" />
                {client.phone}
            </p>
            {client.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {client.tags.map((tag) => (
                        <Badge
                            key={tag.id}
                            variant="secondary"
                            className="px-1.5 py-0 text-[10px]"
                            style={
                                tag.color
                                    ? { backgroundColor: `${tag.color}1a`, color: tag.color }
                                    : undefined
                            }
                        >
                            {tag.name}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
