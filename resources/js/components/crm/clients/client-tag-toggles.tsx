import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ClientTagOption = {
    id: number;
    name: string;
    color: string | null;
};

export function toggleTagId(selectedIds: number[], tagId: number): number[] {
    return selectedIds.includes(tagId)
        ? selectedIds.filter((id) => id !== tagId)
        : [...selectedIds, tagId];
}

export function ClientTagToggles({
    tags,
    selectedIds,
    onToggle,
    size = 'md',
    emptyText = 'Sin etiquetas. Créalas en Estados y etiquetas.',
}: {
    tags: ClientTagOption[];
    selectedIds: number[];
    onToggle: (tagId: number) => void;
    size?: 'sm' | 'md';
    emptyText?: string;
}) {
    if (tags.length === 0) {
        return <p className="text-xs text-muted-foreground">{emptyText}</p>;
    }

    return (
        <div className="flex flex-wrap gap-1">
            {tags.map((tag) => {
                const selected = selectedIds.includes(tag.id);

                return (
                    <button
                        key={tag.id}
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onToggle(tag.id);
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                    >
                        <Badge
                            variant={selected ? 'default' : 'secondary'}
                            className={cn(
                                'cursor-pointer',
                                size === 'sm' && 'px-1.5 py-0 text-[10px]',
                            )}
                            style={
                                selected && tag.color
                                    ? { backgroundColor: tag.color, color: '#fff' }
                                    : tag.color
                                      ? { backgroundColor: `${tag.color}1a`, color: tag.color }
                                      : undefined
                            }
                        >
                            {tag.name}
                        </Badge>
                    </button>
                );
            })}
        </div>
    );
}
