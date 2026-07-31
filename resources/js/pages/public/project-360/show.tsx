import { Head } from '@inertiajs/react';
import { MousePointer2, Rotate3D, Smartphone } from 'lucide-react';
import { Project360Viewer } from '@/components/inmopro/project-360-viewer';
import type { Project360Tour } from '@/types/project-360';

export default function PublicProject360Show({
    project,
    tour,
}: {
    project: { name: string };
    tour: Project360Tour;
}) {
    return (
        <main className="min-h-screen bg-slate-950 text-white">
            <Head title={`Tour 360 de ${project.name}`} />
            <div className="flex min-h-screen flex-col">
                <header className="border-b border-white/10 bg-slate-950/95 px-4 py-4 backdrop-blur md:px-6">
                    <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">
                                Recorrido virtual
                            </p>
                            <h1 className="mt-1 text-xl font-bold md:text-2xl">
                                {project.name}
                            </h1>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                            <span className="flex items-center gap-1">
                                <MousePointer2 className="h-3.5 w-3.5" />
                                Arrastra para mirar
                            </span>
                            <span className="flex items-center gap-1">
                                <Rotate3D className="h-3.5 w-3.5" />
                                Selecciona los puntos naranjas
                            </span>
                            <span className="flex items-center gap-1">
                                <Smartphone className="h-3.5 w-3.5" />
                                Compatible con móvil y VR
                            </span>
                        </div>
                    </div>
                </header>

                <div className="mx-auto flex w-full max-w-7xl flex-1 p-2 md:p-4">
                    <Project360Viewer
                        panoramas={tour.panoramas}
                        hotspots={tour.hotspots}
                        labels={tour.labels}
                        polygons={tour.polygons}
                        settings={tour.settings}
                        startPanoramaId={tour.start_panorama_id}
                        className="min-h-[calc(100vh-8rem)] w-full flex-1 rounded-lg"
                    />
                </div>
            </div>
        </main>
    );
}
