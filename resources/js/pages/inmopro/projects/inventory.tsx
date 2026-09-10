import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { ProjectLotsTable } from './project-lots-table';
import type { PageProps } from './show-types';
import { useProjectLotsEditor } from './use-project-lots-editor';

export default function ProjectInventory({ project, lotStatuses }: PageProps) {
    const editor = useProjectLotsEditor(project, lotStatuses);
    const lotsCount = project.lots?.length ?? 0;

    const breadcrumbs: BreadcrumbItem[] = [
        { href: '/inmopro/dashboard', title: 'Inmopro' },
        { href: '/inmopro/projects', title: 'Proyectos' },
        { href: `/inmopro/projects/${project.id}`, title: project.name },
        {
            href: `/inmopro/projects/${project.id}/inventory`,
            title: 'Inventario comercial',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Inventario · ${project.name} - Inmopro`} />
            <div className="flex h-[calc(100dvh-5.25rem)] min-h-0 flex-col gap-3 overflow-hidden bg-[#fbf9f8] p-3 md:h-[calc(100dvh-6.5rem)] md:p-4 lg:h-[calc(100dvh-9rem)] dark:bg-slate-950">
                <div className="flex shrink-0 flex-col gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_20px_40px_rgba(0,27,68,0.06)] sm:flex-row sm:items-center sm:justify-between dark:border dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
                    <div className="min-w-0">
                        <p className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase dark:text-slate-400">
                            Inventario comercial
                        </p>
                        <h1 className="truncate text-lg font-black text-[#001b44] dark:text-slate-50">
                            {project.name}
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {lotsCount} lote(s). Desplaza la hoja para ver todas
                            las columnas y filas.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-transparent bg-[#f5f3f3] shadow-none dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                            asChild
                        >
                            <Link href={`/inmopro/projects/${project.id}`}>
                                <ArrowLeft className="h-4 w-4" />
                                Volver al proyecto
                            </Link>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-transparent bg-emerald-50 text-emerald-800 shadow-none hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/25"
                            disabled={
                                editor.pendingEditsCount === 0 ||
                                editor.savingAll
                            }
                            onClick={editor.saveAllChanges}
                        >
                            <Save className="h-4 w-4" />
                            {editor.savingAll
                                ? 'Guardando...'
                                : editor.pendingEditsCount > 0
                                  ? `Guardar cambios (${editor.pendingEditsCount})`
                                  : 'Guardar cambios'}
                        </Button>
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
                    </div>
                </div>

                {editor.clientError ? (
                    <Alert variant="destructive" className="shrink-0">
                        <AlertDescription>
                            {editor.clientError}
                        </AlertDescription>
                    </Alert>
                ) : null}

                <div className="min-h-0 min-w-0 flex-1">
                    <ProjectLotsTable
                        variant="workspace"
                        project={project}
                        lotStatuses={lotStatuses}
                        savingLotId={editor.savingLotId}
                        edited={editor.edited}
                        clientSearch={editor.clientSearch}
                        advisorSearch={editor.advisorSearch}
                        advisorSearchTerm={editor.advisorSearchTerm}
                        setAdvisorSearchTerm={editor.setAdvisorSearchTerm}
                        clientJustSelectedRef={editor.clientJustSelectedRef}
                        getCellValue={editor.getCellValue}
                        setCellEdit={editor.setCellEdit}
                        getEffectiveStatusId={editor.getEffectiveStatusId}
                        isTransferredStatus={editor.isTransferredStatus}
                        transferredStatusId={editor.transferredStatusId}
                        buildPayload={editor.buildPayload}
                        buildRowPayloadForSave={editor.buildRowPayloadForSave}
                        updateLot={editor.updateLot}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
