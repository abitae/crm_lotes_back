import { Head, Link, router } from '@inertiajs/react';
import { Copy, PlusCircle, Workflow } from 'lucide-react';
import { CrmPage, CrmPageHeader } from '@/components/crm/crm-page';
import { EmptyState } from '@/components/crm/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CrmLayout from '@/layouts/crm/crm-layout';
import { formatDate } from '@/lib/crm-format';
import type { BreadcrumbItem } from '@/types';

type FlowRow = {
    id: number;
    name: string;
    trigger_type: string;
    is_active: boolean;
    is_published: boolean;
    version: number;
    updated_at: string;
};

type Props = {
    flows: FlowRow[];
    templates: FlowRow[];
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Automatizaciones', href: '/crm/automations' }];

export default function CrmAutomationsIndex({ flows, templates }: Props) {
    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Automatizaciones" />

            <CrmPage>
                <CrmPageHeader
                    title="Automatizaciones"
                    description="Flujos de WhatsApp y Messenger para responder y calificar leads."
                    actions={
                        <Button asChild>
                            <Link href="/crm/automations/create">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Nuevo flujo
                            </Link>
                        </Button>
                    }
                />

                {templates.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Plantillas corporativas</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {templates.map((template) => (
                                <div key={template.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                    <div className="min-w-0">
                                        <p className="font-medium">{template.name}</p>
                                        <p className="text-sm text-muted-foreground">Trigger: {template.trigger_type}</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.post(`/crm/automations/templates/${template.id}/clone`)}
                                    >
                                        <Copy className="mr-1 h-4 w-4" />
                                        Clonar
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Workflow className="h-4 w-4" />
                            Mis flujos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {flows.length === 0 ? (
                            <EmptyState
                                icon={Workflow}
                                title="Aún no tienes flujos"
                                description="Crea un flujo o clona una plantilla para automatizar el inbox."
                                action={
                                    <Button size="sm" asChild>
                                        <Link href="/crm/automations/create">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Nuevo flujo
                                        </Link>
                                    </Button>
                                }
                            />
                        ) : (
                            flows.map((flow) => (
                                <div key={flow.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                    <div className="min-w-0">
                                        <p className="font-medium">{flow.name}</p>
                                        <div className="mt-1 flex flex-wrap gap-2">
                                            <Badge variant="outline">{flow.trigger_type}</Badge>
                                            {flow.is_published ? (
                                                <Badge>Publicado v{flow.version}</Badge>
                                            ) : (
                                                <Badge variant="secondary">Borrador</Badge>
                                            )}
                                            {flow.is_active && <Badge variant="default">Activo</Badge>}
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(flow.updated_at)}
                                            </span>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/crm/automations/${flow.id}/edit`}>Editar</Link>
                                    </Button>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </CrmPage>
        </CrmLayout>
    );
}
