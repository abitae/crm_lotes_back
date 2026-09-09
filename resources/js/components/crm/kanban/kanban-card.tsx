import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { BellPlus, Eye, LifeBuoy, MoreVertical, Pencil, Phone, Tags } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    availableTags = [],
    onView,
    onEdit,
    onCreateReminder,
    onCreateTicket,
    onToggleTag,
}: {
    client: KanbanClient;
    availableTags?: { id: number; name: string; color: string | null }[];
    onView?: (client: KanbanClient) => void;
    onEdit: (client: KanbanClient) => void;
    onCreateReminder: (client: KanbanClient) => void;
    onCreateTicket: (client: KanbanClient) => void;
    onToggleTag?: (client: KanbanClient, tagId: number) => void;
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
            onClick={() => (onView ?? onEdit)(client)}
            className={cn(
                'group/card cursor-grab touch-manipulation rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow select-none active:cursor-grabbing',
                isDragging ? 'opacity-40' : 'hover:shadow-md',
            )}
        >
            <div className="flex items-start justify-between gap-1">
                <p className="min-w-0 truncate text-sm font-semibold text-card-foreground">{client.name}</p>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Más acciones para ${client.name}`}
                            className="-mt-1 -mr-1 size-7 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <MoreVertical className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        {onView ? (
                            <DropdownMenuItem onSelect={() => onView(client)}>
                                <Eye className="mr-2 size-4" />
                                Ver ficha
                            </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onSelect={() => onCreateReminder(client)}>
                            <BellPlus className="mr-2 size-4" />
                            Crear recordatorio
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onCreateTicket(client)}>
                            <LifeBuoy className="mr-2 size-4" />
                            Crear ticket
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onEdit(client)}>
                            <Pencil className="mr-2 size-4" />
                            Editar cliente
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="size-3" />
                {client.phone}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1">
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
                {onToggleTag && availableTags.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Etiquetas de ${client.name}`}
                                className="size-5 shrink-0"
                                onClick={(event) => event.stopPropagation()}
                                onPointerDown={(event) => event.stopPropagation()}
                            >
                                <Tags className="size-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="start"
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => event.stopPropagation()}
                        >
                            {availableTags.map((tag) => {
                                const selected = client.tags.some((assigned) => assigned.id === tag.id);

                                return (
                                    <DropdownMenuCheckboxItem
                                        key={tag.id}
                                        checked={selected}
                                        onSelect={(event) => event.preventDefault()}
                                        onCheckedChange={() => onToggleTag(client, tag.id)}
                                    >
                                        {tag.name}
                                    </DropdownMenuCheckboxItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );
}
