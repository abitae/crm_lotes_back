import { Link } from '@inertiajs/react';
import {
    LayoutGrid,
    Map,
    MapPin,
    Pencil,
    Plus,
    Power,
    PowerOff,
    Save,
    View,
} from 'lucide-react';
import { ProjectLocationLink } from '@/components/inmopro/project-location-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { Project } from './show-types';

export function ProjectShowHeader({
    project,
    clientError,
    onToggleActive,
    onSaveAll,
    pendingEditsCount = 0,
    savingAll = false,
}: {
    project: Project;
    clientError?: string;
    onToggleActive: () => void;
    onSaveAll?: () => void;
    pendingEditsCount?: number;
    savingAll?: boolean;
}) {
    return (
        <>
            <div className="rounded-2xl bg-white px-4 py-4 shadow-[0_20px_40px_rgba(0,27,68,0.06)] sm:px-5 dark:border dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={
                                    project.is_active
                                        ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-black tracking-[0.16em] text-emerald-700 uppercase dark:bg-emerald-500/15 dark:text-emerald-300'
                                        : 'rounded-full bg-slate-200 px-3 py-1 text-xs font-black tracking-[0.16em] text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-300'
                                }
                            >
                                {project.is_active
                                    ? 'Proyecto activo'
                                    : 'Proyecto inactivo'}
                            </span>
                            <span className="rounded-full bg-[#d8e2ff] px-3 py-1 text-xs font-bold tracking-[0.16em] text-[#224583] uppercase dark:bg-sky-500/15 dark:text-sky-200">
                                {project.lots?.length ?? 0} lotes
                            </span>
                        </div>
                        <h1 className="mt-2 truncate text-2xl font-black tracking-tight text-[#001b44] dark:text-slate-50">
                            {project.name}
                        </h1>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {project.tour_360_url ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-transparent bg-[#f5f3f3] shadow-none dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                                asChild
                            >
                                <a
                                    href={project.tour_360_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <View className="h-4 w-4" />
                                    Vista 360
                                </a>
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-transparent bg-[#f5f3f3] shadow-none dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                                asChild
                            >
                                <Link href={`/inmopro/project-360/${project.id}`}>
                                    <View className="h-4 w-4" />
                                    Vista 360
                                </Link>
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-transparent bg-[#f5f3f3] shadow-none dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                            asChild
                        >
                            <Link href={`/inmopro/project-flat/${project.id}`}>
                                <Map className="h-4 w-4" />
                                Vista plana
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-transparent bg-[#f5f3f3] shadow-none dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                            asChild
                        >
                            <Link
                                href={`/inmopro/projects/${project.id}/inventory`}
                            >
                                <LayoutGrid className="h-4 w-4" />
                                Inventario comercial
                            </Link>
                        </Button>
                        {onSaveAll ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-transparent bg-emerald-50 text-emerald-800 shadow-none hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/25"
                                disabled={pendingEditsCount === 0 || savingAll}
                                onClick={onSaveAll}
                            >
                                <Save className="h-4 w-4" />
                                {savingAll
                                    ? 'Guardando...'
                                    : pendingEditsCount > 0
                                      ? `Guardar cambios (${pendingEditsCount})`
                                      : 'Guardar cambios'}
                            </Button>
                        ) : null}
                        <Button
                            size="sm"
                            className="rounded-xl bg-[#001b44] text-white hover:bg-[#002f6c] dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                            asChild
                        >
                            <Link
                                href={`/inmopro/lots/create?project_id=${project.id}`}
                            >
                                <Plus className="h-4 w-4" />
                                Nuevo lote
                            </Link>
                        </Button>
                        <Button
                            size="sm"
                            className="rounded-xl bg-[#001b44] text-white hover:bg-[#002f6c] dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                            asChild
                        >
                            <Link href={`/inmopro/projects/${project.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                                Editar proyecto
                            </Link>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={
                                project.is_active
                                    ? 'rounded-xl border-transparent bg-amber-50 text-amber-700 shadow-none hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25'
                                    : 'rounded-xl border-transparent bg-emerald-50 text-emerald-700 shadow-none hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/25'
                            }
                            onClick={onToggleActive}
                        >
                            {project.is_active ? (
                                <PowerOff className="h-4 w-4" />
                            ) : (
                                <Power className="h-4 w-4" />
                            )}
                            {project.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {(project.maps_url || project.location) && (
                        <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-[#224583] dark:text-sky-300" />
                            <ProjectLocationLink
                                location={project.location}
                                maps_url={project.maps_url}
                                location_label={project.location_label}
                            />
                        </span>
                    )}
                    <span className="text-slate-300 dark:text-slate-700">
                        |
                    </span>
                    <span>
                        Manzanas:{' '}
                        {project.blocks?.length
                            ? project.blocks.join(', ')
                            : '-'}
                    </span>
                </div>
            </div>

            {clientError && (
                <Alert variant="destructive">
                    <AlertDescription>{clientError}</AlertDescription>
                </Alert>
            )}
        </>
    );
}
