import { Head } from '@inertiajs/react';
import { Check, ChevronDown, Copy, Minus, Plus } from 'lucide-react';
import mermaid from 'mermaid';
import { useCallback, useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

type DiagramItem = {
    title: string;
    code: string;
};

function diagramAnchorId(index: number): string {
    return `diagram-${index}`;
}

export default function ProcessDiagramsIndex({
    diagrams,
}: {
    diagrams: DiagramItem[];
}) {
    const baseId = useId().replace(/:/g, '-');
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [zoomByIndex, setZoomByIndex] = useState<Record<number, number>>({});

    const getZoom = (index: number): number => zoomByIndex[index] ?? 1;

    const adjustZoom = useCallback((index: number, delta: number) => {
        setZoomByIndex((prev) => {
            const current = prev[index] ?? 1;
            const next = Math.min(1.35, Math.max(0.65, Math.round((current + delta) * 100) / 100));
            return { ...prev, [index]: next };
        });
    }, []);

    const copyCode = useCallback(async (index: number, code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedIndex(index);
            window.setTimeout(() => setCopiedIndex(null), 2000);
        } catch {
            setCopiedIndex(null);
        }
    }, []);

    useEffect(() => {
        if (diagrams.length === 0) {
            return;
        }

        const isDark = document.documentElement.classList.contains('dark');

        mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'loose',
            theme: isDark ? 'dark' : 'neutral',
            themeVariables: isDark
                ? {
                      primaryColor: '#064e3b',
                      primaryTextColor: '#ecfdf5',
                      primaryBorderColor: '#34d399',
                      lineColor: '#94a3b8',
                      secondaryColor: '#1e293b',
                      tertiaryColor: '#0f172a',
                  }
                : {
                      primaryColor: '#ecfdf5',
                      primaryTextColor: '#0f172a',
                      primaryBorderColor: '#059669',
                      lineColor: '#64748b',
                      secondaryColor: '#f1f5f9',
                      tertiaryColor: '#ffffff',
                  },
            flowchart: { useMaxWidth: true, htmlLabels: true },
            sequence: { useMaxWidth: true },
            state: { useMaxWidth: true },
        });

        let cancelled = false;

        const run = async () => {
            for (let i = 0; i < diagrams.length; i += 1) {
                if (cancelled) {
                    break;
                }
                const container = document.getElementById(`${baseId}-${i}`);
                if (!container || !diagrams[i]) {
                    continue;
                }
                container.innerHTML = '';
                try {
                    const { svg } = await mermaid.render(
                        `mermaid-${baseId}-${i}-${Date.now()}`,
                        diagrams[i].code,
                    );
                    if (!cancelled) {
                        container.innerHTML = svg;
                    }
                } catch (err) {
                    if (!cancelled) {
                        const message =
                            err instanceof Error ? err.message : 'Error desconocido';
                        container.innerHTML = `
                        <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                          Error al renderizar: ${message}
                        </div>
                    `;
                    }
                }
            }
        };

        void run();

        return () => {
            cancelled = true;
            for (let i = 0; i < diagrams.length; i += 1) {
                const el = document.getElementById(`${baseId}-${i}`);
                if (el) {
                    el.innerHTML = '';
                }
            }
        };
    }, [diagrams, baseId]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Diagramas de procesos', href: '/inmopro/process-diagrams' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Diagramas de procesos - Inmopro" />
            <div className="space-y-8 p-4 md:p-6">
                <header className="border-b border-slate-200/80 pb-6 dark:border-slate-700/80">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                        Procesos del sistema
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        Diagramas Mermaid generados desde la documentación del repositorio. Fuente:{' '}
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            docs/GRAFICO_PROCESOS_SISTEMA.md
                        </code>
                        . Incluye API Cazador, API Datero e Inmopro.
                    </p>
                </header>

                {diagrams.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                        No se encontraron diagramas. Comprueba que existe{' '}
                        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">docs/GRAFICO_PROCESOS_SISTEMA.md</code>{' '}
                        con bloques <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">mermaid</code> bajo cada
                        encabezado <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">##</code>.
                    </div>
                ) : (
                    <>
                        <nav
                            aria-label="Índice de diagramas"
                            className="rounded-xl border border-border bg-card text-card-foreground p-4 shadow-sm"
                        >
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Índice
                            </p>
                            <ol className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                                {diagrams.map((diagram, index) => (
                                    <li key={`toc-${baseId}-${index}`}>
                                        <a
                                            href={`#${diagramAnchorId(index)}`}
                                            className="block rounded-lg px-2 py-1.5 text-sm text-emerald-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
                                        >
                                            <span className="font-medium text-slate-400 dark:text-slate-500">
                                                {index + 1}.
                                            </span>{' '}
                                            {diagram.title.replace(/^\d+\.\s*/, '')}
                                        </a>
                                    </li>
                                ))}
                            </ol>
                        </nav>

                        <div className="flex flex-col gap-8">
                            {diagrams.map((diagram, index) => (
                                <Collapsible key={`${baseId}-section-${index}`} defaultOpen>
                                    <section
                                        id={diagramAnchorId(index)}
                                        className="scroll-mt-24 rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-900/5 dark:border-slate-700/90 dark:bg-slate-950/30 dark:ring-white/5"
                                    >
                                        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                                            <CollapsibleTrigger className="group flex flex-1 items-start gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30">
                                                <ChevronDown className="mt-0.5 size-5 shrink-0 text-slate-400 transition-transform group-data-[state=closed]:-rotate-90 dark:text-slate-500" />
                                                <h3 className="text-base font-semibold leading-snug text-slate-800 dark:text-slate-100">
                                                    {diagram.title}
                                                </h3>
                                            </CollapsibleTrigger>
                                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 px-1 dark:border-slate-700 dark:bg-slate-900/60">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8"
                                                        onClick={() => adjustZoom(index, -0.1)}
                                                        aria-label="Reducir zoom del diagrama"
                                                    >
                                                        <Minus className="size-4" />
                                                    </Button>
                                                    <span className="min-w-[2.75rem] text-center text-xs font-medium tabular-nums text-slate-600 dark:text-slate-400">
                                                        {Math.round(getZoom(index) * 100)}%
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8"
                                                        onClick={() => adjustZoom(index, 0.1)}
                                                        aria-label="Aumentar zoom del diagrama"
                                                    >
                                                        <Plus className="size-4" />
                                                    </Button>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1.5 border-slate-200 dark:border-slate-600"
                                                    onClick={() => copyCode(index, diagram.code)}
                                                >
                                                    {copiedIndex === index ? (
                                                        <>
                                                            <Check className="size-3.5 text-emerald-600" />
                                                            Copiado
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="size-3.5" />
                                                            Copiar Mermaid
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                        <CollapsibleContent>
                                            <div className="px-5 pb-5 pt-2">
                                                <div
                                                    className={cn(
                                                        'overflow-x-auto rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-white py-6 dark:border-slate-800 dark:from-slate-900/40 dark:to-slate-950/20',
                                                    )}
                                                >
                                                    <div
                                                        style={{
                                                            transform: `scale(${getZoom(index)})`,
                                                            transformOrigin: 'top center',
                                                        }}
                                                        className="flex min-h-[180px] justify-center px-2 [&>svg]:max-w-full"
                                                    >
                                                        <div
                                                            id={`${baseId}-${index}`}
                                                            className="flex w-full justify-center [&>svg]:max-w-full"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </CollapsibleContent>
                                    </section>
                                </Collapsible>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
