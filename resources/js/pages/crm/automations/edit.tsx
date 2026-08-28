import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CrmLayout from '@/layouts/crm/crm-layout';
import type { BreadcrumbItem } from '@/types';

type Flow = {
    id: number;
    name: string;
    trigger_type: string;
    trigger_config: Record<string, unknown> | null;
    channels: string[] | null;
    graph_json: { nodes?: FlowNode[]; edges?: FlowEdge[] } | null;
    is_active: boolean;
    is_published: boolean;
};

type FlowNode = {
    id: string;
    data: { type: string; config?: Record<string, unknown> };
};

type FlowEdge = { id: string; source: string; target: string };

type Props = {
    flow: Flow | null;
};

export default function CrmAutomationsEdit({ flow }: Props) {
    const isNew = flow === null;

    const form = useForm({
        name: flow?.name ?? '',
        trigger_type: flow?.trigger_type ?? 'welcome',
        trigger_config: flow?.trigger_config ?? { keywords: [] },
        channels: flow?.channels ?? ['whatsapp', 'messenger', 'instagram'],
        graph_json: flow?.graph_json ?? {
            nodes: [
                { id: 'start', data: { type: 'message', config: { text: '¡Hola! ¿En qué puedo ayudarte?' } } },
                { id: 'end', data: { type: 'end', config: {} } },
            ],
            edges: [{ id: 'e1', source: 'start', target: 'end' }],
        },
        is_active: flow?.is_active ?? false,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Automatizaciones', href: '/crm/automations' },
        { title: isNew ? 'Nuevo flujo' : flow.name, href: isNew ? '/crm/automations/create' : `/crm/automations/${flow.id}/edit` },
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();

        if (isNew) {
            form.post('/crm/automations');
        } else {
            form.patch(`/crm/automations/${flow.id}`);
        }
    };

    const publish = () => {
        if (!flow) return;
        form.post(`/crm/automations/${flow.id}/publish`);
    };

    const nodes = (form.data.graph_json.nodes ?? []) as FlowNode[];

    const updateNodeText = (nodeId: string, text: string) => {
        const updatedNodes = nodes.map((node) =>
            node.id === nodeId
                ? { ...node, data: { ...node.data, type: node.data.type, config: { ...node.data.config, text } } }
                : node,
        );
        form.setData('graph_json', { ...form.data.graph_json, nodes: updatedNodes });
    };

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title={isNew ? 'Nuevo flujo' : flow.name} />

            <div className="mx-auto max-w-3xl p-6">
                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{isNew ? 'Crear flujo' : 'Editar flujo'}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="name">Nombre</Label>
                                <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                                <InputError message={form.errors.name} />
                            </div>

                            <div>
                                <Label htmlFor="trigger_type">Trigger</Label>
                                <select
                                    id="trigger_type"
                                    className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                                    value={form.data.trigger_type}
                                    onChange={(e) => form.setData('trigger_type', e.target.value)}
                                >
                                    <option value="welcome">Bienvenida</option>
                                    <option value="keyword">Palabra clave</option>
                                    <option value="default">Por defecto</option>
                                    <option value="schedule">Horario</option>
                                </select>
                            </div>

                            {form.data.trigger_type === 'keyword' && (
                                <div>
                                    <Label htmlFor="keywords">Palabras clave (separadas por coma)</Label>
                                    <Input
                                        id="keywords"
                                        defaultValue={(form.data.trigger_config.keywords as string[] | undefined)?.join(', ') ?? ''}
                                        onChange={(e) =>
                                            form.setData('trigger_config', {
                                                keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean),
                                            })
                                        }
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Constructor de flujo</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {nodes.map((node) => (
                                <div key={node.id} className="rounded-lg border p-3">
                                    <p className="text-xs uppercase text-muted-foreground">
                                        {node.id} — {node.data.type}
                                    </p>
                                    {node.data.type === 'message' && (
                                        <Input
                                            className="mt-2"
                                            value={(node.data.config?.text as string) ?? ''}
                                            onChange={(e) => updateNodeText(node.id, e.target.value)}
                                            placeholder="Texto del mensaje"
                                        />
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <div className="flex flex-wrap gap-2">
                        <Button type="submit" disabled={form.processing}>
                            Guardar borrador
                        </Button>
                        {!isNew && (
                            <Button type="button" variant="secondary" onClick={publish}>
                                Publicar flujo
                            </Button>
                        )}
                        <Button type="button" variant="outline" asChild>
                            <Link href="/crm/automations">Volver</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </CrmLayout>
    );
}
