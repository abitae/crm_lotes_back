import { router } from '@inertiajs/react';
import { Loader2, Merge } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/date';
import { confirmDelete, showSuccessToast } from '@/lib/swal';
import { cn } from '@/lib/utils';

export type DuplicateMergeClient = {
    id: number;
    name: string;
    dni: string;
    phone: string;
    email?: string | null;
    created_at?: string | null;
    lots_count: number;
    attention_tickets_count: number;
    type?: { id: number; name: string; color?: string | null } | null;
    status?: { id: number; name: string; color?: string | null } | null;
    advisor?: { id: number; name: string } | null;
};

export type DuplicateMergeGroup = {
    key: string;
    display: string;
    clients: DuplicateMergeClient[];
};

type MatchField = 'phone' | 'dni';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    listQs: string;
};

const FIELD_CONFIG: Record<
    MatchField,
    {
        label: string;
        empty: string;
        loading: string;
        listUrl: string;
        mergeUrl: string;
        groupNoun: string;
    }
> = {
    phone: {
        label: 'Teléfono',
        empty: 'No hay clientes con el mismo teléfono.',
        loading: 'Buscando teléfonos duplicados…',
        listUrl: '/inmopro/clients/phone-duplicates',
        mergeUrl: '/inmopro/clients/merge-by-phone',
        groupNoun: 'teléfono',
    },
    dni: {
        label: 'DNI',
        empty: 'No hay clientes con el mismo DNI.',
        loading: 'Buscando DNIs duplicados…',
        listUrl: '/inmopro/clients/dni-duplicates',
        mergeUrl: '/inmopro/clients/merge-by-dni',
        groupNoun: 'DNI',
    },
};

