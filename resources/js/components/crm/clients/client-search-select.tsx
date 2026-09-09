import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type ClientSearchOption = { id: number; name: string };

type Props = {
    id?: string;
    clients: ClientSearchOption[];
    value: number | '';
    onChange: (value: number | '') => void;
    allowEmpty?: boolean;
    emptyLabel?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
};

export function ClientSearchSelect({
    id,
    clients,
    value,
    onChange,
    allowEmpty = false,
    emptyLabel = 'Todos los clientes',
    placeholder = 'Buscar cliente…',
    required = false,
    disabled = false,
}: Props) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selected = clients.find((client) => client.id === value);
    const label = selected?.name ?? (allowEmpty ? emptyLabel : placeholder);

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();

        if (!term) {
            return clients;
        }

        return clients.filter((client) =>
            client.name.toLowerCase().includes(term),
        );
    }, [clients, query]);

    const close = () => {
        setOpen(false);
        setQuery('');
    };

    useEffect(() => {
        if (!open) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            if (
                rootRef.current &&
                !rootRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
                setQuery('');
            }
        };

        document.addEventListener('mousedown', handlePointerDown);

        return () =>
            document.removeEventListener('mousedown', handlePointerDown);
    }, [open]);

    const selectClient = (next: number | '') => {
        onChange(next);
        close();
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                id={fieldId}
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-required={required || undefined}
                onClick={() => (open ? close() : setOpen(true))}
                className={cn(
                    'flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-left text-sm shadow-sm',
                    'outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    !selected &&
                        allowEmpty === false &&
                        'text-muted-foreground',
                    disabled && 'pointer-events-none opacity-50',
                )}
            >
                <span className="truncate">{label}</span>
                <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover text-popover-foreground shadow-md">
                    <div className="p-2">
                        <Input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={placeholder}
                            aria-label={placeholder}
                            className="h-8"
                        />
                    </div>
                    <ul
                        role="listbox"
                        aria-labelledby={fieldId}
                        className="max-h-52 overflow-y-auto p-1"
                    >
                        {allowEmpty && (
                            <li>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={value === ''}
                                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                                    onClick={() => selectClient('')}
                                >
                                    <Check
                                        className={cn(
                                            'size-4',
                                            value === ''
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    <span className="text-muted-foreground">
                                        {emptyLabel}
                                    </span>
                                </button>
                            </li>
                        )}
                        {filtered.map((client) => (
                            <li key={client.id}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={value === client.id}
                                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                                    onClick={() => selectClient(client.id)}
                                >
                                    <Check
                                        className={cn(
                                            'size-4',
                                            value === client.id
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    <span className="truncate">
                                        {client.name}
                                    </span>
                                </button>
                            </li>
                        ))}
                        {filtered.length === 0 && (
                            <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                                No hay clientes que coincidan.
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
