import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import { search as searchClients } from '@/routes/crm/clients';

export type ClientSearchOption = {
    id: number;
    name: string;
    dni?: string | null;
    phone?: string | null;
};

type Props = {
    id?: string;
    clients?: ClientSearchOption[];
    value: number | '';
    onChange: (value: number | '', client?: ClientSearchOption) => void;
    allowEmpty?: boolean;
    emptyLabel?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    /** Search via GET /crm/clients/search instead of filtering a preloaded list. */
    remote?: boolean;
};

const SEARCH_DEBOUNCE_MS = 250;
const MIN_REMOTE_CHARS = 2;

function clientMatches(client: ClientSearchOption, term: string): boolean {
    const normalized = term.trim().toLowerCase();
    const digits = term.replace(/\D+/g, '');

    if (!normalized) {
        return true;
    }

    if (client.name.toLowerCase().includes(normalized)) {
        return true;
    }

    if (client.dni?.toLowerCase().includes(normalized)) {
        return true;
    }

    if (client.phone?.toLowerCase().includes(normalized)) {
        return true;
    }

    if (digits.length >= 2) {
        const dniDigits = (client.dni ?? '').replace(/\D+/g, '');
        const phoneDigits = (client.phone ?? '').replace(/\D+/g, '');

        return dniDigits.includes(digits) || phoneDigits.includes(digits);
    }

    return false;
}

export function formatClientOption(client: ClientSearchOption): string {
    return [client.name, client.dni, client.phone].filter(Boolean).join(' · ');
}

export function ClientSearchSelect({
    id,
    clients = [],
    value,
    onChange,
    allowEmpty = false,
    emptyLabel = 'Todos los clientes',
    placeholder = 'Buscar por nombre, DNI o teléfono…',
    required = false,
    disabled = false,
    remote = false,
}: Props) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [remoteClients, setRemoteClients] = useState<ClientSearchOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedCache, setSelectedCache] = useState<ClientSearchOption | null>(null);
    const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);

    const selected =
        clients.find((client) => client.id === value) ??
        remoteClients.find((client) => client.id === value) ??
        (selectedCache?.id === value ? selectedCache : undefined);

    const label = selected
        ? formatClientOption(selected)
        : allowEmpty
          ? emptyLabel
          : placeholder;

    const filtered = useMemo(() => {
        if (remote) {
            return remoteClients;
        }

        const term = query.trim();

        if (!term) {
            return clients;
        }

        return clients.filter((client) => clientMatches(client, term));
    }, [clients, query, remote, remoteClients]);

    const close = () => {
        setOpen(false);
        setQuery('');
    };

    useEffect(() => {
        if (!open) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        };

        document.addEventListener('mousedown', handlePointerDown);

        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [open]);

    useEffect(() => {
        if (!open || !remote) {
            return;
        }

        const term = debouncedQuery.trim();

        if (term.length < MIN_REMOTE_CHARS) {
            setRemoteClients([]);
            setLoading(false);

            return;
        }

        const controller = new AbortController();
        setLoading(true);

        fetch(searchClients.url({ query: { q: term } }), {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
            signal: controller.signal,
        })
            .then((response) => (response.ok ? response.json() : []))
            .then((payload: unknown) => {
                if (Array.isArray(payload)) {
                    setRemoteClients(payload as ClientSearchOption[]);
                }
            })
            .catch((error: unknown) => {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }

                setRemoteClients([]);
            })
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, [debouncedQuery, open, remote]);

    const selectClient = (next: number | '', client?: ClientSearchOption) => {
        if (client) {
            setSelectedCache(client);
        } else if (next === '') {
            setSelectedCache(null);
        }

        onChange(next);
        close();
    };

    const remoteHint =
        remote && query.trim().length < MIN_REMOTE_CHARS
            ? `Escribe al menos ${MIN_REMOTE_CHARS} caracteres (nombre, DNI o teléfono).`
            : null;

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
                    !selected && allowEmpty === false && 'text-muted-foreground',
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
                                            value === '' ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                    <span className="text-muted-foreground">{emptyLabel}</span>
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
                                    onClick={() => selectClient(client.id, client)}
                                >
                                    <Check
                                        className={cn(
                                            'size-4',
                                            value === client.id ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                    <span className="truncate">{formatClientOption(client)}</span>
                                </button>
                            </li>
                        ))}
                        {loading && (
                            <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                                Buscando…
                            </li>
                        )}
                        {!loading && remoteHint && (
                            <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                                {remoteHint}
                            </li>
                        )}
                        {!loading && !remoteHint && filtered.length === 0 && (
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