export function ClientDuplicateMergeModal({ open, onOpenChange, listQs }: Props) {
    const [field, setField] = useState<MatchField>('phone');
    const [loading, setLoading] = useState(false);
    const [merging, setMerging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [groups, setGroups] = useState<DuplicateMergeGroup[]>([]);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [keepClientId, setKeepClientId] = useState<number | null>(null);

    const config = FIELD_CONFIG[field];

    const activeGroup = useMemo(
        () => groups.find((group) => group.key === selectedKey) ?? null,
        [groups, selectedKey],
    );

    const loadGroups = useCallback(async (matchField: MatchField): Promise<void> => {
        setLoading(true);
        setError(null);

        const fieldConfig = FIELD_CONFIG[matchField];

        try {
            const res = await fetch(fieldConfig.listUrl, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            const raw = await res.text();
            let body: { groups?: DuplicateMergeGroup[]; message?: string };

            try {
                body = JSON.parse(raw) as { groups?: DuplicateMergeGroup[]; message?: string };
            } catch {
                setError('Respuesta inválida al cargar duplicados.');
                setGroups([]);

                return;
            }

            if (!res.ok) {
                setError(body.message ?? 'No se pudieron cargar los clientes duplicados.');
                setGroups([]);

                return;
            }

            const nextGroups = body.groups ?? [];
            setGroups(nextGroups);
            const first = nextGroups[0] ?? null;
            setSelectedKey(first?.key ?? null);
            setKeepClientId(first?.clients[0]?.id ?? null);
        } catch {
            setError('Error de red al cargar duplicados. Intente de nuevo.');
            setGroups([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!open) {
            return;
        }

        void loadGroups(field);
    }, [open, field, loadGroups]);

    useEffect(() => {
        if (!activeGroup) {
            setKeepClientId(null);

            return;
        }

        if (!activeGroup.clients.some((client) => client.id === keepClientId)) {
            setKeepClientId(activeGroup.clients[0]?.id ?? null);
        }
    }, [activeGroup, keepClientId]);

    const mergeOthers = useMemo(() => {
        if (!activeGroup || keepClientId == null) {
            return [];
        }

        return activeGroup.clients.filter((client) => client.id !== keepClientId);
    }, [activeGroup, keepClientId]);

    const keepClient = useMemo(
        () => activeGroup?.clients.find((client) => client.id === keepClientId) ?? null,
        [activeGroup, keepClientId],
    );

    const handleMerge = async (): Promise<void> => {
        if (!keepClient || mergeOthers.length === 0) {
            return;
        }

        const confirmed = await confirmDelete(
            '¿Unificar clientes?',
            `Se conservará «${keepClient.name}» y se fusionarán ${mergeOthers.length} registro(s) duplicado(s) por ${config.groupNoun}. Lotes, tickets y seguimiento pasarán al principal. Esta acción no se puede deshacer.`,
        );

        if (!confirmed) {
            return;
        }

        setMerging(true);
        setError(null);

        router.post(
            `${config.mergeUrl}${listQs}`,
            {
                keep_client_id: keepClient.id,
                merge_client_ids: mergeOthers.map((client) => client.id),
            },
            {
                preserveScroll: true,
                onFinish: () => setMerging(false),
                onSuccess: () => {
                    onOpenChange(false);
                    showSuccessToast('Clientes unificados correctamente.');
                },
                onError: (errors) => {
                    const first = Object.values(errors).flat()[0];
                    setError(typeof first === 'string' ? first : 'No se pudo unificar. Revise la selección.');
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[92vh] w-[min(100vw-1.5rem,48rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(100vw-2rem,48rem)]">
                <div className="border-b border-slate-100 px-6 py-4">
                    <DialogHeader className="space-y-1 text-left">
                        <DialogTitle className="flex items-center gap-2">
                            <Merge className="h-5 w-5 text-slate-600" />
                            Unificar clientes duplicados
                        </DialogTitle>
                        <DialogDescription className="text-left">
                            Busque grupos con el mismo teléfono o DNI, marque el cliente a conservar y unifique el resto.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                        {(Object.keys(FIELD_CONFIG) as MatchField[]).map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                disabled={loading || merging}
                                onClick={() => setField(tab)}
                                className={cn(
                                    'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                                    field === tab
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700',
                                )}
                            >
                                {FIELD_CONFIG[tab].label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {config.loading}
                        </div>
                    ) : error && groups.length === 0 ? (
                        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                            <div className="mt-3">
                                <Button type="button" variant="outline" size="sm" onClick={() => void loadGroups(field)}>
                                    Reintentar
                                </Button>
                            </div>
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
                            {config.empty}
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Grupos detectados ({groups.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {groups.map((group) => (
                                        <button
                                            key={group.key}
                                            type="button"
                                            onClick={() => {
                                                setSelectedKey(group.key);
                                                setKeepClientId(group.clients[0]?.id ?? null);
                                            }}
                                            className={cn(
                                                'rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition-colors',
                                                selectedKey === group.key
                                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                                            )}
                                        >
                                            <span className="block">{group.display}</span>
                                            <span className="text-[10px] font-normal text-slate-500">
                                                {group.clients.length} clientes
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {activeGroup && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Seleccione el cliente a conservar
                                    </p>
                                    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                                        {activeGroup.clients.map((client) => {
                                            const selected = client.id === keepClientId;

                                            return (
                                                <li key={client.id}>
                                                    <label
                                                        className={cn(
                                                            'flex cursor-pointer gap-3 px-4 py-3 transition-colors',
                                                            selected ? 'bg-emerald-50/70' : 'bg-white hover:bg-slate-50',
                                                        )}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="keep_client"
                                                            className="mt-1"
                                                            checked={selected}
                                                            onChange={() => setKeepClientId(client.id)}
                                                        />
                                                        <div className="min-w-0 flex-1 space-y-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="truncate font-semibold text-slate-900">
                                                                    {client.name}
                                                                </span>
                                                                {selected && (
                                                                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                                                        Conservar
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-600">
                                                                DNI {client.dni || '—'} · Tel. {client.phone || '—'}
                                                                {client.email ? ` · ${client.email}` : ''}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                Asesor: {client.advisor?.name ?? '—'}
                                                                {client.type ? ` · ${client.type.name}` : ''}
                                                                {client.status ? ` · ${client.status.name}` : ''}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {client.lots_count} lote(s) · {client.attention_tickets_count}{' '}
                                                                ticket(s)
                                                                {client.created_at
                                                                    ? ` · Alta ${formatDateTime(client.created_at)}`
                                                                    : ''}
                                                            </p>
                                                        </div>
                                                    </label>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    {keepClient && mergeOthers.length > 0 && (
                                        <p className="text-xs text-slate-500">
                                            Se fusionarán {mergeOthers.length} cliente(s) en «{keepClient.name}». Sus
                                            datos de perfil no se mezclan: se mantienen los del principal.
                                        </p>
                                    )}
                                </div>
                            )}

                            {error && (
                                <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {error}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter className="border-t border-slate-100 px-6 py-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={merging}>
                        Cerrar
                    </Button>
                    <Button
                        type="button"
                        onClick={() => void handleMerge()}
                        disabled={loading || merging || !keepClient || mergeOthers.length === 0}
                    >
                        {merging ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Unificando…
                            </>
                        ) : (
                            <>
                                <Merge className="h-4 w-4" />
                                Unificar
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
