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
import { formatClientPhone, useCanViewClientPhone } from '@/lib/inmopro-permissions';
import { showSuccessToast } from '@/lib/swal';
import { cn } from '@/lib/utils';

export type DuplicateMergeClient = {
    id: number;
    name: string;
    dni: string;
    phone: string | null;
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
        groupColumn: string;
    }
> = {
    phone: {
        label: 'Teléfono',
        empty: 'No hay clientes con el mismo teléfono.',
        loading: 'Buscando teléfonos duplicados…',
        listUrl: '/inmopro/clients/phone-duplicates',
        mergeUrl: '/inmopro/clients/merge-by-phone',
        groupNoun: 'teléfono',
        groupColumn: 'Teléfono',
    },
    dni: {
        label: 'DNI',
        empty: 'No hay clientes con el mismo DNI.',
        loading: 'Buscando DNIs duplicados…',
        listUrl: '/inmopro/clients/dni-duplicates',
        mergeUrl: '/inmopro/clients/merge-by-dni',
        groupNoun: 'DNI',
        groupColumn: 'DNI',
    },
};

export function ClientDuplicateMergeModal({ open, onOpenChange, listQs }: Props) {
    const canViewPhone = useCanViewClientPhone();
    const [field, setField] = useState<MatchField>(canViewPhone ? 'phone' : 'dni');
    const [loading, setLoading] = useState(false);
    const [merging, setMerging] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [groups, setGroups] = useState<DuplicateMergeGroup[]>([]);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [keepClientId, setKeepClientId] = useState<number | null>(null);

    const config = FIELD_CONFIG[field];
    const availableFields = (Object.keys(FIELD_CONFIG) as MatchField[]).filter(
        (tab) => tab !== 'phone' || canViewPhone,
    );

    const activeGroup = useMemo(
        () => groups.find((group) => group.key === selectedKey) ?? null,
        [groups, selectedKey],
    );

    const loadGroups = useCallback(async (matchField: MatchField): Promise<void> => {
        setLoading(true);
        setError(null);
        setConfirmOpen(false);

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
        if (!canViewPhone && field === 'phone') {
            setField('dni');
        }
    }, [canViewPhone, field]);

    useEffect(() => {
        if (!open) {
            setConfirmOpen(false);

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

    const openConfirm = (): void => {
        if (!keepClient || mergeOthers.length === 0) {
            return;
        }

        setConfirmOpen(true);
    };

    const executeMerge = (): void => {
        if (!keepClient || mergeOthers.length === 0) {
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
                    setConfirmOpen(false);
                    onOpenChange(false);
                    showSuccessToast('Clientes unificados correctamente.');
                },
                onError: (errors) => {
                    setConfirmOpen(false);
                    const first = Object.values(errors).flat()[0];
                    setError(typeof first === 'string' ? first : 'No se pudo unificar. Revise la selección.');
                },
            },
        );
    };

    const handleMainOpenChange = (nextOpen: boolean): void => {
        if (!nextOpen && merging) {
            return;
        }

        if (!nextOpen) {
            setConfirmOpen(false);
        }

        onOpenChange(nextOpen);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleMainOpenChange}>
                <DialogContent className="flex max-h-[92vh] w-[min(100vw-1.5rem,56rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(100vw-2rem,56rem)]">
                    <div className="border-b border-slate-100 px-6 py-4">
                        <DialogHeader className="space-y-1 text-left">
                            <DialogTitle className="flex items-center gap-2">
                                <Merge className="h-5 w-5 text-slate-600" />
                                Unificar clientes duplicados
                            </DialogTitle>
                            <DialogDescription className="text-left">
                                Elija un grupo de la lista, marque el cliente a conservar y confirme la unificación.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="mt-4 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                            {availableFields.map((tab) => (
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

                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
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
                                <section className="space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Grupos detectados ({groups.length})
                                    </p>
                                    <div className="overflow-hidden rounded-xl border border-slate-200">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                <tr>
                                                    <th className="px-4 py-2.5 font-bold">{config.groupColumn}</th>
                                                    <th className="px-4 py-2.5 font-bold">Clientes</th>
                                                    <th className="px-4 py-2.5 font-bold">Nombres</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {groups.map((group) => {
                                                    const selected = selectedKey === group.key;

                                                    return (
                                                        <tr
                                                            key={group.key}
                                                            className={cn(
                                                                'cursor-pointer transition-colors',
                                                                selected ? 'bg-emerald-50/80' : 'bg-white hover:bg-slate-50',
                                                            )}
                                                            onClick={() => {
                                                                setSelectedKey(group.key);
                                                                setKeepClientId(group.clients[0]?.id ?? null);
                                                            }}
                                                        >
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span
                                                                        className={cn(
                                                                            'inline-block h-2.5 w-2.5 rounded-full',
                                                                            selected ? 'bg-emerald-500' : 'bg-slate-300',
                                                                        )}
                                                                    />
                                                                    <span className="font-semibold text-slate-900">
                                                                        {group.display}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-600">{group.clients.length}</td>
                                                            <td className="px-4 py-3 text-slate-600">
                                                                <span className="line-clamp-1">
                                                                    {group.clients.map((client) => client.name).join(' · ')}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                {activeGroup && (
                                    <section className="space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Seleccione el cliente a conservar — {config.groupColumn} {activeGroup.display}
                                        </p>
                                        <div className="overflow-hidden rounded-xl border border-slate-200">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    <tr>
                                                        <th className="w-10 px-4 py-2.5 font-bold" />
                                                        <th className="px-4 py-2.5 font-bold">Cliente</th>
                                                        <th className="px-4 py-2.5 font-bold">DNI</th>
                                                        <th className="px-4 py-2.5 font-bold">Teléfono</th>
                                                        <th className="px-4 py-2.5 font-bold">Asesor</th>
                                                        <th className="px-4 py-2.5 font-bold">Lotes</th>
                                                        <th className="px-4 py-2.5 font-bold">Tickets</th>
                                                        <th className="px-4 py-2.5 font-bold">Alta</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {activeGroup.clients.map((client) => {
                                                        const selected = client.id === keepClientId;

                                                        return (
                                                            <tr
                                                                key={client.id}
                                                                className={cn(
                                                                    'cursor-pointer transition-colors',
                                                                    selected ? 'bg-emerald-50/80' : 'bg-white hover:bg-slate-50',
                                                                )}
                                                                onClick={() => setKeepClientId(client.id)}
                                                            >
                                                                <td className="px-4 py-3 align-middle">
                                                                    <input
                                                                        type="radio"
                                                                        name="keep_client"
                                                                        className="align-middle"
                                                                        checked={selected}
                                                                        onChange={() => setKeepClientId(client.id)}
                                                                        onClick={(event) => event.stopPropagation()}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="min-w-0">
                                                                        <p className="font-semibold text-slate-900">{client.name}</p>
                                                                        {selected && (
                                                                            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                                                                Conservar
                                                                            </span>
                                                                        )}
                                                                        {client.email ? (
                                                                            <p className="truncate text-xs text-slate-500">{client.email}</p>
                                                                        ) : null}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-700">{client.dni || '—'}</td>
                                                                <td className="px-4 py-3 text-slate-700">{formatClientPhone(client.phone, canViewPhone)}</td>
                                                                <td className="px-4 py-3 text-slate-600">
                                                                    {client.advisor?.name ?? '—'}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-600">{client.lots_count}</td>
                                                                <td className="px-4 py-3 text-slate-600">
                                                                    {client.attention_tickets_count}
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-slate-500">
                                                                    {client.created_at ? formatDateTime(client.created_at) : '—'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        {keepClient && mergeOthers.length > 0 && (
                                            <p className="text-xs text-slate-500">
                                                Se fusionarán {mergeOthers.length} cliente(s) en «{keepClient.name}». Los datos
                                                de perfil del principal no se mezclan.
                                            </p>
                                        )}
                                    </section>
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
                        <Button type="button" variant="outline" onClick={() => handleMainOpenChange(false)} disabled={merging}>
                            Cerrar
                        </Button>
                        <Button
                            type="button"
                            onClick={openConfirm}
                            disabled={loading || merging || !keepClient || mergeOthers.length === 0}
                        >
                            <Merge className="h-4 w-4" />
                            Unificar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={confirmOpen} onOpenChange={(next) => !merging && setConfirmOpen(next)}>
                <DialogContent className="max-w-md">
                    <DialogHeader className="text-left">
                        <DialogTitle>¿Unificar clientes?</DialogTitle>
                        <DialogDescription className="text-left">
                            Se conservará «{keepClient?.name ?? '—'}» y se fusionarán {mergeOthers.length} registro(s)
                            duplicado(s) por {config.groupNoun}. Lotes, tickets y seguimiento pasarán al principal. Esta
                            acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>

                    {mergeOthers.length > 0 && (
                        <ul className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 text-sm">
                            {mergeOthers.map((client) => (
                                <li key={client.id} className="border-b border-slate-100 px-3 py-2 last:border-b-0">
                                    <p className="font-medium text-slate-900">{client.name}</p>
                                    <p className="text-xs text-slate-500">
                                        DNI {client.dni || '—'} · Tel. {formatClientPhone(client.phone, canViewPhone)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={merging}>
                            Cancelar
                        </Button>
                        <Button type="button" onClick={executeMerge} disabled={merging}>
                            {merging ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Unificando…
                                </>
                            ) : (
                                'Sí, unificar'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
