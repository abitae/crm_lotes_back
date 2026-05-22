import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { CalendarDays, Cake, Download, FileSpreadsheet, KeyRound, Package, Pencil, Power, PowerOff, Receipt, Search, TimerReset, Upload, UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import {
    addMonthsToIsoDate,
    calendarDateTimestamp,
    formatCalendarDate,
    todayIsoDate,
    toIsoDate,
} from '@/lib/date';
import { advisorsListingQuerySuffix } from '@/lib/inmopro-listing-query';
import { confirmDelete, confirmToggleAdvisorActive } from '@/lib/swal';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

type AdvisorLevel = { id: number; name: string };
type Team = { id: number; name: string; color?: string };
type CityOption = { id: number; name: string; department?: string | null };
type MaterialTypeRow = { id: number; code: string; name: string };
type MaterialFormRow = { advisor_material_type_id: number; delivered_at: string; notes: string };
type AdvisorProfileDocument = {
    id: number;
    title?: string | null;
    file_name: string;
    file_size?: number;
};
type AdvisorProfile = {
    id: number;
    professional_profile?: string | null;
    skills_strengths?: string | null;
    availability?: string | null;
    documents?: AdvisorProfileDocument[];
};
type Advisor = {
    id: number;
    is_active: boolean;
    name: string;
    dni?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    birth_date?: string | null;
    joined_at?: string | null;
    bank_name?: string | null;
    bank_account_number?: string | null;
    bank_cci?: string | null;
    username?: string;
    email: string;
    phone: string;
    city_id?: number;
    personal_quota: string;
    team_id?: number;
    advisor_level_id?: number;
    superior_id?: number | null;
    lots_count?: number;
    team?: Team;
    level?: { name: string; color?: string };
    superior?: { name: string };
    city?: { id: number; name: string; department?: string | null };
    memberships?: Membership[];
    material_items?: Array<{
        id: number;
        advisor_material_type_id: number;
        delivered_at: string | null;
        notes?: string | null;
        type?: { id: number; name: string; code: string };
    }>;
    profile?: AdvisorProfile | null;
};
type Payment = {
    id: number;
    amount: string;
    paid_at: string;
    notes?: string | null;
    advisor_membership_installment_id?: number | null;
};
type MembershipTypeOption = { id: number; name: string; months: number; amount: string };
type Membership = {
    id: number;
    advisor_id: number;
    year: number;
    amount: string;
    start_date?: string | null;
    end_date?: string | null;
    membership_type?: { id: number; name: string; months: number; amount: string } | null;
    advisor?: { id: number; name: string };
    payments?: Payment[];
    installments?: Installment[];
};
type Installment = {
    id: number;
    sequence: number;
    due_date: string | null;
    amount: string;
    paid_amount: string;
    status: string;
};
type MembershipDetail = {
    membership: Membership;
    totalPaid: number;
    balanceDue: number;
    isPaid: boolean;
};
type Paginated<T> = { data: T[]; links: PaginationLink[]; current_page: number; last_page: number; total: number };

function normalizeList<T>(value: T[] | Record<string, T> | null | undefined): T[] {
    if (Array.isArray(value)) {
        return value;
    }

    if (value && typeof value === 'object') {
        return Object.values(value);
    }

    return [];
}

/** YYYY-MM-DD en hora local (para `<input type="date">`). */
function isoLocalDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Valores iniciales de los filtros de fecha cuando no vienen en la URL. */
function defaultAdvisorDateFilterValues(): {
    joinedFrom: string;
    joinedTo: string;
    birthdayFrom: string;
    birthdayTo: string;
} {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const birthdayTo = new Date(today);
    birthdayTo.setDate(birthdayTo.getDate() + 30);

    return {
        joinedFrom: `${today.getFullYear()}-01-01`,
        joinedTo: isoLocalDate(today),
        birthdayFrom: isoLocalDate(today),
        birthdayTo: isoLocalDate(birthdayTo),
    };
}

/**
 * Inertia fusiona el `data` de router.get solo con la query del href; si el href no lleva `?`,
 * hay que partir de la URL del navegador para no perder filtros, paginación o params (modal, etc.).
 */
function mergeWindowSearchWithPatch(patch: Record<string, string | null>): Record<string, string> {
    const merged: Record<string, string> = {};
    const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    sp.forEach((v, k) => {
        merged[k] = v;
    });
    for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') {
            delete merged[key];
        } else {
            merged[key] = value;
        }
    }
    return merged;
}

type PageProps = {
    advisors: Paginated<Advisor>;
    advisorLevels: AdvisorLevel[];
    advisorsList: { id: number; name: string }[];
    teams: Team[];
    cities: CityOption[];
    membershipTypes: MembershipTypeOption[];
    materialTypes: MaterialTypeRow[];
    membershipDetail: MembershipDetail | null;
    advisorForModal: Advisor | null;
    openModal: string | null;
    birthdaysUpcoming: number;
    subscriptionsExpiring: number;
    filters: {
        search?: string;
        advisor_level_id?: string | number;
        team_id?: string | number;
        is_active?: string | number | boolean;
        membership_pending?: string | number | boolean;
        joined_from?: string;
        joined_to?: string;
        birthday_from?: string;
        birthday_to?: string;
        birthdays_upcoming?: string | number | boolean;
        subscriptions_expiring?: string | number | boolean;
    };
};

/** Suscripción anual: 12 meses; si el registro no trae tipo, se trata como anual (datos antiguos). */
function isAnnualMembership(m: Membership): boolean {
    const months = m.membership_type?.months;
    if (months == null) {
        return true;
    }

    return months === 12;
}

/** La membresía anual con mayor año (la vigente / más reciente en calendario). */
function getLatestAnnualMembership(memberships: Membership[] | undefined): Membership | null {
    const annual = normalizeList(memberships).filter(isAnnualMembership);
    if (annual.length === 0) {
        return null;
    }

    return annual.reduce((best, m) => (m.year > best.year ? m : best), annual[0]!);
}

function membershipToDetail(m: Membership, advisor?: { id: number; name: string }): MembershipDetail {
    const totalPaid = normalizeList(m.payments).reduce((sum, p) => sum + Number(p.amount), 0);
    const balanceDue = Math.max(0, Number(m.amount) - totalPaid);
    const membership = { ...m, advisor: m.advisor ?? advisor };
    return { membership, totalPaid, balanceDue, isPaid: balanceDue <= 0 };
}

function buildMaterialFormRows(types: MaterialTypeRow[], existing?: Advisor['material_items']): MaterialFormRow[] {
    const list = normalizeList(existing);
    const sorted = [...list].sort((a, b) => {
        const da = calendarDateTimestamp(a.delivered_at);
        const db = calendarDateTimestamp(b.delivered_at);
        if (db !== da) {
            return db - da;
        }

        return (b.id ?? 0) - (a.id ?? 0);
    });
    const latestByType = new Map<number, (typeof list)[0]>();
    for (const m of sorted) {
        if (!latestByType.has(m.advisor_material_type_id)) {
            latestByType.set(m.advisor_material_type_id, m);
        }
    }
    return types.map((t) => {
        const row = latestByType.get(t.id);
        const d = row?.delivered_at;
        const dateStr = d ? String(d).slice(0, 10) : '';
        return {
            advisor_material_type_id: t.id,
            delivered_at: dateStr,
            notes: row?.notes ?? '',
        };
    });
}

