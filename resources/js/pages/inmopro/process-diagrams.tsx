import { Head } from '@inertiajs/react';
import mermaid from 'mermaid';
import { useEffect, useId } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type DiagramItem = {
    title: string;
    code: string;
};

export default function ProcessDiagramsPage({
    diagrams,
}: {
    diagrams: DiagramItem[];
}) {
    const baseId = useId().replace(/:/g, '-');

    useEffect(() => {
        if (diagrams.length === 0) {
            return;
        }

        mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'loose',
            flowchart: { useMaxWidth: true },
            sequence: { useMaxWidth: true },
        });

        const run = async () => {
            for (let i = 0; i < diagrams.length; i += 1) {
                const container = document.getElementById(`${baseId}-${i}`);
                const diagram = diagrams[i];

                if (!container || !diagram) {
                    continue;
                }

                try {
                    const { svg } = await mermaid.render(`mermaid-${baseId}-${i}`, diagram.code);
                    container.innerHTML = svg;
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Error desconocido';

                    container.innerHTML = `
                        <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                          Error al renderizar: ${message}
                        </div>
                    `;
                }
            }
        };

        void run();
    }, [diagrams, baseId]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'Diagramas de procesos', href: '/inmopro/process-diagrams' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Diagramas de procesos - Inmopro" />

            <div className="space-y-8 p-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Grafico de procesos del sistema</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Diagramas extraidos de `docs/GRAFICO_PROCESOS_SISTEMA.md`.
                    </p>
                </div>

                {diagrams.length === 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        No se encontraron diagramas Mermaid en `docs/GRAFICO_PROCESOS_SISTEMA.md`.
                    </div>
                ) : (
                    <div className="flex flex-col gap-10">
                        {diagrams.map((diagram, index) => (
                            <section
                                key={`${baseId}-${index}`}
                                className="rounded-xl border border-border bg-card text-card-foreground p-6 shadow-sm"
                            >
                                <h3 className="mb-4 text-lg font-semibold text-slate-700">{diagram.title}</h3>
                                <div
                                    id={`${baseId}-${index}`}
                                    className="mermaid-container flex min-h-[200px] justify-center overflow-x-auto bg-slate-50/50 py-4 [&>svg]:max-w-full"
                                />
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
