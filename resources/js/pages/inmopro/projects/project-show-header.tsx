import { Link } from '@inertiajs/react';
import { LayoutGrid, MapPin, Pencil, Plus, Power, PowerOff, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    onSaveAll: () => void;
    pendingEditsCount?: number;
    savingAll?: boolean;
}) {
    return (
        <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{project.name}</h1>
                    {project.location && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            {project.location}
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/inmopro/lots?project_id=${project.id}`}>
                            <LayoutGrid className="h-4 w-4" />
                            Ver inventario
                        </Link>
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        disabled={pendingEditsCount === 0 || savingAll}
                        onClick={onSaveAll}
                    >
                        <Save className="h-4 w-4" />
                        {savingAll ? 'Guardando...' : pendingEditsCount > 0 ? `Guardar cambios (${pendingEditsCount})` : 'Guardar cambios'}
                    </Button>
                    <Button size="sm" asChild>
                        <Link href={`/inmopro/lots/create?project_id=${project.id}`}>
                            <Plus className="h-4 w-4" />
                            Nuevo lote
                        </Link>
                    </Button>
                    <Button size="sm" asChild>
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
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }
                        onClick={onToggleActive}
                    >
                        {project.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        {project.is_active ? 'Desactivar' : 'Activar'}
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span
                    className={
                        project.is_active
                            ? 'rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700'
                            : 'rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-600'
                    }
                >
                    {project.is_active ? 'Activo' : 'Inactivo'}
                </span>
                <span>·</span>
                <span className="tabular-nums font-medium text-slate-700">{project.lots?.length ?? 0} lotes</span>
                <span>·</span>
                <span>Manzanas: {project.blocks?.length ? project.blocks.join(', ') : '-'}</span>
            </div>

            {clientError && (
                <Alert variant="destructive">
                    <AlertDescription>{clientError}</AlertDescription>
                </Alert>
            )}
        </>
    );
}