export default function AdvisorsIndex({
    advisors,
    advisorLevels,
    advisorsList,
    teams,
    cities,
    membershipTypes,
    materialTypes,
    membershipDetail,
    advisorForModal,
    openModal,
    birthdaysUpcoming,
    subscriptionsExpiring,
    filters,
}: PageProps) {
    const [modalCreateAdvisor, setModalCreateAdvisor] = useState(false);
    const [modalEditAdvisor, setModalEditAdvisor] = useState<Advisor | null>(null);
    const [modalCazadorAccess, setModalCazadorAccess] = useState<Advisor | null>(null);
    const [modalCreateMembership, setModalCreateMembership] = useState(false);
    /** null = abrir “Nueva membresía” genérica (primer vendedor de la lista); id = preseleccionar ese vendedor */
    const [membershipModalAdvisorId, setMembershipModalAdvisorId] = useState<number | null>(null);
    const [modalMembershipDetail, setModalMembershipDetail] = useState<MembershipDetail | null>(null);
    const [modalAdvisorImport, setModalAdvisorImport] = useState(false);
    const [materialsModalAdvisorId, setMaterialsModalAdvisorId] = useState<number | null>(null);
    const [showJoinedDateFilters, setShowJoinedDateFilters] = useState(false);
    const [showBirthdayDateFilters, setShowBirthdayDateFilters] = useState(false);
    const advisorsListUrlRef = useRef<string | null>(null);
    const materialsModalAdvisor =
        materialsModalAdvisorId == null ? null : (advisors.data.find((a) => a.id === materialsModalAdvisorId) ?? null);

    const defaultDateFilters = useMemo(() => defaultAdvisorDateFilterValues(), []);

    /* eslint-disable react-hooks/set-state-in-effect -- abrir modales desde ?modal= en la URL */
    useEffect(() => {
        if (openModal === 'create_advisor') {
            setModalCreateAdvisor(true);
        }
        if (openModal === 'edit_advisor' && advisorForModal) {
            setModalEditAdvisor(advisorForModal);
        }
        if (openModal === 'create_membership') {
            setModalCreateMembership(true);
        }
        if (membershipDetail) {
            setModalMembershipDetail(membershipDetail);
        }
    }, [openModal, advisorForModal, membershipDetail]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const inertiaPage = usePage();
    useEffect(() => {
        const url = String(inertiaPage.url ?? '');
        if (!url.startsWith('/inmopro/advisors')) {
            return;
        }
        if (advisorsListUrlRef.current === null) {
            advisorsListUrlRef.current = url;
            return;
        }
        if (advisorsListUrlRef.current !== url) {
            advisorsListUrlRef.current = url;
            setShowJoinedDateFilters(false);
            setShowBirthdayDateFilters(false);
        }
    }, [inertiaPage.url]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Vendedores', href: '/inmopro/advisors' },
    ];
    const totalPaid = (m: Membership) => normalizeList(m.payments).reduce((sum, p) => sum + Number(p.amount), 0);
    const balanceDue = (m: Membership) => Math.max(0, Number(m.amount) - totalPaid(m));
    const isPaid = (m: Membership) => balanceDue(m) <= 0;

    const totalAdvisors = advisors.total ?? advisors.data.length;
    const totalQuota = advisors.data.reduce((sum, advisor) => sum + Number(advisor.personal_quota), 0);
    const membershipsPending = advisors.data.reduce((sum, advisor) => {
        const latest = getLatestAnnualMembership(advisor.memberships);
        return sum + (latest && !isPaid(latest) ? 1 : 0);
    }, 0);

    const isFilterFlagOn = (value: string | number | boolean | undefined): boolean => {
        if (value == null) {
            return false;
        }
        if (typeof value === 'boolean') {
            return value;
        }
        const s = String(value).toLowerCase();
        return s === '1' || s === 'true' || s === 'on';
    };
    const birthdaysFilterOn = isFilterFlagOn(filters.birthdays_upcoming);
    const subscriptionsFilterOn = isFilterFlagOn(filters.subscriptions_expiring);

    const navigateAdvisorsWithPatch = (patch: Record<string, string | null>) => {
        router.get('/inmopro/advisors', mergeWindowSearchWithPatch(patch), { preserveState: true });
    };

    const handleToggleActive = async (adv: Advisor) => {
        const activating = !adv.is_active;
        if (!(await confirmToggleAdvisorActive(adv.name, activating))) {
            return;
        }
        router.patch(`/inmopro/advisors/${adv.id}/toggle-active`, {}, { preserveState: true, preserveScroll: true });
    };

    const advisorCriteriaFiltersFormKey = useMemo(
        () =>
            [
                filters.search ?? '',
                String(filters.advisor_level_id ?? ''),
                String(filters.team_id ?? ''),
                filters.is_active != null && String(filters.is_active) !== '' ? String(filters.is_active) : '',
                filters.membership_pending ? '1' : '',
            ].join('|'),
        [filters],
    );

    const advisorJoinedFiltersFormKey = useMemo(
        () => [filters.joined_from ?? '', filters.joined_to ?? ''].join('|'),
        [filters.joined_from, filters.joined_to],
    );

    const advisorBirthdayFiltersFormKey = useMemo(
        () => [filters.birthday_from ?? '', filters.birthday_to ?? ''].join('|'),
        [filters.birthday_from, filters.birthday_to],
    );

    const handleCriteriaFiltersSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const fd = new FormData(e.target as HTMLFormElement);
        const search = (fd.get('search') as string)?.trim();
        const advisorLevelId = (fd.get('advisor_level_id') as string)?.trim();
        const teamId = (fd.get('team_id') as string)?.trim();
        const membershipPending = fd.get('membership_pending') === '1';
        const isActive = (fd.get('is_active') as string)?.trim();

        navigateAdvisorsWithPatch({
            search: search || null,
            advisor_level_id: advisorLevelId || null,
            team_id: teamId || null,
            is_active: isActive !== '' ? isActive : null,
            membership_pending: membershipPending ? '1' : null,
        });
    };

    const handleJoinedFiltersSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const fd = new FormData(e.target as HTMLFormElement);
        const joinedFrom = (fd.get('joined_from') as string)?.trim();
        const joinedTo = (fd.get('joined_to') as string)?.trim();

        navigateAdvisorsWithPatch({
            joined_from: joinedFrom || null,
            joined_to: joinedTo || null,
        });
    };

    const handleBirthdayFiltersSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const fd = new FormData(e.target as HTMLFormElement);
        const birthdayFrom = (fd.get('birthday_from') as string)?.trim();
        const birthdayTo = (fd.get('birthday_to') as string)?.trim();

        navigateAdvisorsWithPatch({
            birthday_from: birthdayFrom || null,
            birthday_to: birthdayTo || null,
        });
    };

    const toggleQuickFilter = (key: 'birthdays_upcoming' | 'subscriptions_expiring', currentlyOn: boolean): void => {
        if (key === 'birthdays_upcoming') {
            navigateAdvisorsWithPatch({ birthdays_upcoming: !currentlyOn ? '1' : null });
        } else {
            navigateAdvisorsWithPatch({ subscriptions_expiring: !currentlyOn ? '1' : null });
        }
    };

    const advisorsExportQuery = new URLSearchParams();

    if (filters.search) {
        advisorsExportQuery.set('search', String(filters.search));
    }
    if (filters.advisor_level_id != null && String(filters.advisor_level_id) !== '') {
        advisorsExportQuery.set('advisor_level_id', String(filters.advisor_level_id));
    }
    if (filters.team_id != null && String(filters.team_id) !== '') {
        advisorsExportQuery.set('team_id', String(filters.team_id));
    }
    if (filters.is_active != null && String(filters.is_active) !== '') {
        advisorsExportQuery.set('is_active', String(filters.is_active));
    }
    if (filters.membership_pending) {
        advisorsExportQuery.set('membership_pending', '1');
    }
    if (filters.joined_from) {
        advisorsExportQuery.set('joined_from', String(filters.joined_from));
    }
    if (filters.joined_to) {
        advisorsExportQuery.set('joined_to', String(filters.joined_to));
    }
    if (filters.birthday_from) {
        advisorsExportQuery.set('birthday_from', String(filters.birthday_from));
    }
    if (filters.birthday_to) {
        advisorsExportQuery.set('birthday_to', String(filters.birthday_to));
    }
    if (birthdaysFilterOn) {
        advisorsExportQuery.set('birthdays_upcoming', '1');
    }
    if (subscriptionsFilterOn) {
        advisorsExportQuery.set('subscriptions_expiring', '1');
    }

    const advisorsExportHref = `/inmopro/advisors/export-excel${advisorsExportQuery.toString() ? `?${advisorsExportQuery.toString()}` : ''}`;

    const openMembershipDetailFromRow = (m: Membership, advisor?: { id: number; name: string }) => {
        setModalMembershipDetail(membershipToDetail(m, advisor));
    };

    /** Nueva membresía para el vendedor; el detalle de la última anual se abre desde la celda de suscripción. */
    const openCreateMembershipForAdvisor = (adv: Advisor) => {
        setMembershipModalAdvisorId(adv.id);
        setModalCreateMembership(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Vendedores - Inmopro" />
            <div className="space-y-6 p-4">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">
                            Estructura Comercial y Membresías
                        </h2>
                        <p className="text-sm italic font-medium text-slate-500">
                            Vendedores, jerarquías y control de membresías anuales.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <a href={advisorsExportHref}>
                                <Download className="h-4 w-4" />
                                Exportar Excel
                            </a>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            onClick={() => setModalAdvisorImport(true)}
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            Importar Excel
                        </Button>
                        <Button onClick={() => setModalCreateAdvisor(true)} className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Nuevo vendedor
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/inmopro/advisors/new">Registro completo</Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
                    <AdvisorMetric label="Vendedores totales" value={String(totalAdvisors)} icon={<UserPlus className="h-5 w-5" />} />
                    <AdvisorMetric
                        label="Meta acumulada"
                        value={`S/ ${totalQuota.toLocaleString()}`}
                        tone="emerald"
                    />
                    <AdvisorMetric label="Membresías pendientes" value={String(membershipsPending)} tone="amber" />
                    <AdvisorMetric
                        label="Cumpleaños próximos (30 días)"
                        value={String(birthdaysUpcoming)}
                        tone="rose"
                        icon={<Cake className="h-5 w-5" />}
                        onClick={() => toggleQuickFilter('birthdays_upcoming', birthdaysFilterOn)}
                        active={birthdaysFilterOn}
                    />
                    <AdvisorMetric
                        label="Suscripciones por vencer (30 días)"
                        value={String(subscriptionsExpiring)}
                        tone="amber"
                        icon={<TimerReset className="h-5 w-5" />}
                        onClick={() => toggleQuickFilter('subscriptions_expiring', subscriptionsFilterOn)}
                        active={subscriptionsFilterOn}
                    />
                </div>

                <div className="rounded-xl border border-border bg-card text-card-foreground p-3 shadow-sm">
                    <form
                        key={advisorCriteriaFiltersFormKey}
                        onSubmit={handleCriteriaFiltersSubmit}
                        className="flex flex-col gap-1.5"
                    >
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Criterios</p>
                        <div className="flex flex-wrap items-end gap-2">
                            <div className="relative min-w-0 flex-1 sm:min-w-[12rem] sm:max-w-md">
                                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <input
                                    name="search"
                                    type="text"
                                    placeholder="Nombre o email…"
                                    className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 py-1 pl-8 pr-2 text-xs font-medium outline-none ring-emerald-500/30 focus:ring-2"
                                    defaultValue={filters.search}
                                />
                            </div>
                            <div className="w-28 shrink-0 sm:w-32">
                                <Label className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">Nivel</Label>
                                <select
                                    name="advisor_level_id"
                                    defaultValue={filters.advisor_level_id != null ? String(filters.advisor_level_id) : ''}
                                    className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium outline-none ring-emerald-500/30 focus:ring-2"
                                >
                                    <option value="">Todos</option>
                                    {advisorLevels.map((lvl) => (
                                        <option key={lvl.id} value={lvl.id}>
                                            {lvl.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-28 shrink-0 sm:w-32">
                                <Label className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">Team</Label>
                                <select
                                    name="team_id"
                                    defaultValue={filters.team_id != null ? String(filters.team_id) : ''}
                                    className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium outline-none ring-emerald-500/30 focus:ring-2"
                                >
                                    <option value="">Todos</option>
                                    {teams.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-28 shrink-0 sm:w-36">
                                <Label className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">Estado</Label>
                                <select
                                    name="is_active"
                                    defaultValue={filters.is_active != null ? String(filters.is_active) : ''}
                                    className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium outline-none ring-emerald-500/30 focus:ring-2"
                                >
                                    <option value="">Activos e inactivos</option>
                                    <option value="1">Solo activos</option>
                                    <option value="0">Solo inactivos</option>
                                </select>
                            </div>
                            <label
                                htmlFor="filter-membership-pending"
                                className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-amber-100/80 bg-amber-50/50 px-2"
                            >
                                <input
                                    type="checkbox"
                                    id="filter-membership-pending"
                                    name="membership_pending"
                                    value="1"
                                    defaultChecked={Boolean(filters.membership_pending)}
                                    className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-emerald-600"
                                />
                                <span className="whitespace-nowrap text-[11px] font-medium text-amber-900">Pend. pago</span>
                            </label>
                            <Button type="submit" size="sm" className="h-8 shrink-0 px-3 text-xs" title="Aplicar criterios de búsqueda y nivel">
                                Aplicar
                            </Button>
                        </div>
                    </form>

                    <div className="my-2 border-t border-slate-100" />

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        <label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] font-medium text-slate-600">
                            <input
                                type="checkbox"
                                checked={showJoinedDateFilters}
                                onChange={(e) => setShowJoinedDateFilters(e.target.checked)}
                                className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-emerald-600"
                            />
                            Fecha de ingreso
                        </label>
                        <label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] font-medium text-slate-600">
                            <input
                                type="checkbox"
                                checked={showBirthdayDateFilters}
                                onChange={(e) => setShowBirthdayDateFilters(e.target.checked)}
                                className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-emerald-600"
                            />
                            Cumpleaños (mes y día)
                        </label>
                    </div>

                    {(showJoinedDateFilters || showBirthdayDateFilters) && (
                    <div className="mt-2 grid gap-3 lg:grid-cols-2 lg:gap-4">
                        {showJoinedDateFilters ? (
                        <form
                            key={advisorJoinedFiltersFormKey}
                            onSubmit={handleJoinedFiltersSubmit}
                            className="flex flex-col gap-1.5"
                        >
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ingreso</p>
                            <div className="flex flex-wrap items-end gap-2">
                                <div className="min-w-0 flex-1 basis-[8.5rem]">
                                    <Label className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">Desde</Label>
                                    <input
                                        type="date"
                                        name="joined_from"
                                        defaultValue={filters.joined_from ?? defaultDateFilters.joinedFrom}
                                        className="h-8 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-1.5 text-xs font-medium outline-none ring-emerald-500/30 focus:ring-2"
                                    />
                                </div>
                                <div className="min-w-0 flex-1 basis-[8.5rem]">
                                    <Label className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">Hasta</Label>
                                    <input
                                        type="date"
                                        name="joined_to"
                                        defaultValue={filters.joined_to ?? defaultDateFilters.joinedTo}
                                        className="h-8 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-1.5 text-xs font-medium outline-none ring-emerald-500/30 focus:ring-2"
                                    />
                                </div>
                                <Button type="submit" size="sm" variant="secondary" className="h-8 shrink-0 px-3 text-xs" title="Aplicar rango de fecha de ingreso">
                                    Aplicar
                                </Button>
                            </div>
                        </form>
                        ) : null}

                        {showBirthdayDateFilters ? (
                        <form
                            key={advisorBirthdayFiltersFormKey}
                            onSubmit={handleBirthdayFiltersSubmit}
                            className={cn(
                                'flex flex-col gap-1.5',
                                showJoinedDateFilters && 'lg:border-l lg:border-slate-100 lg:pl-4',
                            )}
                        >
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cumpleaños</p>
                            <div className="flex flex-wrap items-end gap-2">
                                <div className="min-w-0 flex-1 basis-[8.5rem]">
                                    <Label className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">Desde</Label>
                                    <input
                                        type="date"
                                        name="birthday_from"
                                        defaultValue={filters.birthday_from ?? defaultDateFilters.birthdayFrom}
                                        className="h-8 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-1.5 text-xs font-medium outline-none ring-emerald-500/30 focus:ring-2"
                                    />
                                </div>
                                <div className="min-w-0 flex-1 basis-[8.5rem]">
                                    <Label className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">Hasta</Label>
                                    <input
                                        type="date"
                                        name="birthday_to"
                                        defaultValue={filters.birthday_to ?? defaultDateFilters.birthdayTo}
                                        className="h-8 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-1.5 text-xs font-medium outline-none ring-emerald-500/30 focus:ring-2"
                                    />
                                </div>
                                <Button type="submit" size="sm" variant="secondary" className="h-8 shrink-0 px-3 text-xs" title="Aplicar rango de cumpleaños (mes y día)">
                                    Aplicar
                                </Button>
                            </div>
                        </form>
                        ) : null}
                    </div>
                    )}
                </div>

                <div className="overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Nivel / Vendedor</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Team</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Ciudad</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Superior</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Nacimiento</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Ingreso</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Cuota</th>
                                    <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Última suscripción anual
                                    </th>
                                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {advisors.data.map((adv) => (
                                    <tr key={adv.id} className="transition-colors hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-black text-white">
                                                    {adv.level?.name ?? '-'}
                                                </span>
                                                <div>
                                                    <p className="font-bold leading-none text-slate-800">{adv.name}</p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {adv.email}
                                                        {adv.username ? ` · @${adv.username}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                                    adv.is_active
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}
                                            >
                                                {adv.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white"
                                                style={{ backgroundColor: adv.team?.color ?? '#0f172a' }}
                                            >
                                                {adv.team?.name ?? 'Sin team'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            <span className="font-medium text-slate-800">{adv.city?.name ?? '—'}</span>
                                            {adv.city?.department ? (
                                                <span className="block text-[10px] text-slate-400">{adv.city.department}</span>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{adv.superior?.name ?? 'Alta Gerencia'}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                                            {formatCalendarDate(adv.birth_date)}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">
                                            {formatCalendarDate(adv.joined_at)}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-700">S/ {Number(adv.personal_quota).toLocaleString()}</td>
                                        <td className="px-2 py-2 text-center">
                                            {(() => {
                                                const mem = getLatestAnnualMembership(adv.memberships);
                                                if (!mem) {
                                                    return <span className="text-slate-300">—</span>;
                                                }
                                                const paid = isPaid(mem);
                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={() => openMembershipDetailFromRow(mem, { id: adv.id, name: adv.name })}
                                                        className={`inline-flex min-w-[4.5rem] flex-col items-center rounded-lg px-2 py-1 text-[10px] font-bold ${
                                                            paid
                                                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                                        }`}
                                                        title={paid ? `${mem.year} · Al día · Ver detalle` : `${mem.year} · Pendiente S/ ${balanceDue(mem).toLocaleString('es-PE')}`}
                                                    >
                                                        <span className="text-[9px] font-semibold opacity-80">{mem.year}</span>
                                                        <span>{paid ? 'Al día' : 'Pend.'}</span>
                                                    </button>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-amber-700"
                                                onClick={() => setModalCazadorAccess(adv)}
                                                title="Usuario y PIN (app Cazador)"
                                            >
                                                <KeyRound className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-emerald-700"
                                                title="Nueva membresía (este vendedor)"
                                                onClick={() => openCreateMembershipForAdvisor(adv)}
                                            >
                                                <CalendarDays className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-violet-700"
                                                onClick={() => setMaterialsModalAdvisorId(adv.id)}
                                                title="Material corporativo"
                                            >
                                                <Package className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    'h-8 w-8',
                                                    adv.is_active
                                                        ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                                                        : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700',
                                                )}
                                                onClick={() => handleToggleActive(adv)}
                                                title={adv.is_active ? 'Desactivar' : 'Activar'}
                                            >
                                                {adv.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-slate-900"
                                                onClick={() => setModalEditAdvisor(adv)}
                                                title="Editar vendedor"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {advisors.data.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            <Receipt className="mx-auto h-10 w-10" />
                            <p className="mt-2">No hay vendedores. Cree uno o busque con otro criterio.</p>
                        </div>
                    ) : (
                        <div className="border-t border-slate-100 px-4 py-3">
                            <Pagination links={advisors.links} />
                        </div>
                    )}
                </div>

                <AdvisorExcelImportModal open={modalAdvisorImport} onOpenChange={setModalAdvisorImport} />

                {/* Modal: Crear vendedor */}
                <CreateAdvisorModal
                    open={modalCreateAdvisor}
                    onOpenChange={setModalCreateAdvisor}
                    advisorLevels={advisorLevels}
                    advisorsList={advisorsList}
                    teams={teams}
                    cities={cities}
                    materialTypes={materialTypes}
                />

                {/* Modal: Editar vendedor */}
                {modalEditAdvisor && (
                    <EditAdvisorModal
                        key={modalEditAdvisor.id}
                        open={!!modalEditAdvisor}
                        onOpenChange={(open) => !open && setModalEditAdvisor(null)}
                        advisor={modalEditAdvisor}
                        advisorLevels={advisorLevels}
                        advisorsList={advisorsList.filter((a) => a.id !== modalEditAdvisor.id)}
                        teams={teams}
                        cities={cities}
                        materialTypes={materialTypes}
                    />
                )}

                {modalCazadorAccess && (
                    <AdvisorCazadorAccessModal
                        key={modalCazadorAccess.id}
                        open={!!modalCazadorAccess}
                        onOpenChange={(open) => !open && setModalCazadorAccess(null)}
                        advisor={modalCazadorAccess}
                    />
                )}

                <AdvisorMaterialsQuickModal
                    open={materialsModalAdvisorId != null}
                    onOpenChange={(open) => !open && setMaterialsModalAdvisorId(null)}
                    advisor={materialsModalAdvisor}
                    materialTypes={materialTypes}
                />

                {/* Modal: Nueva membresía */}
                <CreateMembershipModal
                    open={modalCreateMembership}
                    onOpenChange={(open) => {
                        setModalCreateMembership(open);
                        if (!open) {
                            setMembershipModalAdvisorId(null);
                        }
                    }}
                    advisorsList={advisorsList}
                    membershipTypes={membershipTypes}
                    preselectedAdvisorId={membershipModalAdvisorId}
                />

                {/* Modal: Detalle membresía + abonos */}
                {modalMembershipDetail && (
                    <MembershipDetailModal
                        key={modalMembershipDetail.membership.id}
                        open={!!modalMembershipDetail}
                        onOpenChange={(open) => {
                            if (!open) {
                                setModalMembershipDetail(null);
                                router.get('/inmopro/advisors', { ...filters }, { preserveState: true });
                            }
                        }}
                        detail={modalMembershipDetail}
                    />
                )}
            </div>
        </AppLayout>
    );
}

function getXsrfTokenFromCookie(): string {
    const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

    return m ? decodeURIComponent(m[1]) : '';
}

type AdvisorImportPreviewRow = {
    excel_row: number;
    dni: string | null;
    status: 'valid' | 'invalid';
    action: 'create' | 'update' | null;
    errors: string[];
};

type AdvisorImportPreviewResponse = {
    rows: AdvisorImportPreviewRow[];
    summary: { valid: number; invalid: number };
    token: string | null;
    can_confirm: boolean;
};

function AdvisorExcelImportModal({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const inertiaPage = usePage();
    const listQs = advisorsListingQuerySuffix(inertiaPage.url);
    const fileRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [preview, setPreview] = useState<AdvisorImportPreviewResponse | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const reset = (): void => {
        setPreview(null);
        setFetchError(null);
        setFileName(null);
        if (fileRef.current) {
            fileRef.current.value = '';
        }
    };

    useEffect(() => {
        if (!open) {
            reset();
        }
    }, [open]);

    const assignFile = (file: File | undefined): void => {
        if (!file) {
            setFileName(null);

            return;
        }
        const lower = file.name.toLowerCase();
        if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
            setFetchError('Solo se aceptan archivos Excel (.xlsx o .xls).');

            return;
        }
        const input = fileRef.current;
        if (!input) {
            return;
        }
        try {
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
        } catch {
            setFetchError('No se pudo asignar el archivo. Use el botón para elegir el archivo desde su equipo.');

            return;
        }
        setFetchError(null);
        setFileName(file.name);
        setPreview(null);
    };

    const openFilePicker = (): void => {
        fileRef.current?.click();
    };

    const runPreview = async (): Promise<void> => {
        const input = fileRef.current;
        if (!input?.files?.length) {
            setFetchError('Seleccione o suelte aquí un archivo Excel (.xlsx o .xls).');

            return;
        }

        setLoadingPreview(true);
        setFetchError(null);

        const fd = new FormData();
        fd.append('file', input.files[0]);

        try {
            const res = await fetch('/inmopro/advisors/import-preview', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getXsrfTokenFromCookie(),
                },
                body: fd,
                credentials: 'same-origin',
            });

            const body = (await res.json()) as AdvisorImportPreviewResponse & {
                message?: string;
                errors?: { file?: string[] };
            };

            if (!res.ok) {
                const fileErr = body.errors?.file?.[0];
                setFetchError(fileErr ?? body.message ?? 'No se pudo validar el archivo.');

                return;
            }

            setPreview(body);
        } catch {
            setFetchError('Error de red al validar el archivo. Intente de nuevo.');
        } finally {
            setLoadingPreview(false);
        }
    };

    const confirmImport = (): void => {
        if (!preview?.token) {
            return;
        }

        setConfirming(true);
        router.post(
            `/inmopro/advisors/import-confirm${listQs}`,
            { token: preview.token },
            {
                onFinish: () => setConfirming(false),
                onSuccess: () => onOpenChange(false),
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[92vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
                <div className="border-b border-slate-100 px-6 py-4">
                    <DialogHeader className="space-y-1 text-left">
                        <DialogTitle>Importar vendedores desde Excel</DialogTitle>
                        <DialogDescription className="text-left">
                            Todo el flujo ocurre en este modal: elija o arrastre el archivo, valide fila por fila y confirme
                            solo si no hay errores. Los registros existentes se identifican por DNI y se actualizan. Las fechas
                            del Excel deben ir en formato <strong>DD/MM/AAAA</strong> (también se aceptan celdas con formato de
                            fecha de Excel y, por compatibilidad, <strong>AAAA-MM-DD</strong>).
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    <input
                        id="advisor-import-file"
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="sr-only"
                        aria-hidden
                        tabIndex={-1}
                        onChange={(e) => assignFile(e.target.files?.[0])}
                    />

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-2 text-sm text-slate-700">
                                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">
                                    Plantilla Excel
                                </p>
                                <p>
                                    Descargue la plantilla con la fila de encabezados y una <strong>fila de ejemplo</strong>;
                                    bórrela o sustitúyala por sus vendedores reales antes de subir el archivo.
                                </p>
                                <p className="font-semibold text-slate-800">Datos obligatorios (marcados con * en la plantilla)</p>
                                <ul className="ml-5 list-disc space-y-0.5 text-slate-600">
                                    <li>DNI (8 dígitos), nombres, teléfono, email</li>
                                    <li>Ciudad y departamento (como figuran en el sistema)</li>
                                    <li>Código de equipo y código de nivel</li>
                                    <li>Cuota personal</li>
                                    <li>
                                        Fecha de nacimiento y fecha de ingreso en formato <strong>DD/MM/AAAA</strong> (o celda
                                        de fecha de Excel); la fecha de ingreso va en la última columna.
                                    </li>
                                </ul>
                            </div>
                            <Button type="button" asChild className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
                                <a href="/inmopro/advisors/excel-template" download>
                                    <Download className="mr-2 h-4 w-4" />
                                    Descargar plantilla
                                </a>
                            </Button>
                        </div>
                    </div>

                    <div>
                        <Label className="text-slate-700">Archivo Excel</Label>
                        <button
                            type="button"
                            onClick={openFilePicker}
                            onDragEnter={(e) => {
                                e.preventDefault();
                                setDragActive(true);
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragActive(true);
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault();
                                if (e.currentTarget === e.target) {
                                    setDragActive(false);
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                setDragActive(false);
                                assignFile(e.dataTransfer.files?.[0]);
                            }}
                            className={cn(
                                'mt-2 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors',
                                dragActive
                                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900'
                                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                            )}
                        >
                            <Upload className="h-9 w-9 opacity-70" aria-hidden />
                            <span className="text-sm font-semibold">
                                Arrastre el archivo aquí o{' '}
                                <span className="text-emerald-700 underline decoration-emerald-300 underline-offset-2">elija desde su equipo</span>
                            </span>
                            <span className="text-xs text-slate-500">
                                .xlsx / .xls · fechas como <strong>DD/MM/AAAA</strong> o celda fecha Excel · última columna: ingreso
                            </span>
                            {fileName ? <span className="mt-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-800 shadow-sm">{fileName}</span> : null}
                        </button>
                    </div>

                    {fetchError ? <p className="text-sm font-medium text-red-600">{fetchError}</p> : null}

                    {preview ? (
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card text-card-foreground p-3 text-sm">
                                <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-800">
                                    Válidas: <strong className="tabular-nums">{preview.summary.valid}</strong>
                                </span>
                                <span className="rounded-lg bg-red-50 px-3 py-1.5 font-medium text-red-800">
                                    Con error: <strong className="tabular-nums">{preview.summary.invalid}</strong>
                                </span>
                                {!preview.can_confirm && preview.rows.length > 0 ? (
                                    <span className="text-xs font-medium text-amber-800 sm:self-center">
                                        Corrija el Excel y pulse &quot;Volver a validar&quot;.
                                    </span>
                                ) : null}
                            </div>

                            <div className="max-h-[min(48vh,400px)] overflow-auto rounded-xl border border-slate-200 shadow-sm">
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead className="sticky top-0 z-[1] bg-slate-50 shadow-sm">
                                        <tr className="border-b border-slate-200">
                                            <th className="px-3 py-2.5 font-semibold text-slate-700">Fila Excel</th>
                                            <th className="px-3 py-2.5 font-semibold text-slate-700">DNI</th>
                                            <th className="px-3 py-2.5 font-semibold text-slate-700">Estado</th>
                                            <th className="px-3 py-2.5 font-semibold text-slate-700">Acción</th>
                                            <th className="px-3 py-2.5 font-semibold text-slate-700">Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {preview.rows.map((row) => (
                                            <tr key={row.excel_row} className={row.status === 'invalid' ? 'bg-red-50/40' : undefined}>
                                                <td className="px-3 py-2 tabular-nums text-slate-700">{row.excel_row}</td>
                                                <td className="px-3 py-2 font-medium text-slate-800">{row.dni ?? '—'}</td>
                                                <td className="px-3 py-2">
                                                    {row.status === 'valid' ? (
                                                        <span className="font-medium text-emerald-700">Válida</span>
                                                    ) : (
                                                        <span className="font-medium text-red-600">Error</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-slate-700">
                                                    {row.action === 'create'
                                                        ? 'Crear'
                                                        : row.action === 'update'
                                                          ? 'Actualizar'
                                                          : '—'}
                                                </td>
                                                <td className="px-3 py-2 text-slate-600">{row.errors.length ? row.errors.join(' ') : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {preview.rows.length === 0 ? <p className="text-sm text-slate-500">No se encontraron filas de datos en el archivo.</p> : null}
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="sm:min-w-[100px]">
                        Cerrar
                    </Button>
                    <div className="flex flex-wrap justify-end gap-2">
                        {fileName ? (
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={loadingPreview || confirming}
                                onClick={() => void runPreview()}
                            >
                                {loadingPreview ? 'Validando…' : preview ? 'Volver a validar' : 'Validar archivo'}
                            </Button>
                        ) : null}
                        {preview ? (
                            <Button type="button" variant="outline" disabled={loadingPreview || confirming} onClick={reset}>
                                Otro archivo
                            </Button>
                        ) : null}
                        {preview?.can_confirm && preview.token ? (
                            <Button type="button" disabled={confirming} onClick={confirmImport} className="bg-emerald-600 hover:bg-emerald-700">
                                {confirming ? 'Importando…' : 'Confirmar importación'}
                            </Button>
                        ) : null}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function AdvisorMetric({
    label,
    value,
    tone = 'slate',
    icon,
    onClick,
    active = false,
}: {
    label: string;
    value: string;
    tone?: 'slate' | 'emerald' | 'amber' | 'rose';
    icon?: React.ReactNode;
    onClick?: () => void;
    active?: boolean;
}) {
    const tones = {
        slate: 'text-slate-900',
        emerald: 'text-emerald-600',
        amber: 'text-amber-600',
        rose: 'text-rose-600',
    };
    const iconTones = {
        slate: 'bg-slate-100 text-slate-500',
        emerald: 'bg-emerald-100 text-emerald-600',
        amber: 'bg-amber-100 text-amber-600',
        rose: 'bg-rose-100 text-rose-600',
    };
    const activeRings = {
        slate: 'ring-2 ring-slate-400',
        emerald: 'ring-2 ring-emerald-400',
        amber: 'ring-2 ring-amber-400',
        rose: 'ring-2 ring-rose-400',
    };

    const interactive = typeof onClick === 'function';
    const baseClass = cn(
        'flex items-start justify-between gap-3 rounded-3xl border border-border bg-card text-card-foreground p-5 text-left shadow-sm transition-all',
        interactive && 'cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow',
        active && activeRings[tone],
    );

    const inner = (
        <>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                <p className={`mt-3 text-3xl font-black ${tones[tone]}`}>{value}</p>
            </div>
            {icon ? (
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', iconTones[tone])}>
                    {icon}
                </div>
            ) : null}
        </>
    );

    if (interactive) {
        return (
            <button type="button" onClick={onClick} className={baseClass} aria-pressed={active}>
                {inner}
            </button>
        );
    }

    return <div className={baseClass}>{inner}</div>;
}

function CreateAdvisorModal({
    open,
    onOpenChange,
    advisorLevels,
    advisorsList,
    teams,
    cities,
    materialTypes,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    advisorLevels: AdvisorLevel[];
    advisorsList: { id: number; name: string }[];
    teams: Team[];
    cities: CityOption[];
    materialTypes: MaterialTypeRow[];
}) {
    const listQs = advisorsListingQuerySuffix(usePage().url);
    const { data, setData, post, processing, errors, reset } = useForm({
        dni: '',
        first_name: '',
        last_name: '',
        birth_date: '',
        joined_at: '',
        phone: '',
        email: '',
        city_id: cities[0]?.id ?? 0,
        team_id: teams[0]?.id ?? 0,
        advisor_level_id: advisorLevels[0]?.id ?? 0,
        superior_id: null as number | null,
        personal_quota: 0,
        bank_name: '',
        bank_account_number: '',
        bank_cci: '',
        is_active: true,
        material_items: buildMaterialFormRows(materialTypes),
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(`/inmopro/advisors${listQs}`, { onSuccess: () => { reset(); onOpenChange(false); } });
    };

    const updateMaterialRow = (index: number, patch: Partial<MaterialFormRow>) => {
        const next = [...data.material_items];
        next[index] = { ...next[index], ...patch };
        setData('material_items', next);
    };

    const selectClass = 'mt-1 h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm shadow-sm';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex w-[min(100vw-1.5rem,56rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(100vw-2rem,56rem)]">
                <DialogHeader className="shrink-0 space-y-1 border-b border-slate-100 px-6 py-4 text-left">
                    <DialogTitle>Nuevo vendedor</DialogTitle>
                    <DialogDescription>Complete los campos; el formulario está en dos columnas.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="flex flex-col">
                    <div className="px-6 py-4">
                        <div className="grid gap-6 md:grid-cols-2 md:items-start">
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identidad y contacto</p>
                                <div>
                                    <Label htmlFor="dni">DNI (8 dígitos)</Label>
                                    <Input
                                        id="dni"
                                        inputMode="numeric"
                                        maxLength={8}
                                        autoComplete="off"
                                        value={data.dni}
                                        onChange={(e) => setData('dni', e.target.value.replace(/\D/g, '').slice(0, 8))}
                                        className="mt-1 h-9"
                                    />
                                    <InputError message={errors.dni} />
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="first_name">Nombres</Label>
                                        <Input id="first_name" value={data.first_name} onChange={(e) => setData('first_name', e.target.value)} className="mt-1 h-9" />
                                        <InputError message={errors.first_name} />
                                    </div>
                                    <div>
                                        <Label htmlFor="last_name">Apellidos</Label>
                                        <Input id="last_name" value={data.last_name} onChange={(e) => setData('last_name', e.target.value)} className="mt-1 h-9" />
                                        <InputError message={errors.last_name} />
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="birth_date">Nacimiento</Label>
                                        <Input id="birth_date" type="date" value={data.birth_date} onChange={(e) => setData('birth_date', e.target.value)} className="mt-1 h-9" />
                                        <InputError message={errors.birth_date} />
                                    </div>
                                    <div>
                                        <Label htmlFor="joined_at">Ingreso</Label>
                                        <Input id="joined_at" type="date" value={data.joined_at} onChange={(e) => setData('joined_at', e.target.value)} className="mt-1 h-9" />
                                        <InputError message={errors.joined_at} />
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="phone">Teléfono</Label>
                                        <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} className="mt-1 h-9" />
                                        <InputError message={errors.phone} />
                                    </div>
                                    <div>
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className="mt-1 h-9" />
                                        <InputError message={errors.email} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estructura y meta</p>
                                <div>
                                    <Label htmlFor="city_id">Ciudad</Label>
                                    <select
                                        id="city_id"
                                        value={data.city_id}
                                        onChange={(e) => setData('city_id', Number(e.target.value))}
                                        className={selectClass}
                                    >
                                        {cities.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                                {c.department ? ` · ${c.department}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.city_id} />
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="team_id">Team</Label>
                                        <select id="team_id" value={data.team_id} onChange={(e) => setData('team_id', Number(e.target.value))} className={selectClass}>
                                            {teams.map((team) => (
                                                <option key={team.id} value={team.id}>{team.name}</option>
                                            ))}
                                        </select>
                                        <InputError message={errors.team_id} />
                                    </div>
                                    <div>
                                        <Label htmlFor="advisor_level_id">Nivel</Label>
                                        <select
                                            id="advisor_level_id"
                                            value={data.advisor_level_id}
                                            onChange={(e) => setData('advisor_level_id', Number(e.target.value))}
                                            className={selectClass}
                                        >
                                            {advisorLevels.map((l) => (
                                                <option key={l.id} value={l.id}>{l.name}</option>
                                            ))}
                                        </select>
                                        <InputError message={errors.advisor_level_id} />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="superior_id">Superior</Label>
                                    <select
                                        id="superior_id"
                                        value={data.superior_id ?? ''}
                                        onChange={(e) => setData('superior_id', e.target.value ? Number(e.target.value) : null)}
                                        className={selectClass}
                                    >
                                        <option value="">— Ninguno —</option>
                                        {advisorsList.map((a) => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="personal_quota">Cuota personal (S/)</Label>
                                    <Input
                                        id="personal_quota"
                                        type="number"
                                        min={0}
                                        value={data.personal_quota}
                                        onChange={(e) => setData('personal_quota', Number(e.target.value))}
                                        className="mt-1 h-9"
                                    />
                                    <InputError message={errors.personal_quota} />
                                </div>
                            </div>
                        </div>

                        <Separator className="my-5" />
                        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Datos bancarios</p>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div>
                                <Label htmlFor="bank_name">Banco</Label>
                                <Input id="bank_name" value={data.bank_name} onChange={(e) => setData('bank_name', e.target.value)} className="mt-1 h-9" />
                                <InputError message={errors.bank_name} />
                            </div>
                            <div>
                                <Label htmlFor="bank_account_number">Nº cuenta</Label>
                                <Input id="bank_account_number" value={data.bank_account_number} onChange={(e) => setData('bank_account_number', e.target.value)} className="mt-1 h-9" />
                                <InputError message={errors.bank_account_number} />
                            </div>
                            <div>
                                <Label htmlFor="bank_cci">CCI (20 dígitos)</Label>
                                <Input id="bank_cci" inputMode="numeric" maxLength={20} value={data.bank_cci} onChange={(e) => setData('bank_cci', e.target.value)} className="mt-1 h-9" />
                                <InputError message={errors.bank_cci} />
                            </div>
                        </div>

                        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300"
                            />
                            Vendedor activo (puede acceder a Cazador)
                        </label>
                        <InputError message={errors.is_active} />

                        <Separator className="my-5" />
                        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Material corporativo</p>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {data.material_items.map((row, index) => (
                                <div key={row.advisor_material_type_id} className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                                    <div className="mb-2 flex items-start justify-between gap-2">
                                        <span className="text-xs font-bold leading-tight text-slate-800">
                                            {materialTypes.find((t) => t.id === row.advisor_material_type_id)?.name ?? 'Material'}
                                        </span>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            <Checkbox
                                                id={`m-new-${row.advisor_material_type_id}`}
                                                checked={Boolean(row.delivered_at)}
                                                onCheckedChange={(checked) => {
                                                    updateMaterialRow(index, {
                                                        delivered_at: checked === true ? todayIsoDate() : '',
                                                    });
                                                }}
                                            />
                                            <Label htmlFor={`m-new-${row.advisor_material_type_id}`} className="text-xs font-normal whitespace-nowrap">
                                                Entreg.
                                            </Label>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label className="text-[10px] text-slate-500">Fecha</Label>
                                            <Input
                                                type="date"
                                                value={row.delivered_at}
                                                onChange={(e) => updateMaterialRow(index, { delivered_at: e.target.value })}
                                                className="mt-0.5 h-8 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] text-slate-500">Notas</Label>
                                            <Input
                                                value={row.notes}
                                                onChange={(e) => updateMaterialRow(index, { notes: e.target.value })}
                                                className="mt-0.5 h-8 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-3">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Guardar
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditAdvisorModal({
    open,
    onOpenChange,
    advisor,
    advisorLevels,
    advisorsList,
    teams,
    cities,
    materialTypes,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    advisor: Advisor;
    advisorLevels: AdvisorLevel[];
    advisorsList: { id: number; name: string }[];
    teams: Team[];
    cities: CityOption[];
    materialTypes: MaterialTypeRow[];
}) {
    const listQs = advisorsListingQuerySuffix(usePage().url);
    const { data, setData, put, processing, errors } = useForm({
        dni: advisor.dni ?? '',
        first_name: advisor.first_name ?? advisor.name,
        last_name: advisor.last_name ?? '',
        birth_date: advisor.birth_date ? String(advisor.birth_date).slice(0, 10) : '',
        joined_at: advisor.joined_at ? String(advisor.joined_at).slice(0, 10) : '',
        phone: advisor.phone,
        email: advisor.email,
        city_id: advisor.city_id ?? cities[0]?.id ?? 0,
        team_id: advisor.team_id ?? teams[0]?.id ?? 0,
        advisor_level_id: advisor.advisor_level_id ?? advisorLevels[0]?.id ?? 0,
        superior_id: advisor.superior_id ?? (null as number | null),
        personal_quota: Number(advisor.personal_quota),
        bank_name: advisor.bank_name ?? '',
        bank_account_number: advisor.bank_account_number ?? '',
        bank_cci: advisor.bank_cci ?? '',
        is_active: advisor.is_active ?? true,
        material_items: buildMaterialFormRows(materialTypes, advisor.material_items),
        profile: {
            professional_profile: advisor.profile?.professional_profile ?? '',
            skills_strengths: advisor.profile?.skills_strengths ?? '',
            availability: advisor.profile?.availability ?? '',
            document_files: [] as File[],
            document_titles: [] as string[],
        },
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const hasProfileFiles = data.profile.document_files.length > 0;
        put(`/inmopro/advisors/${advisor.id}${listQs}`, {
            forceFormData: hasProfileFiles,
            onSuccess: () => onOpenChange(false),
        });
    };

    const updateMaterialRow = (index: number, patch: Partial<MaterialFormRow>) => {
        const next = [...data.material_items];
        next[index] = { ...next[index], ...patch };
        setData('material_items', next);
    };

    const selectClass = 'mt-1 h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm shadow-sm';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex w-[min(100vw-1.5rem,56rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(100vw-2rem,56rem)]">
                <DialogHeader className="shrink-0 space-y-1 border-b border-slate-100 px-6 py-4 text-left">
                    <DialogTitle>Editar vendedor</DialogTitle>
                    <DialogDescription>Modifique los datos; el formulario está en dos columnas.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="flex flex-col">
                    <div className="max-h-[min(70vh,42rem)] overflow-y-auto px-6 py-4">
                        <div className="grid gap-6 md:grid-cols-2 md:items-start">
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identidad y contacto</p>
                                <div>
                                    <Label htmlFor="edit-dni">DNI (8 dígitos)</Label>
                                    <Input
                                        id="edit-dni"
                                        inputMode="numeric"
                                        maxLength={8}
                                        autoComplete="off"
                                        value={data.dni}
                                        onChange={(e) => setData('dni', e.target.value.replace(/\D/g, '').slice(0, 8))}
                                        className="mt-1 h-9"
                                    />
                                    <InputError message={errors.dni} />
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="edit-first_name">Nombres</Label>
                                        <Input id="edit-first_name" value={data.first_name} onChange={(e) => setData('first_name', e.target.value)} className="mt-1 h-9" />
                                        <InputError message={errors.first_name} />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-last_name">Apellidos</Label>
                                        <Input id="edit-last_name" value={data.last_name} onChange={(e) => setData('last_name', e.target.value)} className="mt-1 h-9" />
                                        <InputError message={errors.last_name} />
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="edit-birth_date">Nacimiento</Label>
                                        <Input id="edit-birth_date" type="date" value={data.birth_date} onChange={(e) => setData('birth_date', e.target.value)} className="mt-1 h-9" />
                                        <InputError message={errors.birth_date} />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-joined_at">Ingreso</Label>
                                        <Input id="edit-joined_at" type="date" value={data.joined_at} onChange={(e) => setData('joined_at', e.target.value)} className="mt-1 h-9" />
                                        <InputError message={errors.joined_at} />
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="edit-phone">Teléfono</Label>
                                        <Input id="edit-phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} className="mt-1 h-9" />
                                        <InputError message={errors.phone} />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-email">Email</Label>
                                        <Input id="edit-email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className="mt-1 h-9" />
                                        <InputError message={errors.email} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estructura y meta</p>
                                <div>
                                    <Label htmlFor="edit-city">Ciudad</Label>
                                    <select
                                        id="edit-city"
                                        value={data.city_id}
                                        onChange={(e) => setData('city_id', Number(e.target.value))}
                                        className={selectClass}
                                    >
                                        {cities.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                                {c.department ? ` · ${c.department}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.city_id} />
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="edit-team">Team</Label>
                                        <select id="edit-team" value={data.team_id} onChange={(e) => setData('team_id', Number(e.target.value))} className={selectClass}>
                                            {teams.map((team) => (
                                                <option key={team.id} value={team.id}>{team.name}</option>
                                            ))}
                                        </select>
                                        <InputError message={errors.team_id} />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-level">Nivel</Label>
                                        <select
                                            id="edit-level"
                                            value={data.advisor_level_id}
                                            onChange={(e) => setData('advisor_level_id', Number(e.target.value))}
                                            className={selectClass}
                                        >
                                            {advisorLevels.map((l) => (
                                                <option key={l.id} value={l.id}>{l.name}</option>
                                            ))}
                                        </select>
                                        <InputError message={errors.advisor_level_id} />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="edit-superior">Superior</Label>
                                    <select
                                        id="edit-superior"
                                        value={data.superior_id ?? ''}
                                        onChange={(e) => setData('superior_id', e.target.value ? Number(e.target.value) : null)}
                                        className={selectClass}
                                    >
                                        <option value="">— Ninguno —</option>
                                        {advisorsList.map((a) => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="edit-quota">Cuota personal (S/)</Label>
                                    <Input
                                        id="edit-quota"
                                        type="number"
                                        min={0}
                                        value={data.personal_quota}
                                        onChange={(e) => setData('personal_quota', Number(e.target.value))}
                                        className="mt-1 h-9"
                                    />
                                    <InputError message={errors.personal_quota} />
                                </div>
                            </div>
                        </div>

                        <Separator className="my-5" />
                        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Datos bancarios</p>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div>
                                <Label htmlFor="edit-bank_name">Banco</Label>
                                <Input id="edit-bank_name" value={data.bank_name} onChange={(e) => setData('bank_name', e.target.value)} className="mt-1 h-9" />
                                <InputError message={errors.bank_name} />
                            </div>
                            <div>
                                <Label htmlFor="edit-bank_account_number">Nº cuenta</Label>
                                <Input id="edit-bank_account_number" value={data.bank_account_number} onChange={(e) => setData('bank_account_number', e.target.value)} className="mt-1 h-9" />
                                <InputError message={errors.bank_account_number} />
                            </div>
                            <div>
                                <Label htmlFor="edit-bank_cci">CCI (20 dígitos)</Label>
                                <Input id="edit-bank_cci" inputMode="numeric" maxLength={20} value={data.bank_cci} onChange={(e) => setData('bank_cci', e.target.value)} className="mt-1 h-9" />
                                <InputError message={errors.bank_cci} />
                            </div>
                        </div>

                        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300"
                            />
                            Vendedor activo (puede acceder a Cazador)
                        </label>
                        <InputError message={errors.is_active} />

                        <Separator className="my-5" />
                        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Perfil profesional</p>
                        <div className="space-y-3">
                            <div>
                                <Label htmlFor="edit-professional_profile">Perfil profesional</Label>
                                <textarea
                                    id="edit-professional_profile"
                                    value={data.profile.professional_profile}
                                    onChange={(e) => setData('profile', { ...data.profile, professional_profile: e.target.value })}
                                    rows={3}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm"
                                />
                                <InputError message={errors['profile.professional_profile']} />
                            </div>
                            <div>
                                <Label htmlFor="edit-skills_strengths">Habilidades y fortalezas</Label>
                                <textarea
                                    id="edit-skills_strengths"
                                    value={data.profile.skills_strengths}
                                    onChange={(e) => setData('profile', { ...data.profile, skills_strengths: e.target.value })}
                                    rows={3}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm"
                                />
                                <InputError message={errors['profile.skills_strengths']} />
                            </div>
                            <div>
                                <Label htmlFor="edit-availability">Disponibilidad</Label>
                                <textarea
                                    id="edit-availability"
                                    value={data.profile.availability}
                                    onChange={(e) => setData('profile', { ...data.profile, availability: e.target.value })}
                                    rows={2}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm"
                                />
                                <InputError message={errors['profile.availability']} />
                            </div>
                        </div>

                        <Separator className="my-5" />
                        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Documentación adjunta</p>
                        {normalizeList(advisor.profile?.documents).length > 0 && (
                            <ul className="mb-3 space-y-2">
                                {normalizeList(advisor.profile?.documents).map((document) => (
                                    <li key={document.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm">
                                        <span className="truncate">{document.title || document.file_name}</span>
                                        <a
                                            href={`/inmopro/advisors/${advisor.id}/profile-documents/${document.id}`}
                                            className="shrink-0 font-medium text-emerald-700 hover:underline"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Descargar
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div>
                            <Label htmlFor="edit-document_files">Agregar archivos</Label>
                            <Input
                                id="edit-document_files"
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                                onChange={(e) => {
                                    const files = Array.from(e.target.files ?? []);
                                    setData('profile', {
                                        ...data.profile,
                                        document_files: files,
                                        document_titles: files.map((file) => file.name.replace(/\.[^.]+$/, '')),
                                    });
                                }}
                                className="mt-1"
                            />
                            <InputError message={errors['profile.document_files'] || errors['profile.document_files.0']} />
                        </div>

                        <Separator className="my-5" />
                        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Material corporativo</p>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {data.material_items.map((row, index) => (
                                <div key={row.advisor_material_type_id} className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                                    <div className="mb-2 flex items-start justify-between gap-2">
                                        <span className="text-xs font-bold leading-tight text-slate-800">
                                            {materialTypes.find((t) => t.id === row.advisor_material_type_id)?.name ?? 'Material'}
                                        </span>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            <Checkbox
                                                id={`m-edit-${row.advisor_material_type_id}`}
                                                checked={Boolean(row.delivered_at)}
                                                onCheckedChange={(checked) => {
                                                    updateMaterialRow(index, {
                                                        delivered_at: checked === true ? todayIsoDate() : '',
                                                    });
                                                }}
                                            />
                                            <Label htmlFor={`m-edit-${row.advisor_material_type_id}`} className="text-xs font-normal whitespace-nowrap">
                                                Entreg.
                                            </Label>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label className="text-[10px] text-slate-500">Fecha</Label>
                                            <Input
                                                type="date"
                                                value={row.delivered_at}
                                                onChange={(e) => updateMaterialRow(index, { delivered_at: e.target.value })}
                                                className="mt-0.5 h-8 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] text-slate-500">Notas</Label>
                                            <Input
                                                value={row.notes}
                                                onChange={(e) => updateMaterialRow(index, { notes: e.target.value })}
                                                className="mt-0.5 h-8 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-3">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Actualizar
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AdvisorCazadorAccessModal({
    open,
    onOpenChange,
    advisor,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    advisor: Advisor;
}) {
    const listQs = advisorsListingQuerySuffix(usePage().url);
    const { data, setData, put, processing, errors, reset } = useForm({
        username: advisor.username ?? '',
        pin: '',
        pin_confirmation: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`/inmopro/advisors/${advisor.id}/cazador-access${listQs}`, {
            preserveScroll: true,
            onSuccess: () => {
                reset('pin', 'pin_confirmation');
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Acceso app Cazador</DialogTitle>
                    <DialogDescription>
                        Usuario y PIN de 6 dígitos para <strong>{advisor.name}</strong>. Si cambia el PIN o el usuario, las sesiones abiertas en la app móvil se cerrarán.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label htmlFor="cazador-username">Usuario</Label>
                        <Input
                            id="cazador-username"
                            autoComplete="username"
                            value={data.username}
                            onChange={(e) => setData('username', e.target.value)}
                            className="mt-1"
                            required
                        />
                        <InputError message={errors.username} />
                    </div>
                    <div>
                        <Label htmlFor="cazador-pin">Nuevo PIN (6 dígitos)</Label>
                        <Input
                            id="cazador-pin"
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            autoComplete="new-password"
                            placeholder="Dejar vacío para no cambiar"
                            value={data.pin}
                            onChange={(e) => setData('pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="mt-1"
                        />
                        <InputError message={errors.pin} />
                    </div>
                    <div>
                        <Label htmlFor="cazador-pin-confirmation">Confirmar PIN</Label>
                        <Input
                            id="cazador-pin-confirmation"
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            autoComplete="new-password"
                            value={data.pin_confirmation}
                            onChange={(e) => setData('pin_confirmation', e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="mt-1"
                        />
                        <InputError message={errors.pin_confirmation} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Guardar acceso
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AdvisorMaterialsQuickModal({
    open,
    onOpenChange,
    advisor,
    materialTypes,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    advisor: Advisor | null;
    materialTypes: MaterialTypeRow[];
}) {
    const inertiaPage = usePage();
    const listQs = advisorsListingQuerySuffix(inertiaPage.url);
    const pageErrors = ((inertiaPage.props as { errors?: Record<string, string> }).errors ?? {}) as Record<string, string>;

    const addForm = useForm({
        advisor_material_type_id: (materialTypes[0]?.id ?? 0) as number,
        delivered_at: todayIsoDate(),
        notes: '',
    });

    useEffect(() => {
        if (!open || !advisor || materialTypes.length === 0) {
            return;
        }
        addForm.setData({
            advisor_material_type_id: materialTypes[0]!.id,
            delivered_at: todayIsoDate(),
            notes: '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reiniciar al abrir / cambiar vendedor
    }, [open, advisor?.id]);

    const historyRows = advisor
        ? [...normalizeList(advisor.material_items)].sort((a, b) => {
              const da = calendarDateTimestamp(a.delivered_at);
              const db = calendarDateTimestamp(b.delivered_at);
              if (db !== da) {
                  return db - da;
              }

              return (b.id ?? 0) - (a.id ?? 0);
          })
        : [];

    const submitAdd = (e: FormEvent) => {
        e.preventDefault();
        if (!advisor) {
            return;
        }
        addForm.post(`/inmopro/advisors/${advisor.id}/material-items${listQs}`, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['advisors'] });
                addForm.setData('notes', '');
                addForm.setData('delivered_at', todayIsoDate());
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Material corporativo</DialogTitle>
                    <DialogDescription>
                        {advisor
                            ? `Nueva entrega (arriba) e historial (abajo) — ${advisor.name}`
                            : 'Abra el modal desde un vendedor de la tabla.'}
                    </DialogDescription>
                </DialogHeader>

                {!advisor ? (
                    <p className="rounded-lg border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-950">
                        Este vendedor no está en la página actual del listado (por ejemplo, tras cambiar de página o filtros).
                        Cierre el modal, localice al vendedor y vuelva a abrir &quot;Material corporativo&quot;.
                    </p>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">Registrar nueva entrega</h4>
                            <form onSubmit={submitAdd} className="grid gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <Label htmlFor="mat-add-type">Tipo de material</Label>
                                    <select
                                        id="mat-add-type"
                                        className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        value={addForm.data.advisor_material_type_id}
                                        onChange={(e) => addForm.setData('advisor_material_type_id', Number(e.target.value))}
                                    >
                                        {materialTypes.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={addForm.errors.advisor_material_type_id ?? pageErrors.advisor_material_type_id} />
                                </div>
                                <div>
                                    <Label htmlFor="mat-add-date">Fecha de entrega</Label>
                                    <Input
                                        id="mat-add-date"
                                        type="date"
                                        value={addForm.data.delivered_at}
                                        onChange={(e) => addForm.setData('delivered_at', e.target.value)}
                                        className="mt-1"
                                    />
                                    <InputError message={addForm.errors.delivered_at ?? pageErrors.delivered_at} />
                                </div>
                                <div className="sm:col-span-2">
                                    <Label htmlFor="mat-add-notes">Notas (opcional)</Label>
                                    <textarea
                                        id="mat-add-notes"
                                        rows={3}
                                        value={addForm.data.notes}
                                        onChange={(e) => addForm.setData('notes', e.target.value)}
                                        className={cn(
                                            'mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
                                        )}
                                        placeholder="Ej. talla M, entregado en oficina…"
                                    />
                                    <InputError message={addForm.errors.notes ?? pageErrors.notes} />
                                </div>
                                <div className="flex flex-wrap gap-2 sm:col-span-2">
                                    <Button type="submit" disabled={addForm.processing || materialTypes.length === 0}>
                                        Registrar entrega
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                        Cerrar
                                    </Button>
                                </div>
                            </form>
                        </div>

                        <Separator />

                        <div>
                            <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Historial de entregas</h4>
                            {historyRows.length === 0 ? (
                                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center text-sm text-slate-500">
                                    Aún no hay entregas registradas.
                                </p>
                            ) : (
                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                    <table className="w-full border-collapse text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50">
                                                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    Fecha
                                                </th>
                                                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    Material
                                                </th>
                                                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    Notas
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {historyRows.map((row) => (
                                                <tr key={row.id} className="bg-white">
                                                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700">
                                                        {formatCalendarDate(row.delivered_at)}
                                                    </td>
                                                    <td className="px-3 py-2 font-medium text-slate-800">
                                                        {row.type?.name ?? materialTypes.find((t) => t.id === row.advisor_material_type_id)?.name ?? '—'}
                                                    </td>
                                                    <td className="max-w-[14rem] px-3 py-2 text-slate-600">
                                                        <span className="line-clamp-2">{row.notes?.trim() ? row.notes : '—'}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function CreateMembershipModal({
    open,
    onOpenChange,
    advisorsList,
    membershipTypes,
    preselectedAdvisorId,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    advisorsList: { id: number; name: string }[];
    membershipTypes: MembershipTypeOption[];
    preselectedAdvisorId: number | null;
}) {
    const today = todayIsoDate();
    const [submitting, setSubmitting] = useState(false);
    const { data, setData, reset } = useForm({
        advisor_id: (advisorsList[0]?.id ?? 0) as number,
        membership_type_id: (membershipTypes[0]?.id ?? 0) as number,
        start_date: today,
        end_date: today,
        amount: membershipTypes[0] ? String(membershipTypes[0].amount) : '',
    });

    useEffect(() => {
        if (!open) {
            return;
        }
        const fallback = advisorsList[0]?.id ?? 0;
        const id =
            preselectedAdvisorId != null && advisorsList.some((a) => a.id === preselectedAdvisorId)
                ? preselectedAdvisorId
                : fallback;
        setData('advisor_id', id);
    }, [open, preselectedAdvisorId, advisorsList, setData]);

    const page = usePage();
    const listQs = advisorsListingQuerySuffix(page.url);
    const pageErrors = ((page.props as { errors?: Record<string, string> }).errors ?? {}) as Record<string, string>;
    const selectedType = membershipTypes.find((t) => t.id === data.membership_type_id);

    const onTypeChange = (typeId: number) => {
        setData('membership_type_id', typeId);
        const type = membershipTypes.find((t) => t.id === typeId);
        if (type) {
            setData('amount', String(type.amount));
            if (data.start_date) {
                setData('end_date', addMonthsToIsoDate(data.start_date, type.months));
            }
        }
    };

    const onStartDateChange = (date: string) => {
        setData('start_date', date);
        if (selectedType && date) {
            setData('end_date', addMonthsToIsoDate(date, selectedType.months));
        }
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const payload: {
            advisor_id: number;
            membership_type_id: number;
            start_date: string;
            end_date: string;
            amount: string | null;
        } = {
            advisor_id: Number(data.advisor_id),
            membership_type_id: Number(data.membership_type_id),
            start_date: data.start_date,
            end_date: data.end_date,
            amount: data.amount === '' ? null : String(data.amount),
        };
        setSubmitting(true);
        router.post(`/inmopro/advisor-memberships${listQs}`, payload, {
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Nueva membresía</DialogTitle>
                    <DialogDescription>
                        Tipo, vendedor y vigencia. Las cuotas y los abonos se gestionan en el detalle de la membresía (cuotas manuales; cada abono va a una cuota con saldo).
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label htmlFor="mem-type">Tipo de membresía</Label>
                        <select
                            id="mem-type"
                            value={data.membership_type_id}
                            onChange={(e) => onTypeChange(Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                            required
                        >
                            <option value="">— Seleccione —</option>
                            {membershipTypes.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name} ({t.months} meses · S/ {Number(t.amount).toLocaleString('es-PE')})
                                </option>
                            ))}
                        </select>
                        <InputError message={pageErrors.membership_type_id} />
                    </div>
                    <div>
                        <Label htmlFor="mem-advisor">Vendedor</Label>
                        <select
                            id="mem-advisor"
                            value={data.advisor_id}
                            onChange={(e) => setData('advisor_id', Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                            required
                        >
                            <option value="">— Seleccione —</option>
                            {advisorsList.map((a) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                        <InputError message={pageErrors.advisor_id} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="mem-start">Fecha inicio</Label>
                            <Input
                                id="mem-start"
                                type="date"
                                value={data.start_date}
                                onChange={(e) => onStartDateChange(e.target.value)}
                                className="mt-1"
                                required
                            />
                            <InputError message={pageErrors.start_date} />
                        </div>
                        <div>
                            <Label htmlFor="mem-end">Fecha fin</Label>
                            <Input
                                id="mem-end"
                                type="date"
                                value={data.end_date}
                                onChange={(e) => setData('end_date', e.target.value)}
                                className="mt-1"
                                required
                            />
                            <InputError message={pageErrors.end_date} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="mem-amount">Monto (S/) — opcional, por defecto del tipo</Label>
                        <Input
                            id="mem-amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.amount}
                            onChange={(e) => setData('amount', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={pageErrors.amount} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={submitting}>Crear membresía</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function MembershipDetailModal({
    open,
    onOpenChange,
    detail,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    detail: MembershipDetail;
}) {
    const listQs = advisorsListingQuerySuffix(usePage().url);
    const { membership, totalPaid, balanceDue, isPaid } = detail;
    const defaultDate = () => todayIsoDate();
    const [editAmountOpen, setEditAmountOpen] = useState(false);

    const installments = useMemo(
        () => [...normalizeList(membership.installments)].sort((a, b) => a.sequence - b.sequence),
        [membership.installments],
    );

    const payableInstallments = useMemo(
        () => installments.filter((i) => Number(i.amount) - Number(i.paid_amount) > 0.0001),
        [installments],
    );

    const paymentForm = useForm({
        amount: '',
        paid_at: defaultDate(),
        notes: '',
    });

    const installmentForm = useForm({
        amount: '',
        due_date: defaultDate(),
        notes: '',
        sequence: '' as string | number,
    });

    /** Primera cuota con saldo (misma regla que el servidor para asignar el abono). */
    const targetInstallment = payableInstallments[0] ?? null;
    const maxPay =
        targetInstallment != null
            ? Math.max(0, Number(targetInstallment.amount) - Number(targetInstallment.paid_amount))
            : 0;

    const submitInstallment = (e: FormEvent) => {
        e.preventDefault();
        installmentForm.post(`/inmopro/advisor-memberships/${membership.id}/installments${listQs}`, {
            onSuccess: () => {
                installmentForm.reset();
                installmentForm.setData('due_date', defaultDate());
            },
        });
    };

    const submitPayment = (e: FormEvent) => {
        e.preventDefault();
        paymentForm.post(`/inmopro/advisor-memberships/${membership.id}/payments${listQs}`, {
            onSuccess: () => paymentForm.reset('amount', 'paid_at', 'notes'),
        });
    };

    const handleDestroy = async () => {
        if (await confirmDelete(`¿Eliminar la membresía de ${membership.advisor?.name ?? 'este vendedor'} (${membership.year})? Se eliminarán también todos los abonos y cuotas.`)) {
            router.delete(`/inmopro/advisor-memberships/${membership.id}${listQs}`);
            onOpenChange(false);
        }
    };

    const payments = normalizeList(membership.payments);
    const sortedPayments = [...payments].sort((a, b) => calendarDateTimestamp(b.paid_at) - calendarDateTimestamp(a.paid_at));
    const startDate = membership.start_date ? formatCalendarDate(membership.start_date) : null;
    const endDate = membership.end_date ? formatCalendarDate(membership.end_date) : null;
    const vigencia = startDate && endDate ? `${startDate} – ${endDate}` : membership.year?.toString() ?? '—';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {membership.membership_type?.name ?? 'Membresía'} – {membership.advisor?.name ?? 'Vendedor'}
                    </DialogTitle>
                    <DialogDescription>
                        Vigencia: {vigencia} · Monto S/ {Number(membership.amount).toLocaleString('es-PE')}
                        {isPaid ? ' · Al día' : ` · Pendiente S/ ${balanceDue.toLocaleString('es-PE')}`}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {(membership.membership_type?.name || vigencia !== '—') && (
                        <div className="flex flex-wrap gap-2 text-sm">
                            {membership.membership_type?.name && (
                                <span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-700">
                                    {membership.membership_type.name}
                                </span>
                            )}
                            {vigencia !== '—' && (
                                <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">{vigencia}</span>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-slate-500">Monto total</p>
                            <p className="font-bold">S/ {Number(membership.amount).toLocaleString('es-PE')}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-slate-500">Abonado</p>
                            <p className="font-bold text-emerald-700">S/ {totalPaid.toLocaleString('es-PE')}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-slate-500">Pendiente</p>
                            <p className={`font-bold ${balanceDue > 0 ? 'text-amber-600' : 'text-slate-500'}`}>S/ {balanceDue.toLocaleString('es-PE')}</p>
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                        <h4 className="mb-2 text-sm font-semibold text-slate-800">Añadir cuota (manual)</h4>
                        <form onSubmit={submitInstallment} className="grid gap-2 sm:grid-cols-2">
                            <div>
                                <Label className="text-xs">Monto cuota (S/)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={installmentForm.data.amount}
                                    onChange={(e) => installmentForm.setData('amount', e.target.value)}
                                    className="mt-1 h-9"
                                    required
                                />
                                <InputError message={installmentForm.errors.amount} />
                            </div>
                            <div>
                                <Label className="text-xs">Vencimiento</Label>
                                <Input
                                    type="date"
                                    value={installmentForm.data.due_date}
                                    onChange={(e) => installmentForm.setData('due_date', e.target.value)}
                                    className="mt-1 h-9"
                                    required
                                />
                                <InputError message={installmentForm.errors.due_date} />
                            </div>
                            <div>
                                <Label className="text-xs">Nº secuencia (opcional)</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    placeholder="Siguiente automático"
                                    value={installmentForm.data.sequence === '' ? '' : installmentForm.data.sequence}
                                    onChange={(e) =>
                                        installmentForm.setData('sequence', e.target.value === '' ? '' : Number(e.target.value))
                                    }
                                    className="mt-1 h-9"
                                />
                                <InputError message={installmentForm.errors.sequence} />
                            </div>
                            <div>
                                <Label className="text-xs">Notas (opcional)</Label>
                                <Input
                                    value={installmentForm.data.notes}
                                    onChange={(e) => installmentForm.setData('notes', e.target.value)}
                                    className="mt-1 h-9"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Button type="submit" size="sm" disabled={installmentForm.processing}>
                                    Guardar cuota
                                </Button>
                            </div>
                        </form>
                    </div>

                    {installments.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-sm font-semibold text-slate-700">Cuotas ({installments.length})</h4>
                            <ul className="max-h-40 space-y-1 overflow-y-auto rounded border border-slate-100 p-2 text-sm">
                                {installments.map((inst) => (
                                    <li key={inst.id} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                                        <span className="text-slate-600">
                                            #{inst.sequence} · {formatCalendarDate(inst.due_date)}
                                            {` · S/ ${Number(inst.paid_amount).toLocaleString('es-PE')} / S/ ${Number(inst.amount).toLocaleString('es-PE')}`}
                                        </span>
                                        <span
                                            className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                                inst.status === 'PAGADA'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : inst.status === 'PARCIAL'
                                                      ? 'bg-amber-100 text-amber-800'
                                                      : inst.status === 'VENCIDA'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {inst.status}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div>
                        <h4 className="mb-2 text-sm font-semibold text-slate-700">Registrar abono</h4>
                        {payableInstallments.length === 0 ? (
                            <p className="text-sm text-amber-800">
                                No hay cuotas con saldo. Añada una o más cuotas arriba antes de registrar abonos.
                            </p>
                        ) : (
                            <p className="mb-2 rounded-md border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-950">
                                El abono se asignará automáticamente a la cuota <strong>#{targetInstallment?.sequence}</strong>{' '}
                                (primera con saldo pendiente). Saldo máximo en esa cuota:{' '}
                                <strong>S/ {maxPay.toLocaleString('es-PE')}</strong>.
                            </p>
                        )}
                        <form onSubmit={submitPayment} className="space-y-2">
                            <div className="flex flex-wrap items-end gap-2">
                                <div className="min-w-24">
                                    <Label className="text-xs">Monto (S/)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={maxPay > 0 ? maxPay : undefined}
                                        value={paymentForm.data.amount}
                                        onChange={(e) => paymentForm.setData('amount', e.target.value)}
                                        className="mt-1 h-9"
                                        required
                                        disabled={payableInstallments.length === 0}
                                    />
                                    <InputError message={paymentForm.errors.amount} />
                                </div>
                                <div className="min-w-32">
                                    <Label className="text-xs">Fecha</Label>
                                    <Input
                                        type="date"
                                        value={paymentForm.data.paid_at}
                                        onChange={(e) => paymentForm.setData('paid_at', e.target.value)}
                                        className="mt-1 h-9"
                                        required
                                        disabled={payableInstallments.length === 0}
                                    />
                                </div>
                                <div className="min-w-28 flex-1">
                                    <Label className="text-xs">Observ.</Label>
                                    <Input
                                        value={paymentForm.data.notes}
                                        onChange={(e) => paymentForm.setData('notes', e.target.value)}
                                        className="mt-1 h-9"
                                        disabled={payableInstallments.length === 0}
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={paymentForm.processing || payableInstallments.length === 0}
                                >
                                    Agregar
                                </Button>
                            </div>
                        </form>
                    </div>

                    <div>
                        <h4 className="mb-2 text-sm font-semibold text-slate-700">Abonos ({sortedPayments.length})</h4>
                        {sortedPayments.length === 0 ? (
                            <p className="text-sm text-slate-500">Aún no hay abonos.</p>
                        ) : (
                            <ul className="max-h-40 space-y-1 overflow-y-auto rounded border border-slate-100 p-2 text-sm">
                                {sortedPayments.map((p) => {
                                    const toCuota = p.advisor_membership_installment_id
                                        ? installments.find((i) => i.id === p.advisor_membership_installment_id)
                                        : null;
                                    return (
                                        <li key={p.id} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
                                            <span>
                                                {formatCalendarDate(p.paid_at)}
                                                {toCuota ? ` · Cuota #${toCuota.sequence}` : ''}
                                                {p.notes ? ` · ${p.notes}` : ''}
                                            </span>
                                            <span className="font-medium">S/ {Number(p.amount).toLocaleString('es-PE')}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setEditAmountOpen(true)}>Editar monto anual</Button>
                    <Button type="button" variant="outline" className="text-red-600" onClick={handleDestroy}>Eliminar membresía</Button>
                    <Button type="button" onClick={() => onOpenChange(false)}>Cerrar</Button>
                </DialogFooter>

                {editAmountOpen && (
                    <EditMembershipModal
                        membership={membership}
                        open={editAmountOpen}
                        onOpenChange={setEditAmountOpen}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function EditMembershipModal({
    membership,
    open,
    onOpenChange,
}: {
    membership: Membership;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const listQs = advisorsListingQuerySuffix(usePage().url);
    const startDate = toIsoDate(membership.start_date);
    const endDate = toIsoDate(membership.end_date);
    const { data, setData, put, processing, errors } = useForm({
        amount: String(membership.amount),
        start_date: startDate || todayIsoDate(),
        end_date: endDate || todayIsoDate(),
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`/inmopro/advisor-memberships/${membership.id}${listQs}`, { onSuccess: () => onOpenChange(false) });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar membresía</DialogTitle>
                    <DialogDescription>
                        {membership.membership_type?.name ?? 'Membresía'} – {membership.advisor?.name}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label htmlFor="edit-amount">Monto total (S/)</Label>
                        <Input
                            id="edit-amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.amount}
                            onChange={(e) => setData('amount', e.target.value)}
                            className="mt-1"
                            required
                        />
                        <InputError message={errors.amount} />
                    </div>
                    <div>
                        <Label htmlFor="edit-start">Fecha inicio</Label>
                        <Input
                            id="edit-start"
                            type="date"
                            value={data.start_date}
                            onChange={(e) => setData('start_date', e.target.value)}
                            className="mt-1"
                            required
                        />
                        <InputError message={errors.start_date} />
                    </div>
                    <div>
                        <Label htmlFor="edit-end">Fecha fin</Label>
                        <Input
                            id="edit-end"
                            type="date"
                            value={data.end_date}
                            onChange={(e) => setData('end_date', e.target.value)}
                            className="mt-1"
                            required
                        />
                        <InputError message={errors.end_date} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={processing}>Guardar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
